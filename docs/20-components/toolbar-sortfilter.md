---
layer: 2
status: 🟢 done
related:
  - "[ui-shell-and-views](../10-subsystems/ui-shell-and-views.md)"
  - "[view-toggle](view-toggle.md)"
---

# Component — Toolbar (Sort & Filter)

Controls that reorder and filter the visible items **client‑side** (no re‑query). Lives in the toolbar
region beside the [view toggle](view-toggle.md).

## Controls & options
| Control | Options | Default |
|---|---|---|
| **Sort by** | date created · type · size | date created |
| **Direction** | ascending · descending | descending |
| **Filter type** | all · text · file | all |

## Behaviour
- Emits the current `{ sortBy, direction, typeFilter }` selection.
- `sortfilter.applySortFilter(items, selection)` produces the ordered/filtered set, which
  `ui-render` paints.
- Size sort: file items sort by `file_size`; notes count as size 0 (or by content length — pick
  `file_size ?? content.length`, documented so it's deterministic).

## State
- The selection is **presentation state** (see [state-model](../40-cross-cutting/state-model.md));
  optionally remembered in `localStorage` for convenience.

## Maps to code
Markup in `src/index.html`; logic in `src/js/sortfilter.js` → `applySortFilter`.
