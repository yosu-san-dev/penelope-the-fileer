---
layer: 1
status: 🟢 done
related:
  - "[architecture](../00-overview/architecture.md)"
  - "[item-list](../20-components/item-list.md)"
  - "[toolbar-sortfilter](../20-components/toolbar-sortfilter.md)"
  - "[view-toggle](../20-components/view-toggle.md)"
---

# Subsystem — UI Shell & Views

The presentation subsystem: the page skeleton, the two view modes (list / grid), and the toolbar that
sorts and filters. It renders whatever the domain layer provides and **owns no data truth**.

> **Design is deferred.** This doc specifies **structure and behaviour** only — regions, layout rules,
> and interactions. Colours, spacing, and typography come later with the supplied design. `styles.css`
> stays a placeholder until then.

Implemented across `src/index.html`, `src/js/ui-render.js`, `src/css/styles.css`. Per‑piece detail is
in Layer 2 ([components](../20-components/)).

---

## Page regions (top to bottom)

| Region | Contents | Component |
|---|---|---|
| **Header** | App name + [room‑code widget](../20-components/room-code-widget.md) | room-code-widget |
| **Composer** | Text area + **Share**, and the file drop/picker | [composer](../20-components/composer.md), [uploader](../20-components/uploader.md) |
| **Toolbar** | View toggle (list/grid) + sort & filter controls | [view-toggle](../20-components/view-toggle.md), [toolbar-sortfilter](../20-components/toolbar-sortfilter.md) |
| **Items** | The list or grid of item cards | [item-list](../20-components/item-list.md), [note-card](../20-components/note-card.md), [file-card](../20-components/file-card.md) |
| **Editor panel** | Slide‑over / modal to view & edit a note | [editor-panel](../20-components/editor-panel.md) |

## View modes

| Mode | Rule |
|---|---|
| **List** | A vertical stack of full‑width item cards. |
| **Grid** | Responsive grid, **max 5 cards per row** on large desktop, scaling down: e.g. 5 → 4 → 3 → 2 → 1 as width shrinks (breakpoints finalised with the design). |

- The active mode is **client‑only UI state** (see [state-model](../40-cross-cutting/state-model.md));
  it may be remembered in `localStorage` as a convenience but is **not** part of the data model.
- Cards render identically for notes and files except for their body area (see the card components).

## Sort & filter (client‑side)

Operates over the already‑fetched item set (no re‑query):

| Control | Options |
|---|---|
| **Sort by** | date created · type · size |
| **Direction** | ascending · descending (default **desc** by date) |
| **Filter by type** | all · text · file |

Logic lives in `src/js/sortfilter.js` (`applySortFilter`), consumed by `ui-render.js`.

## Rendering contract

- `ui-render.renderItems(items, viewMode)` paints the current set.
- The item set always arrives **pre‑sorted/filtered** and **already excludes expired** items.
- Each card mounts a **countdown** ([countdown](../20-components/countdown.md)) driven by a single
  1‑second ticker.
- Re‑render is triggered by: realtime change events, sort/filter/view changes, and the per‑second
  tick removing a just‑expired card.

## Boundaries & invariants

- The UI **never** calls Supabase directly — only the domain services.
- The UI holds only **presentation state** (view mode, current sort/filter, open panel).
- Empty state, loading state, and error toasts are UI concerns
  ([error-handling](../40-cross-cutting/error-handling.md)).
