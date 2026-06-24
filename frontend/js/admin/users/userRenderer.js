/**
 * userRenderer.js — Users grouped card rendering + backward-compat table writer
 *
 * Exports:
 *   renderUsers()              — re-applies filters then renders grouped cards
 *   renderUsersTableData()     — writes to hidden #users-tbody (backward compat)
 *                                AND calls renderGroupedUsers for card refresh
 *   renderGroupedUsers()       — renders the 4 static group cards from a user list
 *   renderServiceSubscriberGroups() — renders dynamic service groups from subscriptions
 */

import { adminState } from '../state/adminState.js';
import { applyUserFilters } from './userFilters.js';

// ─── helpers (shared with existing table renderer) ──────────────────────────

function roleBadge(role) {
  const map = {
    ADMIN:     '<span class="badge badge-admin">Admin</span>',
    ORGANIZER: '<span class="badge badge-organizer">Organizer</span>',
    CUSTOMER:  '<span class="badge badge-accepted">Customer</span>',
  };
  return map[role] || `<span class="badge">${role}</span>`;
}

function approvalBadge(isApproved) {
  return isApproved
    ? '<span class="badge badge-accepted">Approved</span>'
    : '<span class="badge badge-pending">Pending</span>';
}

// ─── backward-compat table writer ───────────────────────────────────────────

export function renderUsers() {
  applyUserFilters();
}

/**
 * Called by userFilters.applyUserFilters with the filtered user list.
 * Writes to the hidden #users-tbody (so no JS module breaks).
 * Also re-renders the grouped card UI using the FULL user list so counts stay accurate.
 */
