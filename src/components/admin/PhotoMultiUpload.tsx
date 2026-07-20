'use client';
import { useRef, useState, useEffect } from 'react';
import {
  Upload, X, Loader2, AlertCircle, Image as ImageIcon, GripVertical,
  CheckCircle2, Camera,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export interface PhotoItem {
  url: string;
  path?: string;
  type?: string;
  size?: number;
  caption?: string;
}

interface Props {
  value?: string[] | PhotoItem[];
  onChange?: (urls: string[]) => void;
  onCaptionsChange?: (captions: Record<string, string>) => void;
  initialCaptions?: Record<string, string>;
  folder?: string;
  /** Min recommended photos. Just a UX hint, not a hard limit. */
  minRecommended?: number;
  /** Hard max — default 20. */
  max?: number;
  accept?: string;
  label?: string;
  hint?: string;
  /** Set false to hide the caption inputs (e.g. profile photo). */
  showCaptions?: boolean;
}

/**
 * Enterprise multi-photo uploader.
 *
 *  - Click / drop / camera-capture (rear-camera on mobile)
 *  - Optimistic FileReader previews while the upload completes
 *  - HTML5 drag-and-drop reorder (with handle on hover)
 *  - Per-photo caption inline input
 *  - Per-photo delete
 *  - Running "N of M+ recommended" counter
 *  - Per-file error display (mime / size / server failure)
 *  - Distinct visuals for image / video / pdf
 *  - Green check when a file is confirmed in storage
 */
export function PhotoMultiUpload({
  value,
  onChange,
  onCaptionsChange,
  initialCaptions = {},
  folder = 'activities',
  minRecommended = 6,
  max = 20,
  accept = 'image/*,video/mp4,application/pdf',
  label = 'Photos & media',
  hint,
  showCaptions = true,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Whether a file matches this uploader's `accept` list. Enforced for BOTH
   * click and drag-drop (the browser only hints `accept` on the file picker,
   * so drag-drop can otherwise smuggle a photo into the Videos slot — which
   * then saves to the wrong column and never shows on the site).
   */
  function fileAccepted(file: File): boolean {
    const tokens = accept.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (!tokens.length) return true;
    const type = (file.type || '').toLowerCase();
    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
    return tokens.some((tok) => {
      if (tok.startsWith('.')) return tok === ext;
      if (tok.endsWith('/*')) return type.startsWith(tok.slice(0, -1)); // e.g. image/
      return type === tok;
    });
  }

  const initial: PhotoItem[] = (value ?? []).map((v) =>
    typeof v === 'string' ? { url: v, caption: initialCaptions[v] } : v,
  );
  const [items, setItems] = useState<PhotoItem[]>(initial);
  const [dragging, setDragging] = useState(false);   // drop zone
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null); // reorder
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ filename: string; reason: string }[]>([]);
  const [uploading, setUploading] = useState(0);

  // Emit URL list + captions map
  useEffect(() => {
    onChange?.(items.map((i) => i.url));
    if (onCaptionsChange) {
      const map: Record<string, string> = {};
      for (const it of items) if (it.caption && it.url) map[it.url] = it.caption;
      onCaptionsChange(map);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const reachedMin = items.length >= minRecommended;
  const effectiveHint = hint ?? `Upload at least ${minRecommended} photos. Drag-drop or click. Camera on mobile.`;

  async function handleFiles(files: FileList | File[]) {
    const incoming = Array.from(files);
    if (!incoming.length) return;

    // Reject files that don't match this uploader's type (e.g. a photo dropped
    // into the Videos slot). Surface a clear per-file reason and keep the rest.
    const isVideoSlot = accept.includes('video') && !accept.includes('image');
    const fileArr = incoming.filter((f) => fileAccepted(f));
    const rejectErrors = incoming
      .filter((f) => !fileAccepted(f))
      .map((f) => ({
        filename: f.name,
        reason: isVideoSlot
          ? 'This slot is for video clips only. Upload photos under "Project photos" so they appear on the website.'
          : `File type not allowed here (${f.type || 'unknown'}).`,
      }));
    if (!fileArr.length) { setErrors(rejectErrors); return; }

    if (items.length + fileArr.length > max) {
      setErrors([...rejectErrors, { filename: '', reason: `Limit is ${max} files. You added ${items.length}; can add ${Math.max(0, max - items.length)} more.` }]);
      return;
    }

    setUploading((n) => n + fileArr.length);
    setErrors(rejectErrors);

    const previews: PhotoItem[] = await Promise.all(fileArr.map((f) => new Promise<PhotoItem>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result as string, type: f.type, size: f.size });
      reader.onerror = () => resolve({ url: '', type: f.type, size: f.size });
      reader.readAsDataURL(f);
    })));

    const startIndex = items.length;
    setItems((cur) => [...cur, ...previews]);

    try {
      // Upload each file straight from the browser to Supabase Storage using
      // the signed-in admin's auth session. This avoids two problems at once:
      //  - HTTP 413: the bytes never traverse our serverless function (which
      //    is capped at ~4.5 MB request bodies on the host platform).
      //  - "Invalid Compact JWS": the storage request is authorized by the
      //    user's session JWT, not the project anon/service key — so it works
      //    even when the project uses the new non-JWT key format
      //    (sb_publishable_/sb_secret_). The media bucket's RLS policy already
      //    grants write access to admin members.
      const supabase = createClient();
      const newErrors: { filename: string; reason: string }[] = [];
      const uploaded = await Promise.all(fileArr.map(async (file) => {
        const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'bin';
        const path = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 12)}.${ext}`;
        const { error } = await supabase.storage.from('media').upload(path, file, {
          contentType: file.type || 'application/octet-stream',
          cacheControl: '3600',
          upsert: false,
        });
        if (error) {
          newErrors.push({ filename: file.name, reason: error.message });
          return null;
        }
        const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
        return { url: pub.publicUrl, path, type: file.type, size: file.size } as PhotoItem;
      }));

      setItems((cur) => {
        const next = [...cur];
        uploaded.forEach((u, i) => {
          if (u) next[startIndex + i] = { ...u, caption: next[startIndex + i]?.caption };
        });
        return next.filter((_, idx) => {
          if (idx < startIndex) return true;
          return uploaded[idx - startIndex] != null;
        });
      });
      setErrors([...rejectErrors, ...newErrors]);
    } catch (e) {
      setErrors([...rejectErrors, { filename: '', reason: String(e) }]);
      setItems((cur) => cur.slice(0, startIndex));
    } finally {
      setUploading((n) => Math.max(0, n - fileArr.length));
    }
  }

  // Drop zone handlers (file ingest)
  function onDropZone(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }
  function onDragOverZone(e: React.DragEvent) {
    if (draggingIdx != null) return;
    e.preventDefault();
    setDragging(true);
  }
  function onDragLeaveZone() { setDragging(false); }

  // Reorder handlers
  function startReorder(i: number, e: React.DragEvent) {
    setDraggingIdx(i);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(i)); } catch { /* ignore */ }
  }
  function overItem(i: number, e: React.DragEvent) {
    if (draggingIdx == null || draggingIdx === i) return;
    e.preventDefault();
    setOverIdx(i);
  }
  function dropOnItem(to: number) {
    if (draggingIdx == null || draggingIdx === to) {
      setDraggingIdx(null); setOverIdx(null); return;
    }
    setItems((cur) => {
      const next = [...cur];
      const [m] = next.splice(draggingIdx, 1);
      next.splice(to, 0, m);
      return next;
    });
    setDraggingIdx(null);
    setOverIdx(null);
  }
  function endReorder() {
    setDraggingIdx(null); setOverIdx(null);
  }

  function removeAt(i: number) {
    setItems((cur) => cur.filter((_, idx) => idx !== i));
  }
  function updateCaption(i: number, caption: string) {
    setItems((cur) => cur.map((it, idx) => idx === i ? { ...it, caption } : it));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="block text-xs font-semibold text-gray-700">{label}</label>
        <span className={`text-[11px] font-medium ${reachedMin ? 'text-green-700' : 'text-amber-700'}`}>
          {items.length} / {minRecommended}+ recommended
        </span>
      </div>

      <div
        onDrop={onDropZone}
        onDragOver={onDragOverZone}
        onDragLeave={onDragLeaveZone}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        className={`relative cursor-pointer border-2 border-dashed rounded-lg p-5 text-center transition-colors ${
          dragging
            ? 'border-blue-500 bg-blue-50/60'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-1 text-gray-600">
          <div className="flex items-center gap-2 text-blue-600">
            <Upload size={20} />
            <Camera size={18} />
          </div>
          <div className="text-sm font-medium text-navy-800">
            {dragging ? 'Drop to upload…' : 'Click or drop files here'}
          </div>
          <div className="text-[11px] text-gray-500 max-w-md">{effectiveHint}</div>
          {uploading > 0 && (
            <div className="inline-flex items-center gap-1 text-xs text-blue-700 mt-1">
              <Loader2 className="animate-spin" size={12} /> Uploading {uploading}…
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.currentTarget.value = ''; }}
        />
      </div>

      {!!errors.length && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800 space-y-1">
          {errors.map((er, i) => (
            <div key={i} className="inline-flex items-start gap-1.5">
              <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
              <span><strong>{er.filename || 'Upload error'}:</strong> {er.reason}</span>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className={`grid gap-2 ${
          showCaptions
            ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            : 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
        }`}>
          {items.map((it, i) => {
            const isImage = !it.type || it.type.startsWith('image/') || it.url.startsWith('data:image');
            const isVideo = it.type?.startsWith('video/');
            const isPdf   = it.type === 'application/pdf';
            const isOver  = overIdx === i;
            const isDragSrc = draggingIdx === i;
            return (
              <div
                key={`${it.url}-${i}`}
                draggable
                onDragStart={(e) => startReorder(i, e)}
                onDragOver={(e) => overItem(i, e)}
                onDrop={() => dropOnItem(i)}
                onDragEnd={endReorder}
                className={`group relative rounded-md overflow-hidden border bg-gray-50 ${
                  isDragSrc ? 'opacity-40' : ''
                } ${isOver ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="aspect-square">
                  {isVideo ? (
                    <video src={it.url} className="w-full h-full object-cover" muted />
                  ) : isPdf ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 text-xs p-2">
                      <ImageIcon size={20} className="mb-1" /> PDF
                    </div>
                  ) : isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.url} alt={it.caption ?? ''} className="w-full h-full object-cover" />
                  ) : null}
                </div>

                <div className="absolute inset-x-0 top-0 px-1 py-0.5 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white px-1 cursor-grab active:cursor-grabbing">
                    <GripVertical size={11} /> {i + 1}
                  </span>
                  <button
                    type="button"
                    title="Remove"
                    onClick={(e) => { e.stopPropagation(); removeAt(i); }}
                    className="w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600"
                  >
                    <X size={12} />
                  </button>
                </div>

                {it.path && (
                  <CheckCircle2 size={12} className="absolute top-1 right-8 text-emerald-400 drop-shadow opacity-0 group-hover:opacity-100" />
                )}

                {showCaptions && (
                  <input
                    type="text"
                    value={it.caption ?? ''}
                    onChange={(e) => updateCaption(i, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Add a caption…"
                    className="w-full text-[11px] px-2 py-1 border-t bg-white focus:outline-none focus:bg-blue-50/60"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {items.length > 1 && (
        <p className="text-[10px] text-gray-400">
          💡 Drag thumbnails to reorder. The first photo is used as the cover where applicable.
        </p>
      )}
    </div>
  );
}
