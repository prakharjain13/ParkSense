/**
 * Sessions Routes — ParkSense
 * POST /api/sessions/checkin       — Check in a car (auto-assign spot)
 * POST /api/sessions/:id/checkout   — Check out a car (calculate fee)
 * POST /api/sessions/:id/transfer   — Transfer open session to new plate (Level 3 — T6 Valet Hand-off)
 * GET  /api/sessions               — List sessions (paginated, sorted, filtered)
 * GET  /api/sessions/:id           — Get single session detail
 */

const express = require('express');
const { db } = require('../db/database');
const { calculateFee } = require('../utils/feeCalculator');
const config = require('../utils/config');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All session routes require auth
router.use(authMiddleware);

/**
 * POST /api/sessions/checkin
 * Check in a car with auto-spot-assignment
 */
router.post('/checkin', (req, res) => {
  try {
    let { plate, vehicle_type } = req.body;

    // Validation
    if (!plate || !vehicle_type) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'License plate and vehicle type are required'
      });
    }

    plate = plate.toUpperCase().trim();
    vehicle_type = vehicle_type.toLowerCase().trim();

    if (!['compact', 'standard', 'ev'].includes(vehicle_type)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Vehicle type must be compact, standard, or ev'
      });
    }

    // Check if this plate already has an active session
    const activeSession = db.prepare(
      "SELECT id, spot_id FROM sessions WHERE plate = ? AND status = 'active'"
    ).get(plate);

    if (activeSession) {
      const spot = db.prepare('SELECT * FROM spots WHERE id = ?').get(activeSession.spot_id);
      return res.status(409).json({
        error: 'Already checked in',
        message: `Vehicle ${plate} is already checked in at spot ${spot ? spot.spot_number : 'unknown'}`,
        session_id: activeSession.id
      });
    }

    let spotType = vehicle_type;

    // Run the check-in in a transaction for atomicity (double-park guard)
    const checkinTransaction = db.transaction(() => {
      const spot = db.prepare(
        'SELECT id, level, spot_number, type FROM spots WHERE type = ? AND is_occupied = 0 ORDER BY level, spot_number LIMIT 1'
      ).get(spotType);

      if (!spot) {
        const availability = db.prepare(`
          SELECT type, 
            SUM(CASE WHEN is_occupied = 0 THEN 1 ELSE 0 END) as free 
          FROM spots 
          GROUP BY type
        `).all();

        const availMsg = availability
          .map(a => `${a.free} ${a.type} free`)
          .join(', ');

        return {
          success: false,
          error: 'No spots available',
          message: `No ${spotType} spots available. Current availability: ${availMsg}`,
          availability
        };
      }

      // Atomically mark spot as occupied — race condition guard
      const updateResult = db.prepare(
        'UPDATE spots SET is_occupied = 1 WHERE id = ? AND is_occupied = 0'
      ).run(spot.id);

      if (updateResult.changes === 0) {
        return {
          success: false,
          error: 'Spot conflict',
          message: 'The selected spot was just taken. Please try again.'
        };
      }

      // Create session
      const result = db.prepare(
        'INSERT INTO sessions (spot_id, plate, vehicle_type, check_in_time, status, checked_in_by) VALUES (?, ?, ?, datetime(?), ?, ?)'
      ).run(spot.id, plate, vehicle_type, 'now', 'active', req.user.id);

      return {
        success: true,
        session: {
          id: result.lastInsertRowid,
          plate,
          vehicle_type,
          spot: {
            id: spot.id,
            level: spot.level,
            spot_number: spot.spot_number,
            type: spot.type
          },
          check_in_time: new Date().toISOString(),
          status: 'active'
        }
      };
    });

    const result = checkinTransaction();

    if (!result.success) {
      return res.status(result.error === 'Spot conflict' ? 409 : 400).json({
        error: result.error,
        message: result.message,
        availability: result.availability
      });
    }

    res.status(201).json({
      message: `Vehicle ${plate} checked in at spot ${result.session.spot.spot_number}`,
      session: result.session
    });
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({ error: 'Server error', message: 'Failed to check in vehicle' });
  }
});

/**
 * POST /api/sessions/:id/transfer
 * Level 3 — T6 (Lifecycle): Transfer open session to a different plate (valet hand-off)
 * Spot and entry time carry over!
 * Body: { newPlate, reason }
 */