export function renderUsersTableData(filteredUsers) {
  // 1. Write hidden table (backward compat — zero visual impact)
  const tbody = document.getElementById('users-tbody');
  if (tbody) {
    if (!filteredUsers.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><h3>No users found</h3></div></td></tr>`;
    } else {
      tbody.innerHTML = filteredUsers.map(u => `
        <tr>
          <td><strong>${u.fullName}</strong></td>
          <td class="text-sm text-muted">${u.email}</td>
          <td>${roleBadge(u.role)}</td>
          <td class="text-sm text-muted">${fmtDate(u.createdAt)}</td>
          <td>${u.isApproved
            ? `<span class="badge badge-accepted">Approved</span>`
            : `<button class="btn btn-primary btn-sm" onclick="approveUser('${u.id}')">Approve</button>`}
          </td>
          <td>
            <div style="display:flex;gap:6px;">
              <select class="form-control" style="width:120px;font-size:0.8rem;padding:4px;" onchange="changeRole('${u.id}',this.value)">
                <option value="">Role...</option>
                <option value="CUSTOMER">Customer</option>
                <option value="ORGANIZER">Organizer</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button class="btn btn-outline btn-sm" onclick="openUserDetails('${u.id}')">Details</button>
            </div>
          </td>
        </tr>`).join('');
    }
  }

  // 2. Re-render grouped cards using the FULL user list (not filtered) so counts stay correct.
  //    The filter result is used to highlight/narrow within groups.
  renderGroupedUsers(adminState.allUsers, filteredUsers);
}

// ─── grouped card renderer ───────────────────────────────────────────────────

/**
 * Renders the 4 static group cards.
 * @param {Array} allUsers      — full user list (for counts)
 * @param {Array} [highlight]   — filtered list; if provided, only these users appear in the lists
 */
export function renderGroupedUsers(allUsers, highlight) {
  const source = (highlight && highlight.length < allUsers.length) ? highlight : allUsers;

  const groups = [
    {
      cardId:    'card-approved',
      badgeId:   'badge-approved',
      subtitleId:'subtitle-approved',
      listId:    'list-approved',
      filter:    u => u.isApproved,
      emptyText: 'No approved users yet.',
    },
    {
      cardId:    'card-pending',
      badgeId:   'badge-pending-users',
      subtitleId:'subtitle-pending',
      listId:    'list-pending',
      filter:    u => !u.isApproved,
      emptyText: 'No users awaiting approval.',
    },
    {
      cardId:    'card-organizers',
      badgeId:   'badge-organizers',
      subtitleId:'subtitle-organizers',
      listId:    'list-organizers',
      filter:    u => u.role === 'ORGANIZER',
      emptyText: 'No organizers assigned.',
    },
    {
      cardId:    'card-customers',
      badgeId:   'badge-customers',
      subtitleId:'subtitle-customers',
      listId:    'list-customers',
      filter:    u => u.role === 'CUSTOMER',
      emptyText: 'No customers yet.',
    },
  ];

  groups.forEach(({ cardId, badgeId, subtitleId, listId, filter, emptyText }) => {
    const allCount  = allUsers.filter(filter).length;
    const srcUsers  = source.filter(filter);

    // Update count badge & subtitle
    const badge    = document.getElementById(badgeId);
    const subtitle = document.getElementById(subtitleId);
    if (badge)    badge.textContent    = allCount;
    if (subtitle) subtitle.textContent = allCount === 1 ? '1 user' : `${allCount} users`;

    // Render user rows
    const list = document.getElementById(listId);
    if (!list) return;

    if (!srcUsers.length) {
      list.innerHTML = `<div class="group-empty">${emptyText}</div>`;
      return;
    }

    list.innerHTML = srcUsers.map(u => userRowHtml(u)).join('');
  });
}

/**
 * Builds the HTML for a single user row inside a group card.
 */
function userRowHtml(u) {
  const approveOrBadge = u.isApproved
    ? `<span class="badge badge-accepted" style="font-size:.72rem;">Approved</span>`
    : `<button class="btn btn-primary btn-sm" style="font-size:.75rem;padding:3px 8px;" onclick="approveUser('${u.id}')">Approve</button>`;

  return `
    <div class="user-row-card">
      <div class="user-row-info">
        <div class="user-row-name">${escHtml(u.fullName)}</div>
        <div class="user-row-email">${escHtml(u.email)}</div>
      </div>
      <div class="user-row-actions">
        ${roleBadge(u.role)}
        ${approveOrBadge}
        <select class="form-control role-select-compact" onchange="changeRole('${u.id}',this.value)" title="Change role">
          <option value="">Role…</option>
          <option value="CUSTOMER"  ${u.role === 'CUSTOMER'  ? 'selected' : ''}>Customer</option>
          <option value="ORGANIZER" ${u.role === 'ORGANIZER' ? 'selected' : ''}>Organizer</option>
          <option value="ADMIN"     ${u.role === 'ADMIN'     ? 'selected' : ''}>Admin</option>
        </select>
        <button class="btn btn-outline btn-sm" style="font-size:.75rem;padding:3px 8px;" onclick="openUserDetails('${u.id}')">Details</button>
      </div>
    </div>`;
}

// ─── dynamic service subscriber groups ───────────────────────────────────────

/**
 * Renders service-based subscriber groups below the static cards.
 * Groups active subscriptions by serviceName; hides section if none exist.
 * Called from subscriptionRenderer after data loads.
 */
export function renderServiceSubscriberGroups() {
  const { allSubscriptions, allUsers } = adminState;

  const section  = document.getElementById('service-groups-section');
  const grid     = document.getElementById('service-groups-grid');
  if (!section || !grid) return;

  // Only active subscriptions with a user
  const activeSubscriptions = allSubscriptions.filter(s => s.status === 'ACTIVE' || s.isActive);

  // Group by serviceName
  const byService = {};
  activeSubscriptions.forEach(s => {
    const svcName = s.serviceName || s.planName || 'Unknown Service';
    if (!byService[svcName]) byService[svcName] = [];
    byService[svcName].push(s);
  });

  const services = Object.keys(byService);

  if (!services.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  grid.innerHTML = services.map((svcName, idx) => {
    const subs   = byService[svcName];
    const cardId = `card-svc-${idx}`;

    const rowsHtml = subs.map(s => {
      // Try to look up the full user from allUsers for the Details button
      const user    = allUsers.find(u => u.id === s.userId || u.email === s.userEmail);
      const userId  = user ? user.id : null;
      const name    = s.userName || user?.fullName || 'Unknown';
      const email   = s.userEmail || user?.email   || '—';
      const start   = s.startDate ? fmtDate(s.startDate) : '—';
      const statusBadge = `<span class="badge badge-status-active" style="font-size:.7rem;">Active</span>`;
      const detailsBtn  = userId
        ? `<button class="btn btn-outline btn-sm" style="font-size:.75rem;padding:3px 8px;" onclick="openUserDetails('${userId}')">Details</button>`
        : '';

      return `
        <div class="user-row-card">
          <div class="user-row-info">
            <div class="user-row-name">${escHtml(name)}</div>
            <div class="user-row-email">${escHtml(email)}</div>
          </div>
          <div class="user-row-actions">
            ${statusBadge}
            <span style="font-size:.73rem;color:var(--text-muted);">Since ${start}</span>
            ${detailsBtn}
          </div>
        </div>`;
    }).join('');

    return `
      <div class="user-group-card" id="${cardId}">
        <div class="user-group-card-header" onclick="toggleUserGroup('${cardId}')" role="button" aria-expanded="false">
          <div class="group-icon">📦</div>
          <div class="group-info">
            <div class="group-title">${escHtml(svcName)}</div>
            <div class="group-subtitle">${subs.length} active subscriber${subs.length !== 1 ? 's' : ''}</div>
          </div>
          <span class="group-count-badge success">${subs.length}</span>
          <span class="group-arrow">▶</span>
        </div>
        <div class="user-group-list" id="list-${cardId}">
          ${rowsHtml}
        </div>
      </div>`;
  }).join('');
}

// ─── tiny HTML escape util ───────────────────────────────────────────────────

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
