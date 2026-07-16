/**
 * storage.js  —  Domain layer: the Upload / file-storage service
 * ---------------------------------------------------------------------------
 * Moves file BYTES to/from Supabase Storage. Objects live under the room code
 * folder: <bucket>/<code>/<id>-<sanitised-name>.
 *
 * Exports:
 *   - uploadFile(file)         -> Item (bytes + metadata row created)
 *   - deleteObject(path)       -> remove stored bytes
 *   - getDownloadUrl(path)     -> signed URL (24 h TTL)
 *
 * Related docs: docs/10-subsystems/storage-layer.md           (Layer 1)
 *               docs/30-data-and-api/storage-layout.md         (Layer 3)
 *               docs/30-data-and-api/client-sdk-contracts.md   (Layer 3)
 */

import { getClient } from "./supabase-init.js";
import { getRoomCode } from "./auth.js";
import { createFileItem } from "./db.js";
import { STORAGE_BUCKET, MAX_FILE_BYTES, SIGNED_URL_TTL } from "../config/supabase-config.js";

/**
 * Sanitise a file name for use in storage paths.
 * Strips path separators, keeps only safe characters + extension.
 * @param {string} name
 * @returns {string}
 */
function sanitiseFileName(name) {
  // Strip any path traversal sequences and directory separators
  return name
    .replace(/\.\.\//g, "")    // strip ../
    .replace(/\.\.\\/g, "")    // strip ..\
    .replace(/[/\\]/g, "")     // strip path separators
    .replace(/[^\w.\- ]/g, "_") // keep word chars, dots, hyphens, spaces
    .trim() || "file";
}

/**
 * Upload a file to Supabase Storage and create the metadata row.
 * Bytes land FIRST; the row is only written after a successful upload
 * (so a failed upload never leaves an orphan row).
 *
 * @param {File} file — browser File object
 * @returns {Promise<object>} the new Item row
 * @throws {Error} FILE_TOO_LARGE if file exceeds MAX_FILE_BYTES
 */
export async function uploadFile(file) {
  // 1. Guard: file size
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const code = getRoomCode();
  const id = crypto.randomUUID();
  const safeName = sanitiseFileName(file.name);
  const path = code + "/" + id + "-" + safeName;

  // 2. Upload bytes to Storage
  const { error: uploadError } = await getClient()
    .storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: file.type });

  if (uploadError) throw new Error(uploadError.message);

  // 3. Build metadata and create the row via db.js
  const meta = {
    title: file.name,
    path,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
  };

  return createFileItem(meta);
}

/**
 * Get a signed download URL for a stored object (24 h TTL).
 * @param {string} path — storage object path
 * @returns {Promise<string>} signed URL
 */
export async function getDownloadUrl(path) {
  const { data, error } = await getClient()
    .storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);

  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/**
 * Delete a storage object.
 * @param {string} path — storage object path
 */
export async function deleteObject(path) {
  const { error } = await getClient()
    .storage
    .from(STORAGE_BUCKET)
    .remove([path]);

  if (error) throw new Error(error.message);
}
