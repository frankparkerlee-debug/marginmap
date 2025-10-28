const API_BASE = '/api';
const DEFAULT_COMPANY_NAME = window.COMPANY_NAME || (localStorage.getItem('mm_company') || 'Evergreen Wound Supply');

const MM = {
  getToken() {
    return localStorage.getItem('mm_token');
  },
  requireAuth() {
    if (!MM.getToken()) {
      window.location.href = '/login.html';
    }
  },
  async apiFetch(path, options = {}) {
    const opts = { ...options };
    opts.headers = opts.headers ? { ...opts.headers } : {};

    const token = MM.getToken();
    if (token) {
      opts.headers.Authorization = `Bearer ${token}`;
    }

    if (opts.body && !(opts.body instanceof FormData)) {
      opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';
      if (typeof opts.body !== 'string') {
        opts.body = JSON.stringify(opts.body);
      }
    }

    const response = await fetch(`${API_BASE}${path}`, opts);
    if (response.status === 401) {
      localStorage.removeItem('mm_token');
      window.location.href = '/login.html';
      return Promise.reject(new Error('Unauthorized'));
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Request failed');
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  },
  formatCurrency(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
  },
  formatPercent(value) {
    return `${(value * 100).toFixed(1)}%`;
  },
  initLayout() {
    const pageKey = document.body.dataset.page;
    const navLinks = document.querySelectorAll('[data-nav]');
    navLinks.forEach((link) => {
      if (link.dataset.nav === pageKey) {
        link.classList.add('bg-slate-800', 'text-teal-300');
      } else {
        link.classList.remove('bg-slate-800', 'text-teal-300');
      }
    });

    const companyNameEl = document.getElementById('companyName');
    if (companyNameEl) {
      companyNameEl.textContent = DEFAULT_COMPANY_NAME;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (event) => {
        event.preventDefault();
        localStorage.removeItem('mm_token');
        window.location.href = '/login.html';
      });
    }
  }
};

window.MM = MM;

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page && document.body.dataset.page !== 'login') {
    MM.requireAuth();
    MM.initLayout();
  }
});
