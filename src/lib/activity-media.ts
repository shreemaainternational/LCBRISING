/**
 * Shared helpers for collecting an activity's displayable photos across the
 * public website and the mobile app, so every surface renders the same set.
 *
 * Activities store media across four columns — `photos`, `before_photos`,
 * `after_photos` and `videos`. The public gallery only ever showed the first
 * three, so any image files uploaded into the "Videos" slot (easy to do by
 * drag-drop) were saved to `videos[]` and never appeared anywhere. We now
 * recover image-type entries out of `videos[]` as well, and expose the actual
 * clips separately for surfaces that can play them.
 */

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|avif|bmp|heic|heif|tiff?)(\?.*)?$/i;
const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogg|ogv|qt)(\?.*)?$/i;

/** True when a URL points at a still image (by file extension). */
export function isImageUrl(url: string): boolean {
  return IMAGE_EXT_RE.test(url);
}

/** True when a URL points at a video clip (by file extension). */
export function isVideoUrl(url: string): boolean {
  return VIDEO_EXT_RE.test(url);
}

export type ActivityMediaRow = {
  photos?: string[] | null;
  before_photos?: string[] | null;
  after_photos?: string[] | null;
  videos?: string[] | null;
};

/**
 * Every displayable photo for an activity, de-duplicated and in a stable
 * order: project photos, then before, then after, then any image files that
 * were mistakenly uploaded into the Videos slot.
 */
export function collectActivityPhotos(a: ActivityMediaRow): string[] {
  return Array.from(
    new Set(
      [
        ...(a.photos ?? []),
        ...(a.before_photos ?? []),
        ...(a.after_photos ?? []),
        // Recover images accidentally saved into the Videos column.
        ...(a.videos ?? []).filter(isImageUrl),
      ].filter(Boolean),
    ),
  );
}

/** The cover photo (first displayable image), or null when there are none. */
export function activityCover(a: ActivityMediaRow): string | null {
  return collectActivityPhotos(a)[0] ?? null;
}

/** Actual video clips only (excludes images misfiled into `videos[]`). */
export function collectActivityVideos(a: ActivityMediaRow): string[] {
  return Array.from(new Set((a.videos ?? []).filter((u) => u && isVideoUrl(u))));
}
