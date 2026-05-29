-- Ensure the public `media` bucket exists with a 100 MB file-size cap and the
-- expected read/write policies. Idempotent and self-healing: some environments
-- received later column migrations but not the original media-bucket migration
-- (0023), leaving activity photo uploads pointed at a bucket that doesn't exist.

insert into storage.buckets (id, name, public, file_size_limit)
  values ('media', 'media', true, 104857600) -- 100 MB
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      public = true;

-- Public read; admin write. (Mirrors 0023; guarded so re-runs are safe.)
do $$ begin
  create policy media_read_public on storage.objects
    for select using (bucket_id = 'media');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy media_write_admin on storage.objects
    for all using (
      bucket_id = 'media' and
      (auth.role() = 'service_role' or exists (
        select 1 from public.members m
        where m.user_id = auth.uid()
          and m.role in ('admin','president','secretary','treasurer','officer')
      ))
    ) with check (bucket_id = 'media');
exception when duplicate_object then null; end $$;
