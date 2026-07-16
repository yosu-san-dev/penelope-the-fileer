---
layer: 2
status: 🟢 done
related:
  - "[item-list](item-list.md)"
  - "[editor-panel](editor-panel.md)"
  - "[countdown](countdown.md)"
---

# Component — Note Card

Represents one **text item** (`type: 'text'`) in the list/grid. Fixes a first‑build bug: a long note
must **not** fill the screen — the card shows a **title + metadata + a short preview**, and the full
body opens in the [editor panel](editor-panel.md).

## Inputs
- `item: Item` where `type === 'text'` — uses `title`, `content` (for preview), `created_at`,
  `expires_at`, `id`.

## Structure
| Part | Content |
|---|---|
| Title | `item.title` (bold, truncated to one line) |
| Preview | first ~1–2 lines of `item.content`, clamped |
| Meta | type badge ("Text"), created time, [countdown](countdown.md) |
| Actions | **Open/Edit**, **Copy**, **Delete** |

## States
- Normal · hover (affordance) · deleting (optimistic removal) · **expiring** (removed by ticker).

## Interactions
| Action | Effect |
|---|---|
| Click card / **Open** | Opens [editor-panel](editor-panel.md) with the full body (view + edit). |
| **Copy** | Copies `item.content` to the clipboard. |
| **Delete** | Calls `db.deleteItem(id)`; card removed on success (realtime confirms). |

## Notes
- Title source: user‑provided in the [composer](composer.md); if blank, derive from the first line of
  the body (trimmed, ~60 chars). Rule finalised here so build is unambiguous.

## Maps to code
`src/js/ui-render.js` → `renderCard(item)` (text branch).
