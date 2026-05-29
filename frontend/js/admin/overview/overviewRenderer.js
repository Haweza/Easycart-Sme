/**
 * overviewRenderer.js — Dashboard overview counts, alerts, and badges
 */

import { adminState } from '../state/adminState.js';

export function renderOverview() {
  const { allUsers, allRequests, allInvites, allFamilies, allSubscriptions } = adminState;

  const unapproved = allUsers.filter(u => !u.isApproved).length;
  const pendingRequests = allRequests.filter(r => r.status === 'PENDING');
  const pendingInv = allInvites.filter(i => i.status === 'PENDING').length;

  // Calculate subscriptions expiring soon (family + individual)
  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const expiringFamilies = allFamilies.filter(f => {
    if (!f.expiresAt) return false;
    const exp = new Date(f.expiresAt);
    return exp > now && exp <= next7Days;
  }).length;

  const expiringIndividuals = allSubscriptions.filter(s => {
    if (s.status !== 'ACTIVE' || !s.expiresAt) return false;
    const exp = new Date(s.expiresAt);
    return exp > now && exp <= next7Days;
  }).length;

  const expiring = expiringFamilies + expiringIndividuals;

  document.getElementById('s-users').textContent = allUsers.length;
  document.getElementById('s-users-sub').textContent = unapproved ? `${unapproved} pending approval` : 'All approved';

  document.getElementById('s-families').textContent = allFamilies.length;
  const activeFamilies = allFamilies.filter(f => f.isActive).length;
  document.getElementById('s-families-sub').textContent = `${activeFamilies} active`;

  document.getElementById('s-req-pending').textContent = pendingRequests.length;
  document.getElementById('s-inv-pending').textContent = pendingInv;
  document.getElementById('s-expiring').textContent = expiring;

  // Badges
  const unapprovedBadge = document.getElementById('unapproved-badge');
  if (unapprovedBadge) {
    if (unapproved) {
      unapprovedBadge.textContent = unapproved;
      unapprovedBadge.style.display = 'inline-flex';
    } else {
      unapprovedBadge.style.display = 'none';
    }
  }

  const pendingReqBadge = document.getElementById('pending-req-badge');
  if (pendingReqBadge) {
    if (pendingRequests.length) {
      pendingReqBadge.textContent = pendingRequests.length;
      pendingReqBadge.style.display = 'inline-flex';
    } else {
      pendingReqBadge.style.display = 'none';
    }
  }

  // Alerts
  const alertsContainer = document.getElementById('overview-alerts');
  if (alertsContainer) {
    let alertsHtml = '';
    if (unapproved > 0) {
      alertsHtml += `<div class="alert alert-warning" style="cursor:pointer" onclick="showView('users')">⚠️ <strong>${unapproved} user(s)</strong> awaiting approval to join the platform.</div>`;
    }
    if (pendingRequests.length > 0) {
      alertsHtml += `<div class="alert alert-warning" style="cursor:pointer" onclick="showView('requests')">📋 <strong>${pendingRequests.length} request(s)</strong> awaiting review.</div>`;
    }
    if (expiring > 0) {
      alertsHtml += `<div class="alert alert-danger" style="cursor:pointer" onclick="showView('subscriptions')">🔴 <strong>${expiring} subscription(s)</strong> expiring within 7 days.</div>`;
    }
    alertsContainer.innerHTML = alertsHtml;
  }
}
