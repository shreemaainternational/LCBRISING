-- =====================================================================
-- Public site menu visibility. One row per main-nav item so officers can
-- hide/unhide any entry (Stories, Blog, etc.) from the CRM's Website Menu
-- command center (/admin/settings/menu) without a code change or
-- redeploy. The reader (PublicNav, via src/lib/site-menu.ts) falls back
-- to sensible defaults when this table isn't reachable, so the public
-- site keeps rendering either way.
-- =====================================================================

create table if not exists public.site_menu_items (
  key text primary key,
  label text not null,
  href text not null,
  is_visible boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.members(id) on delete set null
);

do $$ begin
  drop trigger if exists set_updated_site_menu_items on public.site_menu_items;
  create trigger set_updated_site_menu_items before update on public.site_menu_items
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.site_menu_items enable row level security;

-- Visibility must be public-readable: the main nav renders for anonymous
-- visitors, and it's the same non-sensitive labels/hrefs already visible
-- in the page source.
do $$ begin
  create policy site_menu_items_public_read on public.site_menu_items
    for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy site_menu_items_admin_write on public.site_menu_items
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid() and m.role = 'admin')
    ) with check (
      exists (select 1 from public.members m
              where m.user_id = auth.uid() and m.role = 'admin')
    );
exception when duplicate_object then null; end $$;

-- Seed every current main-nav item. Stories starts hidden to match the
-- earlier "hide the Stories link" change — flip it from the admin page
-- to bring it back, no deploy required.
insert into public.site_menu_items (key, label, href, is_visible) values
  ('home',       'Home',               '/',           true),
  ('about',      'About',              '/about',      true),
  ('activities', 'Service Activities', '/activities', true),
  ('stories',    'Stories',            '/stories',    false),
  ('campaigns',  'Campaigns',          '/campaigns',  true),
  ('blog',       'Blog',               '/blog',       true),
  ('events',     'Events',             '/events',     true),
  ('media',      'Media',              '/media',      true),
  ('gallery',    'Gallery',            '/gallery',    true),
  ('contact',    'Contact',            '/contact',    true)
on conflict (key) do nothing;
