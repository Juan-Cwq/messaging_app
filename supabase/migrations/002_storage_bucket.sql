-- Create a new storage bucket for attachments
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false);

-- Set up RLS for the bucket
create policy "Authenticated users can upload"
  on storage.objects for insert
  with check ( bucket_id = 'attachments' and auth.role() = 'authenticated' );

create policy "Authenticated users can download"
  on storage.objects for select
  using ( bucket_id = 'attachments' and auth.role() = 'authenticated' );
