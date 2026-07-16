---
layer: 4
status: 🟢 done
related:
  - "[security-rls](../30-data-and-api/security-rls.md)"
  - "[edge-function-purge](../30-data-and-api/edge-function-purge.md)"
  - "[deployment-github-pages](deployment-github-pages.md)"
---

# Cross-cutting — Config & Environment

Where every value lives, and the strict line between **public** (safe in static files) and **secret**
(server‑side only).

---

## Frontend config (public)

Copy `src/config/supabase-config.example.js` → `src/config/supabase-config.js` and fill in:

```js
export const SUPABASE_URL      = "https://<PROJECT-REF>.supabase.co";
export const SUPABASE_ANON_KEY = "<public-anon-key>";
export const STORAGE_BUCKET    = "penelope-files";
```

Derived constants (can live in the same file or a `constants.js`):

| Constant | Value |
|---|---|
| `MAX_FILE_BYTES` | `25 * 1024 * 1024` |
| `SIGNED_URL_TTL` | `86400` (24 h, seconds) |
| `LS_CODE_KEY` | `"penelope.roomCode"` |
| `ITEM_TTL_HOURS` | `24` (matches the DB default) |

- `SUPABASE_ANON_KEY` is **public by design** — RLS + the room‑code header do the protecting
  ([security-rls](../30-data-and-api/security-rls.md)).
- `.gitignore` the **real** `supabase-config.js`; commit only the `.example.js`. (For a private repo
  you may commit the real one — your call.)

## Server‑side secrets (never in the browser)

Set on the Edge Function only ([edge-function-purge](../30-data-and-api/edge-function-purge.md)):

| Secret | Where | Purpose |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | auto‑injected into Edge Functions | purge bypasses RLS |
| `SUPABASE_URL` | auto‑injected | — |
| `PURGE_SECRET` | `supabase secrets set PURGE_SECRET=…` | guards the function URL; also used in the cron header |

> **Rule:** the service‑role key and `PURGE_SECRET` must **never** appear in `src/`, in the repo, or in
> any client bundle.

## One‑time backend setup (SQL/CLI)

Run these once when creating the Supabase project (full walkthrough in
[deployment-github-pages](deployment-github-pages.md)):

1. `supabase/schema.sql` — create `items` + indexes + realtime publication.
2. `supabase/policies.sql` — enable RLS + the header‑scoped policies + storage bucket & policies.
3. Deploy `purge-expired` and set `PURGE_SECRET`.
4. Schedule the `pg_cron` job.
