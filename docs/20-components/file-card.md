---
layer: 2
status: 🟢 done
related:
  - "[item-list](item-list.md)"
  - "[storage-layer](../10-subsystems/storage-layer.md)"
  - "[countdown](countdown.md)"
---

# Component — File Card

Represents one **file item** (`type: 'file'`). Fixes a first‑build bug: uploaded files must **appear**
in the list, in the **same card format** as notes (title, size, type).

## Inputs
- `item: Item` where `type === 'file'` — uses `title` (= `file_name`), `file_name`, `file_size`,
  `mime_type`, `file_url`/`path`, `created_at`, `expires_at`, `id`.

## Structure
| Part | Content |
|---|---|
| Icon | derived from `mime_type` (generic file icon in v1) |
| Title | `item.file_name` (truncated one line) |
| Meta | type badge (short `mime_type` / extension), human size (`file_size`), created time, [countdown](countdown.md) |
| Actions | **Download**, **Delete** |

## States
- Normal · hover · downloading · deleting · **expiring**.

## Interactions
| Action | Effect |
|---|---|
| **Download** | Fetches a fresh signed URL via `storage.getDownloadUrl(path)` (TTL 24 h) and triggers the download. |
| **Delete** | Shared "delete object + delete row" path (`storage.deleteObject` + `db.deleteItem`). |

## Notes
- Human size formatting (B/KB/MB) is a small UI helper.
- No inline preview of the file bytes in v1 (icon + metadata only).

## Maps to code
`src/js/ui-render.js` → `renderCard(item)` (file branch); uses `src/js/storage.js`.
