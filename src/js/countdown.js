/**
 * countdown.js  —  Presentation helper: per-second expiry timers
 * ---------------------------------------------------------------------------
 * A single 1-second interval drives all visible countdown labels.
 * When an item passes expires_at, the UI hides it immediately.
 *
 * Exports:
 *   - startTicker(onTick)         -> returns stop() function
 *   - formatRemaining(expiresAt)  -> "14h 23m 05s" or "23:05" or "<expired>"
 *   - isExpired(expiresAt)        -> boolean
 *
 * Related docs: docs/10-subsystems/expiration-and-cleanup.md  (Layer 1)
 *               docs/20-components/countdown.md                (Layer 2)
 */

/**
 * Start a single 1-second interval that calls onTick every second.
 * One ticker for the whole app (not one per card).
 * @param {() => void} onTick
 * @returns {() => void} stop function
 */
export function startTicker(onTick) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}

/**
 * Check whether an item has expired.
 * @param {string} expiresAt — ISO timestamptz
 * @returns {boolean}
 */
export function isExpired(expiresAt) {
  return new Date(expiresAt).getTime() <= Date.now();
}

/**
 * Format the time remaining until expiry as a human-readable string.
 * - ≤ 0: returns "<expired>"
 * - Under 1 hour: "mm:ss"
 * - 1 hour+: "Xh Ym Zs"
 * @param {string} expiresAt — ISO timestamptz
 * @returns {string}
 */
export function formatRemaining(expiresAt) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "<expired>";

  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const pad = (n) => String(n).padStart(2, "0");

  if (h > 0) {
    return h + "h " + pad(m) + "m " + pad(s) + "s";
  }
  return pad(m) + ":" + pad(s);
}
