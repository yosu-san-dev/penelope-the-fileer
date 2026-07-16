/**
 * main.js  —  App wiring / entry point
 * ---------------------------------------------------------------------------
 * Boots the app and connects all the pieces:
 *   1. Resolve room code (auth)
 *   2. Rescope Supabase client (supabase-init)
 *   3. Client-side expiry sweep
 *   4. Load + subscribe to items (db)
 *   5. Start the per-second countdown ticker (countdown)
 *   6. Bind composer, uploader, toolbar, view toggle, room-code widget
 *
 * No business logic of its own — it orchestrates the services.
 *
 * Related docs: docs/00-overview/architecture.md             (Layer 0)
 *               docs/00-overview/primary-flows.md             (Layer 0)
 *               docs/40-cross-cutting/state-model.md          (Layer 4)
 */

import { getRoomCode, setRoomCode, isStorageAvailable, generateRoomCode, isValidCode } from "./auth.js";
import { rescope } from "./supabase-init.js";
import { shareText, listItems, subscribeItems, listExpired, deleteItem } from "./db.js";
import { uploadFile, deleteObject } from "./storage.js";
import { applySortFilter } from "./sortfilter.js";
import { startTicker } from "./countdown.js";
import {
  renderItems,
  setViewMode,
  getViewMode,
  openEditorPanel,
  closeEditorPanel,
  saveEditor,
  deleteEditorItem,
  showToast,
  updateCountdowns,
  onDeleteItem,
} from "./ui-render.js";
import { MAX_FILE_BYTES, LS_CODE_KEY } from "../config/supabase-config.js";

// ── App state (in memory) ────────────────────────────────────────────────
let _items = [];
let _unsub = null;        // realtime unsubscribe
let _stopTicker = null;   // ticker stop function
let _sortSel = { sortCombined: "date-desc", typeFilter: "all", search: "" };
let _stagedFiles = [];    // files waiting to be uploaded

// ── Boot ─────────────────────────────────────────────────────────────────

async function init() {
  try {
    // 1. Resolve room code + scope client
    let code;
    let isNewDevice = true;
    try {
      const stored = localStorage.getItem(LS_CODE_KEY);
      if (stored && isValidCode(stored)) {
        code = stored;
        isNewDevice = false;
      }
    } catch { }

    if (!isNewDevice) {
      rescope(code);
    } else {
      // Find an empty code for new devices
      while (true) {
        code = generateRoomCode();
        rescope(code);
        const items = await listItems();
        if (items.length === 0) {
          try { localStorage.setItem(LS_CODE_KEY, code); } catch {}
          break;
        }
      }
    }
    _showRoomCode(code);

    // Show storage warning if needed
    if (!isStorageAvailable()) {
      const warning = document.getElementById("storage-warning");
      if (warning) warning.style.display = "block";
    }

    // 2. Client-side sweep (delete expired items for this code)
    await sweepExpired();

    // 3. Initial load
    _items = await listItems();
    _render();

    // 4. Subscribe to realtime changes
    _unsub = subscribeItems((items) => {
      _items = items;
      _render();
    });

    // 5. Start the per-second countdown ticker
    _stopTicker = startTicker(() => {
      updateCountdowns();
    });

    // 6. Bind all UI events
    _bindComposer();
    _bindUploader();
    _bindToolbar();
    _bindViewToggle();
    _bindRoomCodeWidget();
    _bindEditorPanel();

    // Register delete callback so realtime can be supplemented
    onDeleteItem(() => {
      // Will be refreshed by realtime, but this keeps things snappy
    });

  } catch (err) {
    showToast("Failed to start — " + err.message, "error");
  }
}

// ── Sweep expired items (client-side cleanup on load) ────────────────────

async function sweepExpired() {
  try {
    const expired = await listExpired();
    for (const item of expired) {
      try {
        if (item.type === "file" && item.path) {
          await deleteObject(item.path);
        }
        await deleteItem(item.id);
      } catch {
        // Best effort — scheduled purge is the safety net
      }
    }
  } catch {
    // Best effort
  }
}

// ── Render pipeline ──────────────────────────────────────────────────────

function _render() {
  const filtered = applySortFilter(_items, _sortSel);
  renderItems(filtered);
}

// ── Composer binding ─────────────────────────────────────────────────────

