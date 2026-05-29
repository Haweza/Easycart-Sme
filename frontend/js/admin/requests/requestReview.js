/**
 * requestReview.js — Review modal open/submit logic
 * Tightly coupled: openReviewModal and doReview share currentReviewId via adminState.
 */

import { adminState } from '../state/adminState.js';
import { renderRequests } from './requestRenderer.js';
import { renderOverview } from '../overview/overviewRenderer.js';
import { closeModal } from '../utils/modal.js';
import { loadRequests, loadSubscriptions } from '../loaders/dataLoaders.js';

export function openReviewModal(requestId) {
  adminState.currentReviewId = requestId;
  const req = adminState.allRequests.find(r => r.id === requestId);
  document.getElementById('review-content').innerHTML = `
    <div class="card" style="background: var(--bg-subtle);">
      <div style="font-weight: 700; margin-bottom: 4px;">${req.userName}</div>
      <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 12px;">Requested: ${req.serviceName} (${req.planName || 'Any Plan'})</div>
      <div style="font-size: 0.85rem;">"${req.message || 'No message'}"</div>
    </div>
  `;
  document.getElementById('review-note').value = '';
  document.getElementById('review-start-date').value = '';
  document.getElementById('review-expires-date').value = '';
  document.getElementById('review-modal').classList.add('open');
}

export async function doReview(approved) {
  const note = document.getElementById('review-note').value.trim();
  const startDateVal = document.getElementById('review-start-date').value;
  const expiresDateVal = document.getElementById('review-expires-date').value;

  const payload = {
    approved,
    adminNote: note || null
  };
  if (approved) {
    if (startDateVal) payload.startDate = new Date(startDateVal).toISOString();
    if (expiresDateVal) payload.expiresAt = new Date(expiresDateVal).toISOString();
  }

  try {
    await ServiceRequests.review(adminState.currentReviewId, payload);
    await Promise.all([loadRequests(), loadSubscriptions()]);
    renderRequests();
    renderOverview();
    closeModal('review-modal');
    showToast(approved ? 'Request Approved' : 'Request Rejected', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}
