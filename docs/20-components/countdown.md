---
layer: 2
status: 🟢 done
related:
  - "[expiration-and-cleanup](../10-subsystems/expiration-and-cleanup.md)"
---

# Component — Countdown

The per‑second "Expires in: 14h 23m 05s" label on every card, driven by a **single** shared ticker.

## Inputs
- `expiresAt: timestamptz` from the item.

## Behaviour
| Function | Behaviour |
|---|---|
| `startTicker(onTick)` | One `setInterval(…, 1000)` for the whole app; calls `onTick` each second. |
| `formatRemaining(expiresAt)` | Returns `"14h 23m 05s"` (zero‑padded); shows `"<expired>"` / triggers removal at ≤ 0. |
| `isExpired(expiresAt)` | `expiresAt <= now()`. |

## Rules
- **One** interval, not one per card (cheap, avoids drift).
- When a card's `isExpired` flips true, the ticker removes that card immediately; the data is then
  deleted by the sweep/purge ([expiration-and-cleanup](../10-subsystems/expiration-and-cleanup.md)).
- Display granularity: seconds. Under 1 h, show `mm:ss`; otherwise `h m s` (exact format is a UI
  detail, but seconds must tick).

## Maps to code
`src/js/countdown.js` → `startTicker`, `formatRemaining`, `isExpired`; mounted by `src/js/ui-render.js`.
