-- ParkSense Database Schema
-- SQLite with better-sqlite3

-- Users table (attendant accounts)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Parking spots (seeded on init)
CREATE TABLE IF NOT EXISTS spots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,
  spot_number TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('compact', 'standard', 'ev')),
  is_occupied INTEGER DEFAULT 0 CHECK(is_occupied IN (0, 1)),
  UNIQUE(level, spot_number)
);

-- Rate cards table per spot type (Level 1 — T4)
CREATE TABLE IF NOT EXISTS rate_cards (
  spot_type TEXT PRIMARY KEY CHECK(spot_type IN ('compact', 'standard', 'ev')),
  first_hour REAL NOT NULL,
  additional_hour REAL NOT NULL,
  daily_cap REAL NOT NULL,
  currency TEXT DEFAULT '₹',
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Parking sessions (the core transaction log)
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spot_id INTEGER NOT NULL,
  plate TEXT NOT NULL,
  vehicle_type TEXT NOT NULL CHECK(vehicle_type IN ('compact', 'standard', 'ev')),
  check_in_time TEXT NOT NULL DEFAULT (datetime('now')),
  check_out_time TEXT,
  fee REAL,
  fee_breakdown TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  auto_closed INTEGER DEFAULT 0,
  transfer_count INTEGER DEFAULT 0,
  transfer_history TEXT,
  checked_in_by INTEGER,
  checked_out_by INTEGER,
  FOREIGN KEY (spot_id) REFERENCES spots(id),
  FOREIGN KEY (checked_in_by) REFERENCES users(id),
  FOREIGN KEY (checked_out_by) REFERENCES users(id)
);

-- Performance indexes for large log handling
CREATE INDEX IF NOT EXISTS idx_sessions_plate ON sessions(plate);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_check_in ON sessions(check_in_time);
CREATE INDEX IF NOT EXISTS idx_sessions_check_out ON sessions(check_out_time);
CREATE INDEX IF NOT EXISTS idx_sessions_fee ON sessions(fee);
CREATE INDEX IF NOT EXISTS idx_spots_type_occupied ON spots(type, is_occupied);
CREATE INDEX IF NOT EXISTS idx_spots_level ON spots(level);
