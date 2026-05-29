/**
 * familyMembers.js — Members modal and remove-member action
 */

import { adminState } from '../state/adminState.js';
import { loadFamilies } from '../loaders/dataLoaders.js';
import { renderOverview } from '../overview/overviewRenderer.js';

export async function openMembersModal(familyId, familyName) {
  adminState.currentFamily = adminState.allFamilies.find(f => f.id === familyId);
  document.getElementById('members-modal-title').textContent = `👥 ${familyName} Members`;
  const body = document.getElementById('members-modal-body');
  body.innerHTML = `<div class="empty-state"><div class="spinner"></div></div>`;
  document.getElementById('members-modal').classList.add('open');

  try {
    const members = await Organizer.getMembers(familyId); // Admin can use this too

    if (!members || !members.length) {
      body.innerHTML = `<div class="empty-state"><h3>No members in this family.</h3></div>`;
      return;
    }

    body.innerHTML = `
      <div class="table-container">
        <table>
          <thead><tr><th>User</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
          <tbody>
            ${members.map(m => `
              <tr>
                <td>
                  <strong>${m.user?.fullName || 'Unknown'}</strong><br>
                  <span class="text-sm text-muted">${m.user?.email || ''}</span>
                </td>
                <td>${statusBadge(m.status)}</td>
                <td class="text-sm text-muted">${fmtDate(m.joinedAt)}</td>
                <td>
                  <button class="btn btn-outline btn-sm" onclick="removeMemberFromFamily('${familyId}', '${m.userId}')" style="color:var(--danger); border-color:rgba(220,38,38,0.2); padding: 4px 8px; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 4px;">
                    🗑️ Remove
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<div class="alert alert-danger">${err.message || 'Failed to load members'}</div>`;
  }
}

export async function removeMemberFromFamily(familyId, userId) {
  if (!confirm('Are you sure you want to remove this member from the family?')) return;
  try {
    await Organizer.removeFamilyMember(familyId, userId);
    showToast('Member removed successfully!', 'success');

    // Refresh modal
    if (adminState.currentFamily && adminState.currentFamily.id === familyId) {
      openMembersModal(familyId, adminState.currentFamily.name);
    }

    // Refresh families and overview
    await loadFamilies();
    renderOverview();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
