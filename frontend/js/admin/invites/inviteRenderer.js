/**
 * inviteRenderer.js — Invites table rendering
 */

import { adminState } from '../state/adminState.js';

export function renderInvites() {
  const tbody = document.getElementById('invites-tbody');
  const { allInvites } = adminState;

  if (!allInvites.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:40px">No invites sent.</td></tr>`;
    return;
  }
  tbody.innerHTML = allInvites.map(i => `
    <tr>
      <td><strong>${i.recipientName}</strong></td>
      <td>${i.familyName}</td>
      <td>${i.planName} (${i.serviceName})</td>
      <td class="text-muted text-sm">${fmtDate(i.createdAt)}</td>
      <td class="text-muted text-sm">${fmtDate(i.expiresAt)}</td>
      <td>${statusBadge(i.status)}</td>
    </tr>
  `).join('');
}
