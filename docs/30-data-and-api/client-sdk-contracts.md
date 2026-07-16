---
layer: 3
status: 🟢 done
related:
  - "[architecture](../00-overview/architecture.md)"
  - "[db-schema](db-schema.md)"
  - "[storage-layout](storage-layout.md)"
  - "[security-rls](security-rls.md)"
  - "[error-handling](../40-cross-cutting/error-handling.md)"
---

# Data — Client SDK Contracts (the "API")

Penelope has no REST API of its own — its **API surface is this set of client functions** wrapping the
Supabase JS SDK. This page is the contract a fresh session implements. Signatures are shown in
TypeScript for precision; the code is plain JS (types as JSDoc are fine).

**Supabase JS version:** `@supabase/supabase-js` v2.

---

## Shared types

```ts
type ItemType = 'text' | 'file';

interface Item {
  id: string;              // uuid
  code: string;            // 8-char room code
  type: ItemType;
  title: string;
  content?: string;        // notes
  path?: string;           // files: storage object path
  file_url?: string;       // files: optional cached signed URL
  file_name?: string;
  file_size?: number;      // bytes
  mime_type?: string;
  created_at: string;      // ISO timestamptz
  expires_at: string;      // ISO timestamptz
}

// Standard result: throw on hard errors; callers show a toast (see error-handling).
```

Constants (see [config-and-env](../40-cross-cutting/config-and-env.md)):
`STORAGE_BUCKET = 'penelope-files'`, `MAX_FILE_BYTES = 25*1024*1024`, `SIGNED_URL_TTL = 86400`,
`LS_CODE_KEY = 'penelope.roomCode'`.

---

## `supabase-init.js` — the client

```ts
function createClientForCode(code: string): SupabaseClient
// createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { 'x-room-code': code } } })

function getClient(): SupabaseClient          // the current instance
function rescope(code: string): void          // recreate the client with the new code header
```

- The header is what RLS uses ([security-rls](security-rls.md)). `rescope` is called by
  `auth.setRoomCode`.

---

## `auth.js` — room code

```ts
function generateRoomCode(): string
// 8 chars from [A-Z0-9] using crypto.getRandomValues; never returns <8 chars.

function getRoomCode(): string
// read localStorage[LS_CODE_KEY]; if absent, generate + persist, then return it.

function setRoomCode(code: string): void
// validate ^[A-Z0-9]{8}$ (trim+uppercase first); persist; call supabase.rescope(code).
// throws Error('INVALID_CODE') if invalid.

function isValidCode(code: string): boolean
```

---

## `db.js` — Items service (only module touching the `items` table)

```ts
async function shareText(title: string, body: string): Promise<Item>
// title = title || firstLine(body, 60). Insert:
//   supabase.from('items').insert({ code, type:'text', title, content: body }).select().single()
// created_at/expires_at come from DB defaults. Returns the new row.

async function createFileItem(meta: {
  title: string; path: string; file_name: string; file_size: number; mime_type: string; file_url?: string;
}): Promise<Item>
// supabase.from('items').insert({ code, type:'file', ...meta }).select().single()

async function listItems(): Promise<Item[]>
// supabase.from('items').select('*')
//   .eq('code', code).gt('expires_at', new Date().toISOString())
//   .order('created_at', { ascending: false })

function subscribeItems(onChange: (items: Item[]) => void): () => void
// supabase.channel('items-'+code)
//   .on('postgres_changes', { event:'*', schema:'public', table:'items', filter:`code=eq.${code}` },
//        async () => onChange(await listItems()))
//   .subscribe();
// returns an unsubscribe function (removeChannel). Recreated on code change.

async function updateNote(id: string, patch: { title?: string; content?: string }): Promise<Item>
// supabase.from('items').update(patch).eq('id', id).select().single()
// NOTE: does not touch expires_at (editing does not renew expiry).

async function deleteItem(id: string): Promise<void>
// If the item is a file: storage.deleteObject(path) first, then delete the row.
//   supabase.from('items').delete().eq('id', id)

async function listExpired(): Promise<Pick<Item,'id'|'type'|'path'>[]>
// supabase.from('items').select('id,type,path').lte('expires_at', new Date().toISOString())
```

---

## `storage.js` — Upload service (only module touching Storage)

```ts
async function uploadFile(file: File): Promise<Item>
// 1. guard: file.size <= MAX_FILE_BYTES else throw Error('FILE_TOO_LARGE')
// 2. id = crypto.randomUUID(); path = `${code}/${id}-${sanitize(file.name)}`
// 3. supabase.storage.from(STORAGE_BUCKET).upload(path, file, { contentType: file.type })
// 4. meta = { title:file.name, path, file_name:file.name, file_size:file.size, mime_type:file.type }
// 5. return db.createFileItem(meta)   // row is written only AFTER bytes land

async function getDownloadUrl(path: string): Promise<string>
// supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, SIGNED_URL_TTL) -> signedUrl

async function deleteObject(path: string): Promise<void>
// supabase.storage.from(STORAGE_BUCKET).remove([path])
```

---

## `sortfilter.js`

```ts
type SortBy = 'date' | 'type' | 'size';
type Direction = 'asc' | 'desc';
type TypeFilter = 'all' | 'text' | 'file';

function applySortFilter(items: Item[], sel: {
  sortBy: SortBy; direction: Direction; typeFilter: TypeFilter;
}): Item[]
// filter by type; sort by created_at | type | (file_size ?? content?.length ?? 0); apply direction.
```

---

## `countdown.js`

```ts
function startTicker(onTick: () => void): () => void   // one setInterval(…,1000); returns stop()
function formatRemaining(expiresAt: string): string    // "14h 23m 05s"
function isExpired(expiresAt: string): boolean          // Date(expiresAt) <= now
```

---

## `main.js` — orchestration (no business logic)

```ts
async function init(): Promise<void>
// 1. rescope client to getRoomCode()
// 2. await sweepExpired()          // delete this code's expired items (client sweep)
// 3. render(await listItems())
// 4. unsub = subscribeItems(render)
// 5. startTicker(onSecond)         // re-check/remove expired cards
// 6. bind composer, uploader, toolbar, view-toggle, room-code widget events

async function sweepExpired(): Promise<void>
// for each of db.listExpired(): if file -> storage.deleteObject(path); then db.deleteItem(id)
```

---

## Error contract

- Functions **throw** on hard failure; the UI catches and shows a toast
  ([error-handling](../40-cross-cutting/error-handling.md)).
- Named errors: `INVALID_CODE`, `FILE_TOO_LARGE`, plus Supabase's `{ error }` surfaced as thrown
  `Error`.
- **File create ordering**: bytes upload **before** the metadata row, so a failed upload never leaves
  an orphan row. A row without bytes cannot occur; bytes without a row (if step 5 fails) are cleaned by
  the scheduled purge.
