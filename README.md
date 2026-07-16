# Penelope The Fileer

> A lightweight, **fully client-side** web app for quickly moving text snippets and files between a phone and a laptop (in either direction). Every item **auto-expires after 24 hours**.

## Vision & Philosophy
- **Dead-simple, minimal, disposable.** Your items are listed, filterable, and self-deleting.
- **Privacy via a room code, not accounts.** No sign-up, no passwords.
- **Cheap & static.** Hostable on GitHub Pages (or any static host), with no backend server of your own to run or pay for. Supabase provides the database and file storage.

## How it works
Open the site. It assigns your device an **8-character room code** (saved in the browser). Type that same code on your other device and the two share one private stream. Paste text to create a **note**, or drop a file to upload a **file item**. 
Everything lives in **Supabase** (a Postgres row per item; file bytes in Supabase Storage). Each item shows a live countdown to its 24-hour expiry, and is removed automatically when the time is up.

## Features
1. **Text sharing** — Paste text or links, hit Share to create a note.
2. **File uploading** — Drag-and-drop or file picker. Files are securely uploaded to Supabase Storage.
3. **Smart Room Codes** — The app automatically finds an unused 8-character code for new devices.
4. **24-hour expiry + live counter** — Items have a 24-hour TTL and are purged automatically.
5. **Views, sort & filter** — Toggle between List and Grid views. Search, sort, and filter your items instantly.

## Setup & Deployment

Since Penelope is 100% client-side, you only need to host the static files in the root directory. However, you must set up a Supabase project to provide the database and storage.

### 1. Supabase Setup
1. Create a new project at [Supabase](https://supabase.com/).
2. Go to the SQL Editor and run the provided SQL scripts in the `supabase/` directory:
   - Run `supabase/schema.sql` to create the `items` table and the `penelope-files` storage bucket.
   - Run `supabase/policies.sql` to apply Row Level Security (RLS) policies.
3. (Optional) Deploy the Edge Function in `supabase/functions/purge-expired` to handle the background deletion of expired items. 

### 2. Configure the App
1. Make sure `config/supabase-config.js` exists (you can copy `supabase-config.example.js` if needed).
2. Update the `SUPABASE_URL` and `SUPABASE_ANON_KEY` inside it with your project's credentials (found in Supabase Project Settings > API).

### 3. Run Locally or Deploy
- To test locally, simply serve the root directory using any local web server (e.g., `npx serve .`).
- To deploy, host the root directory on GitHub Pages, Vercel, Netlify, or any other static hosting provider.
