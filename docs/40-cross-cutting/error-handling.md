---
layer: 4
status: 🟢 done
related:
  - "[client-sdk-contracts](../30-data-and-api/client-sdk-contracts.md)"
  - "[storage-layer](../10-subsystems/storage-layer.md)"
  - "[state-model](state-model.md)"
---

# Cross-cutting — Error Handling

How failures behave. The rule: **services throw, the UI catches and shows a toast**, and nothing is
left in a half‑broken state the user can't recover from.

---

## Failure matrix

| Situation | Behaviour |
|---|---|
| **Network down / Supabase unreachable** | Operation throws; toast "Couldn't reach the server — try again." Composer keeps the typed text; uploader keeps the file. |
| **Invalid room code** (`INVALID_CODE`) | Inline error on the room‑code widget; the old code stays active. |
| **File too large** (`FILE_TOO_LARGE`) | Rejected **before** upload; toast with the 25 MB limit. |
| **Upload fails mid‑way** | No metadata row is written (row is created only after bytes land) → **no orphan row**. Toast; user can retry. |
| **Row insert fails after upload** | Bytes exist without a row (rare). The [scheduled purge](../30-data-and-api/edge-function-purge.md) reclaims them; user simply retries. |
| **Realtime disconnect** | UI keeps showing the last set; on reconnect the subscription re‑fires `listItems`. A manual refresh also re‑fetches. |
| **Delete fails** | Toast; item stays; user can retry. See partial‑delete rule below. |
| **`localStorage` unavailable** | Fall back to an in‑memory code; warn it won't persist ([auth](../10-subsystems/auth-room-code.md)). |
| **Signed‑URL creation fails** | Download toast "Link expired — try again"; regenerate on retry. |

## Partial file delete {#partial-file-delete}

Deleting a file item is two steps (object, then row). Ordering and recovery:

1. `storage.deleteObject(path)` **first**, then `db.deleteItem(id)`.
2. If the **object** delete fails → **abort**, keep the row, toast. (No orphan row pointing at nothing.)
3. If the object succeeded but the **row** delete fails → the card reappears on next render; retrying
   deletes the (already‑gone) object harmlessly and removes the row. The scheduled purge is the final
   safety net.

## Principles

- **Optimism with confirmation:** the UI may optimistically remove a deleted card, but realtime /
  next `listItems` is the source of truth — a failed delete brings the card back.
- **No silent data loss:** never clear the composer/uploader input until the create **succeeds**.
- **Expired ≠ error:** items past `expires_at` are simply hidden; that's normal, not a failure.
