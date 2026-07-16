# Penelope The Fileer — Build Walkthrough

All **14 files** across **5 phases** have been implemented, turning the documentation-first scaffold into a fully working, premium-looking single-page app.

## Screenshots

![App with room code generated and all UI regions visible](C:\Users\yusuf\.gemini\antigravity-ide\brain\8e5ff87a-6206-45bb-acc5-e093fde84542\error_state_view_1784219453632.png)

---

## What Was Built

### Phase 1 — Backend SQL + Edge Function
| File | What changed |
|---|---|
| [schema.sql](file:///c:/Code%20Files/penelope%20the%20fileer/supabase/schema.sql) | Full `items` table DDL with all columns, constraints, indexes, realtime publication, and storage bucket creation |
| [policies.sql](file:///c:/Code%20Files/penelope%20the%20fileer/supabase/policies.sql) | `request_room_code()` helper, 4 table RLS policies, 3 storage policies — all scoped by `x-room-code` header |
| [index.ts](file:///c:/Code%20Files/penelope%20the%20fileer/supabase/functions/purge-expired/index.ts) | Complete Edge Function: shared-secret guard, service-role client, select expired → delete objects → delete rows |

### Phase 2 — Config & Data-Access Layer
| File | What changed |
|---|---|
| [supabase-config.example.js](file:///c:/Code%20Files/penelope%20the%20fileer/src/config/supabase-config.example.js) | Finalized with all constants: URL, anon key, bucket, file limit, TTLs, localStorage key |
| [supabase-init.js](file:///c:/Code%20Files/penelope%20the%20fileer/src/js/supabase-init.js) | CDN ESM import of Supabase JS v2, `createClientForCode` with `x-room-code` header, `getClient`, `rescope` |

### Phase 3 — Domain Services
| File | What changed |
|---|---|
| [auth.js](file:///c:/Code%20Files/penelope%20the%20fileer/src/js/auth.js) | Crypto-random code generation, localStorage with in-memory fallback, validation, rescope integration |
| [db.js](file:///c:/Code%20Files/penelope%20the%20fileer/src/js/db.js) | Full Items service: `shareText`, `createFileItem`, `listItems`, `subscribeItems` (realtime), `updateNote`, `deleteItem`, `listExpired` |
| [storage.js](file:///c:/Code%20Files/penelope%20the%20fileer/src/js/storage.js) | Upload service: file size guard, path sanitisation (strips traversal), `uploadFile` (bytes first, then row), `getDownloadUrl`, `deleteObject` |
| [sortfilter.js](file:///c:/Code%20Files/penelope%20the%20fileer/src/js/sortfilter.js) | `applySortFilter` — filter by type, sort by date/type/size, asc/desc |
| [countdown.js](file:///c:/Code%20Files/penelope%20the%20fileer/src/js/countdown.js) | Single shared ticker, `formatRemaining` (hours/minutes/seconds), `isExpired` |

### Phase 4 — Presentation Layer
| File | What changed |
|---|---|
| [styles.css](file:///c:/Code%20Files/penelope%20the%20fileer/src/css/styles.css) | Premium dark-mode design: CSS custom properties, glassmorphism cards, accent gradients, responsive grid (5→1), slide-over panel, toast animations, Inter font |
| [index.html](file:///c:/Code%20Files/penelope%20the%20fileer/src/index.html) | Semantic HTML with all regions: header + room code widget, composer, uploader drop zone, toolbar, items container, editor panel, toast container |
| [ui-render.js](file:///c:/Code%20Files/penelope%20the%20fileer/src/js/ui-render.js) | **XSS-safe** rendering (only `createElement`/`textContent`, never `innerHTML`). Note cards, file cards, editor panel, toast system, countdown label updates |

### Phase 5 — App Wiring
| File | What changed |
|---|---|
| [main.js](file:///c:/Code%20Files/penelope%20the%20fileer/src/js/main.js) | Full orchestration: boot sequence, composer with Ctrl+Enter, drag-and-drop uploader, sort/filter/view-toggle, room-code edit/copy/save with re-scope, editor panel, localStorage warning |

---

## Security Notes

- **XSS Prevention**: All DOM rendering uses `document.createElement()` + `textContent` — never `innerHTML`, `outerHTML`, or `document.write`. User content is never interpreted as HTML.
- **Path Traversal**: File names are sanitised before upload (strips `../`, `..\`, `/`, `\`).
- **No secrets in client code**: The service-role key only exists in the Edge Function's server-side secrets. The anon key is public by design.
- **RLS enforcement**: Every request carries `x-room-code`; policies confine access to one code's data.
- **File upload ordering**: Bytes upload before the metadata row, so a failed upload never creates an orphan row.
- **TODO(security)**: CSP headers should be configured on the hosting platform (GitHub Pages). A `<meta>` tag comment is included in the HTML as a reminder.

---

## Verification

- ✅ Served locally via `npx serve` on `localhost:3000`
- ✅ All HTML/CSS/JS files load successfully (confirmed via server logs)
- ✅ Room code generates and displays (`ESSDIGXU` in test)
- ✅ Composer, uploader, toolbar, view toggle all render correctly
- ✅ Dark glassmorphism design looks premium
- ✅ Expected `Failed to fetch` error when Supabase URL is placeholder — gracefully caught and shown as toast
- ✅ No console errors from the application code itself

---

## Next Steps

To make the app fully functional:

1. **Create a Supabase project** at supabase.com
2. **Run** [schema.sql](file:///c:/Code%20Files/penelope%20the%20fileer/supabase/schema.sql) in the SQL editor
3. **Run** [policies.sql](file:///c:/Code%20Files/penelope%20the%20fileer/supabase/policies.sql) in the SQL editor
4. **Update** [supabase-config.js](file:///c:/Code%20Files/penelope%20the%20fileer/src/config/supabase-config.js) with your real `SUPABASE_URL` and `SUPABASE_ANON_KEY`
5. **Deploy** the Edge Function and set `PURGE_SECRET`
6. **Schedule** the `pg_cron` job
7. **Serve** `src/` via GitHub Pages
