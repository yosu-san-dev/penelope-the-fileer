---
layer: 0
status: 🟢 done
related:
  - "[system-context](system-context.md)"
  - "[architecture](architecture.md)"
  - "[primary-flows](primary-flows.md)"
  - "[doc-map](../_meta/doc-map.md)"
---

# Penelope The Fileer — Overview

> A lightweight, **fully client‑side** web app for quickly moving **text snippets and files between
> a phone and a laptop** (either direction). Every item **auto‑expires after 24 hours**.

This is the top layer — the whole app at a glance. Deeper layers ([subsystems](../10-subsystems/),
[components](../20-components/), [data & API](../30-data-and-api/)) drill into each part.

---

## 1. Problem & goal

- **The itch:** I often need to shove a bit of text or a file from my phone to my laptop (or back)
  *fast*. Lots of sites do this — I want my own anyway, for my convenience and the people around me.
- **The goal:** paste text or drop a file on one device, grab it from the other, and have it quietly
  disappear after 24 h so nothing piles up.
- **Non‑goals:** not built for a big public audience; **no backend I run myself**; **permanent
  storage is explicitly not wanted.**

## 2. Vision & philosophy

- **Dead‑simple, minimal, disposable.** Your items listed, filterable, and self‑deleting.
- **Privacy via a room code, not accounts.** No sign‑up, no passwords.
- **Cheap & static.** Hostable on GitHub Pages, with no server of my own to run or pay for.

## 3. How it works in one paragraph

You open the site. It gives your device an **8‑character room code** (saved in the browser). Type
that same code on your other device and the two share one private stream. Paste text → it becomes a
**note**; drop a file → it uploads and appears as a **file item**. Everything lives in
**Supabase** (a Postgres row per item; file bytes in Supabase Storage). Each item shows a
**live countdown** to its 24‑hour expiry, and is removed automatically when the time is up.

## 4. Technology stack

| Area | Choice | Notes |
|---|---|---|
| Frontend | **Plain JS + HTML + CSS** | Single‑page app, 100 % client‑side |
| Hosting | **Static (GitHub Pages)** | No server of my own |
| Database | **Supabase Postgres** | Text notes + file **metadata** |
| File storage | **Supabase Storage** | The actual file **bytes**, one folder per room code |
| Identity | **8‑char room code** | In `localStorage`, editable, no accounts |
| Auto‑delete | **Hybrid** | Scheduled `pg_cron` → Edge Function purge **+** client-side on-load sweep |

> **Why Supabase and not Firebase?** The original idea used Firebase, but Firebase **Cloud Storage
> now requires the paid Blaze plan**, so file uploads aren't free. Supabase's free tier includes
> **both** Postgres **and** file storage behind one client SDK, so the whole app stays free and
> client‑side. (See [architecture](architecture.md).)

## 5. Core features

1. **Text sharing** — a prominent text area; paste text/links, hit **Share** → creates a note row.
2. **File uploading** — drag‑and‑drop or file picker → bytes go to Storage (in a folder named after
   the room code) → a metadata row is created (download URL, name, size, type).
3. **Manual deletion** — every item has a **Delete** button; deleting a file removes **both** the
   row **and** the stored object.
4. **24‑hour expiry + live counter** — every item has `created_at` + `expires_at` (+24 h); each card
   shows a per‑second countdown ("Expires in: 14h 23m 05s"); expired items are ignored by the UI and
   physically purged.
5. **Views, sort & filter** — toggle **List** vs **Grid** (grid max 5 per row on desktop, scaling
   down); sort/filter by **date created**, **type** (text vs file), or **size**; ascending/descending.

## 6. Identity model (room code)

- **No username/password.** On first visit the app checks `localStorage` for a code; if none, it
  generates a random **8‑character** alphanumeric string (long enough to at least spell *Penelope*)
  and saves it.
- The user can **view and edit** the code and type the same one on another device to link them.
- **Every database and storage query is scoped strictly to this code.** Isolation is relaxed (fine
  for me + a few friends), enforced by Supabase Row‑Level Security. Details in
  [auth](../10-subsystems/auth-room-code.md) and [security-rls](../30-data-and-api/security-rls.md).

## 7. Expiry & auto‑delete (hybrid)

Supabase has no built‑in TTL, so **we build the cleanup ourselves**, two ways that back each other up:

- **Scheduled purge** — a `pg_cron` job periodically runs a Supabase **Edge Function** that deletes
  every item where `expires_at < now()` (both the stored file and its row). This is the guarantee
  that reclaims storage even if nobody opens the app.
- **Client‑side on‑load sweep** — when any device opens the app, it also deletes its own already‑
  expired items, so cleanup feels instant.

Both reuse the same "remove file + remove row" path as the manual **Delete** button.
See [expiration-and-cleanup](../10-subsystems/expiration-and-cleanup.md).

## 8. Scope & deferred decisions

- **Design is deferred.** The earlier build's look wasn't liked; the intended visual design will be
  supplied later. **Docs don't invent a design** — the UI layer leaves a placeholder.
- **Fixes folded in from the start** (issues found in the deleted first build): notes need a
  **title** (not the whole text on screen), clicking a note opens a **view/edit panel**, **uploaded
  files must appear** in the list, listing is **database‑driven** (not browser localStorage), and the
  Supabase wiring must actually work end‑to‑end.

## 9. Glossary

| Term | Meaning |
|---|---|
| **Item** | Any shared thing — a note or a file — one row in the database. |
| **Note** | A text item. Has a title + body; body is viewable/editable. |
| **File item** | An uploaded file. Row holds metadata; bytes live in Storage. |
| **Room code** | The 8‑char string that scopes one user's private stream across devices. |
| **Expiry / TTL** | The 24 h lifetime after which an item is purged. |
| **Purge** | Physical deletion of expired items (file bytes + row). |
| **Sweep** | The client‑side, on‑load pass that deletes the current user's expired items. |

## 10. Where to go next

- [System context](system-context.md) — the app and everything it talks to.
- [Architecture](architecture.md) — the internal layers and subsystems.
- [Primary flows](primary-flows.md) — share text, upload a file, link a device, expiry cleanup.
- [Doc map](../_meta/doc-map.md) — the full index and progress tracker.
