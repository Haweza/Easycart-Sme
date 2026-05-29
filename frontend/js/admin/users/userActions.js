/**
 * userActions.js — User mutation actions (approve, change role)
 */

import { adminState } from '../state/adminState.js';
import { applyUserFilters } from './userFilters.js';
import { renderOverview } from '../overview/overviewRenderer.js';

export async function approveUser(userId) {
  try {
    await Admin.approveUser(userId);
    const u = adminState.allUsers.find(u => u.id === userId);
    if (u) u.isApproved = true;
    applyUserFilters();
    renderOverview();
    showToast('User approved!', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

export async function changeRole(userId, newRole) {
  if (!newRole) return;
  try {
    await Admin.assignRole(userId, newRole);
    const u = adminState.allUsers.find(u => u.id === userId);
    if (u) u.role = newRole;
    applyUserFilters();
    showToast(`Role updated to ${newRole}`, 'success');
  } catch (e) { showToast(e.message, 'error'); }
}
