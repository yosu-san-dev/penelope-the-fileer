/**
 * purge-expired/index.ts  —  Scheduled purge Edge Function
 * ---------------------------------------------------------------------------
 * The server-side half of the hybrid auto-delete. Runs on Supabase's Deno
 * runtime, triggered on a schedule by pg_cron. On each run it:
 *   1. selects every item where expires_at < now()
 *   2. deletes each expired object from Storage
 *   3. deletes the expired rows from Postgres
 *
 * Uses the SERVICE-ROLE key (bypasses RLS) — never reaches the browser.
 * Guarded by a shared secret so the public URL can't be triggered by anyone.
 *
 * Deploy:
 *   supabase functions deploy purge-expired --no-verify-jwt
 *   supabase secrets set PURGE_SECRET=<random-long-string>
 *
 * Schedule (run in SQL editor):
 *   create extension if not exists pg_cron;
 *   create extension if not exists pg_net;
 *   select cron.schedule('penelope-purge-hourly', '0 * * * *', $$
 *     select net.http_post(
 *       url     := 'https://<PROJECT-REF>.functions.supabase.co/purge-expired',
 *       headers := jsonb_build_object(
 *         'Content-Type','application/json',
 *         'x-purge-secret', '<PURGE_SECRET>'
 *       )
 *     );
 *   $$);
 *
 * Related docs: docs/30-data-and-api/edge-function-purge.md  (Layer 3)
 *               docs/10-subsystems/expiration-and-cleanup.md  (Layer 1)
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request): Promise<Response> => {
  // Simple shared-secret guard so only cron can call it
  const secret = req.headers.get("x-purge-secret");
  const expected = Deno.env.get("PURGE_SECRET");

  if (!expected || secret !== expected) {
    return new Response("forbidden", { status: 403 });
  }

  // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected into Edge Functions.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const nowIso = new Date().toISOString();

  // 1) Find all expired items across all codes
  const { data: expired, error } = await supabase
    .from("items")
    .select("id, type, path")
    .lte("expires_at", nowIso);

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 });
  }

  const items = expired ?? [];

  // 2) Delete file objects from Storage
  const paths = items
    .filter((i: { type: string; path?: string }) => i.type === "file" && i.path)
    .map((i: { path: string }) => i.path);

  if (paths.length) {
    await supabase.storage.from("penelope-files").remove(paths);
  }

  // 3) Delete expired rows from Postgres
  const ids = items.map((i: { id: string }) => i.id);
  if (ids.length) {
    await supabase.from("items").delete().in("id", ids);
  }

  return new Response(JSON.stringify({ purged: ids.length }), { status: 200 });
});
