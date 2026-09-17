/**
 * Rates Configuration & Messy Rate Card Import Routes — ParkSense (Level 1 — T4)
 * GET  /api/config/rates         — Get active cleaned rates per spot type
 * POST /api/config/rates/import  — Import, clean, and activate messy rate cards
 */

const express = require('express');
const { db } = require('../db/database');
const { parseMessyRateCard, DEFAULT_RATES } = require('../utils/rateCardParser');

const router = express.Router();

/**
 * GET /api/config/rates
 * Returns active rates per spot type
 */
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT spot_type, first_hour, additional_hour, daily_cap, currency, updated_at FROM rate_cards').all();
    
    const ratesBySpotType = {};
    rows.forEach(r => {
      ratesBySpotType[r.spot_type] = {
        firstHour: r.first_hour,
        additionalHour: r.additional_hour,
        dailyCap: r.daily_cap,
        currency: r.currency || '₹',
        updatedAt: r.updated_at
      };
    });

    // Fallback if DB empty
    ['compact', 'standard', 'ev'].forEach(type => {
      if (!ratesBySpotType[type]) {
        ratesBySpotType[type] = DEFAULT_RATES[type];
      }
    });

    res.json({
      rates: ratesBySpotType,
      legacyDefaults: {
        firstHour: ratesBySpotType.standard.firstHour,
        additionalHour: ratesBySpotType.standard.additionalHour,
        dailyCap: ratesBySpotType.standard.dailyCap,
        currency: '₹'
      }
    });
  } catch (err) {
    console.error('Fetch rates error:', err);
    res.status(500).json({ error: 'Server error', message: 'Failed to fetch rates' });
  }
});

/**
 * POST /api/config/rates/import
 * Import & sanitize messy rate card string or JSON object
 * Body: { rateCardText } or { rateCard }
 */
router.post('/import', (req, res) => {
  try {
    const { rateCardText, rateCard } = req.body || {};
    const input = rateCardText || rateCard;

    if (!input) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please provide rateCardText or rateCard object to clean and import'
      });
    }

    const { cleanedRates, diffLog, originalInput } = parseMessyRateCard(input);

    // Save cleaned rates into SQLite DB
    const upsertRate = db.prepare(`
      INSERT INTO rate_cards (spot_type, first_hour, additional_hour, daily_cap, currency, updated_at)
      VALUES (?, ?, ?, ?, '₹', datetime('now'))
      ON CONFLICT(spot_type) DO UPDATE SET
        first_hour = excluded.first_hour,
        additional_hour = excluded.additional_hour,
        daily_cap = excluded.daily_cap,
        updated_at = datetime('now')
    `);

    db.transaction(() => {
      ['compact', 'standard', 'ev'].forEach(type => {
        const r = cleanedRates[type];
        upsertRate.run(type, r.firstHour, r.additionalHour, r.dailyCap);
      });
    })();

    res.json({
      message: 'Messy rate card successfully cleaned and activated!',
      cleanedRates,
      diffLog,
      originalInput
    });
  } catch (err) {
    console.error('Rate card import error:', err);
    res.status(500).json({ error: 'Server error', message: 'Failed to parse and import rate card' });
  }
});

module.exports = router;
