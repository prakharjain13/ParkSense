/**
 * Spots Routes — ParkSense
 * GET /api/spots/availability — summary by type
 * GET /api/spots            — list all spots with filters
 */

const express = require('express');
const { db } = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All spot routes require auth
router.use(authMiddleware);

/**
 * GET /api/spots/availability
 * Returns availability summary by spot type
 * This is the "answer before they ask" endpoint
 */
router.get('/availability', (req, res) => {
  try {
    const summary = db.prepare(`
      SELECT 
        type,
        COUNT(*) as total,
        SUM(CASE WHEN is_occupied = 0 THEN 1 ELSE 0 END) as free,
        SUM(CASE WHEN is_occupied = 1 THEN 1 ELSE 0 END) as occupied
      FROM spots
      GROUP BY type
      ORDER BY type
    `).all();

    // Also get per-level breakdown
    const perLevel = db.prepare(`
      SELECT 
        level,
        type,
        COUNT(*) as total,
        SUM(CASE WHEN is_occupied = 0 THEN 1 ELSE 0 END) as free,
        SUM(CASE WHEN is_occupied = 1 THEN 1 ELSE 0 END) as occupied
      FROM spots
      GROUP BY level, type
      ORDER BY level, type
    `).all();

    // Grand total
    const grand = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_occupied = 0 THEN 1 ELSE 0 END) as free,
        SUM(CASE WHEN is_occupied = 1 THEN 1 ELSE 0 END) as occupied
      FROM spots
    `).get();

    res.json({ summary, perLevel, grand });
  } catch (err) {
    console.error('Availability error:', err);
    res.status(500).json({ error: 'Server error', message: 'Failed to fetch availability' });
  }
});

/**
 * GET /api/spots
 * List all spots with optional filters: type, level, status (free/occupied)
 */
router.get('/', (req, res) => {
  try {
    const { type, level, status } = req.query;

    let sql = `
      SELECT 
        s.id,
        s.level,
        s.spot_number,
        s.type,
        s.is_occupied,
        sess.id as session_id,
        sess.plate,
        sess.vehicle_type,
        sess.check_in_time
      FROM spots s
      LEFT JOIN sessions sess ON s.id = sess.spot_id AND sess.status = 'active'
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      sql += ' AND s.type = ?';
      params.push(type);
    }
    if (level) {
      sql += ' AND s.level = ?';
      params.push(level);
    }
    if (status === 'free') {
      sql += ' AND s.is_occupied = 0';
    } else if (status === 'occupied') {
      sql += ' AND s.is_occupied = 1';
    }

    sql += ' ORDER BY s.level, s.spot_number';

    const spots = db.prepare(sql).all(...params);
    res.json({ spots, count: spots.length });
  } catch (err) {
    console.error('List spots error:', err);
    res.status(500).json({ error: 'Server error', message: 'Failed to fetch spots' });
  }
});

module.exports = router;
