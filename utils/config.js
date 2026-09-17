require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'parksense_default_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  dbPath: process.env.VERCEL ? '/tmp/parksense.db' : (process.env.DB_PATH || './db/parksense.db'),

  // Pricing rates (INR)
  rates: {
    firstHour: parseInt(process.env.FIRST_HOUR_RATE) || 40,
    additionalHour: parseInt(process.env.ADDITIONAL_HOUR_RATE) || 20,
    dailyCap: parseInt(process.env.DAILY_CAP) || 200,
    currency: '₹'
  },

  // Garage layout
  garage: {
    levels: ['L1', 'L2', 'L3'],
    spotsPerLevel: {
      compact: 10,
      standard: 10,
      ev: 5
    }
  },

  // Pagination defaults
  pagination: {
    defaultPage: 1,
    defaultLimit: 10,
    maxLimit: 100
  }
};

module.exports = config;
