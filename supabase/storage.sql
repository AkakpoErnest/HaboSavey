-- HaboSavey storage buckets. All private; the API hands out signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('originals',      'originals',      false, 15728640, array['image/jpeg','image/png','image/webp']),
  ('generated',      'generated',      false, 15728640, array['image/jpeg','image/png','image/webp']),
  ('survey-uploads', 'survey-uploads', false, 15728640, array['image/jpeg','image/png','image/webp']),
  ('poll-images',    'poll-images',    false, 15728640, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
-- Uploads use signed upload URLs created by the server (service role), so no storage.objects
-- policies for anon/authenticated are needed.
