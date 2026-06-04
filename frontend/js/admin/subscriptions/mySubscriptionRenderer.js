/**
 * mySubscriptionRenderer.js — Render Customer "My Subscription" Dashboard
 */

import { adminState } from '../state/adminState.js';

export function renderMySubscriptions() {
  const container = document.getElementById('subscription-content');
  if (!container) return;
  
  if (!adminState.customerSubscriptions || adminState.customerSubscriptions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>No Active Subscriptions</h3>
        <p>You currently have no active subscriptions. Browse available services to get started.</p>
        <button class="btn btn-primary" onclick="showView('services')">View Services</button>
      </div>
    `;
    return;
  }
  
  const html = adminState.customerSubscriptions.map(sub => `
    <div class="subscription-card active">
      <div class="subscription-card-header">
        <h3 class="subscription-card-title">${escapeHtml(sub.serviceName)}</h3>
        <span class="status-badge status-${(sub.status || 'ACTIVE').toLowerCase()}">${sub.status || 'ACTIVE'}</span>
      </div>
      
      <div class="subscription-card-body">
        <div class="subscription-detail">
          <span class="subscription-detail-label">Subscription Type</span>
          <span class="subscription-detail-value">${escapeHtml(sub.planName || 'N/A')}</span>
        </div>
        
        <div class="subscription-detail">
          <span class="subscription-detail-label">Start Date</span>
          <span class="subscription-detail-value">${formatDate(sub.startDate)}</span>
        </div>
        
        <div class="subscription-detail">
          <span class="subscription-detail-label">Expiry Date</span>
          <span class="subscription-detail-value">${formatDate(sub.expiresAt)}</span>
        </div>
        
        <div class="subscription-detail">
          <span class="subscription-detail-label">Status</span>
          <span class="subscription-detail-value">${sub.status === 'ACTIVE' ? '✓ Active' : 'Expired'}</span>
        </div>
        
        ${sub.status === 'ACTIVE' ? `
          <div class="subscription-actions">
            <button class="btn btn-outline" onclick="openManageSubscriptionModal('${sub.id}')">
              Manage
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
  
  container.innerHTML = html;
}

// Helper functions
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid date';
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Placeholder for future manage subscription modal
function openManageSubscriptionModal(subscriptionId) {
  console.log('Opening manage subscription modal for:', subscriptionId);
  // Implement when needed
}
