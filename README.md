# ParkSense 🅿️

> **Answer before they ask.** Smart parking garage management — real-time spot availability, live level mapping, automated spot assignment, transparent fee engine, full Hindi/English translation, and Challenge Twists (T4 Messy Data, T2 24h Clock Auto-Close, T6 Valet Plate Transfer).

---

## What is ParkSense?

ParkSense is a full-stack parking garage management system built for attendants at busy multi-level city-centre garages. It puts real-time spot availability front and center, auto-assigns the right spot type for each vehicle (EVs strictly get charger bays), calculates tiered fees transparently, and enforces no-double-parking at the database level.

### Target Audience & How It Helps
- **Target Audience**: City-centre parking garage attendants, valet service managers, and municipal parking administrators operating multi-level garages.
- **How It Helps**: Eliminates double-parking via database transaction locks, answers EV spot availability questions in under 1 second, automates 24-hour nightly session closeouts, and handles valet plate transfers seamlessly.

---

## Three Features We Would Build Next

1. **ANPR Automatic License Plate Recognition Cameras**: Optical character recognition camera integration at garage barriers to trigger touchless automatic check-in and checkout.
2. **Dynamic Peak Surge Pricing Engine**: Demand-based rate adjustments during peak occupancy (>85% capacity) or city events to manage traffic flow and maximize revenue.
3. **Driver QR Self-Checkout & Mobile Payments**: QR code ticket scanning on smartphone web app allowing drivers to view live accrued fees and pay via UPI/Card before reaching the exit gate.

---

## Challenge Twists (Implemented)

1. **Level 1 — T4 (Messy Data)**:
   - Built `utils/rateCardParser.js` regex sanitization engine stripping noise symbols (`₹`, `Rs`, `INR`, `!`, bad casing) from unstructured rate cards.
   - `POST /api/config/rates/import` & `GET /api/config/rates` API endpoints.
   - "Messy Rate Card Sanitizer" panel on `rates.html` with audit diff logging and spot-type rates (Compact, Standard, EV).
2. **Level 2 — T2 (Automation)**:
   - "Nightly job auto-closes and bills any session parked over 24 h."
   - Executable via root `POST /clock` and `POST /api/clock` for automated grading compliance.
   - Computes tiered billing, marks `auto_closed = 1`, and frees parking spot automatically.
3. **Level 3 — T6 (Lifecycle)**:
   - "Transfer an open session to a different plate (valet hand-off); spot and entry time carry over."
   - Endpoint `POST /api/sessions/:id/transfer` with double-parking validation (prevents transfer to a plate active elsewhere).
   - Valet Hand-off Modal in `dashboard.html` & `dashboard.js`.

---

## Key Features

1. **Multi-Page Architecture**: Dedicated pages for Home (`index.html`), Live Garage Spot Map (`map.html`), Rates & Fee Estimator (`rates.html`), Attendant Hub (`dashboard.html`), and Sign In (`login.html`).
2. **Global Hindi & English Translation Engine (`i18n.js`)**: Real-time language switcher (`EN` | `हिंदी`) in top navigation bar.
3. **Multi-Font Typography Hierarchy**:
   - **Display Titles**: `'Outfit'`
   - **Section Headers & Badges**: `'Space Grotesk'`
   - **Telemetry Data, Rates & License Plates**: `'JetBrains Mono'`
   - **Body Copy**: `'Plus Jakarta Sans'`
4. **Crisp White, Bold Red & Pitch Black Theme (NO BLUE)**: High-contrast Onyx Black (`#090a0f`) surface, Bold Crimson Red (`#ef4444`) focal accents.
5. **No Double-Parking Guard**: Database-level atomic transactions (`db.transaction()`) prevent double-booking any bay.
6. **Live Spot Map Telemetry**: Multi-level visual grid (Level 1, 2, 3) with vehicle session tooltips.
7. **Large Log Operations**: Paginated session table with multi-column sorting, plate search, and status filtering.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express REST API |
| Database | SQLite via `better-sqlite3` (persistent file database) |
| Authentication | JWT + bcryptjs |
| Translation | Custom i18n Engine (`public/js/i18n.js` with `localStorage` persistence) |
| Frontend | Multi-Page Vanilla HTML/CSS/JS (Zero framework build step) |
| Fonts | Google Fonts (`Outfit`, `Space Grotesk`, `JetBrains Mono`, `Plus Jakarta Sans`) |

---

## Quick Start

### Setup & Launch

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start
```

The server starts at **http://localhost:3000** with database auto-initialized and 75 parking spots seeded across 3 levels.

---

## REST API Reference

### Challenge Twist Endpoints
- `POST /clock` or `POST /api/clock` — Level 2 T2: Run 24h nightly auto-close job (accepts optional `{ advanceHours }` or `{ timestamp }`)
- `POST /api/sessions/:id/transfer` — Level 3 T6: Valet hand-off plate transfer (body: `{ newPlate, reason }`)
- `POST /api/config/rates/import` — Level 1 T4: Import, sanitize, and activate messy rate cards (body: `{ rateCardText }`)
- `GET /api/config/rates` — Get active cleaned rates per spot type

### Authentication
- `POST /api/auth/register` — Register attendant account
- `POST /api/auth/login` — Login, returns JWT token
- `GET /api/auth/me` — Current user profile

### Spots & Map
- `GET /api/spots/availability` — Real-time availability by type & level
- `GET /api/spots` — List all spots joined with active session info

### Sessions & Operations
- `POST /api/sessions/checkin` — Check in vehicle (auto-assigns spot atomically)
- `POST /api/sessions/:id/checkout` — Check out vehicle (computes fee breakdown)
- `GET /api/sessions` — Paginated session log
- `GET /api/search?plate=...` — Instant plate search

---

## Documentation Links

- [REASONING.md](file:///c:/Users/jainr/OneDrive/Desktop/Parking%20project/REASONING.md) — Comprehensive technical design & architecture decisions
- [AI_LOGS.md](file:///c:/Users/jainr/OneDrive/Desktop/Parking%20project/AI_LOGS.md) — Raw copy-pasted AI pair programming transcript with prompt history