function _bindComposer() {
  const titleEl = document.getElementById("composer-title");
  const bodyEl = document.getElementById("composer-body");
  const shareBtn = document.getElementById("share-btn");

  if (!bodyEl || !shareBtn) return;

  // Enable/disable Share based on body content or staged files
  const updateShareState = () => {
    const hasText = !!(bodyEl.value || "").trim();
    const hasFiles = _stagedFiles.length > 0;
    shareBtn.disabled = !(hasText || hasFiles);
  };
  
  // Expose updateShareState globally so uploader can trigger it
  window.__updateShareState = updateShareState;

  bodyEl.addEventListener("input", updateShareState);
  updateShareState();

  // Share handler
  const doShare = async () => {
    const title = titleEl ? titleEl.value.trim() : "";
    const body = (bodyEl.value || "").trim();
    const filesToUpload = [..._stagedFiles];
    
    if (!body && filesToUpload.length === 0) return;

    shareBtn.disabled = true;
    try {
      if (body) {
        await shareText(title, body);
      }
      
      if (filesToUpload.length > 0) {
        await _uploadStagedFiles(filesToUpload);
        _stagedFiles = [];
        _renderStagedFiles();
      }

      // Clear on success
      if (titleEl) titleEl.value = "";
      bodyEl.value = "";
      updateShareState();
      showToast(filesToUpload.length > 0 ? "Shared with files" : "Note shared", "success");
      
      // Force a refresh of the items list to ensure new files appear immediately
      _items = await listItems();
      _render();
    } catch (err) {
      showToast("Share failed — " + err.message, "error");
      shareBtn.disabled = false;
    }
  };

  shareBtn.addEventListener("click", doShare);

  // Ctrl/Cmd+Enter shortcut
  bodyEl.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!shareBtn.disabled) doShare();
    }
  });
}

// ── Uploader binding ─────────────────────────────────────────────────────

function _bindUploader() {
  const dropZone = document.getElementById("uploader-drop-zone");
  const fileInput = document.getElementById("uploader-input");

  if (!dropZone || !fileInput) return;

  // Full-page Drag events
  document.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  document.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  document.addEventListener("dragleave", (e) => {
    e.preventDefault();
    if (!e.relatedTarget || e.relatedTarget.nodeName === "HTML") {
      dropZone.classList.remove("drag-over");
    }
  });

  document.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    if (e.dataTransfer && e.dataTransfer.files.length) {
      _stageFiles(e.dataTransfer.files);
    }
  });

  // Click / file picker
  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files.length) {
      _stageFiles(fileInput.files);
      fileInput.value = ""; // reset so the same file can be re-selected
    }
  });
}

function _stageFiles(files) {
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      showToast((file.name || "File") + " is too large (max 25 MB)", "error");
      continue;
    }
    _stagedFiles.push(file);
  }
  _renderStagedFiles();
  if (window.__updateShareState) window.__updateShareState();
}

function _renderStagedFiles() {
  const container = document.getElementById("uploader-staged-files");
  if (!container) return;
  
  container.replaceChildren();
  
  for (let i = 0; i < _stagedFiles.length; i++) {
    const file = _stagedFiles[i];
    const el = document.createElement("div");
    el.className = "staged-file";
    
    const name = document.createElement("span");
    name.textContent = file.name;
    
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn-ghost btn-sm staged-file-remove";
    removeBtn.textContent = "✕";
    removeBtn.onclick = () => {
      _stagedFiles.splice(i, 1);
      _renderStagedFiles();
      if (window.__updateShareState) window.__updateShareState();
    };
    
    el.appendChild(name);
    el.appendChild(removeBtn);
    container.appendChild(el);
  }
}

async function _uploadStagedFiles(files) {
  const progress = document.getElementById("uploader-progress");
  const dropZone = document.getElementById("uploader-drop-zone");
  
  if (dropZone) dropZone.classList.add("uploading");
  if (progress) {
    progress.style.display = "block";
    progress.textContent = "Uploading…";
  }

  for (const file of files) {
    try {
      if (progress) progress.textContent = "Uploading " + file.name + "…";
      await uploadFile(file);
    } catch (err) {
      showToast("Failed to upload " + file.name + " — " + err.message, "error");
    }
  }

  if (dropZone) dropZone.classList.remove("uploading");
  if (progress) {
    progress.style.display = "none";
    progress.textContent = "";
  }
}

// ── Toolbar binding ──────────────────────────────────────────────────────

