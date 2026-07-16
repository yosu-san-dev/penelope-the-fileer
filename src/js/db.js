/**
 * db.js  —  Domain layer: the Items service (notes + file metadata)
 * ---------------------------------------------------------------------------
 * All reads/writes of `items` rows in Postgres, always scoped to the current
 * room code. The item list is ALWAYS database-driven (never from localStorage).
 *
 * Exports:
 *   - shareText(title, body)       -> create a note row
 *   - createFileItem(meta)         -> create a file row (after upload)
 *   - listItems()                  -> current, non-expired items
 *   - subscribeItems(onChange)     -> realtime; returns unsubscribe fn
 *   - updateNote(id, patch)        -> edit title/content (no expiry reset)
 *   - deleteItem(id)               -> delete row (+ file bytes if applicable)
 *   - listExpired()                -> for client sweep
 *
 * Related docs: docs/10-subsystems/data-layer-supabase.md     (Layer 1)
 *               docs/30-data-and-api/db-schema.md              (Layer 3)
 *               docs/30-data-and-api/client-sdk-contracts.md   (Layer 3)
 */

import { getClient } from "./supabase-init.js";
import { getRoomCode } from "./auth.js";
import { deleteObject } from "./storage.js";

/**
 * Derive a short title from body text when the user leaves it blank.
 * @param {string} body
 * @param {number} [max=60]
 * @returns {string}
 */
function firstLine(body, max = 60) {
  const line = (body || "").split("\n")[0].trim();
  return line.length > max ? line.slice(0, max) + "…" : line;
}

/**
 * Create a text note.
 * @param {string} title
 * @param {string} body
 * @returns {Promise<object>} the new item row
 */
export async function shareText(title, body) {
  const code = getRoomCode();
  const finalTitle = (title || "").trim() || firstLine(body);
  const { data, error } = await getClient()
    .from("items")
    .insert({ code, type: "text", title: finalTitle, content: body })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Create a file-item metadata row (call AFTER bytes are uploaded).
 * @param {{ title: string, path: string, file_name: string, file_size: number, mime_type: string, file_url?: string }} meta
 * @returns {Promise<object>}
 */
export async function createFileItem(meta) {
  const code = getRoomCode();
  const { data, error } = await getClient()
    .from("items")
    .insert({ code, type: "file", ...meta })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Fetch current (non-expired) items for the room code, newest first.
 * @returns {Promise<object[]>}
 */
export async function listItems() {
  const code = getRoomCode();
  const { data, error } = await getClient()
    .from("items")
    .select("*")
    .eq("code", code)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Subscribe to realtime changes for the current code.
 * On any insert/update/delete, re-fetches the full list and calls onChange.
 * @param {(items: object[]) => void} onChange
 * @returns {() => void} unsubscribe function
 */
export function subscribeItems(onChange) {
  const code = getRoomCode();
  const client = getClient();
  const channel = client
    .channel("items-" + code)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "items",
        filter: "code=eq." + code,
      },
      async () => {
        const items = await listItems();
        onChange(items);
      }
    )
    .subscribe();

  // Return an unsubscribe function
  return () => {
    client.removeChannel(channel);
  };
}

/**
 * Update a note's title and/or content. Does NOT reset expires_at.
 * @param {string} id
 * @param {{ title?: string, content?: string }} patch
 * @returns {Promise<object>}
 */
export async function updateNote(id, patch) {
  const { data, error } = await getClient()
    .from("items")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Delete an item. If it's a file, delete the storage object first.
 * @param {string} id
 * @param {object} [item] — optional item object (to know if it's a file)
 */
export async function deleteItem(id, item) {
  // If we have item info and it's a file, delete the storage object first
  if (item && item.type === "file" && item.path) {
    await deleteObject(item.path);
  }

  const { error } = await getClient()
    .from("items")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/**
 * List expired items for the client-side sweep.
 * @returns {Promise<Array<{id: string, type: string, path?: string}>>}
 */
export async function listExpired() {
  const { data, error } = await getClient()
    .from("items")
    .select("id, type, path")
    .lte("expires_at", new Date().toISOString());

  if (error) throw new Error(error.message);
  return data || [];
}
