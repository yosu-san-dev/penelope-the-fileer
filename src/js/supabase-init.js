/**
 * supabase-init.js  —  Data-access layer: the single Supabase client
 * ---------------------------------------------------------------------------
 * Creates and exports ONE configured Supabase JS client (using the public
 * anon key from config). This is the app's only door to the backend.
 *
 * The client is created WITH the room code as a request header 'x-room-code',
 * which Row-Level Security uses to confine every request to one code. When the
 * code changes, the client is re-created (rescope).
 *
 * Exports:
 *   - createClientForCode(code)  -> SupabaseClient
 *   - getClient()                -> current instance
 *   - rescope(code)              -> recreate client with the new code header
 *
 * Related docs: docs/00-overview/architecture.md            (Layer 0)
 *               docs/30-data-and-api/client-sdk-contracts.md (Layer 3)
 *               docs/30-data-and-api/security-rls.md         (Layer 3)
 */

// NOTE(user): Update the Supabase JS CDN version below as needed.
// Using pinned version for reproducibility.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config/supabase-config.js";

/** @type {import("@supabase/supabase-js").SupabaseClient | null} */
let _client = null;

/**
 * Create a new Supabase client scoped to the given room code.
 * The code is sent as an `x-room-code` header on every request so
 * Row-Level Security confines access to that code's data.
 * @param {string} code — 8-char room code
 * @returns {import("@supabase/supabase-js").SupabaseClient}
 */
export function createClientForCode(code) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { "x-room-code": code },
    },
  });
}

/**
 * Return the current client instance.
 * @returns {import("@supabase/supabase-js").SupabaseClient}
 */
export function getClient() {
  if (!_client) {
    throw new Error("Supabase client not initialised — call rescope(code) first.");
  }
  return _client;
}

/**
 * Tear down and recreate the client with a new room code header.
 * Called on init and whenever the user changes their room code.
 * @param {string} code
 */
export function rescope(code) {
  _client = createClientForCode(code);
}
