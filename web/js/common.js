/**
 * Common utilities and shared functions for MarginMap frontend
 */

// Format currency
export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

// Format percentage
export function formatPercent(value, decimals = 1) {
  return `${value.toFixed(decimals)}%`;
}

// Format number with commas
export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

// API call wrapper
export async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Show toast notification
export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  const container = document.getElementById('toast-container');
  if (container) {
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Logout function
export async function logout() {
  try {
    await apiCall('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

// Check authentication
export async function checkAuth() {
  try {
    const data = await apiCall('/api/auth/me');
    return data.user;
  } catch (error) {
    window.location.href = '/login.html';
    return null;
  }
}

// Animate number counter
export function animateNumber(element, start, end, duration = 1000) {
  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
      current = end;
      clearInterval(timer);
    }
    element.textContent = Math.round(current);
  }, 16);
}

// Get margin status
export function getMarginStatus(marginPercent, target = 55) {
  if (marginPercent >= target + 10) return 'excellent';
  if (marginPercent >= target) return 'good';
  if (marginPercent >= target - 10) return 'warning';
  return 'critical';
}

// Get priority badge
export function getPriorityBadge(priority) {
  const badges = {
    high: '<span class="badge badge-high">High</span>',
    medium: '<span class="badge badge-medium">Medium</span>',
    low: '<span class="badge badge-low">Low</span>'
  };
  return badges[priority] || badges.medium;
}

// Get category icon
export function getCategoryIcon(category) {
  const icons = {
    pricing: '💰',
    discount: '🏷️',
    returns: '↩️',
    customer_pricing: '🤝',
    customer: '👥',
    leakage: '💧',
    region: '🌎'
  };
  return icons[category] || '📊';
}

// Initialize navigation
export function initNavigation() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Highlight current page in navigation
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    }
  });
}

// Loading state
export function showLoading(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading...</p></div>';
  }
}

export function hideLoading(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    const loading = container.querySelector('.loading');
    if (loading) loading.remove();
  }
}
