/**
 * userDetails.js — User analytics / intelligence modal
 */

import { adminState } from '../state/adminState.js';

export async function openUserDetails(userId) {
  const { allUsers, allRequests, allInvites, allSubscriptions } = adminState;
  const u = allUsers.find(x => x.id === userId);
  if (!u) return;

  document.getElementById('user-details-name').textContent = u.fullName;
  document.getElementById('user-details-email').textContent = u.email;
  document.getElementById("user-details-phone").textContent =
    u.phone || "No phone number";

  // Badges
  const badgesHtml = `
    ${roleBadge(u.role)}
    ${u.isApproved ? '<span class="badge badge-accepted">Approved</span>' : '<span class="badge badge-pending">Pending Approval</span>'}
  `;
  document.getElementById('user-details-badges').innerHTML = badgesHtml;

  // Compute analytics
  const userReqs = allRequests.filter(r => r.userId === userId);
  const userInvs = allInvites.filter(i => i.recipientId === userId);

  // Engagement Score
  let score = 0;
  if (u.isApproved) score += 20;
  if (userReqs.length > 0) score += 30;

  const acceptedInvs = userInvs.filter(i => i.status === 'ACCEPTED').length;
  if (acceptedInvs > 0) score += Math.min(50, acceptedInvs * 25);

  document.getElementById('engagement-bar').style.width = `${score}%`;
  document.getElementById('engagement-score-text').textContent = `${score}%`;

  let engLabel = 'Low Engagement';
  if (score >= 40) engLabel = 'Active User';
  if (score >= 80) engLabel = 'Highly Engaged';
  document.getElementById('engagement-label').textContent = engLabel;

  // Grid stats
  document.getElementById('user-details-grid').innerHTML = `
    <div class="detail-item"><div class="detail-label">Joined</div><div class="detail-value">${fmtDate(u.createdAt)}</div></div>
    <div class="detail-item"><div class="detail-label">Requests</div><div class="detail-value">${userReqs.length}</div></div>
    <div class="detail-item"><div class="detail-label">Invites Received</div><div class="detail-value">${userInvs.length}</div></div>
    <div class="detail-item"><div class="detail-label">Families (Active)</div><div class="detail-value">${acceptedInvs}</div></div>
  `;

  // Active individual subscriptions list
  const activeSubContainer = document.getElementById('user-active-subscriptions');
  const userSubs = allSubscriptions.filter(s => s.userId === userId);
  if (userSubs.length) {
    activeSubContainer.innerHTML = userSubs.map(s => {
      const start = s.startDate ? fmtDate(s.startDate) : 'Not set';
      const expiry = s.expiresAt ? fmtDate(s.expiresAt) : 'Not set';
      return `
        <div style="background:var(--bg-subtle); padding:10px; border-radius:var(--radius-sm); border-left:3px solid var(--accent); font-size:0.85rem; display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; justify-content:space-between; font-weight:600; align-items:center;">
            <span>${s.serviceName} (${s.planName || 'Any Plan'})</span>
            <span class="badge badge-accepted">${s.status}</span>
          </div>
          <div style="display:flex; justify-content:space-between; color:var(--text-muted); font-size:0.78rem;">
            <span>Start: ${start}</span>
            <span>Expiry: ${expiry}</span>
          </div>
        </div>
      `;
    }).join('');
  } else {
    activeSubContainer.innerHTML = '<span class="text-muted text-sm">No active individual subscriptions</span>';
  }

  // Requests list
  const reqContainer = document.getElementById('user-request-history');
  if (userReqs.length) {
    reqContainer.innerHTML = userReqs.map(r => `
      <div style="font-size:0.85rem;display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:4px;">
        <span>${r.serviceName}</span>
        ${statusBadge(r.status)}
      </div>
    `).join('');
  } else {
    reqContainer.innerHTML = '<span class="text-muted text-sm">No requests</span>';
  }

  // Invites list
  const invContainer = document.getElementById('user-invite-history');
  if (userInvs.length) {
    invContainer.innerHTML = userInvs.map(i => `
      <div style="font-size:0.85rem;display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:4px;">
        <span>${i.familyName} (${i.serviceName})</span>
        ${statusBadge(i.status)}
      </div>
    `).join('');
  } else {
    invContainer.innerHTML = '<span class="text-muted text-sm">No invites</span>';
  }

  document.getElementById('user-details-modal').classList.add('open');
}
