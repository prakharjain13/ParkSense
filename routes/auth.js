/**
 * Auth Routes — ParkSense
 * POST /api/auth/register
 * POST /api/auth/login
 * GET  /api/auth/me
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db/database');
const config = require('../utils/config');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new attendant account
 */
router.post('/register', (req, res) => {
  try {
    const { username, password, full_name } = req.body;

    // Validation
    if (!username || !password || !full_name) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Username, password, and full name are required'
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Username must be at least 3 characters'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if username already exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({
        error: 'Username taken',
        message: 'This username is already registered'
      });
    }

    // Hash password and insert
    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (username, password_hash, full_name) VALUES (?, ?, ?)'
    ).run(username, passwordHash, full_name);

    // Generate token
    const token = jwt.sign(
      { id: result.lastInsertRowid, username, full_name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id: result.lastInsertRowid, username, full_name }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error', message: 'Failed to create account' });
  }
});

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Username and password are required'
      });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid username or password'
      });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid username or password'
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, full_name: user.full_name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, full_name: user.full_name }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error', message: 'Failed to login' });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile (requires auth)
 */
router.get('/me', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, full_name, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
