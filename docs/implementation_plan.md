# Build Penelope The Fileer — Implementation Plan

Turn the documentation-first scaffold into a fully working, premium-looking single-page app. All 5 documentation layers (0–4) are 🟢 done — this plan implements the code from those specs.

---

## User Review Required

> [!IMPORTANT]
> **Supabase credentials are required.** The app needs a real Supabase project to function. You'll need to provide (or create) a `src/config/supabase-config.js` with your `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Without them the app loads but cannot connect to a backend.

> [!IMPORTANT]
> **Design was marked "deferred" in the docs.** Since no design was supplied, I will create a premium dark-mode design with glassmorphism, smooth animations, and modern typography (Inter font). The docs explicitly say "the user will supply [the design]" — please confirm you're OK with me designing it, or provide your own preferences.

> [!WARNING]
> **The Supabase backend (schema, RLS, bucket, Edge Function, pg_cron) must be set up manually in the Supabase dashboard / CLI.** I will write the complete SQL files (`schema.sql`, `policies.sql`) and the Edge Function (`purge-expired/index.ts`) so they're ready to run, but I cannot execute them against your Supabase project from here.

## Open Questions

1. **Supabase credentials** — Do you already have a Supabase project set up? If so, do you want me to create the `supabase-config.js` with placeholder values, or do you have real credentials to embed?
2. **Supabase JS loading** — The docs say "CDN script import or bundler". I'll use a CDN ESM import (`https://esm.sh/@supabase/supabase-js@2`) to keep it zero-build. OK?
3. **Design direction** — Shall I go with a dark premium glassmorphism look, or do you have a specific aesthetic in mind?

---

## Proposed Changes

### Phase 1 — Supabase Backend Files (SQL + Edge Function)

