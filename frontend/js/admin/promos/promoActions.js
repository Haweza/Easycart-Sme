/**
 * promoActions.js — Actions for Promo User Management
 */

import { adminState } from '../state/adminState.js';
import { loadPromoUsers, loadPendingPromoUsers, loadSubscriptions } from '../loaders/dataLoaders.js';
import { renderPromoUsers } from './promoRenderer.js';
import { renderSubscriptions } from '../subscriptions/subscriptionRenderer.js';

// Approve promo user
export async function approvePromoUser() {
  const promoUserId = adminState.currentPromoReviewId;
  if (!promoUserId) {
    showToast('No promo user selected', 'error');
    return;
  }
  
  try {
    await PromoUsers.approve(promoUserId);
    showToast('Promo access approved', 'success');
    
    // Reload promo data
    await loadPromoUsers();
    await loadPendingPromoUsers();
    
    // Re-render
    renderPromoUsers();
    closePromoModal();
  } catch (error) {
    showToast('Error approving promo: ' + error.message, 'error');
  }
}

// Reject promo user
export async function rejectPromoUser() {
  const promoUserId = adminState.currentPromoReviewId;
  const reason = document.getElementById('promo-rejection-reason')?.value || '';
  
  if (!promoUserId) {
    showToast('No promo user selected', 'error');
    return;
  }
  
  try {
    await PromoUsers.reject(promoUserId, reason);
    showToast('Promo access rejected', 'success');
    
    await loadPromoUsers();
    await loadPendingPromoUsers();
    
    renderPromoUsers();
    closePromoModal();
  } catch (error) {
    showToast('Error rejecting promo: ' + error.message, 'error');
  }
}

// Delete subscription
export async function deleteSubscriptionAction(subscriptionId) {
  const subscription = adminState.allSubscriptions.find(s => s.id === subscriptionId);
  
  if (!subscription) {
    showToast('Subscription not found', 'error');
    return;
  }
  
  const confirmed = confirm(
    `Delete subscription for ${subscription.planName}?\n\nThis action cannot be undone.`
  );
  
  if (!confirmed) return;
  
  try {
    await Admin.deleteSubscription(subscriptionId);
    showToast('Subscription deleted', 'success');
    
    await loadSubscriptions();
    renderSubscriptions();
  } catch (error) {
    showToast('Error deleting subscription: ' + error.message, 'error');
  }
}

// Open promo review modal
export function openPromoReviewModal(promoUserId) {
  const promo = adminState.allPromoUsers.find(p => p.id === promoUserId);
  if (!promo) {
    showToast('Promo user not found', 'error');
    return;
  }
  
  adminState.currentPromoReviewId = promoUserId;
  
  // Populate modal with promo details
  document.getElementById('promo-review-user-name').textContent = promo.profileName;
  document.getElementById('promo-review-user-email').textContent = promo.profileEmail || 'N/A';
  document.getElementById('promo-review-service').textContent = promo.serviceName;
  document.getElementById('promo-review-plan').textContent = promo.planName;
  document.getElementById('promo-review-start-date').textContent = formatDate(promo.startDate);
  document.getElementById('promo-review-expiry-date').textContent = formatDate(promo.expiryDate);
  document.getElementById('promo-review-notes').textContent = promo.notes || 'No notes';
  document.getElementById('promo-rejection-reason').value = '';
  
  // Update status display
  const statusDisplay = document.getElementById('promo-review-status');
  statusDisplay.innerHTML = `<span class="approval-badge approval-${(promo.approvalStatus || 'pending').toLowerCase()}">${promo.approvalStatus || 'PENDING'}</span>`;
  
  // Show/hide buttons based on status
  const approveBtn = document.getElementById('promo-approve-btn');
  const rejectBtn = document.getElementById('promo-reject-btn');
  const rejectionGroup = document.getElementById('promo-rejection-reason-group');
  
  if (promo.approvalStatus === 'PENDING') {
    approveBtn.style.display = 'block';
    rejectBtn.style.display = 'block';
    rejectionGroup.style.display = 'none';
  } else if (promo.approvalStatus === 'REJECTED') {
    approveBtn.style.display = 'none';
    rejectBtn.style.display = 'none';
    rejectionGroup.style.display = 'block';
    // Show the reason that was already rejected with
    let rejectionReason = 'N/A';
    if (promo.notes && promo.notes.includes('Rejected: ')) {
      rejectionReason = promo.notes.split('Rejected: ').pop();
    }
    document.getElementById('promo-rejection-reason').value = rejectionReason;
    document.getElementById('promo-rejection-reason').disabled = true;
  } else {
    approveBtn.style.display = 'none';
    rejectBtn.style.display = 'none';
    rejectionGroup.style.display = 'none';
  }
  
  document.getElementById('promo-review-modal').classList.add('open');
}

export function closePromoModal() {
  document.getElementById('promo-review-modal').classList.remove('open');
  adminState.currentPromoReviewId = null;
}

// Filter promo users
export function filterPromoUsers(status) {
  adminState.promoFilterApprovalStatus = status;
  renderPromoUsers();
}

// Click user name to open user details modal
function openUserDetailsFromPromo(userId) {
  openUserDetails(userId);
}

// Format date helper (should use existing formatDate function)
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'Invalid date';
  }
}

// Toast helper (should use existing showToast function)
function showToast(message, type = 'info') {
  // Assuming showToast exists globally; otherwise implement here
  if (typeof window.showToast === 'function') {
    window.showToast(message, type);
  } else {
    console.log(`[${type}] ${message}`);
  }
}
