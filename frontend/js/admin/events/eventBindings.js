/**
 * eventBindings.js — Initialize event listeners for forms and modal actions
 */

import { doReview } from '../requests/requestReview.js';
import { loadFamilies, loadInvites } from '../loaders/dataLoaders.js';
import { renderFamilies } from '../families/familyRenderer.js';
import { renderSubscriptions } from '../subscriptions/subscriptionRenderer.js';
import { renderOverview } from '../overview/overviewRenderer.js';
import { renderInvites } from '../invites/inviteRenderer.js';
import { closeModal } from '../utils/modal.js';
import { showAddMemberView } from '../families/addMemberView.js';
import { renderPromoUsers } from '../promos/promoRenderer.js';
import { renderMySubscriptions } from '../subscriptions/mySubscriptionRenderer.js';
import { closePromoModal } from '../promos/promoActions.js';
import { openUserDetails } from '../users/userDetails.js';

export function initEventBindings() {
  document.addEventListener('DOMContentLoaded', () => {
    // Review modal buttons
    document.getElementById('review-approve-btn')?.addEventListener('click', () => doReview(true));
    document.getElementById('review-reject-btn')?.addEventListener('click', () => doReview(false));

    // Family form submission
    document.getElementById('family-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('family-submit-btn');
      if (!btn) return;
      btn.disabled = true;
      btn.textContent = 'Creating...';
      try {
        const startDateStr = document.getElementById('family-start-date').value;
        const expiresAtStr = document.getElementById('family-expires-date').value;

        const serviceId = document.getElementById('family-service').value;
        if (!serviceId) {
          showToast('Service is required', 'error');
          btn.disabled = false;
          btn.textContent = 'Create Family';
          return;
        }

        const payload = {
          name: document.getElementById('family-name').value.trim(),
          serviceId: serviceId,
          planId: document.getElementById('family-plan').value || null,
          organizerId: document.getElementById('family-organizer').value || null,
          maxMembers: 10
        };

        if (startDateStr) payload.startDate = new Date(startDateStr).toISOString();
        if (expiresAtStr) payload.expiresAt = new Date(expiresAtStr).toISOString();

        await Admin.createFamily(payload);
        await loadFamilies();
        renderFamilies();
        renderSubscriptions();
        renderOverview();
        closeModal('family-modal');
        showToast('Family Created!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Create Family';
      }
    });

    // Invite form submission
    document.getElementById('invite-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('invite-submit-btn');
      if (!btn) return;

      const recipientId = document.getElementById('invite-recipient').value;
      const familyId = document.getElementById('invite-family').value;
      const planId = document.getElementById('invite-plan-id').value;

      if (!recipientId) { showToast('Please select a recipient.', 'error'); return; }
      if (!familyId) { showToast('Please select a family.', 'error'); return; }
      if (!planId) { showToast('The selected family has no plan assigned.', 'error'); return; }

      btn.disabled = true;
      btn.textContent = 'Sending...';
      try {
        await Invites.create({
          recipientId,
          familyId,
          planId,
          message: document.getElementById('invite-message').value.trim()
        });
        await loadInvites();
        renderInvites();
        renderOverview();
        closeModal('invite-modal');
        showToast('Invite Sent!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send Invite';
      }
    });

    // Add Member trigger
    document.getElementById('btn-add-member-trigger')?.addEventListener('click', showAddMemberView);

    // NEW: Promo modal close listener
    document.getElementById('promo-review-modal')?.addEventListener('click', function(e) {
      if (e.target === this) {
        closePromoModal();
      }
    });

    // NEW: Subscription render on load
    renderSubscriptions();

    // NEW: Promo users render on load
    renderPromoUsers();

    // NEW: My subscriptions render on load
    renderMySubscriptions();
  });

  // NEW: User name click handler for user details
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('user-link')) {
      e.preventDefault();
      const userId = e.target.dataset.userId;
      if (userId) {
        openUserDetails(userId);
      }
    }
  });
}
