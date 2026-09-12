-- =====================================================================
-- Adds the "Directory" link (public club + officer directory at
-- /directory) to the Website Menu command center. Migration 0081 already
-- seeded the original nav items and ran on existing installs, so this
-- adds the new row rather than editing that migration in place.
-- =====================================================================

insert into public.site_menu_items (key, label, href, is_visible) values
  ('directory', 'Directory', '/directory', true)
on conflict (key) do nothing;
