-- Raise the server-side file-size cap on the public `media` bucket so larger
-- assets (notably project videos) can be uploaded via signed upload URLs.
-- Photos comfortably fit within this; the API still enforces tighter,
-- per-type ceilings before issuing a signed URL.
update storage.buckets
  set file_size_limit = 104857600 -- 100 MB
  where id = 'media';
