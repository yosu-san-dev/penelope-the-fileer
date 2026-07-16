-- policies.sql  —  Row-Level Security for Penelope The Fileer
-- ---------------------------------------------------------------------------
-- Run this in the Supabase SQL editor AFTER schema.sql.
-- Enforces room-code isolation: every request only touches rows/objects
-- whose code matches the caller's x-room-code request header.
--
-- Related docs: docs/30-data-and-api/security-rls.md     (Layer 3)
--               docs/10-subsystems/auth-room-code.md      (Layer 1)
-- ---------------------------------------------------------------------------

-- Helper: extract the room code from the request header (set by the JS client).
-- Returns null if the header is missing or empty → all policies fail → no rows.
create or replace function public.request_room_code() returns text
language sql stable as $$
  select nullif(current_setting('request.headers', true)::json ->> 'x-room-code', '')
$$;

-- ---------------------------------------------------------------------------
-- Table policies: items
-- ---------------------------------------------------------------------------
alter table public.items enable row level security;

-- Read only rows for the caller's code.
create policy items_select on public.items
  for select using ( code = public.request_room_code() );

-- Insert only rows tagged with the caller's code.
create policy items_insert on public.items
  for insert with check ( code = public.request_room_code() );

-- Update only your own code's rows.
create policy items_update on public.items
  for update using  ( code = public.request_room_code() )
             with check ( code = public.request_room_code() );

-- Delete only your own code's rows.
create policy items_delete on public.items
  for delete using ( code = public.request_room_code() );

-- ---------------------------------------------------------------------------
-- Storage policies: penelope-files bucket
-- Confine access to the caller's folder (first path segment = room code).
-- ---------------------------------------------------------------------------

-- Read
create policy penelope_read on storage.objects
  for select using (
    bucket_id = 'penelope-files'
    and (storage.foldername(name))[1] = public.request_room_code()
  );

-- Write
create policy penelope_write on storage.objects
  for insert with check (
    bucket_id = 'penelope-files'
    and (storage.foldername(name))[1] = public.request_room_code()
  );

-- Delete
create policy penelope_delete on storage.objects
  for delete using (
    bucket_id = 'penelope-files'
    and (storage.foldername(name))[1] = public.request_room_code()
  );
