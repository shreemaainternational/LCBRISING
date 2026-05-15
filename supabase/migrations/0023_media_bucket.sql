-- =====================================================================
-- Media bucket for photo / video / document uploads
-- =====================================================================

insert into storage.buckets (id, name, public)
  values ('media', 'media', true)
on conflict (id) do nothing;

-- Public read; admin write.
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
