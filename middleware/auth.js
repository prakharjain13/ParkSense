/**
 * JWT Authentication Middleware — ParkSense
 */

const jwt = require('jsonwebtoken');
const config = require('../utils/config');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide a valid Bearer token in the Authorization header'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded; // { id, username, full_name }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please login again.'
      });
    }
    return res.status(401).json({
      error: 'Invalid token',
      message: 'The provided token is invalid.'
    });
  }
}

module.exports = authMiddleware;
