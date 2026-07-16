---
layer: 0
status: 🟢 done
related:
  - "[README](README.md)"
  - "[architecture](architecture.md)"
---

# Primary Flows

The handful of end‑to‑end journeys that define the app. Each is shown top‑to‑bottom as a sequence.
Detailed per‑component behaviour lives in Layer 2 ([components](../20-components/)); the exact call
signatures live in Layer 3 ([client-sdk-contracts](../30-data-and-api/client-sdk-contracts.md)).

The four flows: **share text · upload file · link a device · expiry & cleanup**.

---

## Flow 1 — Share text (create a note)

```mermaid
sequenceDiagram
    actor U as User
    participant UI as UI (text area)
    participant Items as Items service
    participant SDK as Supabase client
    participant DB as Postgres (items)

    U->>UI: paste text, click "Share"
    UI->>Items: shareText(title, body)
    Items->>Items: set created_at = now, expires_at = now + 24h
    Items->>SDK: insert row {code, type:'text', title, content, timestamps}
    SDK->>DB: INSERT (RLS checks code)
    DB-->>SDK: new row
    SDK-->>Items: ok
    Note over UI,DB: realtime subscription pushes the new row → UI re-renders the list
```

![Share text flow|697](diagrams/flow-share-text.svg)

**Notes:** a note has a **title** shown in the card and a **body** opened in the editor panel — a big
paste never fills the screen. The list re‑renders from the **database**, not local state.

---

## Flow 2 — Upload a file

```mermaid
sequenceDiagram
    actor U as User
    participant UI as Uploader (drop / picker)
    participant Up as Upload service
    participant Store as Supabase Storage
    participant Items as Items service
    participant DB as Postgres (items)

    U->>UI: drop file / choose file
    UI->>Up: uploadFile(file)
    Up->>Store: put bytes at <code>/<id>-<name>
    Store-->>Up: object path / public URL
    Up->>Items: create row {type:'file', title, file_url, file_name, file_size, mime_type, timestamps}
    Items->>DB: INSERT (RLS checks code)
    DB-->>Items: new row
    Note over UI,DB: realtime pushes the row → file appears in the list like a note
```

![Upload file flow|697](diagrams/flow-upload-file.svg)

**Notes:** bytes **and** metadata are created together. Fixing a first‑build bug, **the uploaded file
now appears** in the list immediately, in the same card format (title, size, type).

---

## Flow 3 — Link a second device

```mermaid
sequenceDiagram
    actor U as User
    participant P as Phone (has code)
    participant L as Laptop (new visit)
    participant LS as localStorage
    participant DB as Supabase

    Note over P: already has code "PEN1LOPE"
    U->>L: open the site
    L->>LS: read room code
    LS-->>L: none found
    L->>L: generate 8-char code, but...
    U->>L: type the phone's code "PEN1LOPE"
    L->>LS: save "PEN1LOPE"
    L->>DB: query items where code = "PEN1LOPE"
    DB-->>L: the shared stream
    Note over P,L: both devices now read/write the same items
```

![Link device flow|697](diagrams/flow-link-device.svg)

**Notes:** linking is just **sharing the same code**. No pairing handshake, no account — the code in
`localStorage` is the only identity, and it's user‑editable.

---

## Flow 4 — Expiry & cleanup (hybrid)

```mermaid
sequenceDiagram
    autonumber
    participant Cron as pg_cron (schedule)
    participant Edge as Edge Function
    participant DB as Postgres (items)
    participant Store as Supabase Storage
    participant UI as Any device on load

    Cron->>Edge: trigger (e.g. hourly)
    Edge->>DB: select items where expires_at < now()
    DB-->>Edge: expired rows
    Edge->>Store: delete each expired object
    Edge->>DB: delete expired rows
    Note over Cron,Store: server-side guarantee — reclaims storage even if nobody visits

    UI->>DB: on load, select own items where expires_at < now()
    DB-->>UI: expired rows (if any)
    UI->>Store: delete objects
    UI->>DB: delete rows
    Note over UI: client-side sweep — instant cleanup; UI also hides anything past expires_at
```

![Expiry & cleanup flow|697](diagrams/flow-expiry-cleanup.svg)

**Notes:** two independent mechanisms. The **scheduled purge** is the real guarantee; the **on‑load
sweep** keeps things instant. Both reuse the same "delete object + delete row" path as the manual
**Delete** button, and the UI always **hides** items past `expires_at` regardless of purge timing.

---

## Flow summary

| # | Flow | Trigger | Touches |
|---|---|---|---|
| 1 | Share text | User clicks Share | Items → DB |
| 2 | Upload file | Drop / pick file | Storage → Items → DB |
| 3 | Link device | Type same code | localStorage → DB |
| 4 | Expiry & cleanup | Schedule + app load | Edge/pg_cron + client sweep → DB + Storage |
