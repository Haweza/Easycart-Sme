/**
 * userFilters.js — User role/status filter panel and search
 * State lives in adminState; renderUsersTableData is called after filtering.
 */

import { adminState } from '../state/adminState.js';
import { renderUsersTableData } from './userRenderer.js';

export function toggleFilterPanel() {
  const panel = document.getElementById('filter-panel');
  panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
}

export function setFilter(type, value, btnEl) {
  if (type === 'role')     adminState.userFilterRole   = value;
  if (type === 'approval') adminState.userFilterStatus = value;

  // Highlight active chip
  const container = btnEl.parentElement;
  container.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');

  applyUserFilters();
}

export function clearFilters() {
  adminState.userFilterRole   = 'ALL';
  adminState.userFilterStatus = 'ALL';

  document.querySelectorAll('.filter-chip[data-filter]').forEach(b => {
    if (b.dataset.value === 'ALL') b.classList.add('active');
    else b.classList.remove('active');
  });

  document.getElementById('user-search').value = '';
  applyUserFilters();
}

export function applyUserFilters() {
  const { allUsers, userFilterRole, userFilterStatus } = adminState;
  const q = document.getElementById('user-search').value.toLowerCase();

  const filtered = allUsers.filter(u => {
    const matchesSearch =
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (userFilterRole   !== 'ALL' && u.role      !== userFilterRole)   return false;
    if (userFilterStatus === 'APPROVED' && !u.isApproved)               return false;
    if (userFilterStatus === 'PENDING'  &&  u.isApproved)               return false;
    return true;
  });

  // Badge count
  let activeFilters = 0;
  if (userFilterRole   !== 'ALL') activeFilters++;
  if (userFilterStatus !== 'ALL') activeFilters++;

  const filterCountEl = document.getElementById('active-filter-count');
  if (activeFilters > 0) {
    filterCountEl.textContent = activeFilters;
    filterCountEl.style.display = 'inline-flex';
  } else {
    filterCountEl.style.display = 'none';
  }

  renderUsersTableData(filtered);
}
