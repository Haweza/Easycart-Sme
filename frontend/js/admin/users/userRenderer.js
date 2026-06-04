/**
 * userRenderer.js — Users table rendering
 */

import { adminState } from '../state/adminState.js';
import { applyUserFilters } from './userFilters.js';

export function renderUsers() {
  applyUserFilters();
}

export function renderUsersTableData(users) {
  const tbody = document.getElementById('users-tbody');
  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><h3>No users found matching filters</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.fullName}</strong></td>
      <td class="text-sm text-muted">${u.email}</td>
      <td>${roleBadge(u.role)}</td>
      <td class="text-sm text-muted">${fmtDate(u.createdAt)}</td>
      <td>
        ${u.isApproved
      ? `<span class="badge badge-accepted">Approved</span>`
      : `<button class="btn btn-primary btn-sm" onclick="approveUser('${u.id}')">Approve</button>`}
      </td>
      <td>
        <div style="display:flex;gap:6px;">
          <select class="form-control" style="width:120px; font-size: 0.8rem; padding: 4px;" onchange="changeRole('${u.id}', this.value)">
            <option value="">Role...</option>
            <option value="CUSTOMER">Customer</option>
            <option value="ORGANIZER">Organizer</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button class="btn btn-outline btn-sm" onclick="openUserDetails('${u.id}')">Details</button>
        </div>
      </td>
    </tr>`).join('');
}