router.post('/:id/transfer', (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    let { newPlate, reason } = req.body || {};

    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'Validation failed', message: 'Invalid session ID' });
    }

    if (!newPlate || !newPlate.trim()) {
      return res.status(400).json({ error: 'Validation failed', message: 'New license plate is required' });
    }

    newPlate = newPlate.toUpperCase().trim();
    reason = reason ? reason.trim() : 'Valet Hand-off';

    const transferTx = db.transaction(() => {
      // Find active session
      const session = db.prepare("SELECT * FROM sessions WHERE id = ? AND status = 'active'").get(sessionId);

      if (!session) {
        return {
          success: false,
          status: 404,
          error: 'Active session not found',
          message: `No active session found with ID ${sessionId}`
        };
      }

      if (session.plate === newPlate) {
        return {
          success: false,
          status: 400,
          error: 'Same plate',
          message: `Session is already registered to plate ${newPlate}`
        };
      }

      // Check if target plate is already checked in somewhere else
      const existingActive = db.prepare("SELECT id, spot_id FROM sessions WHERE plate = ? AND status = 'active'").get(newPlate);
      if (existingActive) {
        return {
          success: false,
          status: 409,
          error: 'Plate conflict',
          message: `Target plate ${newPlate} already has an active session (Session #${existingActive.id}). Cannot transfer to a currently parked vehicle.`
        };
      }

      // Parse existing transfer history
      let history = [];
      if (session.transfer_history) {
        try { history = JSON.parse(session.transfer_history); } catch (e) {}
      }

      const transferLog = {
        from_plate: session.plate,
        to_plate: newPlate,
        reason,
        transferred_at: new Date().toISOString(),
        transferred_by: req.user.username || 'attendant'
      };

      history.push(transferLog);

      // Update session record — plate changes, spot_id and check_in_time remain UNCHANGED
      db.prepare(`
        UPDATE sessions
        SET plate = ?,
            transfer_count = transfer_count + 1,
            transfer_history = ?
        WHERE id = ?
      `).run(newPlate, JSON.stringify(history), sessionId);

      const spot = db.prepare('SELECT * FROM spots WHERE id = ?').get(session.spot_id);

      return {
        success: true,
        session: {
          id: sessionId,
          old_plate: session.plate,
          new_plate: newPlate,
          vehicle_type: session.vehicle_type,
          spot: spot ? { spot_number: spot.spot_number, level: spot.level, type: spot.type } : null,
          check_in_time: session.check_in_time,
          transfer_count: session.transfer_count + 1,
          transferLog
        }
      };
    });

    const result = transferTx();

    if (!result.success) {
      return res.status(result.status).json({
        error: result.error,
        message: result.message
      });
    }

    res.json({
      message: `Valet Transfer complete! Session #${sessionId} transferred from ${result.session.old_plate} to ${result.session.new_plate}. Spot ${result.session.spot.spot_number} and entry time retained.`,
      session: result.session
    });
  } catch (err) {
    console.error('Transfer session error:', err);
    res.status(500).json({ error: 'Server error', message: 'Failed to transfer session' });
  }
});

/**
 * POST /api/sessions/:id/checkout
 * Check out a car, calculate fee, free the spot
 */
