-- =====================================================================
-- Photos table — curated images managed via /admin/media.
-- Drives the public Media gallery and the About-section collage.
-- =====================================================================

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  thumb_url text,
  title text,
  caption text,
  category text,                 -- 'gallery', 'about', 'hero', 'press', ...
  alt text,
  width int,
  height int,
  uploaded_by uuid references public.members(id) on delete set null,
  is_featured boolean not null default false,
  display_order int default 0,
  taken_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_photos_category on public.photos(category);
create index if not exists idx_photos_featured on public.photos(is_featured) where is_featured;
create index if not exists idx_photos_order on public.photos(display_order);

drop trigger if exists trg_photos_updated on public.photos;
create trigger trg_photos_updated before update on public.photos
  for each row execute function public.set_updated_at();

alter table public.photos enable row level security;

-- Public can read non-deleted photos.
do $$ begin
  create policy photos_read on public.photos
    for select using (deleted_at is null);
exception when duplicate_object then null; end $$;

-- Writes via service role only (admin upload flow).
