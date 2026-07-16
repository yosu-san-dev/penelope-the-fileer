---
layer: 2
status: 🟢 done
related:
  - "[auth-room-code](../10-subsystems/auth-room-code.md)"
---

# Component — Room-Code Widget

Shows the current [room code](../10-subsystems/auth-room-code.md) and lets the user **copy** it or
**change** it (to link another device). Lives in the header.

## Structure
| Part | Content |
|---|---|
| Display | the current 8‑char code |
| **Copy** | copies the code to the clipboard |
| **Edit** | reveals an input to type a new code |
| Save/Cancel | confirm or discard the edit |

## Interactions
| Action | Effect |
|---|---|
| **Copy** | Clipboard write; brief "copied" confirmation. |
| **Edit → Save** | Validate `^[A-Z0-9]{8}$` (after trim + uppercase). On valid: `auth.setRoomCode(code)` → re‑scope client, resubscribe, reload list. On invalid: inline error, keep old code. |
| **Cancel** | Close the editor unchanged. |

## States
- Display · editing · invalid (error shown) · saving/re‑scoping.

## Notes
- Changing the code switches to a **different isolated stream** — the item list reloads for the new
  code (this is the "link a device" mechanism, [Flow 3](../00-overview/primary-flows.md#flow-3--link-a-second-device)).

## Maps to code
Markup in `src/index.html`; `src/js/auth.js` → `getRoomCode` / `setRoomCode`; triggers reload in
`src/js/main.js`.
