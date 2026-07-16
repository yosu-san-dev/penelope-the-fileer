/**
 * ui-render.js  —  Presentation layer: render items into the DOM
 * ---------------------------------------------------------------------------
 * Turns the current item set into the visible UI — list OR grid, item cards
 * (note vs file), the editor panel, and toast notifications.
 *
 * SECURITY: All user-supplied content is inserted via textContent /
 * createElement + setAttribute — never innerHTML — to prevent XSS.
 *
 * Exports:
 *   - renderItems(items, viewMode)   -> paint list/grid
 *   - renderCard(item)               -> one note/file card DOM element
 *   - openEditorPanel(item)          -> view/edit a note
 *   - closeEditorPanel()             -> close the panel
 *   - setViewMode('list'|'grid')     -> toggle layout
 *   - showToast(message, type)       -> notification
 *   - formatFileSize(bytes)          -> human-readable size
 *
 * Related docs: docs/10-subsystems/ui-shell-and-views.md     (Layer 1)
 *               docs/20-components/*.md                       (Layer 2)
 */

import { formatRemaining, isExpired } from "./countdown.js";
import { getDownloadUrl, deleteObject } from "./storage.js";
import { deleteItem, updateNote } from "./db.js";

// ── State ────────────────────────────────────────────────────────────────
let _viewMode = "list";
try {
  _viewMode = localStorage.getItem("penelope.viewMode") || "list";
} catch {
  // Ignore
}

let _currentEditorItem = null;
let _editorDirty = false;
/** @type {(id: string, item: object) => void} */
let _onDeleteItem = null;

// ── DOM refs (cached once) ───────────────────────────────────────────────
const $container   = () => document.getElementById("items-container");
const $loading     = () => document.getElementById("loading-state");
const $editorOverlay  = () => document.getElementById("editor-overlay");
const $editorPanel    = () => document.getElementById("editor-panel");
const $editorTitle    = () => document.getElementById("editor-title");
const $editorContent  = () => document.getElementById("editor-content");
const $editorCountdown = () => document.getElementById("editor-countdown");
const $toastContainer = () => document.getElementById("toast-container");

// ── View mode ────────────────────────────────────────────────────────────

/**
 * Set the current view mode and re-apply the class on the container.
 * @param {'list'|'grid'} mode
 */
export function setViewMode(mode) {
  _viewMode = mode;
  try {
    localStorage.setItem("penelope.viewMode", mode);
  } catch {
    // Ignore if storage blocked
  }
  
  // Update toggle button states
  const listBtn = document.getElementById("view-list-btn");
  const gridBtn = document.getElementById("view-grid-btn");
  if (listBtn) {
    listBtn.classList.toggle("active", mode === "list");
  }
  if (gridBtn) {
    gridBtn.classList.toggle("active", mode === "grid");
  }
}

/**
 * @returns {'list'|'grid'}
 */
export function getViewMode() {
  return _viewMode;
}

// ── Render items ─────────────────────────────────────────────────────────

/**
 * Paint the item set into the container as list or grid.
 * @param {object[]} items — already sorted/filtered, expired excluded
 */
export function renderItems(items) {
  const container = $container();
  if (!container) return;

  // Hide loading state
  const loading = $loading();
  if (loading) loading.style.display = "none";

  // Clear existing cards
  container.replaceChildren();

  // Empty state
  if (!items || items.length === 0) {
    const empty = _buildEmptyState();
    container.appendChild(empty);
    return;
  }

  // Apply view mode class
  container.className = _viewMode === "grid" ? "item-grid" : "item-list";

  // Render each card
  for (const item of items) {
    if (!isExpired(item.expires_at)) {
      const card = renderCard(item);
      container.appendChild(card);
    }
  }
}

/**
 * Register a callback for when an item is deleted from a card.
 * @param {(id: string, item: object) => void} fn
 */
export function onDeleteItem(fn) {
  _onDeleteItem = fn;
}

// ── Build cards ──────────────────────────────────────────────────────────

/**
 * Render a single card DOM element based on item type.
 * @param {object} item
 * @returns {HTMLElement}
 */
