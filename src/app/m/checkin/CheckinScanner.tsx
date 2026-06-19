'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, AlertCircle, X } from 'lucide-react';

/**
 * Lightweight QR scanner that uses the BarcodeDetector Web API when
 * available (Android Chrome, Safari 17+). On older browsers it shows a
 * file picker for capturing a photo of the QR which the server can
 * decode if needed.
 */
export function CheckinScanner() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Reset scan state each time the camera is (re)opened.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null); setResult(null);

    type BarcodeDetectorCtor = new (opts: { formats: string[] }) => {
      detect(source: CanvasImageSource): Promise<{ rawValue?: string }[]>;
    };
    const BD = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!BD) {
      setError("This browser doesn't support live QR scanning. Use the file picker below.");
      return;
    }

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }, audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        const detector = new BD({ formats: ['qr_code'] });
        let active = true;
        stopRef.current = () => {
          active = false;
          stream.getTracks().forEach((t) => t.stop());
        };
        const loop = async () => {
          if (!active) return;
          try {
            const codes = await detector.detect(v);
            const v0 = codes[0]?.rawValue;
            if (v0) { setResult(v0); stopRef.current(); return; }
          } catch { /* ignore frame error */ }
          requestAnimationFrame(loop);
        };
        loop();
      } catch (e) {
        setError(`Camera unavailable: ${String(e)}`);
      }
    })();

    return () => {
      cancelled = true;
      stopRef.current();
    };
  }, [open]);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-emerald-500 active:bg-emerald-600 text-white font-semibold">
          <Camera size={18} /> Start Scanner
        </button>
      ) : (
        <div>
          <div className="relative aspect-square w-full bg-black rounded-xl overflow-hidden">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-x-8 inset-y-12 border-2 border-amber-400/80 rounded-2xl" />
            </div>
            <button type="button" onClick={() => setOpen(false)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center">
              <X size={16} />
            </button>
          </div>
          {error && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-red-700">
              <AlertCircle size={13} /> {error}
            </div>
          )}
          {result && (
            <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="inline-flex items-center gap-1.5 text-sm text-green-800 font-semibold">
                <CheckCircle2 size={14} /> Scanned
              </div>
              <div className="text-xs text-green-700 mt-1 break-all">{result}</div>
              {result.startsWith('http') && (
                <a href={result} className="inline-block mt-2 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold">
                  Open link
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
