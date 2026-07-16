---
layer: 2
status: 🟢 done
related:
  - "[ui-shell-and-views](../10-subsystems/ui-shell-and-views.md)"
  - "[uploader](uploader.md)"
  - "[data-layer-supabase](../10-subsystems/data-layer-supabase.md)"
---

# Component — Composer (create a note)

The prominent input for creating **text items**. Sits in the header/composer region next to the
[uploader](uploader.md).

## Structure
| Part | Content |
|---|---|
| Title field | optional short title input |
| Body area | multi‑line text area (paste text / links) |
| **Share** button | creates the note |

## Interactions
| Action | Effect |
|---|---|
| Click **Share** (or Ctrl/Cmd+Enter) | Calls `db.shareText(title, body)`; on success clears the fields (realtime adds the card). |
| Empty body | **Share** disabled / no‑op. |
| Blank title | Title derived from the first line of the body (~60 chars) — see [note-card](note-card.md). |

## States
- Idle · valid (Share enabled) · submitting · error (inline message, keep the text so nothing is lost).

## Maps to code
Markup in `src/index.html` (composer region); handler wiring in `src/js/main.js`; create via
`src/js/db.js` → `shareText`.
