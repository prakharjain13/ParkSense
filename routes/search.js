/**
 * Search Routes — ParkSense
 * GET /api/search?plate=ABC — Search sessions by plate (partial match, all history)
 */

const express = require('express');
const { db } = require('../db/database');
const config = require('../utils/config');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

/**
 * GET /api/search
 * Search sessions by license plate across all history (active + completed)
 * Supports partial matching and pagination
 */
router.get('/', (req, res) => {
  try {
    let {
      plate,
      page = config.pagination.defaultPage,
      limit = config.pagination.defaultLimit,
      sort = 'check_in_time',
      order = 'desc'
    } = req.query;

    if (!plate || plate.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please provide a plate number to search'
      });
    }

    plate = plate.toUpperCase().trim();

    // Sanitize
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.min(config.pagination.maxLimit, Math.max(1, parseInt(limit) || config.pagination.defaultLimit));
    const offset = (page - 1) * limit;

    const allowedSorts = ['check_in_time', 'check_out_time', 'plate', 'fee', 'status'];
    if (!allowedSorts.includes(sort)) sort = 'check_in_time';
    order = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Count
    const { total } = db.prepare(
      'SELECT COUNT(*) as total FROM sessions WHERE plate LIKE ?'
    ).get(`%${plate}%`);

    // Search with spot info
    const sessions = db.prepare(`
      SELECT 
        s.id, s.plate, s.vehicle_type, s.check_in_time, s.check_out_time,
        s.fee, s.fee_breakdown, s.status,
        sp.level as spot_level, sp.spot_number, sp.type as spot_type
      FROM sessions s
      LEFT JOIN spots sp ON s.spot_id = sp.id
      WHERE s.plate LIKE ?
      ORDER BY s.${sort} ${order}
      LIMIT ? OFFSET ?
    `).all(`%${plate}%`, limit, offset);

    const totalPages = Math.ceil(total / limit);

    res.json({
      query: plate,
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Server error', message: 'Search failed' });
  }
});

module.exports = router;
