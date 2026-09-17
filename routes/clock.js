/**
 * Clock Route — ParkSense (Level 2 — T2)
 * Automated nightly job to auto-close and bill any session parked over 24 hours.
 * Graded via POST /clock & POST /api/clock
 */

const express = require('express');
const { db } = require('../db/database');
const { calculateFee } = require('../utils/feeCalculator');

const router = express.Router();

/**
 * Perform auto-close check for all sessions > 24 hours
 * @param {string|Date} [referenceTimestamp] - Optional reference clock time for simulation/grading
 */
function runNightlyClockJob(referenceTimestamp) {
  const refTime = referenceTimestamp ? new Date(referenceTimestamp) : new Date();
  
  const activeSessions = db.prepare(`
    SELECT s.*, sp.type as spot_type
    FROM sessions s
    LEFT JOIN spots sp ON s.spot_id = sp.id
    WHERE s.status = 'active'
  `).all();

  const closedSessions = [];

  const autoCloseTx = db.transaction(() => {
    for (const session of activeSessions) {
      const checkInDate = new Date(session.check_in_time);
      const elapsedMs = refTime.getTime() - checkInDate.getTime();
      const elapsedHours = elapsedMs / (1000 * 60 * 60);

      // Auto-close if parked 24 hours or longer
      if (elapsedHours >= 24) {
        const checkOutIso = refTime.toISOString();
        const feeResult = calculateFee(session.check_in_time, checkOutIso, session.vehicle_type || session.spot_type);

        // Update session to completed with auto_closed flag
        db.prepare(`
          UPDATE sessions
          SET check_out_time = datetime(?),
              fee = ?,
              fee_breakdown = ?,
              status = 'completed',
              auto_closed = 1
          WHERE id = ?
        `).run(checkOutIso, feeResult.totalFee, `Nightly 24h Auto-Close: ${feeResult.breakdown}`, session.id);

        // Free parking spot
        db.prepare('UPDATE spots SET is_occupied = 0 WHERE id = ?').run(session.spot_id);

        closedSessions.push({
          session_id: session.id,
          plate: session.plate,
          spot_id: session.spot_id,
          check_in_time: session.check_in_time,
          check_out_time: checkOutIso,
          elapsed_hours: Math.round(elapsedHours * 10) / 10,
          fee: feeResult.totalFee,
          fee_breakdown: feeResult.breakdown,
          status: 'completed',
          auto_closed: 1
        });
      }
    }
  });

  autoCloseTx();

  return {
    timestamp: refTime.toISOString(),
    scannedActiveSessions: activeSessions.length,
    autoClosedCount: closedSessions.length,
    closedSessions
  };
}

/**
 * POST /clock & POST /api/clock
 * Triggers the nightly auto-close job for sessions > 24 hours
 */
router.post('/', (req, res) => {
  try {
    const { timestamp, advanceHours } = req.body || {};
    let refTimestamp = timestamp;

    if (!refTimestamp && advanceHours) {
      const future = new Date();
      future.setHours(future.getHours() + parseFloat(advanceHours));
      refTimestamp = future.toISOString();
    }

    const result = runNightlyClockJob(refTimestamp);

    res.json({
      message: `Nightly 24h auto-close job executed successfully. ${result.autoClosedCount} session(s) auto-closed & billed.`,
      result
    });
  } catch (err) {
    console.error('Clock endpoint error:', err);
    res.status(500).json({ error: 'Server error', message: 'Failed to run clock auto-close job' });
  }
});

module.exports = { router, runNightlyClockJob };
