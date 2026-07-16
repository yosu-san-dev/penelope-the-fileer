/**
 * supabase-config.js  —  PUBLIC client configuration
 * ---------------------------------------------------------------------------
 * ⚠  Replace SUPABASE_URL and SUPABASE_ANON_KEY with your real project values.
 *    These are the PUBLIC anon credentials — safe to ship in static files.
 *
 *   ⚠  NEVER put the Supabase service-role key here.
 */

export const SUPABASE_URL = "https://dqxkevhztfhndolzulhd.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxeGtldmh6dGZobmRvbHp1bGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMTUzNDQsImV4cCI6MjA5OTc5MTM0NH0._sTtzqDNPVf-x_-7LtsqrCKWhOeykZnwvZOI8FFvCzg";
export const STORAGE_BUCKET = "penelope-files";

export const MAX_FILE_BYTES = 25 * 1024 * 1024;          // 25 MiB
export const SIGNED_URL_TTL = 86400;                     // 24 h in seconds
export const LS_CODE_KEY = "penelope.roomCode";        // localStorage key
export const ITEM_TTL_HOURS = 24;                         // matches DB default
