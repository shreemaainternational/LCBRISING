'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import {
  Upload, X, Loader2, AlertCircle, Image as ImageIcon, GripVertical,
  CheckCircle2, Camera,
} from 'lucide-react';

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
  folder?: string;
  /** Min recommended photos (default 6). Just a UX hint, not a hard limit. */
  minRecommended?: number;
  /** Hard max — default 20. */
  max?: number;
  accept?: string;
  label?: string;
  hint?: string;
}

/**
 * Enterprise multi-photo uploader. Drag-and-drop or click; previews
 * each file with progress, individual delete, error per file, and a
 * running "X of Y" counter against a recommended minimum.
 *
 * Posts to /api/uploads (multipart) which returns Supabase Storage
 * public URLs from the `media` bucket. Per-file optimistic previews
 * are shown via FileReader before the round-trip completes.
 */
export function PhotoMultiUpload({
  value,
  onChange,
  folder = 'activities',
  minRecommended = 6,
  max = 20,
  accept = 'image/*,video/mp4,application/pdf',
  label = 'Photos & media',
  hint = `Upload at least ${6} photos. Drag-drop or click. Captures from camera on mobile.`,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // normalize value to PhotoItem[]
  const initial = (value ?? []).map((v) => typeof v === 'string' ? { url: v } : v);
  const [items, setItems] = useState<PhotoItem[]>(initial);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<{ filename: string; reason: string }[]>([]);
  const [uploading, setUploading] = useState(0);

  // emit URLs whenever items change
  useEffect(() => {
    onChange?.(items.map((i) => i.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const reachedMin = items.length >= minRecommended;

  async function handleFiles(files: FileList | File[]) {
    const fileArr = Array.from(files);
    if (!fileArr.length) return;

    if (items.length + fileArr.length > max) {
      setErrors([{ filename: '', reason: `Limit is ${max} files. You added ${items.length}; can add ${Math.max(0, max - items.length)} more.` }]);
      return;
    }

    setUploading((n) => n + fileArr.length);
    setErrors([]);

    // optimistic previews via FileReader
    const previews: PhotoItem[] = await Promise.all(fileArr.map((f) => new Promise<PhotoItem>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result as string, type: f.type, size: f.size });
      reader.onerror = () => resolve({ url: '', type: f.type, size: f.size });
      reader.readAsDataURL(f);
    })));

    const startIndex = items.length;
    setItems((cur) => [...cur, ...previews]);

    // actual upload
    const fd = new FormData();
    fd.append('folder', folder);
    for (const f of fileArr) fd.append('file', f);

    try {
      const res = await fetch('/api/uploads', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);

      const newErrors: { filename: string; reason: string }[] = [];
      setItems((cur) => {
        const next = [...cur];
        (j.files as Array<{ ok: boolean; url?: string; path?: string; filename?: string; error?: string; type?: string; size?: number }>).forEach((r, i) => {
          if (r.ok && r.url) {
            next[startIndex + i] = { url: r.url, path: r.path, type: r.type, size: r.size };
          } else {
            newErrors.push({ filename: r.filename ?? `file-${i}`, reason: r.error ?? 'unknown' });
          }
        });
        // remove failed previews
        return next.filter((it, idx) => {
          if (idx < startIndex) return true;
          const r = (j.files as Array<{ ok: boolean }>)[idx - startIndex];
          return r?.ok;
        });
      });
      setErrors(newErrors);
    } catch (e) {
      setErrors([{ filename: '', reason: String(e) }]);
      // strip optimistic previews on hard failure
      setItems((cur) => cur.slice(0, startIndex));
    } finally {
      setUploading((n) => Math.max(0, n - fileArr.length));
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true); }
  function onDragLeave() { setDragging(false); }

  function removeAt(i: number) {
    setItems((cur) => cur.filter((_, idx) => idx !== i));
  }
  function move(from: number, to: number) {
    setItems((cur) => {
      if (to < 0 || to >= cur.length) return cur;
      const next = [...cur];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
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
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
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
          <div className="text-[11px] text-gray-500 max-w-md">{hint}</div>
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
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {items.map((it, i) => (
            <div key={`${it.url}-${i}`} className="group relative aspect-square rounded-md overflow-hidden border bg-gray-50">
              {it.type?.startsWith('video/') ? (
                <video src={it.url} className="w-full h-full object-cover" muted />
              ) : it.type === 'application/pdf' ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 text-xs p-2">
                  <ImageIcon size={20} className="mb-1" />
                  PDF
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.url} alt="" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-x-0 top-0 px-1 py-0.5 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  title="Move left"
                  onClick={(e) => { e.stopPropagation(); move(i, i - 1); }}
                  className="w-5 h-5 rounded bg-white/90 text-gray-700 flex items-center justify-center text-xs"
                >‹</button>
                <span className="text-[10px] font-bold text-white px-1">{i + 1}</span>
                <button
                  type="button"
                  title="Move right"
                  onClick={(e) => { e.stopPropagation(); move(i, i + 1); }}
                  className="w-5 h-5 rounded bg-white/90 text-gray-700 flex items-center justify-center text-xs"
                >›</button>
              </div>
              <button
                type="button"
                title="Remove"
                onClick={(e) => { e.stopPropagation(); removeAt(i); }}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
              >
                <X size={12} />
              </button>
              {it.path && (
                <CheckCircle2 size={12} className="absolute bottom-1 left-1 text-emerald-400 drop-shadow" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Hidden grip handle reference so lucide is imported and tree-shaken cleanly. */}
      <span className="hidden"><GripVertical size={0} /></span>
    </div>
  );
}
