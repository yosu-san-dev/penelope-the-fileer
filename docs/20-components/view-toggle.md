---
layer: 2
status: 🟢 done
related:
  - "[item-list](item-list.md)"
  - "[ui-shell-and-views](../10-subsystems/ui-shell-and-views.md)"
---

# Component — View Toggle

Switches the [item list](item-list.md) between **List** and **Grid**.

## Structure
- A two‑option toggle (list icon / grid icon), showing the active mode.

## Behaviour
| Action | Effect |
|---|---|
| Select **List** | `ui-render.setViewMode('list')` → vertical stack. |
| Select **Grid** | `ui-render.setViewMode('grid')` → responsive grid, max 5/row. |

## State
- `viewMode` is presentation state (see [state-model](../40-cross-cutting/state-model.md)); may be
  persisted to `localStorage` so the user's preference survives reloads.

## Maps to code
Markup in `src/index.html`; `src/js/ui-render.js` → `setViewMode`.
