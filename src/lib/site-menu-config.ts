// Pure config for the public site's main nav — no server imports, safe to
// use from client components (PublicNav, the admin toggle UI).

export type MenuItemKey =
  | 'home'
  | 'about'
  | 'activities'
  | 'stories'
  | 'campaigns'
  | 'blog'
  | 'events'
  | 'media'
  | 'gallery'
  | 'contact';

export interface MenuItemDef {
  key: MenuItemKey;
  label: string;
  href: string;
}

// Canonical list of every entry in the public site's main nav. This is the
// source of truth for key/label/href — the DB (site_menu_items) only ever
// stores the is_visible flag per key.
export const PUBLIC_MENU_ITEMS: MenuItemDef[] = [
  { key: 'home', label: 'Home', href: '/' },
  { key: 'about', label: 'About', href: '/about' },
  { key: 'activities', label: 'Service Activities', href: '/activities' },
  { key: 'stories', label: 'Stories', href: '/stories' },
  { key: 'campaigns', label: 'Campaigns', href: '/campaigns' },
  { key: 'blog', label: 'Blog', href: '/blog' },
  { key: 'events', label: 'Events', href: '/events' },
  { key: 'media', label: 'Media', href: '/media' },
  { key: 'gallery', label: 'Gallery', href: '/gallery' },
  { key: 'contact', label: 'Contact', href: '/contact' },
];

// Items hidden out of the box, before any admin row exists — keeps the
// "hide the Stories link" behaviour from before this became configurable.
const DEFAULT_HIDDEN: ReadonlySet<MenuItemKey> = new Set(['stories']);

export function defaultMenuVisibility(): Record<MenuItemKey, boolean> {
  const out = {} as Record<MenuItemKey, boolean>;
  for (const item of PUBLIC_MENU_ITEMS) out[item.key] = !DEFAULT_HIDDEN.has(item.key);
  return out;
}
