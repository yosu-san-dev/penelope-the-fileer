---
layer: 1
status: 🟢 done
related:
  - "[primary-flows](../00-overview/primary-flows.md)"
  - "[countdown](../20-components/countdown.md)"
  - "[edge-function-purge](../30-data-and-api/edge-function-purge.md)"
  - "[db-schema](../30-data-and-api/db-schema.md)"
---

# Subsystem — Expiration & Cleanup

Every item lives **24 hours**, then disappears. Three cooperating mechanisms make that true; together
they guarantee an item is **never shown after** expiry and **never lingers long past** it.

---

## The three mechanisms

| # | Mechanism | Where | Job |
|---|---|---|---|
| 1 | **UI hides expired** | `countdown.js` + `db.js` read filter | An item past `expires_at` is never rendered (read query uses `expires_at > now()`, and the ticker removes a card the instant it expires). |
| 2 | **Client‑side sweep** | `main.js` on load → `db.js` | On every app load, delete this code's already‑expired rows + objects. Instant tidy‑up for active users. |
| 3 | **Scheduled purge** | Supabase Edge Function + `pg_cron` | Runs hourly regardless of visits; deletes expired rows + objects for **all** codes. The real guarantee that reclaims storage. |

Detail of #3: [edge-function-purge](../30-data-and-api/edge-function-purge.md). Overview sequence:
[primary-flows › Flow 4](../00-overview/primary-flows.md#flow-4--expiry--cleanup-hybrid).

## Timestamps

- On create, `created_at = now()` and `expires_at = now() + 24h`. The `+24h` default is set by the
  **database** (`default now() + interval '24 hours'`) so it can't be forgotten client‑side. See
  [db-schema](../30-data-and-api/db-schema.md).
- Nothing "renews" an item. Editing a note does **not** reset its expiry (documented so behaviour is
  intentional; can change later if wanted).

## The live countdown

- A **single** 1‑second interval (`countdown.startTicker`) updates every visible card — not one timer
  per card.
- Each card shows `formatRemaining(expires_at)` → e.g. `Expires in: 14h 23m 05s`.
- When `isExpired(expires_at)` flips true, the ticker removes that card immediately (and the next
  sweep/purge removes the data). See [countdown](../20-components/countdown.md).

## Shared delete path

All three mechanisms (plus the manual **Delete** button) funnel through the same operation:

```
purgeItem(item):
    if item.type == 'file': storage.deleteObject(item.path)
    db.deleteRow(item.id)
```

This keeps behaviour identical no matter what triggered the removal.

## Boundaries & invariants

- **Client cleanup only ever touches the current code's** items; the **scheduled purge** is the only
  thing that spans all codes (it runs with the service‑role key server‑side).
- Storage bytes are **always** removed with their row — orphans are only ever temporary and are swept
  by the scheduled purge.
- The service‑role key used by the purge **never** reaches the browser
  ([config-and-env](../40-cross-cutting/config-and-env.md)).
