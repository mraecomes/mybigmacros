-- Public read policy for the chain-logos Storage bucket.
-- The bucket itself is created outside migrations (Storage buckets are not schema objects).
-- This policy allows anonymous users to read logo images without authentication.

create policy "Public read access for chain-logos"
  on storage.objects for select
  using (bucket_id = 'chain-logos');
