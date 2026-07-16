---
layer: 2
status: 🟢 done
related:
  - "[note-card](note-card.md)"
  - "[data-layer-supabase](../10-subsystems/data-layer-supabase.md)"
---

# Component — Editor Panel

A slide‑over / modal to **view and edit a note's full content**. Fixes a first‑build gap: clicking a
note must open somewhere to read and change it.

## Inputs
- `item: Item` where `type === 'text'`.

## Structure
| Part | Content |
|---|---|
| Header | editable title + close button + [countdown](countdown.md) |
| Body | large editable text area pre‑filled with `item.content` |
| Footer | **Save**, **Cancel**, **Delete** |

## Interactions
| Action | Effect |
|---|---|
| Open | From a note card click. Loads current title/content. |
| **Save** | `db.updateNote(id, { title, content })`; closes on success. Editing does **not** reset expiry (see [expiration-and-cleanup](../10-subsystems/expiration-and-cleanup.md)). |
| **Cancel** / close / Esc | Discards edits, closes. |
| **Delete** | `db.deleteItem(id)`, closes. |

## States
- Viewing · dirty (unsaved changes) · saving · error.
- Warn on close if there are unsaved changes.

## Notes
- Only text items open the editor; file items have no editable body.

## Maps to code
`src/js/ui-render.js` → `openEditorPanel(item)`; update via `src/js/db.js` → `updateNote`.
