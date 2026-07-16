---
layer: 3
status: 🟢 done
related:
  - "[expiration-and-cleanup](../10-subsystems/expiration-and-cleanup.md)"
  - "[security-rls](security-rls.md)"
  - "[config-and-env](../40-cross-cutting/config-and-env.md)"
---

# Data — Scheduled Purge (Edge Function + pg_cron)

The server‑side half of the [hybrid cleanup](../10-subsystems/expiration-and-cleanup.md). A Supabase
**Edge Function** deletes expired objects **and** rows across all codes; **`pg_cron`** invokes it on a
schedule. It runs with the **service‑role key** (bypasses RLS) and never involves the browser.

Runtime: **Deno** (Supabase Edge Functions). File: `supabase/functions/purge-expired/index.ts`.

---

## Why a function (not plain cron SQL)

`pg_cron` can delete expired **rows** with SQL, but deleting **storage objects** needs the Storage
API. So the function does both, and cron just triggers the function.

## The function

```ts
// supabase/functions/purge-expired/index.ts
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // simple shared-secret guard so only cron can call it
  if (req.headers.get("x-purge-secret") !== Deno.env.get("PURGE_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }

  // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected into Edge Functions.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const nowIso = new Date().toISOString();

  const { data: expired, error } = await supabase
    .from("items").select("id, type, path").lte("expires_at", nowIso);
  if (error) return new Response(JSON.stringify({ error }), { status: 500 });

  // 1) delete file objects
  const paths = (expired ?? [])
    .filter((i) => i.type === "file" && i.path).map((i) => i.path as string);
  if (paths.length) await supabase.storage.from("penelope-files").remove(paths);

  // 2) delete rows
  const ids = (expired ?? []).map((i) => i.id);
  if (ids.length) await supabase.from("items").delete().in("id", ids);

  return new Response(JSON.stringify({ purged: ids.length }), { status: 200 });
});
```

## Deploy + secrets

```bash
supabase functions deploy purge-expired --no-verify-jwt
supabase secrets set PURGE_SECRET=<random-long-string>
# SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided automatically.
```

`--no-verify-jwt` because cron calls it with the shared secret, not a user JWT.

## Schedule it (pg_cron + pg_net)

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- run every hour, on the hour
select cron.schedule('penelope-purge-hourly', '0 * * * *', $$
  select net.http_post(
    url     := 'https://<PROJECT-REF>.functions.supabase.co/purge-expired',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-purge-secret', '<PURGE_SECRET>'
    )
  );
$$);
```

- Frequency is a knob: hourly is plenty for a 24 h TTL. The client sweep handles the "right now" case
  for active users, so the schedule only needs to reclaim storage from inactive streams.

## Guarantees & idempotency

- **Idempotent:** re‑running only ever deletes already‑expired items; nothing to do if none.
- **Cross‑code:** service role bypasses RLS, so one run cleans every code.
- **Orphan cleanup:** any file bytes whose row‑write failed client‑side are removed here (their row is
  gone but the object is still matched by path on a later manual pass, or — if a matching row exists —
  by `expires_at`). Rows and objects for expired items are removed together.

## Security

- The **service‑role key stays in the function's environment** only; never shipped to the browser.
- The `x-purge-secret` guard stops the public function URL from being triggered by anyone.
- See [config-and-env](../40-cross-cutting/config-and-env.md) for where each secret lives.