function _bindToolbar() {
  const sortCombined = document.getElementById("sort-combined-select");
  const typeFilter = document.getElementById("type-filter-select");
  const searchInput = document.getElementById("search-input");

  const update = () => {
    _sortSel = {
      sortCombined: sortCombined ? sortCombined.value : "date-desc",
      typeFilter: typeFilter ? typeFilter.value : "all",
      search: searchInput ? searchInput.value.toLowerCase().trim() : "",
    };
    _render();
  };

  if (sortCombined) sortCombined.addEventListener("change", update);
  if (typeFilter) typeFilter.addEventListener("change", update);
  if (searchInput) searchInput.addEventListener("input", update);
}

// ── View toggle binding ──────────────────────────────────────────────────

function _bindViewToggle() {
  const listBtn = document.getElementById("view-list-btn");
  const gridBtn = document.getElementById("view-grid-btn");

  // Sync UI state from localStorage
  setViewMode(getViewMode());

  if (listBtn) {
    listBtn.addEventListener("click", () => {
      setViewMode("list");
      _render();
    });
  }

  if (gridBtn) {
    gridBtn.addEventListener("click", () => {
      setViewMode("grid");
      _render();
    });
  }
}

// ── Room-code widget binding ─────────────────────────────────────────────

function _bindRoomCodeWidget() {
  const displayWidget = document.getElementById("room-code-widget");
  const editWidget = document.getElementById("room-code-edit-widget");
  const displayEl = document.getElementById("room-code-display");
  const inputEl = document.getElementById("room-code-input");
  const copyBtn = document.getElementById("room-code-copy-btn");
  const editBtn = document.getElementById("room-code-edit-btn");
  const saveBtn = document.getElementById("room-code-save-btn");
  const cancelBtn = document.getElementById("room-code-cancel-btn");

  if (!displayWidget || !editWidget) return;

  // Copy
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(getRoomCode());
        showToast("Room code copied", "success");
      } catch {
        showToast("Couldn't copy", "error");
      }
    });
  }

  // Edit
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      displayWidget.style.display = "none";
      editWidget.style.display = "flex";
      if (inputEl) {
        inputEl.value = getRoomCode();
        inputEl.focus();
        inputEl.select();
      }
    });
  }

  // Save
  if (saveBtn) {
    saveBtn.addEventListener("click", () => _saveRoomCode());
  }

  // Cancel
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      editWidget.style.display = "none";
      displayWidget.style.display = "flex";
    });
  }

  // Enter key in input
  if (inputEl) {
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        _saveRoomCode();
      }
      if (e.key === "Escape") {
        editWidget.style.display = "none";
        displayWidget.style.display = "flex";
      }
    });
  }
}

async function _saveRoomCode() {
  const displayWidget = document.getElementById("room-code-widget");
  const editWidget = document.getElementById("room-code-edit-widget");
  const inputEl = document.getElementById("room-code-input");

  const raw = inputEl ? inputEl.value : "";

  try {
    setRoomCode(raw);
  } catch (err) {
    if (err.message === "INVALID_CODE") {
      showToast("Invalid code — must be 8 characters (A–Z, 0–9)", "error");
    } else {
      showToast("Error: " + err.message, "error");
    }
    return;
  }

  const code = getRoomCode();
  _showRoomCode(code);

  // Switch back to display
  if (editWidget) editWidget.style.display = "none";
  if (displayWidget) displayWidget.style.display = "flex";

  // Re-scope: tear down old subscription, reload
  if (_unsub) { _unsub(); _unsub = null; }

  try {
    _items = await listItems();
    _render();
    _unsub = subscribeItems((items) => {
      _items = items;
      _render();
    });
    showToast("Switched to room " + code, "success");
  } catch (err) {
    showToast("Failed to load room — " + err.message, "error");
  }
}

function _showRoomCode(code) {
  const el = document.getElementById("room-code-display");
  if (el) el.textContent = code;
}

// ── Editor panel binding ─────────────────────────────────────────────────

function _bindEditorPanel() {
  const overlay = document.getElementById("editor-overlay");
  const closeBtn = document.getElementById("editor-close-btn");
  const saveBtn = document.getElementById("editor-save-btn");
  const cancelBtn = document.getElementById("editor-cancel-btn");
  const deleteBtn = document.getElementById("editor-delete-btn");

  if (overlay) {
    overlay.addEventListener("click", () => closeEditorPanel());
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", () => closeEditorPanel());
  }
  if (saveBtn) {
    saveBtn.addEventListener("click", () => saveEditor());
  }
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => closeEditorPanel());
  }
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => deleteEditorItem());
  }

  // Escape key to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const panel = document.getElementById("editor-panel");
      if (panel && panel.classList.contains("open")) {
        closeEditorPanel();
      }
    }
  });
}

// ── Start ────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", init);
