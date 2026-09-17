/**
 * ParkSense — Auth Page Logic
 * Handles login and registration forms
 */

document.addEventListener('DOMContentLoaded', () => {
  // If already authenticated, redirect to dashboard
  if (api.isAuthenticated()) {
    window.location.href = '/dashboard.html';
    return;
  }

  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginError = document.getElementById('loginError');
  const registerError = document.getElementById('registerError');

  // Toggle between login and register
  loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
    loginError.classList.remove('show');
  });

  registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
    registerError.classList.remove('show');
  });

  // Login form submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.remove('show');

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    if (!username || !password) {
      loginError.textContent = 'Please fill in all fields';
      loginError.classList.add('show');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Signing in...';

    try {
      await api.login(username, password);
      showToast('Welcome back!', 'success');
      window.location.href = '/dashboard.html';
    } catch (err) {
      loginError.textContent = err.message;
      loginError.classList.add('show');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });

  // Register form submission
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.classList.remove('show');

    const full_name = document.getElementById('registerName').value.trim();
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const submitBtn = registerForm.querySelector('button[type="submit"]');

    if (!full_name || !username || !password || !confirmPassword) {
      registerError.textContent = 'Please fill in all fields';
      registerError.classList.add('show');
      return;
    }

    if (password !== confirmPassword) {
      registerError.textContent = 'Passwords do not match';
      registerError.classList.add('show');
      return;
    }

    if (password.length < 6) {
      registerError.textContent = 'Password must be at least 6 characters';
      registerError.classList.add('show');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Creating account...';

    try {
      await api.register(username, password, full_name);
      showToast('Account created! Welcome to ParkSense.', 'success');
      window.location.href = '/dashboard.html';
    } catch (err) {
      registerError.textContent = err.message;
      registerError.classList.add('show');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  });
});
