/**
 * Rate Card Parser & Sanitizer — ParkSense (Level 1 — T4)
 * 
 * Cleans messy, noisy, and unstructured rate card input strings/objects per spot type
 * (compact, standard, ev) and extracts validated numeric rates:
 * - firstHour (number)
 * - additionalHour (number)
 * - dailyCap (number)
 * - currency (string)
 */

const DEFAULT_RATES = {
  compact: { firstHour: 30, additionalHour: 15, dailyCap: 150, currency: '₹' },
  standard: { firstHour: 40, additionalHour: 20, dailyCap: 200, currency: '₹' },
  ev: { firstHour: 50, additionalHour: 25, dailyCap: 250, currency: '₹' }
};

/**
 * Extract clean numbers from messy text (e.g. "₹40/hr!" -> 40, "20 Rs" -> 20)
 */
function extractNumber(str, defaultVal) {
  if (typeof str === 'number' && !isNaN(str)) return Math.max(0, str);
  if (!str) return defaultVal;
  
  const match = String(str).match(/\d+(\.\d+)?/);
  if (match) {
    const val = parseFloat(match[0]);
    return isNaN(val) ? defaultVal : Math.max(0, val);
  }
  return defaultVal;
}

/**
 * Sanitize a raw messy rate card string or object
 * @param {string|object} rawInput 
 * @returns {object} { cleanedRates, diffLog, originalInput }
 */
function parseMessyRateCard(rawInput) {
  const diffLog = [];
  const cleanedRates = JSON.parse(JSON.stringify(DEFAULT_RATES));

  if (!rawInput) {
    diffLog.push('No input provided. Loaded default sanitized rate card.');
    return { cleanedRates, diffLog, originalInput: '' };
  }

  // If object was passed directly
  if (typeof rawInput === 'object' && rawInput !== null) {
    ['compact', 'standard', 'ev'].forEach(type => {
      if (rawInput[type]) {
        const item = rawInput[type];
        const f = extractNumber(item.firstHour || item.first_hour || item['1st'], DEFAULT_RATES[type].firstHour);
        const a = extractNumber(item.additionalHour || item.additional_hour || item.extra, DEFAULT_RATES[type].additionalHour);
        const c = extractNumber(item.dailyCap || item.daily_cap || item.cap, DEFAULT_RATES[type].dailyCap);
        
        cleanedRates[type] = { firstHour: f, additionalHour: a, dailyCap: c, currency: '₹' };
        diffLog.push(`Sanitized [${type.toUpperCase()}]: 1st Hr=${f}, Extra=${a}, Cap=${c}`);
      }
    });
    return { cleanedRates, diffLog, originalInput: JSON.stringify(rawInput, null, 2) };
  }

  // If text string was passed
  const text = String(rawInput);
  const lines = text.split(/\r?\n|;/);

  lines.forEach(line => {
    const lower = line.toLowerCase();
    let spotType = null;
    if (lower.includes('compact')) spotType = 'compact';
    else if (lower.includes('standard')) spotType = 'standard';
    else if (lower.includes('ev') || lower.includes('electric')) spotType = 'ev';

    if (spotType) {
      // Find numbers for 1st hour, extra hour, cap
      // Regex search for terms or order of numbers
      const firstMatch = line.match(/(?:1st|first|start)[^0-9]*(\d+)/i) || line.match(/(\d+)\s*(?:rs|inr|₹)?\s*(?:first|\/1st)/i);
      const extraMatch = line.match(/(?:extra|additional|next)[^0-9]*(\d+)/i) || line.match(/(\d+)\s*(?:rs|inr|₹)?\s*(?:extra|\/extra)/i);
      const capMatch = line.match(/(?:cap|max|24h)[^0-9]*(\d+)/i) || line.match(/(\d+)\s*(?:rs|inr|₹)?\s*(?:cap|\/cap)/i);

      // Fallback to all numbers in order if key matches fail
      const allNumbers = (line.match(/\d+/g) || []).map(Number);

      const f = firstMatch ? parseInt(firstMatch[1]) : (allNumbers[0] !== undefined ? allNumbers[0] : DEFAULT_RATES[spotType].firstHour);
      const a = extraMatch ? parseInt(extraMatch[1]) : (allNumbers[1] !== undefined ? allNumbers[1] : DEFAULT_RATES[spotType].additionalHour);
      const c = capMatch ? parseInt(capMatch[1]) : (allNumbers[2] !== undefined ? allNumbers[2] : DEFAULT_RATES[spotType].dailyCap);

      cleanedRates[spotType] = { firstHour: f, additionalHour: a, dailyCap: c, currency: '₹' };
      diffLog.push(`Cleaned messy line "${line.trim()}": Extracted ${spotType.toUpperCase()} -> 1st: ₹${f}, Extra: ₹${a}, Daily Cap: ₹${c}`);
    }
  });

  if (diffLog.length === 0) {
    diffLog.push('No recognized spot type keywords found in text. Applied standard default rates.');
  }

  return {
    cleanedRates,
    diffLog,
    originalInput: text
  };
}

module.exports = {
  parseMessyRateCard,
  DEFAULT_RATES
};
