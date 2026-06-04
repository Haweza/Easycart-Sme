/**
 * promoRenderer.js — Render Promo Users Management UI
 */

import { adminState } from '../state/adminState.js';

export function renderPromoUsers() {
  const container = document.getElementById('promo-users-list');
  if (!container) return;
  
  const filter = adminState.promoFilterApprovalStatus;
  
  let filtered = adminState.allPromoUsers;
  if (filter !== 'ALL') {
    filtered = filtered.filter(p => p.approvalStatus === filter);
  }
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎁</div>
        <h3>No Promo Users</h3>
        <p>No promo users found with the current filter.</p>
      </div>
    `;
    return;
  }
  
  const html = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>User Name</th>
          <th>Service</th>
          <th>Plan</th>
          <th>Start Date</th>
          <th>Expiry Date</th>
          <th>Status</th>
          <th>Approval</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(promo => `
          <tr>
            <td>
              <a href="#" class="user-link" data-user-id="${promo.profileId}">
                ${escapeHtml(promo.profileName)}
              </a>
            </td>
            <td>${escapeHtml(promo.serviceName)}</td>
            <td>${escapeHtml(promo.planName)}</td>
            <td>${formatDate(promo.startDate)}</td>
            <td>${formatDate(promo.expiryDate)}</td>
            <td><span class="status-badge status-${(promo.status || 'pending').toLowerCase()}">${promo.status || 'PENDING'}</span></td>
            <td><span class="approval-badge approval-${(promo.approvalStatus || 'pending').toLowerCase()}">${promo.approvalStatus || 'PENDING'}</span></td>
            <td>
              ${promo.approvalStatus === 'PENDING' ? `
                <button class="btn btn-sm btn-primary" onclick="openPromoReviewModal('${promo.id}')">
                  Review
                </button>
              ` : `
                <button class="btn btn-sm btn-outline" onclick="openPromoReviewModal('${promo.id}')">
                  View
                </button>
              `}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = html;
}

// Helper functions
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'Invalid date';
  }
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}
