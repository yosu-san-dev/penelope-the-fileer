/**
 * auth.js  —  Domain layer: the room-code identity service
 * ---------------------------------------------------------------------------
 * Manages the 8-character room code that scopes ALL data. No accounts, no
 * passwords. The code is the only identity.
 *
 * Exports:
 *   - generateRoomCode()  -> string (8 chars [A-Z0-9])
 *   - getRoomCode()       -> string (from localStorage or newly generated)
 *   - setRoomCode(code)   -> void   (validate, persist, rescope)
 *   - isValidCode(code)   -> boolean
 *
 * Related docs: docs/10-subsystems/auth-room-code.md          (Layer 1)
 *               docs/30-data-and-api/security-rls.md           (Layer 3)
 *               docs/30-data-and-api/client-sdk-contracts.md   (Layer 3)
 */

import { rescope } from "./supabase-init.js";
import { LS_CODE_KEY } from "../config/supabase-config.js";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 8;
const CODE_REGEX = /^[A-Z0-9]{8}$/;

// Fallback when localStorage is unavailable
let _memoryCode = null;
let _storageAvailable = true;

// Feature-detect localStorage once on load
try {
  const testKey = "__penelope_ls_test__";
  localStorage.setItem(testKey, "1");
  localStorage.removeItem(testKey);
} catch {
  _storageAvailable = false;
}

/**
 * Generate a cryptographically random 8-char room code from [A-Z0-9].
 * @returns {string}
 */
export function generateRoomCode() {
  const values = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(values);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[values[i] % ALPHABET.length];
  }
  return code;
}

/**
 * Validate a room code string.
 * @param {string} code
 * @returns {boolean}
 */
export function isValidCode(code) {
  return typeof code === "string" && CODE_REGEX.test(code);
}

/**
 * Read the current room code from localStorage.
 * If absent, generate one, persist it, and return it.
 * Falls back to in-memory storage if localStorage is blocked.
 * @returns {string}
 */
export function getRoomCode() {
  if (_storageAvailable) {
    try {
      const stored = localStorage.getItem(LS_CODE_KEY);
      if (stored && isValidCode(stored)) {
        return stored;
      }
    } catch {
      _storageAvailable = false;
    }
  }

  // Check in-memory fallback
  if (_memoryCode && isValidCode(_memoryCode)) {
    return _memoryCode;
  }

  // Generate a new code
  const code = generateRoomCode();
  _persistCode(code);
  return code;
}

/**
 * Set a new room code. Validates, persists, and re-scopes the Supabase client.
 * @param {string} raw — user input (will be trimmed + uppercased)
 * @throws {Error} with message 'INVALID_CODE' if validation fails
 */
export function setRoomCode(raw) {
  const code = (raw || "").trim().toUpperCase();
  if (!isValidCode(code)) {
    throw new Error("INVALID_CODE");
  }
  _persistCode(code);
  rescope(code);
}

/**
 * @param {string} code
 * @private
 */
function _persistCode(code) {
  _memoryCode = code;
  if (_storageAvailable) {
    try {
      localStorage.setItem(LS_CODE_KEY, code);
    } catch {
      _storageAvailable = false;
    }
  }
}

/**
 * Whether localStorage is available for persistence.
 * Exposed so the UI can warn the user.
 * @returns {boolean}
 */
export function isStorageAvailable() {
  return _storageAvailable;
}
