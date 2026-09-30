/**
 * Groups the flat `photos` table into one album per activity/event for the
 * public gallery (and its mobile mirror).
 *
 * A photo joins an activity's album in one of two ways:
 *  1. It is explicitly linked via `photos.activity_id` (set at upload time).
 *  2. It isn't linked, but its date matches exactly one activity's date.
 *
 * When an unlinked photo's date matches more than one activity — two events
 * held the same day — we never guess which one it belongs to. It falls back
 * to the "Other Photos" album instead of being merged into either, so two
 * same-day activities still end up as separate albums as soon as at least
 * one photo from each is explicitly linked.
 */

export type AlbumSourcePhoto = {
  id: string;
  url: string;
  title: string | null;
  caption: string | null;
  date?: string | null;
  activityId?: string | null;
};

export type ActivityForAlbum = {
  id: string;
  title: string;
  date: string | null;
};

export type Album = {
  key: string;
  name: string;
  date: string | null;
  photos: AlbumSourcePhoto[];
};

const OTHER_ALBUM_KEY = '__other__';
const OTHER_ALBUM_NAME = 'Other Photos';

function dayKey(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : iso.slice(0, 10);
}

export function groupPhotosIntoAlbums(
  photos: AlbumSourcePhoto[],
  activities: ActivityForAlbum[],
): Album[] {
  const activityById = new Map(activities.map((a) => [a.id, a]));
  const activitiesByDay = new Map<string, ActivityForAlbum[]>();
  for (const a of activities) {
    const key = dayKey(a.date);
    if (!key) continue;
    const list = activitiesByDay.get(key);
    if (list) list.push(a);
    else activitiesByDay.set(key, [a]);
  }

  const albums = new Map<string, Album>();
  const other: AlbumSourcePhoto[] = [];

  for (const p of photos) {
    let activity = p.activityId ? activityById.get(p.activityId) : undefined;
    if (!activity) {
      const key = dayKey(p.date);
      const candidates = key ? activitiesByDay.get(key) : undefined;
      if (candidates && candidates.length === 1) activity = candidates[0];
    }

    if (activity) {
      let album = albums.get(activity.id);
      if (!album) {
        album = { key: activity.id, name: activity.title, date: activity.date, photos: [] };
        albums.set(activity.id, album);
      }
      album.photos.push(p);
    } else {
      other.push(p);
    }
  }

  const sorted = Array.from(albums.values()).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  if (other.length) {
    sorted.push({ key: OTHER_ALBUM_KEY, name: OTHER_ALBUM_NAME, date: null, photos: other });
  }
  return sorted;
}
