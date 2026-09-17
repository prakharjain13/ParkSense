/**
 * ParkSense — Dashboard Logic
 * Core operational screen: spot availability, live spot map, check-in/out, session log
 * Level 2 — T2: Automated 24h Clock Auto-Close (POST /clock)
 * Level 3 — T6: Valet Plate Transfer Lifecycle (POST /api/sessions/:id/transfer)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Auth guard
  if (!api.isAuthenticated()) {
    window.location.href = '/login.html';
    return;
  }

  // State
  const state = {
    selectedLevel: 'Level 1',
    spots: [],
    sessions: {
      page: 1,
      limit: 10,
      sort: 'check_in_time',
      order: 'desc',
      status: '',
      plate: '',
      vehicle_type: ''
    }
  };

  // SVG Icon definitions for dynamic rendering
  const icons = {
    ev: `<svg class="icon icon-sm" viewBox="0 0 24 24" style="color: #0d9488;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    compact: `<svg class="icon icon-sm" viewBox="0 0 24 24" style="color: #d97706;"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.2 2 11.6 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><circle cx="17" cy="17" r="2"></circle></svg>`,
    standard: `<svg class="icon icon-sm" viewBox="0 0 24 24" style="color: #2563eb;"><rect x="1" y="6" width="22" height="12" rx="2"></rect><circle cx="6" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle></svg>`,
    check: `<svg class="icon icon-sm" viewBox="0 0 24 24" style="color: #16a34a;"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    alert: `<svg class="icon icon-sm" viewBox="0 0 24 24" style="color: #dc2626;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    refresh: `<svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>`,
    transfer: `<svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>`
  };

  // Setup user info in navbar
  const user = api.getUser();
  if (user) {
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    if (userAvatar) {
      userAvatar.innerHTML = `<span style="font-weight: 700;">${user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}</span>`;
    }
    if (userName) userName.textContent = user.full_name || user.username;
  }

  // Logout handler
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    api.logout();
  });

  // ===== LEVEL 2 — T2 NIGHTLY 24H AUTO-CLOSE JOB (POST /clock) =====
  const btnRunClock = document.getElementById('btnRunClock');
  if (btnRunClock) {
    btnRunClock.addEventListener('click', async () => {
      btnRunClock.disabled = true;
      btnRunClock.textContent = 'Running Nightly Auto-Close...';

      try {
        const res = await fetch('/clock', { method: 'POST' });
        const data = await res.json();

        if (res.ok) {
          showToast(data.message, 'success');
          loadAvailability();
          loadSpotMap();
          loadSessions();
        } else {
          showToast(data.message || 'Failed to run clock job', 'error');
        }
      } catch (err) {
        console.error('Clock error:', err);
        showToast('Network error triggering POST /clock', 'error');
      } finally {
        btnRunClock.disabled = false;
        btnRunClock.textContent = 'Run Nightly 24h Auto-Close (POST /clock)';
      }
    });
  }

  // ===== LEVEL 3 — T6 VALET PLATE TRANSFER MODAL =====
  const transferModal = document.getElementById('transferModal');
  const transferForm = document.getElementById('transferForm');
  const closeTransferModal = document.getElementById('closeTransferModal');
  const cancelTransferBtn = document.getElementById('cancelTransferBtn');

  function openTransferModal(sessionId, currentPlate) {
    if (!transferModal) return;
    document.getElementById('transferSessionId').value = sessionId;
    document.getElementById('transferOldPlate').value = currentPlate;
    document.getElementById('transferNewPlate').value = '';
    document.getElementById('transferReason').value = 'Valet Hand-off';
    transferModal.classList.remove('hidden');
    document.getElementById('transferNewPlate').focus();
  }

  function hideTransferModal() {
    if (transferModal) transferModal.classList.add('hidden');
  }

  if (closeTransferModal) closeTransferModal.addEventListener('click', hideTransferModal);
  if (cancelTransferBtn) cancelTransferBtn.addEventListener('click', hideTransferModal);

  if (transferForm) {
    transferForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const sessionId = document.getElementById('transferSessionId').value;
      const newPlate = document.getElementById('transferNewPlate').value.trim().toUpperCase();
      const reason = document.getElementById('transferReason').value.trim();

      if (!newPlate) {
        showToast('Please enter replacement plate number', 'error');
        return;
      }

      try {
        const res = await fetch(`/api/sessions/${sessionId}/transfer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${api.getToken()}`
          },
          body: JSON.stringify({ newPlate, reason })
        });

        const data = await res.json();

        if (res.ok) {
          showToast(data.message, 'success');
          hideTransferModal();
          loadSpotMap();
          loadSessions();
        } else {
          showToast(data.message || 'Transfer failed', 'error');
        }
      } catch (err) {
        console.error('Transfer error:', err);
        showToast('Failed to execute valet plate transfer', 'error');
      }
    });
  }

  // ===== AVAILABILITY CARDS =====
  async function loadAvailability() {
    try {
      const data = await api.getAvailability();
      renderAvailability(data);
    } catch (err) {
      console.error('Failed to load availability:', err);
      showToast('Failed to load availability', 'error');
    }
  }

  function renderAvailability(data) {
    const types = ['compact', 'standard', 'ev'];

    types.forEach(type => {
      const info = data.summary.find(s => s.type === type) || { free: 0, total: 0, occupied: 0 };
      const freeEl = document.getElementById(`${type}Free`);
      const totalEl = document.getElementById(`${type}Total`);
      const barEl = document.getElementById(`${type}Bar`);

      if (freeEl) freeEl.textContent = info.free;
      if (totalEl) totalEl.textContent = `of ${info.total} spots free`;
      if (barEl) {
        const occupiedPct = info.total > 0 ? ((info.occupied / info.total) * 100) : 0;
        barEl.style.width = `${occupiedPct}%`;
      }
    });

    const grandEl = document.getElementById('grandAvailability');
    if (grandEl && data.grand) {
      grandEl.innerHTML = `<strong style="font-size: 1.15rem; font-family: var(--font-mono); color: var(--accent-red);">${data.grand.free}</strong> of <strong style="font-family: var(--font-mono);">${data.grand.total}</strong> total garage spots available right now`;
    }
  }

  // ===== LIVE INTERACTIVE SPOT MAP =====
  async function loadSpotMap() {
    try {
      const res = await api.getSpots();
      state.spots = res.spots || [];
      renderSpotMap();
    } catch (err) {
      console.error('Failed to load spot map:', err);
      const grid = document.getElementById('spotGrid');
      if (grid) grid.innerHTML = `<div class="text-center text-muted" style="grid-column: 1 / -1; padding: 20px;">Failed to load spot map</div>`;
    }
  }

  function renderSpotMap() {
    const levelTabsContainer = document.getElementById('levelTabs');
    const grid = document.getElementById('spotGrid');
    if (!grid) return;

    const levels = Array.from(new Set(state.spots.map(s => s.level))).sort();
    if (levels.length === 0) {
      grid.innerHTML = `<div class="text-center text-muted" style="grid-column: 1 / -1; padding: 20px;">No spots configured</div>`;
      return;
    }

    if (!levels.includes(state.selectedLevel)) {
      state.selectedLevel = levels[0];
    }

    if (levelTabsContainer) {
      levelTabsContainer.innerHTML = levels.map(lvl => {
        const countFree = state.spots.filter(s => s.level === lvl && !s.is_occupied).length;
        const total = state.spots.filter(s => s.level === lvl).length;
        const isActive = lvl === state.selectedLevel ? 'active' : '';
        return `
          <button class="level-tab ${isActive}" data-level="${lvl}">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></button>
            ${lvl} (${countFree}/${total} Free)
          </button>
        `;
      }).join('');

      levelTabsContainer.querySelectorAll('.level-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          state.selectedLevel = btn.dataset.level;
          renderSpotMap();
        });
      });
    }

    const levelSpots = state.spots.filter(s => s.level === state.selectedLevel);

    grid.innerHTML = levelSpots.map(s => {
      const isOccupied = Boolean(s.is_occupied);
      const iconSvg = icons[s.type] || icons.standard;
      const statusText = isOccupied ? 'Occupied' : 'Free';
      const durationText = isOccupied && s.check_in_time ? formatDuration(s.check_in_time) : '';

      return `
        <div class="spot-card ${isOccupied ? 'occupied' : 'free'} type-${s.type}" data-spot-id="${s.id}" data-plate="${s.plate || ''}">
          <div class="spot-num">${s.spot_number}</div>
          <div class="spot-type-badge">
            ${iconSvg}
            <span style="text-transform: capitalize;">${s.type}</span>
          </div>
          <div class="spot-status-indicator">
            ${isOccupied ? icons.alert : icons.check}
            <span>${statusText}</span>
          </div>
          ${isOccupied ? `<div class="occupied-details">${s.plate || 'Occupied'} · ${durationText}</div>` : ''}
          ${isOccupied && s.plate ? `<div class="spot-tooltip">Plate: ${s.plate} (${s.vehicle_type || s.type})<br>Parked: ${durationText}</div>` : `<div class="spot-tooltip">Click to check in</div>`}
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.spot-card').forEach(card => {
      card.addEventListener('click', () => {
        const plate = card.dataset.plate;
        if (plate) {
          const checkoutSearch = document.getElementById('checkoutSearchInput');
          if (checkoutSearch) {
            checkoutSearch.value = plate;
            checkoutSearch.dispatchEvent(new Event('input'));
            checkoutSearch.scrollIntoView({ behavior: 'smooth' });
          }
        } else {
          const checkinInput = document.getElementById('checkinPlate');
          if (checkinInput) {
            checkinInput.focus();
            checkinInput.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    });
  }

  document.getElementById('refreshMapBtn')?.addEventListener('click', async () => {
    showToast('Refreshing spot map...', 'info');
    await loadSpotMap();
    await loadAvailability();
  });

  // ===== CHECK-IN =====
  const checkinForm = document.getElementById('checkinForm');
  const checkinResult = document.getElementById('checkinResult');

  checkinForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const plate = document.getElementById('checkinPlate').value.trim().toUpperCase();
    const vehicleType = document.getElementById('checkinVehicleType').value;
    const submitBtn = checkinForm.querySelector('button[type="submit"]');

    if (!plate) {
      showResult(checkinResult, 'Please enter a license plate number', 'error');
      return;
    }
    if (!vehicleType) {
      showResult(checkinResult, 'Please select a vehicle category', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner"></span> Assigning spot...`;

    try {
      const data = await api.checkIn(plate, vehicleType);
      const spot = data.session.spot;
      showResult(checkinResult, `
        <div style="display: flex; align-items: flex-start; gap: 10px;">
          ${icons.check}
          <div>
            <strong>Vehicle Checked In Successfully</strong>
            <div style="margin-top: 6px;">
              Plate: <strong style="letter-spacing: 1px;">${data.session.plate}</strong> → Spot: <strong>${spot.spot_number}</strong> (${spot.type.toUpperCase()}, ${spot.level})<br>
              <span class="text-sm text-muted">Session ID: #${data.session.id} · ${formatDateTime(data.session.check_in_time)}</span>
            </div>
          </div>
        </div>
      `, 'success');

      showToast(`${plate} assigned spot ${spot.spot_number}`, 'success');

      document.getElementById('checkinPlate').value = '';
      document.getElementById('checkinVehicleType').value = '';

      loadAvailability();
      loadSpotMap();
      loadSessions();
    } catch (err) {
      showResult(checkinResult, err.message, 'error');
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
        <span>Assign Spot &amp; Check In</span>
      `;
    }
  });

  // ===== CHECK-OUT =====
  const checkoutSearch = document.getElementById('checkoutSearchInput');
  const checkoutResults = document.getElementById('checkoutSearchResults');
  const checkoutResult = document.getElementById('checkoutResult');
  let checkoutDebounce;

  checkoutSearch?.addEventListener('input', () => {
    clearTimeout(checkoutDebounce);
    const plate = checkoutSearch.value.trim();

    if (plate.length < 2) {
      checkoutResults.innerHTML = '';
      return;
    }

    checkoutDebounce = setTimeout(async () => {
      try {
        const data = await api.getSessions({ plate, status: 'active', limit: 5 });
        renderCheckoutSessions(data.sessions);
      } catch (err) {
        checkoutResults.innerHTML = `<p class="text-muted text-sm">Error searching: ${err.message}</p>`;
      }
    }, 300);
  });

  function renderCheckoutSessions(sessions) {
    if (sessions.length === 0) {
      checkoutResults.innerHTML = '<p class="text-muted text-sm" style="padding: 8px;">No active sessions found for this plate</p>';
      return;
    }

    checkoutResults.innerHTML = sessions.map(s => `
      <div class="checkout-session-item" data-session-id="${s.id}">
        <div class="checkout-session-info">
          <span class="checkout-session-plate">${s.plate}</span>
          <span class="checkout-session-detail">
            Spot ${s.spot_number} · ${s.vehicle_type} · Parked ${formatDuration(s.check_in_time)}
          </span>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="neu-btn neu-btn-sm transfer-btn" data-id="${s.id}" data-plate="${s.plate}" style="background: rgba(255, 255, 255, 0.08);">
            Transfer
          </button>
          <button class="neu-btn neu-btn-danger neu-btn-sm checkout-btn" data-id="${s.id}">
            Check Out
          </button>
        </div>
      </div>
    `).join('');

    checkoutResults.querySelectorAll('.checkout-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await performCheckout(btn.dataset.id);
      });
    });

    checkoutResults.querySelectorAll('.transfer-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openTransferModal(btn.dataset.id, btn.dataset.plate);
      });
    });
  }

  async function performCheckout(sessionId) {
    try {
      const data = await api.checkOut(sessionId);
      const fee = data.session.fee;
      const spot = data.session.spot;

      showResult(checkoutResult, `
        <div style="display: flex; align-items: flex-start; gap: 10px;">
          ${icons.check}
          <div style="width: 100%;">
            <strong>Check-Out Complete &amp; Fee Calculated</strong>
            <div class="fee-receipt" style="margin-top: 10px;">
              <div class="receipt-row">
                <span>Vehicle Plate</span>
                <strong style="letter-spacing: 1px;">${data.session.plate}</strong>
              </div>
              <div class="receipt-row">
                <span>Spot Bay</span>
                <span>${spot ? spot.spot_number : '—'}</span>
              </div>
              <div class="receipt-row">
                <span>Duration Parked</span>
                <span>${formatDuration(data.session.check_in_time, data.session.check_out_time)} (${fee.totalMinutes} min)</span>
              </div>
              <div class="receipt-row">
                <span>Rate Calculation</span>
                <span class="text-sm">${fee.breakdown}</span>
              </div>
              ${fee.dailyCapApplied ? '<div class="receipt-row"><span>Daily Cap Status</span><span style="color: var(--accent-green); font-weight: 600;">Daily Maximum Applied</span></div>' : ''}
              <div class="receipt-row receipt-total">
                <span>Total Amount Due</span>
                <span>${fee.rates.currency}${fee.totalFee}</span>
              </div>
            </div>
          </div>
        </div>
      `, 'success');

      showToast(`${data.session.plate} checked out — ${fee.rates.currency}${fee.totalFee}`, 'success');

      checkoutSearch.value = '';
      checkoutResults.innerHTML = '';

      loadAvailability();
      loadSpotMap();
      loadSessions();
    } catch (err) {
      showResult(checkoutResult, err.message, 'error');
      showToast(err.message, 'error');
    }
  }

  // ===== SESSION LOG =====
  const sessionTableBody = document.getElementById('sessionTableBody');
  const paginationInfo = document.getElementById('paginationInfo');
  const paginationControls = document.getElementById('paginationControls');

  document.querySelectorAll('.session-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const sortField = th.dataset.sort;
      if (state.sessions.sort === sortField) {
        state.sessions.order = state.sessions.order === 'desc' ? 'asc' : 'desc';
      } else {
        state.sessions.sort = sortField;
        state.sessions.order = 'desc';
      }
      state.sessions.page = 1;
      loadSessions();
      updateSortIndicators();
    });
  });

  function updateSortIndicators() {
    document.querySelectorAll('.session-table th[data-sort]').forEach(th => {
      th.classList.remove('sorted');
      const arrow = th.querySelector('.sort-arrow');
      if (arrow) arrow.textContent = '';

      if (th.dataset.sort === state.sessions.sort) {
        th.classList.add('sorted');
        if (arrow) arrow.textContent = state.sessions.order === 'asc' ? ' ↑' : ' ↓';
      }
    });
  }

  document.getElementById('filterStatus')?.addEventListener('change', (e) => {
    state.sessions.status = e.target.value;
    state.sessions.page = 1;
    loadSessions();
  });

  document.getElementById('filterVehicleType')?.addEventListener('change', (e) => {
    state.sessions.vehicle_type = e.target.value;
    state.sessions.page = 1;
    loadSessions();
  });

  let logSearchDebounce;
  document.getElementById('logPlateSearch')?.addEventListener('input', (e) => {
    clearTimeout(logSearchDebounce);
    logSearchDebounce = setTimeout(() => {
      state.sessions.plate = e.target.value.trim();
      state.sessions.page = 1;
      loadSessions();
    }, 400);
  });

  document.getElementById('pageSize')?.addEventListener('change', (e) => {
    state.sessions.limit = parseInt(e.target.value) || 10;
    state.sessions.page = 1;
    loadSessions();
  });

  async function loadSessions() {
    try {
      const params = {
        page: state.sessions.page,
        limit: state.sessions.limit,
        sort: state.sessions.sort,
        order: state.sessions.order
      };

      if (state.sessions.status) params.status = state.sessions.status;
      if (state.sessions.plate) params.plate = state.sessions.plate;
      if (state.sessions.vehicle_type) params.vehicle_type = state.sessions.vehicle_type;

      const data = await api.getSessions(params);
      renderSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      if (sessionTableBody) {
        sessionTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 40px;">Failed to load sessions</td></tr>`;
      }
    }
  }

  function renderSessions(data) {
    const { sessions, pagination } = data;

    if (sessions.length === 0) {
      sessionTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            <div style="margin-bottom: 8px;">
              <svg class="icon icon-xl" viewBox="0 0 24 24" style="color: var(--text-muted);"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <div>No matching sessions found</div>
            <div class="text-sm text-muted mt-sm">Check in a vehicle or adjust filters</div>
          </td>
        </tr>
      `;
    } else {
      sessionTableBody.innerHTML = sessions.map(s => {
        const isAutoClosed = s.status === 'auto-closed';
        const statusBadgeClass = s.status === 'active' ? 'badge-active' : (isAutoClosed ? 'badge-warning' : 'badge-completed');
        const statusLabel = isAutoClosed ? 'Auto-Closed 24h' : s.status;

        return `
          <tr>
            <td>
              <strong style="letter-spacing: 1px;">${s.plate}</strong>
              ${s.transfer_count > 0 ? `<div style="font-size: 0.72rem; color: #facc15; margin-top: 2px;">🔄 ${s.transfer_count} Valet Transfer(s)</div>` : ''}
            </td>
            <td><span class="badge badge-${s.vehicle_type}">${s.vehicle_type}</span></td>
            <td>${s.spot_number || '—'}</td>
            <td>${formatDateTime(s.check_in_time)}</td>
            <td>${s.check_out_time ? formatDateTime(s.check_out_time) : '<span class="text-muted">—</span>'}</td>
            <td>${s.fee !== null && s.fee !== undefined ? `₹${s.fee}` : '<span class="text-muted">—</span>'}</td>
            <td><span class="badge ${statusBadgeClass}">${statusLabel}</span></td>
            <td>
              ${s.status === 'active' ? `
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                  <button class="neu-btn neu-btn-sm inline-transfer-btn" data-id="${s.id}" data-plate="${s.plate}" style="font-size: 0.72rem; padding: 4px 8px; background: rgba(255, 255, 255, 0.08);">
                    Transfer
                  </button>
                  <button class="neu-btn neu-btn-danger neu-btn-sm inline-checkout-btn" data-id="${s.id}" style="font-size: 0.72rem; padding: 4px 8px;">
                    Check Out
                  </button>
                </div>
              ` : '<span class="text-muted text-sm">Closed</span>'}
            </td>
          </tr>
        `;
      }).join('');

      sessionTableBody.querySelectorAll('.inline-checkout-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          performCheckout(btn.dataset.id);
        });
      });

      sessionTableBody.querySelectorAll('.inline-transfer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          openTransferModal(btn.dataset.id, btn.dataset.plate);
        });
      });
    }

    if (paginationInfo) {
      const start = (pagination.page - 1) * pagination.limit + 1;
      const end = Math.min(pagination.page * pagination.limit, pagination.total);
      paginationInfo.textContent = pagination.total > 0
        ? `Showing ${start}–${end} of ${pagination.total} sessions`
        : 'No sessions';
    }

    if (paginationControls) {
      renderPagination(pagination);
    }
  }

  function renderPagination(pagination) {
    const { page, totalPages } = pagination;
    let html = '';

    html += `<button class="page-btn" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">‹</button>`;

    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      html += `<button class="page-btn" data-page="1">1</button>`;
      if (startPage > 2) html += `<span class="text-muted text-sm" style="padding: 0 4px;">…</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
      html += `<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += `<span class="text-muted text-sm" style="padding: 0 4px;">…</span>`;
      html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    html += `<button class="page-btn" ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}">›</button>`;

    paginationControls.innerHTML = html;

    paginationControls.querySelectorAll('.page-btn:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        state.sessions.page = parseInt(btn.dataset.page);
        loadSessions();
      });
    });
  }

  // ===== PLATE SEARCH (GLOBAL) =====
  const globalSearchInput = document.getElementById('globalPlateSearch');
  const globalSearchResults = document.getElementById('globalSearchResults');
  let globalSearchDebounce;

  globalSearchInput?.addEventListener('input', () => {
    clearTimeout(globalSearchDebounce);
    const query = globalSearchInput.value.trim();

    if (query.length < 2) {
      globalSearchResults.innerHTML = '';
      globalSearchResults.classList.add('hidden');
      return;
    }

    globalSearchDebounce = setTimeout(async () => {
      try {
        const data = await api.searchPlate(query, { limit: 10 });
        renderGlobalSearch(data);
      } catch (err) {
        globalSearchResults.innerHTML = `<p class="text-muted text-sm" style="padding: 12px;">Error: ${err.message}</p>`;
        globalSearchResults.classList.remove('hidden');
      }
    }, 350);
  });

  function renderGlobalSearch(data) {
    if (data.sessions.length === 0) {
      globalSearchResults.innerHTML = `<div style="padding: 16px;" class="text-muted text-sm">No sessions found matching "${data.query}"</div>`;
      globalSearchResults.classList.remove('hidden');
      return;
    }

    globalSearchResults.innerHTML = `
      <div style="padding: 12px 16px; font-size: 0.82rem; color: var(--text-muted); border-bottom: 1px solid var(--bg-dark);">
        Found ${data.pagination.total} session${data.pagination.total !== 1 ? 's' : ''} for "${data.query}"
      </div>
      ${data.sessions.map(s => `
        <div style="padding: 12px 16px; border-bottom: 1px solid var(--bg-dark); font-size: 0.88rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="letter-spacing: 1px;">${s.plate}</strong>
              <span class="badge badge-${s.status}" style="margin-left: 8px;">${s.status}</span>
              <span class="badge badge-${s.vehicle_type}" style="margin-left: 4px;">${s.vehicle_type}</span>
            </div>
            <span class="text-sm text-muted">${s.fee !== null ? '₹' + s.fee : 'Active'}</span>
          </div>
          <div class="text-sm text-muted" style="margin-top: 4px;">
            Spot ${s.spot_number || '—'} (${s.level || ''}) · Check In: ${formatDateTime(s.check_in_time)}${s.check_out_time ? ' · Out: ' + formatDateTime(s.check_out_time) : ''}
          </div>
        </div>
      `).join('')}
    `;
    globalSearchResults.classList.remove('hidden');
  }

  document.addEventListener('click', (e) => {
    if (globalSearchResults && !globalSearchResults.contains(e.target) && e.target !== globalSearchInput) {
      globalSearchResults.classList.add('hidden');
    }
  });

  function showResult(el, message, type) {
    if (!el) return;
    el.className = `ops-result show ${type}`;
    el.innerHTML = message;
  }

  // ===== INIT =====
  loadAvailability();
  loadSpotMap();
  loadSessions();
  updateSortIndicators();

  setInterval(() => {
    loadAvailability();
    loadSpotMap();
  }, 15000);
});
