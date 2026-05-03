import crypto from 'node:crypto';
import { env, integrations } from '@/lib/env';

/**
 * Lightweight Cloudinary-backed video composer.
 *
 * Cloudinary's Upload API supports a `video` "manifest" composition
 * mode where you supply a JSON describing scenes (image overlays,
 * text overlays, audio, transitions). It renders the MP4 server-side
 * and returns a permanent URL — perfect for serverless / Vercel.
 *
 * Docs: https://cloudinary.com/documentation/video_manipulation_and_delivery
 *
 * For environments without Cloudinary, the service queues a job that
 * a self-hosted ffmpeg worker can consume from automation_jobs.
 */

const ASPECT_DIMENSIONS = {
  '9:16': { w: 1080, h: 1920 },
  '1:1':  { w: 1080, h: 1080 },
  '16:9': { w: 1920, h: 1080 },
} as const;

export interface VideoScene {
  text: string;
  image_url?: string;
  duration_seconds?: number;
}

export interface VideoRequest {
  title: string;
  scenes: VideoScene[];
  aspect_ratio?: keyof typeof ASPECT_DIMENSIONS;
  audio_url?: string;
}

export interface VideoResult {
  status: 'ready' | 'queued';
  video_url?: string;
  thumbnail_url?: string;
  external_id?: string;
}

export async function generateVideo(req: VideoRequest): Promise<VideoResult> {
  if (!integrations.cloudinary) {
    return { status: 'queued' };       // worker will pick up
  }

  const dim = ASPECT_DIMENSIONS[req.aspect_ratio ?? '9:16'];
  const publicId = `lcbrs/videos/${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  // Build a simple slideshow manifest: each scene becomes a clip with
  // an image base + text overlay. Audio is laid over the whole thing.
  const manifest = {
    w: dim.w,
    h: dim.h,
    du: req.scenes.reduce((s, sc) => s + (sc.duration_seconds ?? 3), 0),
    fps: 30,
    vars: {
      sdur: req.scenes.map((s) => s.duration_seconds ?? 3),
      simg: req.scenes.map((s) => s.image_url ?? ''),
      stxt: req.scenes.map((s) => s.text),
    },
    clips: req.scenes.map((s, i) => ({
      type: s.image_url ? 'image' : 'solid',
      ...(s.image_url ? { url: s.image_url } : { color: '#1e3a8a' }),
      transformation: [
        { width: dim.w, height: dim.h, crop: 'fill' },
        { overlay: { font_family: 'Montserrat', font_size: 64, font_weight: 'bold',
                     text: s.text }, color: 'white', gravity: 'center', y: 50 },
      ],
      duration: s.duration_seconds ?? 3,
    })),
    ...(req.audio_url ? { audio: { url: req.audio_url } } : {}),
  };

  const preset = env.CLOUDINARY_UPLOAD_PRESET ?? 'lcbrs_default';
  const { signature, timestamp } = signCloudinary(
    { public_id: publicId, upload_preset: preset },
    env.CLOUDINARY_API_SECRET!,
  );

  const formData = new URLSearchParams();
  formData.set('public_id', publicId);
  formData.set('upload_preset', preset);
  formData.set('manifest_json', JSON.stringify(manifest));
  formData.set('resource_type', 'video');
  formData.set('api_key', env.CLOUDINARY_API_KEY!);
  formData.set('signature', signature);
  formData.set('timestamp', timestamp);

  const url = `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/video/upload`;
  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(`Cloudinary ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json() as {
    secure_url: string; public_id: string; width: number; height: number;
  };

  return {
    status: 'ready',
    video_url: json.secure_url,
    thumbnail_url: json.secure_url.replace('/video/upload/', '/video/upload/so_0/').replace(/\.\w+$/, '.jpg'),
    external_id: json.public_id,
  };
}

function signCloudinary(params: Record<string, string>, secret: string) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const toSign = Object.entries({ ...params, timestamp })
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`).join('&');
  const signature = crypto.createHash('sha1').update(`${toSign}${secret}`).digest('hex');
  return { signature, timestamp };
}
