---
layer: 4
status: 🟢 done
related:
  - "[architecture](../00-overview/architecture.md)"
  - "[ui-shell-and-views](../10-subsystems/ui-shell-and-views.md)"
  - "[data-layer-supabase](../10-subsystems/data-layer-supabase.md)"
---

# Cross-cutting — Client State Model

What the app holds in memory, what it persists, and what is always re‑derived from the database. Keeps
a first‑build bug from returning: **items are never the browser's source of truth**.

---

## State inventory

| State | Lives in | Persisted? | Source of truth |
|---|---|---|---|
| **Room code** | `auth` | ✅ `localStorage["penelope.roomCode"]` | localStorage (the only persisted app data) |
| **Item set** | in‑memory (`main`) | ❌ | **Database** (via `listItems` / realtime) |
| **View mode** (list/grid) | in‑memory | ⚪ optional convenience persist | UI |
| **Sort/filter selection** | in‑memory | ⚪ optional convenience persist | UI |
| **Open editor panel** (which item) | in‑memory | ❌ | UI |
| **Realtime subscription handle** | in‑memory | ❌ | — |
| **Ticker handle** (1 s interval) | in‑memory | ❌ | — |

> Only the **room code** is persisted app data. Everything about items is fetched from Supabase and
> lives only for the session.

## Lifecycle

```
init():
  code    = auth.getRoomCode()          # from localStorage (or generate)
  client  = rescope(code)               # header set
  sweepExpired()                        # remove this code's expired items
  items   = listItems()                 # DB-driven
  render(applySortFilter(items, sel))
  unsub   = subscribeItems(render)      # realtime keeps items fresh
  stop    = startTicker(onSecond)       # per-second countdowns + expiry removal
```

## On room‑code change

Tear down and rebuild the data‑bound state; keep UI prefs:

```
setRoomCode(newCode):
  persist newCode; rescope(newCode)
  unsub()                 # drop old subscription
  items = listItems()     # reload for new code
  render(...)
  unsub = subscribeItems(render)
  # viewMode / sort-filter selection are preserved
```

## Invariants

- The **item set is always a projection of the DB** for the current code — never edited in place as
  the source of truth; writes go to Supabase and come back via realtime/`listItems`.
- Changing the code fully **re‑scopes** data state (new subscription, fresh list) while preserving
  presentation preferences.
- Exactly **one** realtime channel and **one** ticker are alive at a time.
