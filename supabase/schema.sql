-- schema.sql  —  Database schema for Penelope The Fileer
-- ---------------------------------------------------------------------------
-- Run this in the Supabase SQL editor to create the items table, indexes,
-- enable realtime, and create the private storage bucket.
--
-- Related docs: docs/30-data-and-api/db-schema.md       (Layer 3)
--               docs/30-data-and-api/storage-layout.md   (Layer 3)
-- ---------------------------------------------------------------------------

-- Requires pgcrypto for gen_random_uuid() (enabled by default on Supabase).
create table if not exists public.items (
  id          uuid        primary key default gen_random_uuid(),
  code        text        not null check (code ~ '^[A-Z0-9]{8}$'),   -- room code (scopes the row)
  type        text        not null check (type in ('text','file')),

  title       text        not null default '',                       -- shown on the card

  -- text notes:
  content     text,                                                  -- note body (type = 'text')

  -- file items:
  path        text,                                                  -- storage object path <code>/<id>-<name>
  file_url    text,                                                  -- optional cached signed URL (24h)
  file_name   text,
  file_size   bigint,                                                -- bytes
  mime_type   text,

  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '24 hours'),

  -- shape guarantees per type:
  constraint items_text_shape check (type <> 'text' or content is not null),
  constraint items_file_shape check (type <> 'file' or (path is not null and file_name is not null))
);

-- Indexes for common query patterns
create index if not exists items_code_idx          on public.items (code);
create index if not exists items_expires_idx       on public.items (expires_at);
create index if not exists items_code_created_idx  on public.items (code, created_at desc);

-- Enable realtime subscriptions on the items table
alter publication supabase_realtime add table public.items;

-- ---------------------------------------------------------------------------
-- Storage bucket: private, 25 MiB per-file limit
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('penelope-files', 'penelope-files', false, 26214400)   -- 25 MiB
on conflict (id) do nothing;
