---
layer: 3
status: 🟢 done
related:
  - "[auth-room-code](../10-subsystems/auth-room-code.md)"
  - "[db-schema](db-schema.md)"
  - "[storage-layout](storage-layout.md)"
  - "[config-and-env](../40-cross-cutting/config-and-env.md)"
---

# Data — Security & Row-Level Security

Exactly what the room code protects, and the RLS policies that enforce it.

---

## Threat model (be honest)

- The **anon key is public** (shipped in static files) — that's expected for Supabase.
- The **room code is a bearer secret**: anyone who knows a code can read/write that stream. This is
  **by design** (it's how a second device links). We accept it — the app is for me + a few friends and
  every item self‑deletes in 24 h.
- What we **do** want to prevent: a client **enumerating all data across all codes** in one query.

The mechanism below confines **every** request to a single code, so you can only reach data for a code
you already know — you cannot vacuum up everyone's items.

## How the code reaches the database

The Supabase client is created with the room code as a **request header**, `x-room-code`:

```js
createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { "x-room-code": getRoomCode() } }
});
```

When the code changes, the client is **re‑created** with the new header
([auth-room-code](../10-subsystems/auth-room-code.md)). PostgREST exposes that header to SQL via
`current_setting('request.headers', true)::json ->> 'x-room-code'`.

A small helper keeps policies readable:

```sql
create or replace function public.request_room_code() returns text
language sql stable as $$
  select nullif(current_setting('request.headers', true)::json ->> 'x-room-code','')
$$;
```

## Table policies (`items`)

```sql
alter table public.items enable row level security;

-- Read only rows for the caller's code.
create policy items_select on public.items
  for select using ( code = public.request_room_code() );

-- Insert only rows tagged with the caller's code.
create policy items_insert on public.items
  for insert with check ( code = public.request_room_code() );

-- Update only your own code's rows.
create policy items_update on public.items
  for update using ( code = public.request_room_code() )
             with check ( code = public.request_room_code() );

-- Delete only your own code's rows.
create policy items_delete on public.items
  for delete using ( code = public.request_room_code() );
```

Result: with no `x-room-code` header, `request_room_code()` is `null`, and every policy fails →
**no rows**. With a header, a request only ever touches that one code's rows. The client **also**
filters by `code` explicitly (belt‑and‑braces).

## Storage policies

Objects live under `<roomCode>/…` in the private `penelope-files` bucket. Confine access to the
caller's folder by comparing the first path segment to the header code:

```sql
-- read
create policy penelope_read on storage.objects
  for select using (
    bucket_id = 'penelope-files'
    and (storage.foldername(name))[1] = public.request_room_code()
  );

-- write
create policy penelope_write on storage.objects
  for insert with check (
    bucket_id = 'penelope-files'
    and (storage.foldername(name))[1] = public.request_room_code()
  );

-- delete
create policy penelope_delete on storage.objects
  for delete using (
    bucket_id = 'penelope-files'
    and (storage.foldername(name))[1] = public.request_room_code()
  );
```

## The scheduled purge is exempt

The purge Edge Function runs with the **service‑role key**, which **bypasses RLS**, so it can delete
expired rows/objects across **all** codes. That key lives only in the function's server‑side secrets
and never reaches the browser ([edge-function-purge](edge-function-purge.md),
[config-and-env](../40-cross-cutting/config-and-env.md)).

## Hardening path (optional, later)

If stronger isolation is ever wanted: use **Supabase anonymous auth** to give each device a real JWT
and store a `code` claim, then key policies off the claim instead of a header. Not needed for v1.
