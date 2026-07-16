---
layer: 1
status: 🟢 done
related:
  - "[data-layer-supabase](data-layer-supabase.md)"
  - "[storage-layout](../30-data-and-api/storage-layout.md)"
  - "[uploader](../20-components/uploader.md)"
  - "[client-sdk-contracts](../30-data-and-api/client-sdk-contracts.md)"
---

# Subsystem — Storage Layer (Supabase Storage)

Owns the **file bytes**. It uploads a file, hands back the metadata that `db.js` stores as a row, and
deletes objects when items expire or are removed. Implemented in `src/js/storage.js` (the **Upload
service**). Exact layout & limits: [storage-layout](../30-data-and-api/storage-layout.md).

---

## Responsibilities

1. **Upload** raw bytes to the bucket, under the room code's folder.
2. Produce the **metadata** (`file_url`, `file_name`, `file_size`, `mime_type`, storage `path`) for
   `db.js` to insert as a `type:'file'` row.
3. **Issue a download URL** (signed, time‑limited) for a stored object.
4. **Delete** an object (used by manual delete, the client sweep, and the scheduled purge).

## Canonical rules

| Property | Decision |
|---|---|
| Bucket | `penelope-files` (**private**) |
| Object path | `<roomCode>/<itemId>-<originalName>` |
| Download URLs | **signed URLs**, TTL **24 h** (matches item lifetime) |
| Max file size | **25 MB** per file (configurable; well under free‑tier limits) |
| Allowed types | any; `mime_type` is stored for display/icon, not restricted |
| Two‑part rule | bytes + row are created together and deleted together |

> **Why private + signed URLs?** Keeps files from being world‑readable by guessing paths, while the
> 24 h signed‑URL TTL lines up exactly with the item's life. See
> [storage-layout](../30-data-and-api/storage-layout.md) for the trade‑off vs a public bucket.

## Upload sequence

See [primary-flows › Flow 2](../00-overview/primary-flows.md#flow-2--upload-a-file). In short:
`uploadFile(file)` → put bytes at `<code>/<id>-<name>` → build metadata → `db.createFileItem(meta)` →
realtime makes the file appear in the list.

## Delete semantics (shared path)

Deleting a file item must remove **both** parts:

```
deleteFileItem(item):
    storage.deleteObject(item.path)   # bytes
    db.deleteRow(item.id)             # metadata
```

If the object delete fails but the row delete succeeds (or vice‑versa), see
[error-handling](../40-cross-cutting/error-handling.md#partial-file-delete) for the reconciliation
rule (the scheduled purge is the safety net that eventually removes orphans).

## Boundaries & invariants

- `storage.js` is the **only** module that talks to Supabase Storage.
- It does **not** insert/read the metadata row itself — it returns metadata to `db.js`.
- Object paths are **always** under the caller's room‑code folder; Storage RLS enforces this
  ([security-rls](../30-data-and-api/security-rls.md#storage-policies)).

## Maps to code

- `src/js/storage.js` → `uploadFile`, `deleteObject`, `getDownloadUrl`.