router.post('/:id/checkout', (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);

    if (isNaN(sessionId)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid session ID'
      });
    }

    const checkoutTransaction = db.transaction(() => {
      const session = db.prepare(
        "SELECT * FROM sessions WHERE id = ? AND status = 'active'"
      ).get(sessionId);

      if (!session) {
        const anySession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
        if (anySession) {
          return {
            success: false,
            status: 400,
            error: 'Already checked out',
            message: `Session ${sessionId} was already checked out at ${anySession.check_out_time} (Status: ${anySession.status})`
          };
        }
        return {
          success: false,
          status: 404,
          error: 'Session not found',
          message: `No session found with ID ${sessionId}`
        };
      }

      const checkOutTime = new Date().toISOString();
      const feeResult = calculateFee(session.check_in_time, checkOutTime, session.vehicle_type);

      db.prepare(`
        UPDATE sessions 
        SET check_out_time = datetime(?), 
            fee = ?, 
            fee_breakdown = ?,
            status = 'completed',
            checked_out_by = ?
        WHERE id = ?
      `).run(checkOutTime, feeResult.totalFee, feeResult.breakdown, req.user.id, sessionId);

      db.prepare('UPDATE spots SET is_occupied = 0 WHERE id = ?').run(session.spot_id);

      const spot = db.prepare('SELECT * FROM spots WHERE id = ?').get(session.spot_id);

      return {
        success: true,
        session: {
          id: sessionId,
          plate: session.plate,
          vehicle_type: session.vehicle_type,
          spot: spot ? {
            id: spot.id,
            level: spot.level,
            spot_number: spot.spot_number,
            type: spot.type
          } : null,
          check_in_time: session.check_in_time,
          check_out_time: checkOutTime,
          status: 'completed',
          fee: feeResult
        }
      };
    });

    const result = checkoutTransaction();

    if (!result.success) {
      return res.status(result.status).json({
        error: result.error,
        message: result.message
      });
    }

    res.json({
      message: `Vehicle ${result.session.plate} checked out. Fee: ${config.rates.currency}${result.session.fee.totalFee}`,
      session: result.session
    });
  } catch (err) {
    console.error('Check-out error:', err);
    res.status(500).json({ error: 'Server error', message: 'Failed to check out vehicle' });
  }
});

/**
 * GET /api/sessions
 * List sessions with pagination, sorting, and filtering
 */
router.get('/', (req, res) => {
  try {
    let {
      page = config.pagination.defaultPage,
      limit = config.pagination.defaultLimit,
      sort = 'check_in_time',
      order = 'desc',
      status,
      plate,
      vehicle_type
    } = req.query;

    page = Math.max(1, parseInt(page) || 1);
    limit = Math.min(config.pagination.maxLimit, Math.max(1, parseInt(limit) || config.pagination.defaultLimit));
    const offset = (page - 1) * limit;

    const allowedSorts = ['check_in_time', 'check_out_time', 'plate', 'fee', 'status', 'vehicle_type', 'transfer_count'];
    if (!allowedSorts.includes(sort)) sort = 'check_in_time';
    order = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    let where = 'WHERE 1=1';
    const params = [];

    if (status && ['active', 'completed', 'auto-closed'].includes(status)) {
      where += ' AND s.status = ?';
      params.push(status);
    }

    if (plate) {
      where += ' AND s.plate LIKE ?';
      params.push(`%${plate.toUpperCase()}%`);
    }

    if (vehicle_type && ['compact', 'standard', 'ev'].includes(vehicle_type)) {
      where += ' AND s.vehicle_type = ?';
      params.push(vehicle_type);
    }

    const countSql = `SELECT COUNT(*) as total FROM sessions s ${where}`;
    const { total } = db.prepare(countSql).get(...params);

    const dataSql = `
      SELECT 
        s.id, s.plate, s.vehicle_type, s.check_in_time, s.check_out_time,
        s.fee, s.fee_breakdown, s.status, s.auto_closed, s.transfer_count, s.transfer_history,
        sp.level as spot_level, sp.spot_number, sp.type as spot_type
      FROM sessions s
      LEFT JOIN spots sp ON s.spot_id = sp.id
      ${where}
      ORDER BY s.${sort} ${order}
      LIMIT ? OFFSET ?
    `;

    const sessions = db.prepare(dataSql).all(...params, limit, offset);
    const totalPages = Math.ceil(total / limit);

    res.json({
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      sort: { field: sort, order }
    });
  } catch (err) {
    console.error('List sessions error:', err);
    res.status(500).json({ error: 'Server error', message: 'Failed to fetch sessions' });
  }
});

/**
 * GET /api/sessions/:id
 * Get single session detail
 */
router.get('/:id', (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    const session = db.prepare(`
      SELECT 
        s.*, 
        sp.level as spot_level, sp.spot_number, sp.type as spot_type,
        u1.full_name as checked_in_by_name,
        u2.full_name as checked_out_by_name
      FROM sessions s
      LEFT JOIN spots sp ON s.spot_id = sp.id
      LEFT JOIN users u1 ON s.checked_in_by = u1.id
      LEFT JOIN users u2 ON s.checked_out_by = u2.id
      WHERE s.id = ?
    `).get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session });
  } catch (err) {
    console.error('Get session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