export function renderCard(item) {
  if (item.type === "file") {
    return _buildFileCard(item);
  }
  return _buildNoteCard(item);
}

/**
 * Build a text-note card.
 * @param {object} item
 * @returns {HTMLElement}
 * @private
 */
function _buildNoteCard(item) {
  const card = document.createElement("article");
  card.className = "item-card";
  card.dataset.itemId = item.id;

  // Top Area
  const topArea = document.createElement("div");
  topArea.className = "item-card-top";

  const topBar = document.createElement("div");
  topBar.className = "item-card-top-bar";

  const badge = document.createElement("span");
  badge.className = "item-card-badge badge-text";
  badge.textContent = "Text";

  const created = document.createElement("span");
  created.className = "item-card-meta-item";
  created.textContent = _formatDate(item.created_at);

  topBar.appendChild(badge);
  topBar.appendChild(created);

  const title = document.createElement("div");
  title.className = "item-card-title full-width";
  title.textContent = item.title || "Untitled";

  const preview = document.createElement("p");
  preview.className = "item-card-preview";
  preview.textContent = item.content || "";

  topArea.appendChild(topBar);
  topArea.appendChild(title);
  topArea.appendChild(preview);

  // Bottom Area
  const bottomArea = document.createElement("div");
  bottomArea.className = "item-card-bottom";

  const countdownContainer = document.createElement("div");
  countdownContainer.className = "item-card-countdown-container";
  
  const countdown = document.createElement("span");
  countdown.className = "item-card-countdown";
  countdown.dataset.expiresAt = item.expires_at;
  countdown.textContent = formatRemaining(item.expires_at);
  countdownContainer.appendChild(countdown);

  const actions = document.createElement("div");
  actions.className = "item-card-actions";

  const openBtn = _makeBtn("Open", "btn btn-ghost btn-sm", () => {
    openEditorPanel(item);
  });

  const copyBtn = _makeBtn("Copy", "btn btn-ghost btn-sm", async () => {
    try {
      await navigator.clipboard.writeText(item.content || "");
      showToast("Copied to clipboard", "success");
    } catch {
      showToast("Couldn't copy — try again", "error");
    }
  });

  const delBtn = _makeBtn("Delete", "btn btn-danger btn-sm", async () => {
    try {
      await deleteItem(item.id, item);
      card.remove();
      showToast("Note deleted", "success");
      if (_onDeleteItem) _onDeleteItem(item.id, item);
    } catch (err) {
      showToast("Delete failed — " + err.message, "error");
    }
  });

  actions.appendChild(openBtn);
  actions.appendChild(copyBtn);
  actions.appendChild(delBtn);

  bottomArea.appendChild(countdownContainer);
  bottomArea.appendChild(actions);

  // Assemble
  card.appendChild(topArea);
  card.appendChild(bottomArea);

  // Click card body to open
  card.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    openEditorPanel(item);
  });

  return card;
}

/**
 * Build a file-item card.
 * @param {object} item
 * @returns {HTMLElement}
 * @private
 */
