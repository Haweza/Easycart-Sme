/**
 * EasyCart SME — API Client
 * Central fetch wrapper with auth headers and error handling
 */

const API_BASE = window.API_BASE_URL || 'http://localhost:8080/api';

// ---- Token helpers ----------------------------------------
function getToken() { return localStorage.getItem('ec_token'); }
function getUser() { return JSON.parse(localStorage.getItem('ec_user') || 'null'); }
function setAuth(token, user) { localStorage.setItem('ec_token', token); localStorage.setItem('ec_user', JSON.stringify(user)); }
function clearAuth() { localStorage.removeItem('ec_token'); localStorage.removeItem('ec_user'); }
function isLoggedIn() { return !!getToken(); }

// ---- Core fetch ------------------------------------------- 
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (networkErr) {
    // Only genuine network failures (offline, CORS block, DNS) land here
    console.error('Network Error:', networkErr.message, 'URL:', `${API_BASE}${path}`);
    throw new Error('Connection failed — please check your internet or backend status.');
  }

  if (res.status === 401) {
    clearAuth();
    window.location.replace('login.html');
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Throw the real backend message so callers can show it
    const errorMsg = data.message || `HTTP ${res.status} at ${path}`;
    console.error('API Error:', errorMsg);
    throw new Error(errorMsg);
  }

  return data;
}



// ---- Auth -------------------------------------------------
const Auth = {
  register: (payload) => apiFetch('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => apiFetch('/auth/login', { method: 'POST', body: payload }),
  me: () => apiFetch('/auth/me'),
};

// ---- Services ---------------------------------------------
const Services = {
  listActive: () => apiFetch('/services'),
};

// ---- Service Requests -------------------------------------
const ServiceRequests = {
  create: (payload) => apiFetch('/service-requests', { method: 'POST', body: payload }),
  getMy: () => apiFetch('/service-requests/my'),
  getPending: () => apiFetch('/service-requests/pending'),
  getAll: () => apiFetch('/service-requests'),
  review: (id, payload) => apiFetch(`/service-requests/${id}/review`, { method: 'PUT', body: payload }),
};

// ---- Invites ----------------------------------------------
const Invites = {
  getMy: () => apiFetch('/invites/my'),
  getAll: () => apiFetch('/invites'),
  create: (payload) => apiFetch('/invites', { method: 'POST', body: payload }),
  accept: (id) => apiFetch(`/invites/${id}/accept`, { method: 'POST' }),
  decline: (id) => apiFetch(`/invites/${id}/decline`, { method: 'POST' }),
};

// ---- Admin ------------------------------------------------
const Admin = {
  getUsers: () => apiFetch('/admin/users'),
  assignRole: (id, role) => apiFetch(`/admin/users/${id}/role`, { method: 'PUT', body: { role } }),
  approveUser: (id) => apiFetch(`/admin/users/${id}/approve`, { method: 'PUT' }),
  getFamilies: () => apiFetch('/admin/families'),
  createFamily: (payload) => apiFetch('/admin/families', { method: 'POST', body: payload }),
  assignOrganizer: (id, organizerId) => apiFetch(`/admin/families/${id}/organizer`, { method: 'PUT', body: { organizerId } }),
  addFamilyMember: (familyId, userId) => apiFetch(`/admin/families/${familyId}/members`, { method: 'POST', body: { userId } }),
  removeFamilyMember: (familyId, userId) => apiFetch(`/families/${familyId}/members/${userId}`, { method: 'DELETE' }),
  getActivities: () => apiFetch('/admin/activities'),
  getSubscriptions: () => apiFetch('/admin/subscriptions'),
  deleteSubscription: (subscriptionId) => apiFetch(`/admin/subscriptions/${subscriptionId}`, { method: 'DELETE' }),
  deleteActivity: (id) => apiFetch(`/admin/activities/${id}`, { method: 'DELETE' }),
  clearActivities: () => apiFetch('/admin/activities', { method: 'DELETE' }),
};

// ---- Promo Users (NEW) ------------------------------------
const PromoUsers = {
  create: (payload) => apiFetch('/promo-users', { method: 'POST', body: payload }),
  getPending: () => apiFetch('/promo-users/pending'),
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/promo-users/admin/all?${query}`);
  },
  getMy: () => apiFetch('/promo-users/my'),
  approve: (id) => apiFetch(`/promo-users/${id}/approve`, { method: 'PUT' }),
  reject: (id, reason) => apiFetch(`/promo-users/${id}/reject`, { method: 'PUT', body: { reason } }),
  getExpiringSoon: () => apiFetch('/promo-users/expiring-soon'),
};

// ---- Subscriptions (NEW) ----------------------------------
const Subscriptions = {
  getMy: () => apiFetch('/subscriptions/my'),
};

// ---- Organizer --------------------------------------------
const Organizer = {
  getMyFamilies: () => apiFetch('/families'),
  getMembers: (familyId) => apiFetch(`/families/${familyId}/members`),
  removeFamilyMember: (familyId, userId) => apiFetch(`/families/${familyId}/members/${userId}`, { method: 'DELETE' }),
  getActivities: () => apiFetch('/families/activities'),
};

// ---- Toast ------------------------------------------------
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut .3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ---- Role guard -------------------------------------------
function requireRole(...roles) {
  const user = getUser();
  if (!user || !isLoggedIn()) {
    window.location.replace('login.html');
    return false;
  }
  if (roles.length && !roles.includes(user.role)) {
    window.location.replace('dashboard.html');
    return false;
  }
  return true;
}

// ---- Redirect based on role --------------------------------
function redirectByRole() {
  const user = getUser();
  if (!user) return;
  // All roles land on dashboard first — Admin Panel is accessed via button from there
  const map = { ADMIN: 'dashboard.html', ORGANIZER: 'dashboard.html', CUSTOMER: 'dashboard.html' };
  window.location.href = map[user.role] || 'dashboard.html';
}

// ---- Badge helper -----------------------------------------
function roleBadge(role) {
  const cls = { ADMIN: 'badge-admin', ORGANIZER: 'badge-organizer', CUSTOMER: 'badge-customer' };
  return `<span class="badge ${cls[role] || ''}">${role}</span>`;
}
function statusBadge(status) {
  const cls = {
    PENDING: 'badge-pending', ACCEPTED: 'badge-accepted', DECLINED: 'badge-declined',
    EXPIRED: 'badge-expired', APPROVED: 'badge-approved', REJECTED: 'badge-rejected',
    ACTIVE: 'badge-active',
  };
  return `<span class="badge ${cls[status] || ''}">${status}</span>`;
}

// ---- Date formatter ---------------------------------------
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-ZM', { day: '2-digit', month: 'short', year: 'numeric' });
}
