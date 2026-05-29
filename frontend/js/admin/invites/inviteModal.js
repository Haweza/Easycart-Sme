/**
 * inviteModal.js — Create Invite modal: populate selects, auto-fill plan info
 */

import { adminState } from '../state/adminState.js';

export function openCreateInviteModal() {
  const { allUsers, allFamilies } = adminState;

  const rSel = document.getElementById('invite-recipient');
  rSel.innerHTML = '<option value="">Select Recipient</option>';
  allUsers.filter(u => u.role === 'CUSTOMER' && u.isApproved).forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.fullName;
    rSel.appendChild(opt);
  });

  const fSel = document.getElementById('invite-family');
  fSel.innerHTML = '<option value="">Select Family</option>';
  allFamilies.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    fSel.appendChild(opt);
  });

  document.getElementById('invite-plan-display').value = '';
  document.getElementById('invite-plan-id').value = '';
  document.getElementById('invite-message').value = '';
  document.getElementById('invite-modal').classList.add('open');
}

export function updateInvitePlanInfo() {
  const fId = document.getElementById('invite-family').value;
  if (!fId) return;
  const family = adminState.allFamilies.find(f => f.id === fId);
  if (family) {
    document.getElementById('invite-plan-display').value =
      `${family.serviceName} - ${family.planName}`;
    document.getElementById('invite-plan-id').value = family.planId;
  }
}