function _buildFileCard(item) {
  const card = document.createElement("article");
  card.className = "item-card";
  card.dataset.itemId = item.id;

  // Top Area
  const topArea = document.createElement("div");
  topArea.className = "item-card-top";

  const topBar = document.createElement("div");
  topBar.className = "item-card-top-bar";

  const badge = document.createElement("span");
  badge.className = "item-card-badge badge-file";
  badge.textContent = "File";

  const created = document.createElement("span");
  created.className = "item-card-meta-item";
  created.textContent = _formatDate(item.created_at);

  topBar.appendChild(badge);
  topBar.appendChild(created);

  const title = document.createElement("div");
  title.className = "item-card-title full-width";
  title.textContent = item.file_name || item.title || "file";

  const detail = document.createElement("div");
  detail.className = "item-card-preview file-detail"; 
  detail.textContent = _shortMime(item.mime_type) + " · " + formatFileSize(item.file_size);

  topArea.appendChild(topBar);
  topArea.appendChild(title);
  topArea.appendChild(detail);

  // Bottom Area
  const bottomArea = document.createElement("div");
  bottomArea.className = "item-card-bottom";

  const countdownContainer = document.createElement("div");
  countdownContainer.className = "item-card-countdown-container";
  
  const countdown = document.createElement("span");
  countdown.className = "item-card-countdown";
  countdown.dataset.expiresAt = item.expires_at;
  countdown.textContent = formatRemaining(item.expires_at);
  countdownContainer.appendChild(countdown);

  const actions = document.createElement("div");
  actions.className = "item-card-actions";

  const dlBtn = _makeBtn("Download", "btn btn-ghost btn-sm", async () => {
    try {
      const url = await getDownloadUrl(item.path);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.file_name || "file";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      showToast("Download failed — " + err.message, "error");
    }
  });

  const delBtn = _makeBtn("Delete", "btn btn-danger btn-sm", async () => {
    try {
      // Delete object first, then row (per error-handling.md)
      if (item.path) await deleteObject(item.path);
      await deleteItem(item.id);
      card.remove();
      showToast("File deleted", "success");
      if (_onDeleteItem) _onDeleteItem(item.id, item);
    } catch (err) {
      showToast("Delete failed — " + err.message, "error");
    }
  });

  actions.appendChild(dlBtn);
  actions.appendChild(delBtn);

  bottomArea.appendChild(countdownContainer);
  bottomArea.appendChild(actions);

  // Assemble
  card.appendChild(topArea);
  card.appendChild(bottomArea);

  return card;
}

// ── Editor Panel ─────────────────────────────────────────────────────────

/**
 * Open the slide-over editor panel for a note.
 * @param {object} item — must be type 'text'
 */
export function openEditorPanel(item) {
  if (item.type !== "text") return;

  _currentEditorItem = item;
  _editorDirty = false;

  const titleEl = $editorTitle();
  const contentEl = $editorContent();
  const countdownEl = $editorCountdown();
  const overlay = $editorOverlay();
  const panel = $editorPanel();

  if (titleEl) titleEl.value = item.title || "";
  if (contentEl) contentEl.value = item.content || "";
  if (countdownEl) {
    countdownEl.textContent = formatRemaining(item.expires_at);
    countdownEl.dataset.expiresAt = item.expires_at;
  }

  if (overlay) overlay.classList.add("open");
  if (panel) panel.classList.add("open");

  // Track dirtiness
  const markDirty = () => { _editorDirty = true; };
  if (titleEl) titleEl.addEventListener("input", markDirty, { once: false });
  if (contentEl) contentEl.addEventListener("input", markDirty, { once: false });

  // Focus the content
  if (contentEl) contentEl.focus();
}

/**
 * Close the editor panel.
 * @param {boolean} [force=false] — skip dirty check
 */
export function closeEditorPanel(force = false) {
  if (_editorDirty && !force) {
    // Simple unsaved-changes guard
    if (!window.confirm("You have unsaved changes. Discard them?")) {
      return;
    }
  }
  _currentEditorItem = null;
  _editorDirty = false;

  const overlay = $editorOverlay();
  const panel = $editorPanel();
  if (overlay) overlay.classList.remove("open");
  if (panel) panel.classList.remove("open");
}

/**
 * Save the current editor state to the database.
 */
export async function saveEditor() {
  if (!_currentEditorItem) return;

  const titleEl = $editorTitle();
  const contentEl = $editorContent();
  const title = titleEl ? titleEl.value.trim() : "";
  const content = contentEl ? contentEl.value : "";

  try {
    await updateNote(_currentEditorItem.id, { title, content });
    _editorDirty = false;
    closeEditorPanel(true);
    showToast("Note saved", "success");
  } catch (err) {
    showToast("Save failed — " + err.message, "error");
  }
}

/**
 * Delete the item currently open in the editor.
 */
export async function deleteEditorItem() {
  if (!_currentEditorItem) return;

  try {
    await deleteItem(_currentEditorItem.id, _currentEditorItem);
    _editorDirty = false;
    closeEditorPanel(true);
    showToast("Note deleted", "success");
    if (_onDeleteItem) _onDeleteItem(_currentEditorItem.id, _currentEditorItem);
  } catch (err) {
    showToast("Delete failed — " + err.message, "error");
  }
}

