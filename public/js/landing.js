/**
 * ParkSense — Welcome Page & Landing Logic
 * Level 1 — T4: Dynamic per-spot-type fee estimator & Messy Rate Card Cleaner UI
 */

document.addEventListener('DOMContentLoaded', async () => {
  let activeRates = {
    compact: { firstHour: 30, additionalHour: 15, dailyCap: 150, currency: '₹' },
    standard: { firstHour: 40, additionalHour: 20, dailyCap: 200, currency: '₹' },
    ev: { firstHour: 50, additionalHour: 25, dailyCap: 250, currency: '₹' }
  };

  // Live availability status for hero section
  async function loadHeroAvailability() {
    try {
      const data = await api.getAvailability();
      const heroEl = document.getElementById('heroLiveStatus');
      if (heroEl && data.grand) {
        heroEl.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
            <svg class="icon" viewBox="0 0 24 24" style="color: var(--accent-red);"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span><strong style="color: var(--text-primary); font-size: 1.15rem; font-family: var(--font-mono);">${data.grand.free}</strong> of <strong style="font-family: var(--font-mono);">${data.grand.total}</strong> garage spots available right now</span>
          </div>
        `;
      }
    } catch (err) {
      console.error('Hero availability error:', err);
    }
  }

  // Fetch active rate cards from backend
  async function loadActiveRates() {
    try {
      const res = await fetch('/api/config/rates');
      if (res.ok) {
        const data = await res.json();
        if (data.rates) {
          activeRates = data.rates;
        }
      }
    } catch (e) {
      console.error('Error loading rates:', e);
    }
    renderRateScheduleTable();
    calculateEstimatedFee();
  }

  // Interactive Fee Estimator Widget
  const calcHoursInput = document.getElementById('calcHours');
  const calcTypeSelect = document.getElementById('calcVehicleType');
  const calcAmountEl = document.getElementById('calcFeeAmount');
  const calcBreakdownEl = document.getElementById('calcBreakdown');
  const rateSummaryBox = document.getElementById('rateSummaryBox');

  function calculateEstimatedFee() {
    if (!calcHoursInput || !calcAmountEl) return;

    const spotType = calcTypeSelect ? calcTypeSelect.value : 'standard';
    const rates = activeRates[spotType] || activeRates['standard'];
    const hours = Math.max(1, parseInt(calcHoursInput.value) || 1);

    if (rateSummaryBox) {
      rateSummaryBox.innerHTML = `
        &bull; <strong>${spotType.toUpperCase()} Bay Rates:</strong><br>
        &bull; First Hour: ${rates.currency}${rates.firstHour}<br>
        &bull; Additional Hours: ${rates.currency}${rates.additionalHour} / hr<br>
        &bull; 24h Daily Cap: ${rates.currency}${rates.dailyCap}
      `;
    }

    const days = Math.floor(hours / 24);
    const remHours = hours % 24;

    let totalFee = days * rates.dailyCap;
    let remFee = 0;

    if (remHours > 0) {
      if (remHours === 1) {
        remFee = rates.firstHour;
      } else {
        remFee = rates.firstHour + (remHours - 1) * rates.additionalHour;
      }
      if (remFee > rates.dailyCap) remFee = rates.dailyCap;
    }

    totalFee += remFee;
    calcAmountEl.textContent = `${rates.currency}${totalFee}`;

    let text = '';
    if (days > 0) {
      text += `${days} day${days > 1 ? 's' : ''} (&times; ${rates.currency}${rates.dailyCap})`;
      if (remHours > 0) text += ` + ${remHours} hr${remHours > 1 ? 's' : ''} (${rates.currency}${remFee})`;
    } else {
      if (hours === 1) {
        text = `First hour: ${rates.currency}${rates.firstHour}`;
      } else {
        text = `First hour: ${rates.currency}${rates.firstHour} + ${hours - 1} extra hr${hours - 1 > 1 ? 's' : ''} &times; ${rates.currency}${rates.additionalHour} = ${rates.currency}${remFee}`;
      }
      if (remFee >= rates.dailyCap) {
        text += ` (Daily Cap Applied)`;
      }
    }

    if (calcBreakdownEl) calcBreakdownEl.innerHTML = text;
  }

  // Render Rate Schedule Table
  function renderRateScheduleTable() {
    const pricingContainer = document.getElementById('pricingRates');
    if (!pricingContainer) return;

    let html = `
      <table class="neu-table" style="width: 100%;">
        <thead>
          <tr>
            <th>Spot Category</th>
            <th>First Hour</th>
            <th>Additional Hour</th>
            <th>24h Daily Cap</th>
          </tr>
        </thead>
        <tbody>
    `;

    ['compact', 'standard', 'ev'].forEach(type => {
      const r = activeRates[type];
      const name = type === 'compact' ? 'Compact Bays' : (type === 'standard' ? 'Standard Bays' : 'EV Charger Bays');
      html += `
        <tr>
          <td><strong style="color: var(--text-primary);">${name}</strong></td>
          <td style="font-family: var(--font-mono); color: var(--accent-red); font-weight: 700;">${r.currency}${r.firstHour}</td>
          <td style="font-family: var(--font-mono); color: var(--text-primary);">${r.currency}${r.additionalHour} / hr</td>
          <td style="font-family: var(--font-mono); color: var(--text-primary); font-weight: 700;">${r.currency}${r.dailyCap}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      <div style="padding-top: 14px; text-align: center; color: var(--text-muted); font-size: 0.82rem;">
        Partial hours round up automatically &bull; Multi-day stays accumulate 24-hour capped blocks
      </div>
    `;

    pricingContainer.innerHTML = html;
  }

  // Handle Messy Rate Card Sanitizer Button
  const btnCleanRates = document.getElementById('btnCleanRates');
  const messyCardInput = document.getElementById('messyCardInput');
  const messyDiffOutput = document.getElementById('messyDiffOutput');

  if (btnCleanRates && messyCardInput && messyDiffOutput) {
    btnCleanRates.addEventListener('click', async () => {
      const text = messyCardInput.value.trim();
      if (!text) {
        messyDiffOutput.innerHTML = `<div style="color: var(--accent-red);">[ERROR] Please paste raw messy rate text to clean.</div>`;
        return;
      }

      messyDiffOutput.innerHTML = `<div style="color: #facc15;">[PROCESSING] Sanitizing messy rates and running regex cleanup...</div>`;

      try {
        const res = await fetch('/api/config/rates/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rateCardText: text })
        });

        const data = await res.json();
        if (res.ok) {
          activeRates = data.cleanedRates;
          renderRateScheduleTable();
          calculateEstimatedFee();

          let diffHtml = `<div style="color: #4ade80; font-weight: 700; margin-bottom: 8px;">✓ ${data.message}</div>`;
          data.diffLog.forEach(log => {
            diffHtml += `<div>• ${log}</div>`;
          });
          messyDiffOutput.innerHTML = diffHtml;
        } else {
          messyDiffOutput.innerHTML = `<div style="color: var(--accent-red);">[ERROR] ${data.message || 'Failed to clean rates'}</div>`;
        }
      } catch (err) {
        console.error('Clean rates error:', err);
        messyDiffOutput.innerHTML = `<div style="color: var(--accent-red);">[ERROR] Network error while connecting to sanitizer endpoint.</div>`;
      }
    });
  }

  if (calcHoursInput) calcHoursInput.addEventListener('input', calculateEstimatedFee);
  if (calcTypeSelect) calcTypeSelect.addEventListener('change', calculateEstimatedFee);

  loadHeroAvailability();
  await loadActiveRates();
});
