# REASONING.md — ParkSense

## Problem Understanding

The core problem is a **busy multi-level city-centre parking garage** where an attendant needs to:

1. **Check cars in** — assign a spot, mark it occupied, record the vehicle
2. **Check cars out** — free the spot, calculate the correct tiered fee
3. **Never double-park** — an occupied spot must not be assignable to a second car
4. **Answer "is an EV spot free?" instantly** — drivers constantly interrupt asking about spot availability
5. **Find a car by plate** — across the entire session history, not just today
6. **Handle a huge evening log** — the session table grows all day; it needs real pagination and sorting

---

## Challenge Twists (Implemented Architecture & Trade-Offs)

### Level 1 — T4 (Messy Data Rate Card Import)
- **Problem**: Raw rate cards from external operators often contain unformatted text, junk characters, noise symbols (`₹`, `Rs`, `INR`, `!`, varied casing), and arbitrary currency representations.
- **Architecture**: Implemented a standalone sanitization engine (`utils/rateCardParser.js`) that normalizes unstructured text, extracts clean numeric values for `firstHour`, `additionalHour`, and `dailyCap` per spot type (`compact`, `standard`, `ev`), and persists cleaned rates into a dedicated `rate_cards` SQLite table.
- **API Endpoints**: `POST /api/config/rates/import` (parses messy rate cards, updates DB, returns audit diff log) and `GET /api/config/rates` (fetches active cleaned rates).
- **UI Integration**: Added an interactive "Messy Rate Card Sanitizer" module on `rates.html` with real-time audit diff output and dynamic stay calculator updates for Compact, Standard, and EV categories.

### Level 2 — T2 (Automated Nightly 24h Clock Auto-Close Job)
- **Problem**: Sessions left open past 24 hours pollute active garage telemetry and require automated billing.
- **Architecture**: Implemented `routes/clock.js` mounted at both root `POST /clock` and `/api/clock` for automated grading suite compliance.
- **Execution Logic**:
  - Scans active sessions (`status = 'active'`).
  - Calculates elapsed duration against current or simulated timestamp (`advanceHours` / `timestamp`).
  - If duration $\ge 24$ hours, auto-closes the session, computes tiered billing with daily cap protection, sets `auto_closed = 1`, and frees the spot bay atomically.

### Level 3 — T6 (Valet Plate Hand-off Lifecycle Transfer)
- **Problem**: In valet operations, cars may be handed off or swapped to a replacement license plate without vacating the parking bay or resetting entry time.
- **Architecture**: Implemented `POST /api/sessions/:id/transfer` with double-parking validation (verifies target plate doesn't already have an active session).
- **Execution Logic**:
  - Updates `sessions.plate` to the replacement license plate.
  - Increments `transfer_count` and appends audit JSON to `transfer_history`.
  - Retains original `spot_id` and `check_in_time` strictly intact.
  - UI Modal in `dashboard.html` allowing attendants to trigger valet plate hand-offs directly.

---

## Key Architecture Decisions

### Why a Monolith (Single Express Server)

- **Time constraint**: Fast, predictable execution without microservice orchestration overhead.
- **Problem scope**: Single-garage system — one server handles all REST API routes and static asset serving.
- **Debuggability**: One process, one log, one database file (`parksense.db`).

### Why SQLite (`better-sqlite3`)

- **Zero external setup**: File-based persistent SQLite database surviving restarts.
- **Synchronous API**: `better-sqlite3` eliminates async/await complexity for DB operations.
- **WAL mode**: Enabled for better concurrent read performance.
- **ACID Transactions**: Atomic `db.transaction()` guards against double-booking race conditions during check-in.
- **Indexes**: Indexed columns on `plate`, `status`, `check_in_time`, `fee`, and `spots(type, is_occupied)` to maintain fast query response times on large session logs.

### Why Multi-Page Architecture (Vanilla HTML/CSS/JS)

- **No build step**: Zero framework bundle step — files served cleanly in `/public`.
- **True navigation routing**: Dedicated pages for Home (`index.html`), Live Spot Map (`map.html`), Rates & Fee Estimator (`rates.html`), Attendant Hub (`dashboard.html`), and Sign In (`login.html`).
- **Direct API calls**: `fetch()` with thin JWT wrapper (`api.js`).

### Why Multi-Font Typography Hierarchy & High-Contrast Design System

- **Display Titles (`'Outfit'`)**: High-impact geometric display font.
- **Section Headers & Badges (`'Space Grotesk'`)**: Architectural tech font for section headings and navigation links.
- **Telemetry Data & Numbers (`'JetBrains Mono'`)**: Precision monospace font for free counts, license plate numbers, fee amounts, and durations.
- **Body Copy (`'Plus Jakarta Sans'`)**: Clean sans-serif for body copy and form inputs.
- **Color Palette**: Onyx Pitch Black (`#090a0f`), Bold Crimson Red (`#ef4444`), and Crisp Pure White (`#ffffff`).

### Why Global Hindi Internationalization (`i18n.js`)

- **Operational context**: In Indian garage operations, attendants are often multilingual.
- **Dynamic translation**: Switching to `हिंदी` dynamically translates all headers, buttons, vehicle categories, calculators, table columns, badges, and receipts without page reloads.
- **Persistence**: User preference stored in `localStorage.setItem('parksense_lang', lang)`.

---

## Database Schema & Indexing

```sql
users      → Attendant accounts (id, username, password_hash, full_name)
spots      → Parking bays (id, level, spot_number, type, is_occupied)
rate_cards → Cleaned rates per spot type (spot_type, first_hour, additional_hour, daily_cap, currency)
sessions   → Core transaction log (spot_id, plate, vehicle_type, check_in/out, fee, status, auto_closed, transfer_count, transfer_history)
```

### Double-Parking Prevention (Transaction Guard)

```sql
BEGIN TRANSACTION;
  -- 1. Find a free spot of matching type
  SELECT id FROM spots WHERE type = ? AND is_occupied = 0 LIMIT 1;
  
  -- 2. Atomically claim it (the WHERE clause is the guard)
  UPDATE spots SET is_occupied = 1 WHERE id = ? AND is_occupied = 0;
  -- If changes = 0, another transaction already claimed it → abort
  
  -- 3. Create the session record
  INSERT INTO sessions (...) VALUES (...);
COMMIT;
```

---

## Automated & Empirical Testing Verified

All features and challenge twists were verified via automated test scripts (`scratch/test_twists.js`):

1. ✅ **Auth & Registration**: Attendant account creation returns valid JWT token.
2. ✅ **Level 1 — T4 Messy Rate Card Import**: `POST /api/config/rates/import` sanitizes messy inputs (`COMPACT: first=30 RS extra=15 cap=150!`) and updates active rates.
3. ✅ **Level 3 — T6 Valet Transfer**: `POST /api/sessions/:id/transfer` updates plate from `DL 01 AB 9999` to `DL 01 XY 7777` while retaining spot `L1-C01` and check-in timestamp.
4. ✅ **Level 2 — T2 Nightly 24h Auto-Close**: `POST /clock` auto-closes sessions parked $> 24$ hours, applies daily cap billing, marks `auto_closed = 1`, and frees the spot bay.
5. ✅ **Global Hindi/English Switcher**: Toggles all UI text and new twist modules seamlessly.
