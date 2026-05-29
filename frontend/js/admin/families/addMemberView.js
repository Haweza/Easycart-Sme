/**
 * addMemberView.js — Full-page add-member flow
 */

import { adminState } from '../state/adminState.js';
import { loadUsers, loadFamilies } from '../loaders/dataLoaders.js';
import { closeModal } from '../utils/modal.js';

export async function showAddMemberView() {
  if (!adminState.currentFamily) return;

  // Close current modal and show view — showView is on window (set in admin.js)
  closeModal('members-modal');
  window.showView('add-member');

  document.getElementById('add-member-family-title').textContent = `Add Member to ${adminState.currentFamily.name}`;
  document.getElementById('add-member-family-subtitle').textContent = `Manage members for the ${adminState.currentFamily.serviceName} plan. Select an approved customer to join.`;

  const listContainer = document.getElementById('family-user-selection-list');
  const searchInput = document.getElementById('family-user-search');

  listContainer.innerHTML = `<div class="empty-state"><div class="spinner"></div></div>`;
  searchInput.value = '';

  try {
    // 1. Fetch all customers (approved and unapproved)
    const customers = adminState.allUsers.filter(u => u.role === 'CUSTOMER');

    // 2. Fetch pending requests to find matches
    const requests = await ServiceRequests.getPending();

    const renderList = (filter = '') => {
      const filtered = customers.filter(u =>
        u.fullName.toLowerCase().includes(filter.toLowerCase()) ||
        u.email.toLowerCase().includes(filter.toLowerCase())
      );

      // Sort: matched service/plan first
      const sorted = filtered.sort((a, b) => {
        const aMatch = requests.some(r => r.userId === a.id && (r.serviceId === adminState.currentFamily.serviceId || r.planId === adminState.currentFamily.planId));
        const bMatch = requests.some(r => r.userId === b.id && (r.serviceId === adminState.currentFamily.serviceId || r.planId === adminState.currentFamily.planId));
        return bMatch - aMatch;
      });

      if (!sorted.length) {
        listContainer.innerHTML = `<div class="empty-state"><p>No matching customers found.</p></div>`;
        return;
      }

      listContainer.innerHTML = sorted.map(u => {
        const isMatch = requests.some(r => r.userId === u.id && (r.serviceId === adminState.currentFamily.serviceId || r.planId === adminState.currentFamily.planId));
        const unapprovedBadge = u.isApproved
          ? ''
          : '<span class="badge badge-warning" style="margin-left:8px; font-size:0.75rem; padding:0.2rem 0.5rem; background:#FFF3CD; color:#856404; border:1px solid #FFEEBA; border-radius:4px; font-weight:500;">Unapproved</span>';
        return `
          <div class="user-select-item" onclick="addMemberToFamily('${u.id}')" style="padding: 1.5rem 2rem;">
            <div class="user-select-info">
              <div class="user-select-name" style="font-size:1.1rem; display:flex; align-items:center; gap:8px;">
                ${u.fullName}
                ${isMatch ? '<span class="ripple-dot" title="Prioritized: Matching Service Request" style="margin-left:4px; flex-shrink:0;"></span>' : ''}
                ${unapprovedBadge}
              </div>
              <div style="font-size: 0.9rem; color: var(--text-muted); margin-top:4px;">${u.email}</div>
            </div>
            <button class="btn btn-outline btn-sm">Add to Family</button>
          </div>
        `;
      }).join('');
    };

    renderList();
    searchInput.oninput = (e) => renderList(e.target.value);

  } catch (err) {
    listContainer.innerHTML = `<div class="alert alert-danger" style="margin:20px;">${err.message || 'Error loading users'}</div>`;
  }
}

export async function addMemberToFamily(userId) {
  if (!adminState.currentFamily) return;
  try {
    const u = adminState.allUsers.find(user => user.id === userId);
    if (u && !u.isApproved) {
      await Admin.approveUser(userId);
      await loadUsers(); // reload users to refresh state
    }
    await Admin.addFamilyMember(adminState.currentFamily.id, userId);
    showToast('Member Added Successfully!', 'success');
    // Refresh family members data and return to families view
    await loadFamilies();
    window.showView('families');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
