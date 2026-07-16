---
layer: 2
status: 🟢 done
related:
  - "[storage-layer](../10-subsystems/storage-layer.md)"
  - "[storage-layout](../30-data-and-api/storage-layout.md)"
---

# Component — Uploader

Drag‑and‑drop zone **and** file picker for creating **file items**.

## Structure
| Part | Content |
|---|---|
| Drop zone | full area accepting drops; highlights on drag‑over |
| Picker | "Choose file" button → native file input |
| Progress | per‑file progress / spinner while uploading |

## Interactions
| Action | Effect |
|---|---|
| Drop / choose file(s) | For each file: `storage.uploadFile(file)` → `db.createFileItem(meta)`. Realtime adds the [file card](file-card.md). |
| Oversized file (> 25 MB) | Reject with an inline message before upload (see [storage-layer](../10-subsystems/storage-layer.md)). |
| Upload error | Inline error; no orphan row is created (row is only written **after** bytes land). |

## States
- Idle · drag‑over (highlight) · uploading (progress) · error.

## Notes
- Multiple files: upload sequentially or in parallel; each becomes its own item.
- Title of a file item defaults to the original file name.

## Maps to code
Markup in `src/index.html`; wiring in `src/js/main.js`; upload in `src/js/storage.js` → `uploadFile`.
