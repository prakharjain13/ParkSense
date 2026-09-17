/**
 * Fee Calculator — ParkSense
 * 
 * Level 1 — T4: Dynamic per-spot-type tiered pricing loaded from cleaned rate cards.
 * - Compact, Standard, EV each have independent rates.
 * - First hour, additional hours, daily cap (per 24-hour block).
 * - Partial hours round UP (Math.ceil).
 */

const config = require('./config');
const { DEFAULT_RATES } = require('./rateCardParser');

/**
 * Get active rate card for a spot type
 */
function getRatesForSpotType(spotType) {
  const type = (spotType || 'standard').toLowerCase();
  
  try {
    const { db } = require('../db/database');
    const row = db.prepare('SELECT spot_type, first_hour, additional_hour, daily_cap, currency FROM rate_cards WHERE spot_type = ?').get(type);
    if (row) {
      return {
        firstHour: row.first_hour,
        additionalHour: row.additional_hour,
        dailyCap: row.daily_cap,
        currency: row.currency || '₹'
      };
    }
  } catch (e) {
    // Fall back if DB call happens outside initialized DB context
  }

  return DEFAULT_RATES[type] || config.rates;
}

/**
 * Calculate parking fee with full breakdown
 * @param {string|Date} checkInTime - ISO datetime string or Date
 * @param {string|Date} checkOutTime - ISO datetime string or Date
 * @param {string} [spotType='standard'] - 'compact' | 'standard' | 'ev'
 * @param {object} [customRates] - Optional override rates object
 * @returns {object} { totalFee, totalMinutes, fullDays, remainderHours, dailyCapApplied, breakdown }
 */
function calculateFee(checkInTime, checkOutTime, spotType = 'standard', customRates = null) {
  const rates = customRates || getRatesForSpotType(spotType);
  const checkIn = new Date(checkInTime);
  const checkOut = new Date(checkOutTime);

  const totalMs = checkOut.getTime() - checkIn.getTime();
  if (totalMs <= 0) {
    return {
      totalFee: 0,
      totalMinutes: 0,
      fullDays: 0,
      remainderHours: 0,
      dailyCapApplied: false,
      breakdown: 'No charge (invalid duration)',
      rates
    };
  }

  const totalMinutes = Math.ceil(totalMs / (1000 * 60));
  const MINUTES_PER_DAY = 1440; // 24 * 60

  const fullDays = Math.floor(totalMinutes / MINUTES_PER_DAY);
  const remainderMinutes = totalMinutes % MINUTES_PER_DAY;

  // Each full 24-hour block is charged at the daily cap
  let totalFee = fullDays * rates.dailyCap;
  let dailyCapApplied = fullDays > 0;

  // Calculate fee for the remainder partial day
  let remainderHours = 0;
  let remainderFee = 0;
  let remainderCapApplied = false;

  if (remainderMinutes > 0) {
    remainderHours = Math.ceil(remainderMinutes / 60); // partial hours round UP

    // First hour at full rate
    remainderFee = rates.firstHour;

    // Additional hours at reduced rate
    if (remainderHours > 1) {
      remainderFee += (remainderHours - 1) * rates.additionalHour;
    }

    // Apply daily cap to the remainder day-block
    if (remainderFee > rates.dailyCap) {
      remainderFee = rates.dailyCap;
      remainderCapApplied = true;
      dailyCapApplied = true;
    }

    totalFee += remainderFee;
  }

  // Build human-readable breakdown
  const breakdownParts = [];

  if (fullDays > 0) {
    breakdownParts.push(
      `${fullDays} full day${fullDays > 1 ? 's' : ''} × ${rates.currency}${rates.dailyCap} (daily cap) = ${rates.currency}${fullDays * rates.dailyCap}`
    );
  }

  if (remainderMinutes > 0) {
    const parts = [];
    parts.push(`First hour: ${rates.currency}${rates.firstHour}`);
    if (remainderHours > 1) {
      parts.push(
        `${remainderHours - 1} extra hour${remainderHours - 1 > 1 ? 's' : ''} × ${rates.currency}${rates.additionalHour} = ${rates.currency}${(remainderHours - 1) * rates.additionalHour}`
      );
    }
    let partStr = parts.join(' + ');
    if (remainderCapApplied) {
      partStr += ` (capped at ${rates.currency}${rates.dailyCap})`;
    }
    partStr += ` = ${rates.currency}${remainderFee}`;
    breakdownParts.push(partStr);
  }

  const breakdown = breakdownParts.join(' | ');

  return {
    totalFee: Math.round(totalFee * 100) / 100,
    totalMinutes,
    fullDays,
    remainderHours,
    remainderMinutes,
    dailyCapApplied,
    breakdown,
    spotType,
    rates: {
      firstHour: rates.firstHour,
      additionalHour: rates.additionalHour,
      dailyCap: rates.dailyCap,
      currency: rates.currency
    }
  };
}

module.exports = { calculateFee, getRatesForSpotType };
