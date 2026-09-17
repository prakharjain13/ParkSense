/**
 * ParkSense — API Client
 * Fetch wrapper with JWT authentication
 */

const API_BASE = '/api';

class ParkSenseAPI {
  constructor() {
    this.token = localStorage.getItem('parksense_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('parksense_token', token);
    } else {
      localStorage.removeItem('parksense_token');
    }
  }

  getToken() {
    return this.token;
  }

  isAuthenticated() {
    return !!this.token;
  }

  logout() {
    this.setToken(null);
    localStorage.removeItem('parksense_user');
    window.location.href = '/login.html';
  }

  setUser(user) {
    localStorage.setItem('parksense_user', JSON.stringify(user));
  }

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('parksense_user'));
    } catch {
      return null;
    }
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle auth errors
        if (response.status === 401) {
          this.logout();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(data.message || data.error || `Request failed (${response.status})`);
      }

      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Unable to connect to server. Is it running?');
      }
      throw err;
    }
  }

  // Auth
  async register(username, password, full_name) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, full_name })
    });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  }

  async login(username, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  }

  async getProfile() {
    return this.request('/auth/me');
  }

  // Spots
  async getAvailability() {
    return this.request('/spots/availability');
  }

  async getSpots(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/spots?${query}`);
  }

  // Sessions
  async checkIn(plate, vehicle_type) {
    return this.request('/sessions/checkin', {
      method: 'POST',
      body: JSON.stringify({ plate, vehicle_type })
    });
  }

  async checkOut(sessionId) {
    return this.request(`/sessions/${sessionId}/checkout`, {
      method: 'POST'
    });
  }

  async getSessions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/sessions?${query}`);
  }

  async getSession(id) {
    return this.request(`/sessions/${id}`);
  }

  // Search
  async searchPlate(plate, params = {}) {
    const allParams = { plate, ...params };
    const query = new URLSearchParams(allParams).toString();
    return this.request(`/search?${query}`);
  }

  // Config
  async getRates() {
    const response = await fetch(`${API_BASE}/config/rates`);
    return response.json();
  }
}

// Global instance
const api = new ParkSenseAPI();

// Toast notification helper
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Date formatting helper
function formatDateTime(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString + (isoString.endsWith('Z') ? '' : 'Z'));
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Duration formatting helper
function formatDuration(checkIn, checkOut) {
  if (!checkIn) return '—';
  const inDate = new Date(checkIn + (checkIn.endsWith('Z') ? '' : 'Z'));
  const outDate = checkOut ? new Date(checkOut + (checkOut.endsWith('Z') ? '' : 'Z')) : new Date();
  const diffMs = Math.max(0, outDate - inDate);
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
