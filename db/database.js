/**
 * Database Connection & Initialization — ParkSense
 * Uses better-sqlite3 for synchronous, file-based SQLite
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../utils/config');
const { DEFAULT_RATES } = require('../utils/rateCardParser');

// Ensure db directory exists
const dbDir = path.dirname(path.resolve(config.dbPath));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create/open database
const db = new Database(path.resolve(config.dbPath));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Initialize schema from schema.sql and apply alter migrations if needed
 */
function initializeDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // Safe ALTER migrations for existing databases
  try {
    db.exec("ALTER TABLE sessions ADD COLUMN auto_closed INTEGER DEFAULT 0;");
  } catch (e) { /* column already exists */ }

  try {
    db.exec("ALTER TABLE sessions ADD COLUMN transfer_count INTEGER DEFAULT 0;");
  } catch (e) { /* column already exists */ }

  try {
    db.exec("ALTER TABLE sessions ADD COLUMN transfer_history TEXT;");
  } catch (e) { /* column already exists */ }

  // Seed default rate cards if empty
  const count = db.prepare('SELECT COUNT(*) as count FROM rate_cards').get().count;
  if (count === 0) {
    const insertRate = db.prepare(`
      INSERT OR REPLACE INTO rate_cards (spot_type, first_hour, additional_hour, daily_cap, currency)
      VALUES (?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      insertRate.run('compact', DEFAULT_RATES.compact.firstHour, DEFAULT_RATES.compact.additionalHour, DEFAULT_RATES.compact.dailyCap, '₹');
      insertRate.run('standard', DEFAULT_RATES.standard.firstHour, DEFAULT_RATES.standard.additionalHour, DEFAULT_RATES.standard.dailyCap, '₹');
      insertRate.run('ev', DEFAULT_RATES.ev.firstHour, DEFAULT_RATES.ev.additionalHour, DEFAULT_RATES.ev.dailyCap, '₹');
    })();
    console.log('✓ Seeded default rate cards per spot type');
  }

  console.log('✓ Database schema initialized');
}

/**
 * Seed parking spots based on config
 */
function seedSpots() {
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM spots').get().count;
  if (existingCount > 0) {
    console.log(`✓ Spots already seeded (${existingCount} spots exist)`);
    return;
  }

  const insert = db.prepare(
    'INSERT INTO spots (level, spot_number, type) VALUES (?, ?, ?)'
  );

  const insertMany = db.transaction(() => {
    for (const level of config.garage.levels) {
      let spotIndex = 1;

      // Compact spots
      for (let i = 0; i < config.garage.spotsPerLevel.compact; i++) {
        const spotNumber = `${level}-C${String(spotIndex).padStart(2, '0')}`;
        insert.run(level, spotNumber, 'compact');
        spotIndex++;
      }

      // Standard spots
      for (let i = 0; i < config.garage.spotsPerLevel.standard; i++) {
        const spotNumber = `${level}-S${String(spotIndex).padStart(2, '0')}`;
        insert.run(level, spotNumber, 'standard');
        spotIndex++;
      }

      // EV spots
      for (let i = 0; i < config.garage.spotsPerLevel.ev; i++) {
        const spotNumber = `${level}-EV${String(spotIndex).padStart(2, '0')}`;
        insert.run(level, spotNumber, 'ev');
        spotIndex++;
      }
    }
  });

  insertMany();
  const totalSpots = db.prepare('SELECT COUNT(*) as count FROM spots').get().count;
  console.log(`✓ Seeded ${totalSpots} parking spots across ${config.garage.levels.length} levels`);
}

module.exports = { db, initializeDatabase, seedSpots };