#### [MODIFY] [schema.sql](file:///c:/Code%20Files/penelope%20the%20fileer/supabase/schema.sql)
Replace the stub with the full DDL from [db-schema.md](file:///c:/Code%20Files/penelope%20the%20fileer/docs/30-data-and-api/db-schema.md):
- `items` table with all columns, constraints, and indexes
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.items`
- Storage bucket creation SQL

#### [MODIFY] [policies.sql](file:///c:/Code%20Files/penelope%20the%20fileer/supabase/policies.sql)
Replace the stub with complete RLS policies from [security-rls.md](file:///c:/Code%20Files/penelope%20the%20fileer/docs/30-data-and-api/security-rls.md):
- `request_room_code()` helper function
- Table RLS: select/insert/update/delete scoped by `x-room-code` header
- Storage RLS: read/write/delete scoped by folder segment

#### [MODIFY] [index.ts](file:///c:/Code%20Files/penelope%20the%20fileer/supabase/functions/purge-expired/index.ts)
Replace the stub with the full Edge Function from [edge-function-purge.md](file:///c:/Code%20Files/penelope%20the%20fileer/docs/30-data-and-api/edge-function-purge.md):
- Shared-secret guard (`x-purge-secret`)
- Service-role client → select expired → delete storage objects → delete rows

---

### Phase 2 — Config & Data-Access Layer (JS)

#### [MODIFY] [supabase-config.example.js](file:///c:/Code%20Files/penelope%20the%20fileer/src/config/supabase-config.example.js)
Uncomment and finalize the export template with all constants:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STORAGE_BUCKET`
- `MAX_FILE_BYTES`, `SIGNED_URL_TTL`, `LS_CODE_KEY`, `ITEM_TTL_HOURS`

#### [MODIFY] [supabase-init.js](file:///c:/Code%20Files/penelope%20the%20fileer/src/js/supabase-init.js)
Implement per [client-sdk-contracts.md](file:///c:/Code%20Files/penelope%20the%20fileer/docs/30-data-and-api/client-sdk-contracts.md):
- Import `createClient` from Supabase CDN
- `createClientForCode(code)` — creates client with `x-room-code` header
- `getClient()` — returns current instance
- `rescope(code)` — tears down and recreates client

---

### Phase 3 — Domain Services (JS)

#### [MODIFY] [auth.js](file:///c:/Code%20Files/penelope%20the%20fileer/src/js/auth.js)
Implement per [auth-room-code.md](file:///c:/Code%20Files/penelope%20the%20fileer/docs/10-subsystems/auth-room-code.md):
- `generateRoomCode()` — 8 chars `[A-Z0-9]` via `crypto.getRandomValues`
- `getRoomCode()` — from `localStorage["penelope.roomCode"]` or generate
- `setRoomCode(code)` — validate `^[A-Z0-9]{8}$`, persist, call `rescope()`
- `isValidCode(code)` — regex test
- `localStorage` fallback to in-memory

#### [MODIFY] [db.js](file:///c:/Code%20Files/penelope%20the%20fileer/src/js/db.js)
Implement per [client-sdk-contracts.md](file:///c:/Code%20Files/penelope%20the%20fileer/docs/30-data-and-api/client-sdk-contracts.md):
- `shareText(title, body)` — insert `type:'text'` row
- `createFileItem(meta)` — insert `type:'file'` row
- `listItems()` — select current items, `expires_at > now()`, order by `created_at desc`
- `subscribeItems(onChange)` — realtime channel filtered by code
- `updateNote(id, patch)` — update title/content (does NOT reset expiry)
- `deleteItem(id)` — delete object if file, then delete row
- `listExpired()` — for client sweep

#### [MODIFY] [storage.js](file:///c:/Code%20Files/penelope%20the%20fileer/src/js/storage.js)
Implement per [storage-layer.md](file:///c:/Code%20Files/penelope%20the%20fileer/docs/10-subsystems/storage-layer.md):
- `uploadFile(file)` — size guard, upload bytes, create file item via `db.createFileItem`
- `getDownloadUrl(path)` — signed URL, 24h TTL
- `deleteObject(path)` — remove from storage

#### [MODIFY] [sortfilter.js](file:///c:/Code%20Files/penelope%20the%20fileer/src/js/sortfilter.js)
Implement per [toolbar-sortfilter.md](file:///c:/Code%20Files/penelope%20the%20fileer/docs/20-components/toolbar-sortfilter.md):
- `applySortFilter(items, { sortBy, direction, typeFilter })` — filter then sort

#### [MODIFY] [countdown.js](file:///c:/Code%20Files/penelope%20the%20fileer/src/js/countdown.js)
Implement per [countdown.md](file:///c:/Code%20Files/penelope%20the%20fileer/docs/20-components/countdown.md):
- `startTicker(onTick)` — single `setInterval(1000)`, returns `stop()`
- `formatRemaining(expiresAt)` — `"14h 23m 05s"` or `"23:05"` under 1h
- `isExpired(expiresAt)` — boolean

---

### Phase 4 — Presentation Layer (HTML + CSS + ui-render.js)

#### [MODIFY] [index.html](file:///c:/Code%20Files/penelope%20the%20fileer/src/index.html)
Full app shell with semantic HTML:
- `<header>` — logo/title + room-code widget
- Composer section — title input + body textarea + Share button + uploader drop zone
- Toolbar — view toggle (list/grid) + sort/filter controls
- `<main>` — item list/grid container
- Editor panel — slide-over modal for viewing/editing notes
- Toast container for error/success notifications
- Google Fonts (Inter), Supabase CDN script

#### [MODIFY] [styles.css](file:///c:/Code%20Files/penelope%20the%20fileer/src/css/styles.css)
Premium dark-mode design with:
- CSS custom properties design system (colors, spacing, typography, radii, shadows)
- Glassmorphism cards with frosted glass effect
- Smooth hover/focus animations and micro-interactions
- Responsive grid: 5→4→3→2→1 columns
- Editor panel slide-over transition
- Drag-over highlighting for uploader
- Toast notification animations
- Mobile-first responsive breakpoints

#### [MODIFY] [ui-render.js](file:///c:/Code%20Files/penelope%20the%20fileer/src/js/ui-render.js)
Implement all presentation logic:
- `renderItems(items, viewMode)` — paint list/grid, handle empty/loading states
- `renderCard(item)` — note card (title, preview, copy, open, delete) vs file card (icon, name, size, download, delete)
- `openEditorPanel(item)` — slide-over with editable title/content, save/cancel/delete
- `setViewMode(mode)` — toggle layout class
- `showToast(message, type)` — notification system
- Human-readable file size formatting
- Countdown label mounting per card

---

### Phase 5 — App Wiring (main.js)

#### [MODIFY] [main.js](file:///c:/Code%20Files/penelope%20the%20fileer/src/js/main.js)
Orchestration per [state-model.md](file:///c:/Code%20Files/penelope%20the%20fileer/docs/40-cross-cutting/state-model.md):
- `init()` — boot sequence: getRoomCode → rescope → sweepExpired → listItems → render → subscribe → startTicker → bind events
- `sweepExpired()` — client-side cleanup on load
- Composer: Share button + Ctrl/Cmd+Enter
- Uploader: drag-and-drop + file picker
- Toolbar: sort/filter/view-toggle event binding
- Room-code widget: edit/save/copy
- Re-scope on code change (tear down subscription, reload)

---

## Verification Plan

### Manual Verification
1. Open `src/index.html` in a browser — confirm the UI renders with the premium design
2. Verify room code is generated and shown in the header
3. Confirm all interactive elements work (composer, view toggle, sort/filter)
4. With Supabase credentials: test text sharing, file upload, real-time sync, deletion, countdown, and expiry sweep

### Visual Verification
- Check responsive grid at different viewport widths (5→4→3→2→1 columns)
- Verify glassmorphism card styling, hover animations, and transitions
- Test editor panel open/close slide animation
- Verify drag-and-drop upload zone highlighting
- Test on mobile viewport

---

## File Count Summary

| Phase | Files | Type |
|---|---|---|
| 1 — Backend SQL + Edge Fn | 3 | Modify |
| 2 — Config + Init | 2 | Modify |
| 3 — Domain Services | 5 | Modify |
| 4 — Presentation | 3 | Modify |
| 5 — App Wiring | 1 | Modify |
| **Total** | **14** | All existing stubs |