// ── Toast ────────────────────────────────────────────────────────────────

/**
 * Show a temporary toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} [type='info']
 */
export function showToast(message, type = "info") {
  const container = $toastContainer();
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;

  const icon = document.createElement("span");
  if (type === "success") icon.textContent = "✓";
  else if (type === "error") icon.textContent = "✗";
  else icon.textContent = "ℹ";

  const text = document.createElement("span");
  text.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(text);
  container.appendChild(toast);

  // Auto-dismiss after 4s
  setTimeout(() => {
    toast.classList.add("leaving");
    toast.addEventListener("animationend", () => toast.remove());
  }, 4000);
}

// ── Countdown tick (called every second by main.js) ──────────────────────

/**
 * Update all visible countdown labels and remove expired cards.
 * Called by the global 1-second ticker.
 */
export function updateCountdowns() {
  const countdowns = document.querySelectorAll("[data-expires-at]");
  for (const el of countdowns) {
    const expiresAt = el.dataset.expiresAt;
    if (isExpired(expiresAt)) {
      // If it's in a card, remove the card
      const card = el.closest(".item-card");
      if (card) {
        card.style.opacity = "0";
        card.style.transform = "scale(0.95)";
        setTimeout(() => card.remove(), 200);
      }
      el.textContent = "<expired>";
      el.classList.add("expired");
    } else {
      el.textContent = formatRemaining(expiresAt);
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Format file size in human-readable units.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0);
  return val + " " + units[i];
}

/**
 * Build the empty-state message.
 * @returns {HTMLElement}
 * @private
 */
function _buildEmptyState() {
  const div = document.createElement("div");
  div.className = "empty-state";

  const icon = document.createElement("div");
  icon.className = "empty-state-icon";
  icon.textContent = "📭";

  const title = document.createElement("div");
  title.className = "empty-state-title";
  title.textContent = "Nothing here yet";

  const text = document.createElement("p");
  text.className = "empty-state-text";
  text.textContent = "Paste text and click Share, or drop a file to get started. Items auto-expire in 24 hours.";

  div.appendChild(icon);
  div.appendChild(title);
  div.appendChild(text);
  return div;
}

/**
 * Create a button element.
 * @param {string} label
 * @param {string} className
 * @param {() => void} onClick
 * @returns {HTMLButtonElement}
 * @private
 */
function _makeBtn(label, className, onClick) {
  const btn = document.createElement("button");
  btn.className = className;
  btn.textContent = label;
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return btn;
}

/**
 * Short date format.
 * @param {string} iso
 * @returns {string}
 * @private
 */
function _formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * Get an icon emoji based on mime type.
 * @param {string} mime
 * @returns {string}
 * @private
 */
function _fileIcon(mime) {
  if (!mime) return "📄";
  if (mime.startsWith("image/")) return "🖼️";
  if (mime.startsWith("video/")) return "🎬";
  if (mime.startsWith("audio/")) return "🎵";
  if (mime.includes("pdf")) return "📕";
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("tar")) return "📦";
  if (mime.includes("word") || mime.includes("document")) return "📝";
  if (mime.includes("sheet") || mime.includes("excel")) return "📊";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "📽️";
  if (mime.startsWith("text/")) return "📃";
  return "📄";
}

/**
 * Shorten a MIME type for display (e.g. "application/pdf" → "PDF").
 * @param {string} mime
 * @returns {string}
 * @private
 */
function _shortMime(mime) {
  if (!mime) return "file";
  const sub = mime.split("/").pop();
  if (sub.length <= 5) return sub.toUpperCase();
  // Known long types
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("zip")) return "ZIP";
  if (mime.includes("word")) return "DOCX";
  if (mime.includes("sheet") || mime.includes("excel")) return "XLSX";
  if (mime.includes("presentation")) return "PPTX";
  if (mime.includes("javascript")) return "JS";
  if (mime.includes("typescript")) return "TS";
  return sub.toUpperCase().slice(0, 6);
}
