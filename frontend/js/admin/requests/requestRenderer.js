/**
 * requestRenderer.js — Service requests table rendering
 */

import { adminState } from '../state/adminState.js';

export function renderRequests() {
  const tbody = document.getElementById('requests-tbody');
  const pendingRequests = adminState.allRequests.filter(r => r.status === 'PENDING');
  if (!pendingRequests.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 40px;">No pending requests.</td></tr>`;
    return;
  }
  tbody.innerHTML = pendingRequests.map(r => `
    <tr>
      <td><strong>${r.userName}</strong></td>
      <td>${r.serviceName}</td>
      <td>${r.planName || '<span class="text-muted">Not specified</span>'}</td>
      <td class="text-sm text-muted">${fmtDate(r.createdAt)}</td>
      <td>${statusBadge(r.status)}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="openReviewModal('${r.id}')">Review</button>
      </td>
    </tr>`).join('');
}
