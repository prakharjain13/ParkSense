/**
 * ParkSense — Express Server Entry Point
 * Smart parking garage management system
 * Enforces Tiered Pricing (T4), Nightly 24h Clock Auto-Close (T2), and Valet Plate Transfer (T6)
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./utils/config');
const { initializeDatabase, seedSpots } = require('./db/database');
const { router: clockRouter, runNightlyClockJob } = require('./routes/clock');
const ratesRouter = require('./routes/rates');

// Initialize database schema and seed spots
initializeDatabase();
seedSpots();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Level 2 — T2 Automated Clock Endpoint exposed at root level (POST /clock)
app.post('/clock', (req, res) => {
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
    console.error('Root POST /clock error:', err);
    res.status(500).json({ error: 'Server error', message: 'Failed to run clock auto-close job' });
  }
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/spots', require('./routes/spots'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/search', require('./routes/search'));
app.use('/api/clock', clockRouter);
app.use('/api/config/rates', ratesRouter);

// SPA fallback — serve index.html for unmatched routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path === '/clock') {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(config.port, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║                🅿️  ParkSense Server                      ║
  ╠══════════════════════════════════════════════════════════╣
  ║  Running on: http://localhost:${config.port}               ║
  ║  Database:   ${config.dbPath.padEnd(24)}    ║
  ║  Twists:     T4 (Messy Rates) | T2 (POST /clock 24h)     ║
  ║              T6 (Valet Plate Transfer Hand-off)          ║
  ╚══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
