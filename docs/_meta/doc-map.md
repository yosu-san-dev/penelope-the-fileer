---
layer: meta
status: 🟢 done
related:
  - "[conventions](conventions.md)"
---

# Doc Map — Master Index & Status Tracker

The single place to navigate every Penelope document. Status: ⚪ not-started · 🟡 draft · 🟢 done.

> The full app is now specified across Layers 0–4 — enough to write the code in a fresh session from
> the docs alone. Start at Layer 0 for orientation; Layer 3 is the build‑critical detail.

---

## Meta

| Doc | Purpose | Status |
|---|---|---|
| [conventions](conventions.md) | How the docs & diagrams are written | 🟢 |
| [doc-map](doc-map.md) | This index / progress tracker | 🟢 |

## Layer 0 — Overview (`00-overview/`)

| Doc | Purpose | Status |
|---|---|---|
| [README](../00-overview/README.md) | What/why, vision, goals, glossary, stack | 🟢 |
| [system-context](../00-overview/system-context.md) | App as one box + Supabase (diagram) | 🟢 |
| [architecture](../00-overview/architecture.md) | Internal layer/subsystem map (diagram) | 🟢 |
| [primary-flows](../00-overview/primary-flows.md) | 4 end-to-end flows (diagrams) | 🟢 |

## Layer 1 — Subsystems (`10-subsystems/`)

| Doc | Purpose | Status |
|---|---|---|
| [auth-room-code](../10-subsystems/auth-room-code.md) | 8-char room-code identity (diagram) | 🟢 |
| [data-layer-supabase](../10-subsystems/data-layer-supabase.md) | Items in Postgres + realtime (diagram) | 🟢 |
| [storage-layer](../10-subsystems/storage-layer.md) | File bytes in Supabase Storage | 🟢 |
| [ui-shell-and-views](../10-subsystems/ui-shell-and-views.md) | Shell, list/grid, sort/filter | 🟢 |
| [expiration-and-cleanup](../10-subsystems/expiration-and-cleanup.md) | Countdown + hybrid auto-delete | 🟢 |

## Layer 2 — Components (`20-components/`)

| Doc | Purpose | Status |
|---|---|---|
| [item-list](../20-components/item-list.md) | List/grid container | 🟢 |
| [note-card](../20-components/note-card.md) | Text item card | 🟢 |
| [file-card](../20-components/file-card.md) | File item card | 🟢 |
| [composer](../20-components/composer.md) | Create a note | 🟢 |
| [editor-panel](../20-components/editor-panel.md) | View/edit a note | 🟢 |
| [uploader](../20-components/uploader.md) | Drag-drop / picker upload | 🟢 |
| [toolbar-sortfilter](../20-components/toolbar-sortfilter.md) | Sort & filter controls | 🟢 |
| [view-toggle](../20-components/view-toggle.md) | List ↔ grid | 🟢 |
| [room-code-widget](../20-components/room-code-widget.md) | View/edit/link the code | 🟢 |
| [countdown](../20-components/countdown.md) | Per-second expiry timer | 🟢 |

## Layer 3 — Data & API (`30-data-and-api/`)

| Doc | Purpose | Status |
|---|---|---|
| [db-schema](../30-data-and-api/db-schema.md) | `items` table DDL, indexes (diagram) | 🟢 |
| [storage-layout](../30-data-and-api/storage-layout.md) | Bucket + path scheme (diagram) | 🟢 |
| [security-rls](../30-data-and-api/security-rls.md) | Header-scoped RLS policies | 🟢 |
| [client-sdk-contracts](../30-data-and-api/client-sdk-contracts.md) | Every client function ("the API") | 🟢 |
| [edge-function-purge](../30-data-and-api/edge-function-purge.md) | Scheduled purge fn + pg_cron | 🟢 |

## Layer 4 — Cross-cutting (`40-cross-cutting/`)

| Doc | Purpose | Status |
|---|---|---|
| [config-and-env](../40-cross-cutting/config-and-env.md) | Public vs secret config | 🟢 |
| [deployment-github-pages](../40-cross-cutting/deployment-github-pages.md) | Supabase + Pages setup (diagram) | 🟢 |
| [error-handling](../40-cross-cutting/error-handling.md) | Failure behaviour | 🟢 |
| [state-model](../40-cross-cutting/state-model.md) | Client-side state | 🟢 |

---

### Progress

All layers complete. Next step is **implementation** — writing the code in `src/` and `supabase/`
from these docs (the scaffold stubs already point back to the relevant pages).
