---
layer: 2
status: 🟢 done
related:
  - "[ui-shell-and-views](../10-subsystems/ui-shell-and-views.md)"
  - "[note-card](note-card.md)"
  - "[file-card](file-card.md)"
---

# Component — Item List

The container that renders the current item set as either a **list** or a **grid** of cards.

## Inputs
- `items: Item[]` — already **sorted/filtered** and **expired‑excluded** by the domain layer.
- `viewMode: 'list' | 'grid'`.

## Structure
- A single container element whose layout class switches between list and grid.
- **Grid rule:** max **5 cards per row** on large desktop, scaling 5→4→3→2→1 as width shrinks.
- One child per item — a [note-card](note-card.md) or [file-card](file-card.md) by `item.type`.

## States
| State | Render |
|---|---|
| Loading (first fetch) | Skeleton / "Loading…" placeholder |
| Empty | Friendly empty message ("Nothing here yet — paste text or drop a file") |
| Populated | The cards |

## Interactions
- No logic of its own beyond choosing card type and layout; delegates card interactions to the cards.
- Re‑renders on: realtime change, sort/filter/view change, and a card expiring via the ticker.

## Maps to code
`src/js/ui-render.js` → `renderItems(items, viewMode)`.
