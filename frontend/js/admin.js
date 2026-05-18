/**
 * EasyCart SME — Admin Panel Logic
 * Refactored for Service/Plan structure & Subscriptions Tracking
 */

let allUsers = [];
let allFamilies = [];
let allRequests = [];
let allInvites = [];
let pendingRequests = [];
let currentFamily = null; // Store current family for member adding
let allServices = [];
let currentReviewId = null;
let allActivities = [];

// User Filters
let userFilterRole = 'ALL';
let userFilterStatus = 'ALL';

// Subscriptions Filters
let subFilter = 'ALL';

// ---- Boot -------------------------------------------------
(async function init() {
  if (!requireRole('ADMIN')) return;
  const user = getUser();
  document.getElementById('nav-admin-name').textContent = user.fullName || 'Admin';
  const mobileAdminName = document.getElementById('mobile-nav-admin-name');
  if (mobileAdminName) mobileAdminName.textContent = user.fullName || 'Admin';
  document.getElementById('admin-welcome-name').textContent = (user.fullName || 'Admin').split(' ')[0];

  await Promise.all([
    loadUsers(), loadFamilies(), loadRequests(), loadInvites(), loadServices(), loadActivities()
  ]);

  // Set default view or overview
  showView('overview');
})();

// ---- View switching ---------------------------------------
function showView(name, link) {
  ['overview', 'users', 'requests', 'families', 'subscriptions', 'invites', 'add-member', 'promos'].forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.style.display = v === name ? 'block' : 'none';
  });
  document.querySelectorAll('.sidebar-link').forEach(a => a.classList.remove('active'));
  if (link) {
    link.classList.add('active');
  } else {
    const m = document.querySelector(`[data-view="${name}"]`);
    if (m) m.classList.add('active');
  }

  const renderers = {
    overview: () => { renderOverview(); loadActivities(); },
    users: renderUsers,
    requests: renderRequests,
    families: renderFamilies,
    subscriptions: renderSubscriptions,
    invites: renderInvites,
    promos: loadAndRenderPromos
  };

  if (renderers[name]) renderers[name]();
  closeSidebar();
}

// Sidebar toggle (Mobile)
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('active');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}

// ---- Data loaders -----------------------------------------
async function loadUsers() { try { allUsers = await Admin.getUsers(); } catch (e) { allUsers = []; } }
async function loadFamilies() { try { allFamilies = await Admin.getFamilies(); } catch (e) { allFamilies = []; } }
async function loadRequests() { try { allRequests = await ServiceRequests.getPending(); } catch (e) { allRequests = []; } }
async function loadInvites() { try { allInvites = await Invites.getAll(); } catch (e) { allInvites = []; } }
async function loadServices() { try { allServices = await Services.listActive(); } catch (e) { allServices = []; } }

// ---- Overview ---------------------------------------------
function renderOverview() {
  const unapproved = allUsers.filter(u => !u.isApproved).length;
  const pendingInv = allInvites.filter(i => i.status === 'PENDING').length;

  // Calculate subscriptions expiring soon
  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiring = allFamilies.filter(f => {
    if (!f.expiresAt) return false;
    const exp = new Date(f.expiresAt);
    return exp > now && exp <= next7Days;
  }).length;

  document.getElementById('s-users').textContent = allUsers.length;
  document.getElementById('s-users-sub').textContent = unapproved ? `${unapproved} pending approval` : 'All approved';

  document.getElementById('s-families').textContent = allFamilies.length;
  const activeFamilies = allFamilies.filter(f => f.isActive).length;
  document.getElementById('s-families-sub').textContent = `${activeFamilies} active`;

  document.getElementById('s-req-pending').textContent = allRequests.length;
  document.getElementById('s-inv-pending').textContent = pendingInv;
  document.getElementById('s-expiring').textContent = expiring;

  // Badges
  if (unapproved) {
    const b = document.getElementById('unapproved-badge');
    if (b) { b.textContent = unapproved; b.style.display = 'inline-flex'; }
  } else {
    const b = document.getElementById('unapproved-badge');
    if (b) b.style.display = 'none';
  }

  if (allRequests.length) {
    const b = document.getElementById('pending-req-badge');
    if (b) { b.textContent = allRequests.length; b.style.display = 'inline-flex'; }
  } else {
    const b = document.getElementById('pending-req-badge');
    if (b) b.style.display = 'none';
  }

  // Alerts
  const alertsContainer = document.getElementById('overview-alerts');
  if (alertsContainer) {
    let alertsHtml = '';
    if (unapproved > 0) {
      alertsHtml += `<div class="alert alert-warning" style="cursor:pointer" onclick="showView('users')">⚠️ <strong>${unapproved} user(s)</strong> awaiting approval to join the platform.</div>`;
    }
    if (allRequests.length > 0) {
      alertsHtml += `<div class="alert alert-warning" style="cursor:pointer" onclick="showView('requests')">📋 <strong>${allRequests.length} request(s)</strong> awaiting review.</div>`;
    }
    if (expiring > 0) {
      alertsHtml += `<div class="alert alert-danger" style="cursor:pointer" onclick="showView('subscriptions')">🔴 <strong>${expiring} family subscription(s)</strong> expiring within 7 days.</div>`;
    }
    alertsContainer.innerHTML = alertsHtml;
  }
}

async function loadActivities() {
  try {
    allActivities = await Admin.getActivities();
    renderActivitiesFeed(allActivities);
  } catch (e) {
    allActivities = [];
    const container = document.getElementById('activities-feed');
    if (container) {
      container.innerHTML = `<div style="color:var(--danger); padding:10px;">Failed to load activities: ${e.message}</div>`;
    }
  }
}

function renderActivitiesFeed(activities) {
  const container = document.getElementById('activities-feed');
  if (!container) return;

  if (!activities || !activities.length) {
    container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); font-size:0.9rem;">No recent activities logged.</div>`;
    return;
  }

  container.innerHTML = activities.map(act => {
    let icon = 'ℹ️';
    let badgeClass = 'badge-pending';
    if (act.action === 'REMOVE_MEMBER') {
      icon = '🗑️';
      badgeClass = 'badge-declined';
    } else if (act.action === 'ADD_MEMBER') {
      icon = '👤';
      badgeClass = 'badge-accepted';
    }

    const timeAgoStr = formatTimeAgo(new Date(act.createdAt));

    return `
      <div style="display:flex; gap:12px; padding:12px 16px; background:var(--surface-hover); border-radius:var(--radius); border-left:4px solid ${act.action === 'REMOVE_MEMBER' ? 'var(--danger)' : 'var(--accent)'}; transition:var(--transition); align-items:flex-start;">
        <span style="font-size:1.25rem; margin-top:2px;">${icon}</span>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:baseline; gap:8px;">
            <span style="font-weight:600; font-size:0.95rem;">${act.actorName}</span>
            <span style="font-size:0.75rem; color:var(--text-muted); white-space:nowrap;">${timeAgoStr}</span>
          </div>
          <p style="font-size:0.875rem; color:var(--text-muted); margin:4px 0 6px 0;">${act.description}</p>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="badge ${badgeClass}" style="font-size:0.65rem; text-transform:uppercase; letter-spacing:0.04em;">${act.action}</span>
            <span style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;">${fmtDate(act.createdAt)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---- Users & Filtering ------------------------------------
function toggleFilterPanel() {
  const panel = document.getElementById('filter-panel');
  panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
}

function setFilter(type, value, btnEl) {
  // Update state
  if (type === 'role') userFilterRole = value;
  if (type === 'approval') userFilterStatus = value;

  // Update UI buttons
  const container = btnEl.parentElement;
  container.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');

  applyUserFilters();
}

function clearFilters() {
  userFilterRole = 'ALL';
  userFilterStatus = 'ALL';

  // Reset buttons
  document.querySelectorAll('.filter-chip[data-filter]').forEach(b => {
    if (b.dataset.value === 'ALL') b.classList.add('active');
    else b.classList.remove('active');
  });

  document.getElementById('user-search').value = '';
  applyUserFilters();
}

function applyUserFilters() {
  const q = document.getElementById('user-search').value.toLowerCase();

  let filtered = allUsers.filter(u => {
    // Text search
    const matchesSearch = u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    // Role filter
    if (userFilterRole !== 'ALL' && u.role !== userFilterRole) return false;

    // Status filter
    if (userFilterStatus === 'APPROVED' && !u.isApproved) return false;
    if (userFilterStatus === 'PENDING' && u.isApproved) return false;

    return true;
  });

  // Update count badge
  let activeFilters = 0;
  if (userFilterRole !== 'ALL') activeFilters++;
  if (userFilterStatus !== 'ALL') activeFilters++;

  const filterCountEl = document.getElementById('active-filter-count');
  if (activeFilters > 0) {
    filterCountEl.textContent = activeFilters;
    filterCountEl.style.display = 'inline-flex';
  } else {
    filterCountEl.style.display = 'none';
  }

  renderUsersTableData(filtered);
}

function renderUsers() {
  applyUserFilters();
}

function renderUsersTableData(users) {
  const tbody = document.getElementById('users-tbody');
  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><h3>No users found matching filters</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.fullName}</strong></td>
      <td class="text-sm text-muted">${u.email}</td>
      <td>${roleBadge(u.role)}</td>
      <td class="text-sm text-muted">${fmtDate(u.createdAt)}</td>
      <td>
        ${u.isApproved
      ? `<span class="badge badge-accepted">Approved</span>`
      : `<button class="btn btn-primary btn-sm" onclick="approveUser('${u.id}')">Approve</button>`}
      </td>
      <td>
        <div style="display:flex;gap:6px;">
          <select class="form-control" style="width:120px; font-size: 0.8rem; padding: 4px;" onchange="changeRole('${u.id}', this.value)">
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

// User Details Intelligence
async function openUserDetails(userId) {
  const u = allUsers.find(x => x.id === userId);
  if (!u) return;

  document.getElementById('user-details-name').textContent = u.fullName;
  document.getElementById('user-details-email').textContent = u.email;

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

  // Reqs list
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

  // Invs list
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

async function approveUser(userId) {
  try {
    await Admin.approveUser(userId);
    const u = allUsers.find(u => u.id === userId);
    if (u) u.isApproved = true;
    applyUserFilters();
    renderOverview();
    showToast('User approved!', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

async function changeRole(userId, newRole) {
  if (!newRole) return;
  try {
    await Admin.assignRole(userId, newRole);
    const u = allUsers.find(u => u.id === userId);
    if (u) u.role = newRole;
    applyUserFilters();
    showToast(`Role updated to ${newRole}`, 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

// ---- Service Requests -------------------------------------
function renderRequests() {
  const tbody = document.getElementById('requests-tbody');
  if (!allRequests.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 40px;">No pending requests.</td></tr>`;
    return;
  }
  tbody.innerHTML = allRequests.map(r => `
    <tr>
      <td><strong>${r.userName}</strong></td>
      <td>${r.serviceName}</td>
      <td>${r.planName || '<span class="text-muted">Not specified</span>'}</td>
      <td class="text-sm text-muted">${fmtDate(r.createdAt)}</td>
      <td>${statusBadge(r.status)}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="openReviewModal('${r.id}')">Review</button>
      </td>
    </tr>`).join('');
}

function openReviewModal(requestId) {
  currentReviewId = requestId;
  const req = allRequests.find(r => r.id === requestId);
  document.getElementById('review-content').innerHTML = `
    <div class="card" style="background: var(--bg-subtle);">
      <div style="font-weight: 700; margin-bottom: 4px;">${req.userName}</div>
      <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 12px;">Requested: ${req.serviceName} (${req.planName || 'Any Plan'})</div>
      <div style="font-size: 0.85rem;">"${req.message || 'No message'}"</div>
    </div>
  `;
  document.getElementById('review-note').value = '';
  document.getElementById('review-modal').classList.add('open');
}

async function doReview(approved) {
  const note = document.getElementById('review-note').value.trim();
  try {
    await ServiceRequests.review(currentReviewId, { approved, adminNote: note || null });
    await loadRequests();
    renderRequests();
    renderOverview();
    closeModal('review-modal');
    showToast(approved ? 'Request Approved' : 'Request Rejected', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

// ---- Families (Grouped by Service) ------------------------
function renderFamilies() {
  const container = document.getElementById('families-container');
  if (!allFamilies.length) {
    container.innerHTML = `<div class="empty-state"><h3>No families created yet.</h3></div>`;
    return;
  }

  // Grouping logic
  const grouped = {};
  allFamilies.forEach(f => {
    const sName = f.serviceName || 'Unknown Service';
    if (!grouped[sName]) grouped[sName] = [];
    grouped[sName].push(f);
  });

  container.innerHTML = Object.keys(grouped).map(sName => `
    <div class="accordion-item" id="acc-${sName.replace(/\s/g, '-')}">
      <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
        <span>${sName} <small style="font-weight: 500; color: var(--text-muted); margin-left: 8px;">(${grouped[sName].length} families)</small></span>
        <span>▼</span>
      </div>
      <div class="accordion-content">
        <div class="table-container" style="border:none;border-radius:0;">
          <table>
            <thead>
              <tr><th>Family Name</th><th>Plan</th><th>Organizer</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${grouped[sName].map(f => `
                <tr>
                  <td><strong>${f.name}</strong></td>
                  <td>${f.planName || '—'}</td>
                  <td>${f.organizerName || '<span class="text-muted">Unassigned</span>'}</td>
                  <td>${f.isActive ? '<span class="badge badge-accepted">Active</span>' : '<span class="badge badge-expired">Inactive</span>'}</td>
                  <td>
                    <button class="btn btn-outline btn-sm" onclick="openMembersModal('${f.id}','${escHtml(f.name)}')">Members</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `).join('');
}

function openCreateFamilyModal() {
  const sSel = document.getElementById('family-service');
  sSel.innerHTML = '<option value="">Select Service</option>';
  allServices.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id; opt.textContent = s.name;
    sSel.appendChild(opt);
  });

  document.getElementById('family-plan').innerHTML = '<option value="">Select a plan</option>';

  const oSel = document.getElementById('family-organizer');
  oSel.innerHTML = '<option value="">Assign Organizer</option>';
  allUsers.filter(u => u.role === 'ORGANIZER').forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id; opt.textContent = u.fullName;
    oSel.appendChild(opt);
  });

  // Set default start date to today, expiry to 1 month ahead
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(now.getMonth() + 1);

  document.getElementById('family-start-date').value = now.toISOString().split('T')[0];
  document.getElementById('family-expires-date').value = nextMonth.toISOString().split('T')[0];

  document.getElementById('family-modal').classList.add('open');
}

function updatePlansDropdown(serviceElementId, planDropdownId) {
  const serviceId = document.getElementById(serviceElementId).value;
  const sel = document.getElementById(planDropdownId);
  sel.innerHTML = '<option value="">Select Plan</option>';

  if (!serviceId) return;
  const s = allServices.find(x => x.id === serviceId);
  if (!s || !s.plans) return;

  s.plans.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} (${p.currency} ${p.price})`;
    sel.appendChild(opt);
  });
}

// ---- Subscriptions Tracker --------------------------------
function setSubFilter(filter, btnEl) {
  subFilter = filter;
  const container = btnEl.parentElement;
  container.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');
  renderSubscriptions();
}

function renderSubscriptions() {
  const container = document.getElementById('subscriptions-list');
  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let expiringCount = 0;

  // Enrich families with status
  const enriched = allFamilies.map(f => {
    let subStatus = 'ACTIVE';
    let isExpiringSoon = false;
    let isExpired = false;

    if (f.expiresAt) {
      const exp = new Date(f.expiresAt);
      if (exp < now) {
        subStatus = 'EXPIRED';
        isExpired = true;
      } else if (exp <= next7Days) {
        subStatus = 'EXPIRING';
        isExpiringSoon = true;
        expiringCount++;
      }
    } else if (!f.isActive) {
      subStatus = 'EXPIRED';
      isExpired = true;
    }

    return { ...f, subStatus, isExpiringSoon, isExpired };
  });

  // Update Alert Banner
  const alertBanner = document.getElementById('expiry-alert-banner');
  if (expiringCount > 0) {
    document.getElementById('expiry-alert-count').textContent = expiringCount;
    alertBanner.style.display = 'block';
  } else {
    alertBanner.style.display = 'none';
  }

  // Filter
  const filtered = enriched.filter(f => {
    if (subFilter === 'ALL') return true;
    return f.subStatus === subFilter;
  });

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state"><h3>No subscriptions match this filter.</h3></div>`;
    return;
  }

  container.innerHTML = filtered.map(f => {
    let cardClass = 'active';
    let badgeHtml = '<span class="badge badge-status-active">Active</span>';

    if (f.isExpired) {
      cardClass = 'expired';
      badgeHtml = '<span class="badge badge-status-expired">Expired</span>';
    } else if (f.isExpiringSoon) {
      cardClass = 'expiring-soon';
      badgeHtml = '<span class="badge badge-status-expiring">Expiring Soon</span>';
    }

    const startDateStr = f.startDate ? fmtDate(f.startDate) : 'Not set';
    const expiresAtStr = f.expiresAt ? fmtDate(f.expiresAt) : 'Not set';

    return `
      <div class="subscription-card ${cardClass}">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
            <h3 style="margin:0;font-size:1.1rem;">${f.name}</h3>
            ${badgeHtml}
          </div>
          <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:4px;">
            <strong>${f.serviceName}</strong> • ${f.planName || 'No plan'}
          </div>
          <div style="font-size:0.8rem;color:var(--text-muted);">
            Organizer: ${f.organizerName || 'Unassigned'}
          </div>
        </div>
        
        <div style="display:flex;gap:24px;background:var(--bg-subtle);padding:10px 16px;border-radius:var(--radius-sm);">
          <div>
            <div style="font-size:0.7rem;text-transform:uppercase;color:var(--text-muted);font-weight:700;">Start Date</div>
            <div style="font-size:0.9rem;font-weight:600;">${startDateStr}</div>
          </div>
          <div>
            <div style="font-size:0.7rem;text-transform:uppercase;color:var(--text-muted);font-weight:700;">Expiry Date</div>
            <div style="font-size:0.9rem;font-weight:600;${f.isExpiringSoon ? 'color:#C2410C;' : ''}${f.isExpired ? 'color:var(--danger);' : ''}">${expiresAtStr}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ---- Members Modal ----------------------------------------
async function openMembersModal(familyId, familyName) {
  currentFamily = allFamilies.find(f => f.id === familyId);
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

    const html = `
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
    body.innerHTML = html;
  } catch (err) {
    body.innerHTML = `<div class="alert alert-danger">${err.message || 'Failed to load members'}</div>`;
  }
}

async function removeMemberFromFamily(familyId, userId) {
  if (!confirm('Are you sure you want to remove this member from the family?')) return;
  try {
    await Organizer.removeFamilyMember(familyId, userId);
    showToast('Member removed successfully!', 'success');

    // Refresh modal
    if (currentFamily && currentFamily.id === familyId) {
      openMembersModal(familyId, currentFamily.name);
    }

    // Refresh families and overview
    await loadFamilies();
    renderOverview();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---- Add Member to Family (Full View) ----------------------
async function showAddMemberView() {
  if (!currentFamily) return;

  // Close current modal and show view
  closeModal('members-modal');
  showView('add-member');

  document.getElementById('add-member-family-title').textContent = `Add Member to ${currentFamily.name}`;
  document.getElementById('add-member-family-subtitle').textContent = `Manage members for the ${currentFamily.serviceName} plan. Select an approved customer to join.`;

  const listContainer = document.getElementById('family-user-selection-list');
  const searchInput = document.getElementById('family-user-search');

  listContainer.innerHTML = `<div class="empty-state"><div class="spinner"></div></div>`;
  searchInput.value = '';

  try {
    // 1. Fetch all customers (approved and unapproved)
    const customers = allUsers.filter(u => u.role === 'CUSTOMER');

    // 2. Fetch pending requests to find matches
    const requests = await ServiceRequests.getPending();

    const renderUsers = (filter = '') => {
      const filtered = customers.filter(u =>
        u.fullName.toLowerCase().includes(filter.toLowerCase()) ||
        u.email.toLowerCase().includes(filter.toLowerCase())
      );

      // Sort: matched service/plan first
      const sorted = filtered.sort((a, b) => {
        const aMatch = requests.some(r => r.userId === a.id && (r.serviceId === currentFamily.serviceId || r.planId === currentFamily.planId));
        const bMatch = requests.some(r => r.userId === b.id && (r.serviceId === currentFamily.serviceId || r.planId === currentFamily.planId));
        return bMatch - aMatch;
      });

      if (!sorted.length) {
        listContainer.innerHTML = `<div class="empty-state"><p>No matching customers found.</p></div>`;
        return;
      }

      listContainer.innerHTML = sorted.map(u => {
        const isMatch = requests.some(r => r.userId === u.id && (r.serviceId === currentFamily.serviceId || r.planId === currentFamily.planId));
        const statusBadge = u.isApproved
          ? ''
          : '<span class="badge badge-warning" style="margin-left:8px; font-size:0.75rem; padding:0.2rem 0.5rem; background:#FFF3CD; color:#856404; border:1px solid #FFEEBA; border-radius:4px; font-weight:500;">Unapproved</span>';
        return `
          <div class="user-select-item" onclick="addMemberToFamily('${u.id}')" style="padding: 1.5rem 2rem;">
            <div class="user-select-info">
              <div class="user-select-name" style="font-size:1.1rem; display:flex; align-items:center; gap:8px;">
                ${u.fullName}
                ${isMatch ? '<span class="ripple-dot" title="Prioritized: Matching Service Request" style="margin-left:4px; flex-shrink:0;"></span>' : ''}
                ${statusBadge}
              </div>
              <div style="font-size: 0.9rem; color: var(--text-muted); margin-top:4px;">${u.email}</div>
            </div>
            <button class="btn btn-outline btn-sm">Add to Family</button>
          </div>
        `;
      }).join('');
    };

    renderUsers();
    searchInput.oninput = (e) => renderUsers(e.target.value);

  } catch (err) {
    listContainer.innerHTML = `<div class="alert alert-danger" style="margin:20px;">${err.message || 'Error loading users'}</div>`;
  }
}

async function addMemberToFamily(userId) {
  if (!currentFamily) return;
  try {
    const u = allUsers.find(user => user.id === userId);
    if (u && !u.isApproved) {
      await Admin.approveUser(userId);
      await loadUsers(); // reload users to refresh state
    }
    await Admin.addFamilyMember(currentFamily.id, userId);
    showToast('Member Added Successfully!', 'success');
    // Refresh family members data and return to families view
    await loadFamilies();
    showView('families');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---- Invites ----------------------------------------------
function renderInvites() {
  const tbody = document.getElementById('invites-tbody');
  if (!allInvites.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:40px">No invites sent.</td></tr>`;
    return;
  }
  tbody.innerHTML = allInvites.map(i => `
    <tr>
      <td><strong>${i.recipientName}</strong></td>
      <td>${i.familyName}</td>
      <td>${i.planName} (${i.serviceName})</td>
      <td class="text-muted text-sm">${fmtDate(i.createdAt)}</td>
      <td class="text-muted text-sm">${fmtDate(i.expiresAt)}</td>
      <td>${statusBadge(i.status)}</td>
    </tr>
  `).join('');
}

function openCreateInviteModal() {
  const rSel = document.getElementById('invite-recipient');
  rSel.innerHTML = '<option value="">Select Recipient</option>';
  allUsers.filter(u => u.role === 'CUSTOMER' && u.isApproved).forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id; opt.textContent = u.fullName;
    rSel.appendChild(opt);
  });

  const fSel = document.getElementById('invite-family');
  fSel.innerHTML = '<option value="">Select Family</option>';
  allFamilies.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id; opt.textContent = f.name;
    fSel.appendChild(opt);
  });

  document.getElementById('invite-plan-display').value = '';
  document.getElementById('invite-plan-id').value = '';
  document.getElementById('invite-message').value = '';
  document.getElementById('invite-modal').classList.add('open');
}

function updateInvitePlanInfo() {
  const fId = document.getElementById('invite-family').value;
  if (!fId) return;
  const family = allFamilies.find(f => f.id === fId);
  if (family) {
    document.getElementById('invite-plan-display').value = `${family.serviceName} - ${family.planName}`;
    document.getElementById('invite-plan-id').value = family.planId;
  }
}

// ---- Shared Helpers ---------------------------------------
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function handleLogout() { clearAuth(); window.location.href = 'login.html'; }
function escHtml(str) { return str ? str.replace(/'/g, "\\'").replace(/"/g, '&quot;') : ''; }

// ---- All DOM event bindings (safe, isolated) --------------
document.addEventListener('DOMContentLoaded', () => {

  // Review modal buttons
  document.getElementById('review-approve-btn')?.addEventListener('click', () => doReview(true));
  document.getElementById('review-reject-btn')?.addEventListener('click', () => doReview(false));

  // Family form
  document.getElementById('family-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('family-submit-btn');
    btn.disabled = true; btn.textContent = 'Creating...';
    try {
      const startDateStr = document.getElementById('family-start-date').value;
      const expiresAtStr = document.getElementById('family-expires-date').value;

      const payload = {
        name: document.getElementById('family-name').value.trim(),
        planId: document.getElementById('family-plan').value,
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
    } catch (e) { showToast(e.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Create Family'; }
  });

  // Invite form
  document.getElementById('invite-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('invite-submit-btn');

    const recipientId = document.getElementById('invite-recipient').value;
    const familyId = document.getElementById('invite-family').value;
    const planId = document.getElementById('invite-plan-id').value;

    if (!recipientId) { showToast('Please select a recipient.', 'error'); return; }
    if (!familyId) { showToast('Please select a family.', 'error'); return; }
    if (!planId) { showToast('The selected family has no plan assigned.', 'error'); return; }

    btn.disabled = true;
    btn.textContent = 'Sending...';
    try {
      await Invites.create({ recipientId, familyId, planId, message: document.getElementById('invite-message').value.trim() });
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

});

// ---- Promos & Deals Implementation -------------------------
let uploadedPromoImageBase64 = '';

function previewPromoImage(input) {
  const file = input.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showToast('Image size exceeds 2MB limit.', 'error');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    uploadedPromoImageBase64 = e.target.result;
    const container = document.getElementById('promo-image-preview-container');
    if (container) {
      container.innerHTML = `<img src="${uploadedPromoImageBase64}" style="width:100%; height:100%; object-fit:contain;" />`;
    }
  };
  reader.readAsDataURL(file);
}

async function publishPromo(e) {
  e.preventDefault();
  const btn = document.getElementById('promo-submit-btn');
  const serviceName = document.getElementById('promo-service-name').value.trim();
  const price = document.getElementById('promo-price').value.trim();
  const description = document.getElementById('promo-description').value.trim();

  if (!serviceName || !price || !description) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  if (!uploadedPromoImageBase64) {
    showToast('Please upload a promo image.', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Publishing...';

  try {
    const payload = {
      serviceName,
      price,
      description,
      imageContent: uploadedPromoImageBase64
    };

    await apiFetch('/admin/promos', {
      method: 'POST',
      body: payload
    });

    showToast('Promo published successfully!', 'success');

    // Reset form
    document.getElementById('promo-form').reset();
    uploadedPromoImageBase64 = '';
    const container = document.getElementById('promo-image-preview-container');
    if (container) container.innerHTML = `<span style="font-size:1.5rem; color:var(--text-muted);">🖼️</span>`;

    // Refresh active promo panel
    await loadAndRenderPromos();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Publish to Homepage';
  }
}

async function bringDownPromo() {
  if (!confirm('Are you sure you want to bring down the active promotion and restore the slideshow?')) return;
  try {
    await apiFetch('/admin/promos/active', { method: 'DELETE' });
    showToast('Promotion removed successfully!', 'success');
    await loadAndRenderPromos();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadAndRenderPromos() {
  const container = document.getElementById('active-promo-status-container');
  if (!container) return;

  container.innerHTML = `<div class="text-center" style="padding:40px;"><div class="spinner"></div></div>`;

  try {
    const res = await fetch(`${API_BASE}/promos/active`);
    if (res.status === 200) {
      const promo = await res.json();

      // Calculate remaining time
      const createdTime = new Date(promo.createdAt);
      const expiryTime = new Date(createdTime.getTime() + 24 * 60 * 60 * 1000);
      const remainingMs = expiryTime - new Date();
      let remainingStr = 'Expired';
      if (remainingMs > 0) {
        const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
        const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        remainingStr = `${remainingHours}h ${remainingMins}m remaining`;
      } else {
        remainingStr = 'Expired (Falls back to slideshow)';
      }

      container.innerHTML = `
        <div style="border: 1px solid var(--border); border-radius: var(--radius); padding: 1.25rem; background: var(--surface-hover); text-align: center; display:flex; flex-direction:column; gap:12px; align-items:center;">
          <div style="background: var(--surface); border-radius: var(--radius-lg); padding: 10px; display: flex; align-items: center; justify-content: center; width: 90px; height: 90px; box-shadow: var(--shadow-sm);">
            <img src="${promo.imageContent || 'assets/default_icon.png'}" style="max-width:100%; max-height:100%; object-fit:contain;" onerror="this.src='assets/default_icon.png'">
          </div>
          <div>
            <h4 style="margin:0; font-size:1.15rem; font-weight:700;">${promo.serviceName}</h4>
            <div style="font-size:1rem; font-weight:700; color:var(--success); margin: 4px 0;">${promo.price}</div>
            <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.4; margin: 4px 0;">${promo.description}</p>
          </div>
          <div style="border-top: 1px solid var(--border); width:100%; padding-top:8px; display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--text-muted);">
            <span>Published: ${fmtDate(promo.createdAt)}</span>
            <span style="font-weight:600; color:var(--warning);">${remainingStr}</span>
          </div>
          <button class="btn btn-outline btn-sm w-full" onclick="bringDownPromo()" style="color:var(--danger); border-color:rgba(220,38,38,0.2); margin-top: 8px; font-weight:600; justify-content:center;">
            🗑️ Bring Down Promo
          </button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="text-align:center; padding:30px; color:var(--text-muted);">
          <span style="font-size:2.5rem; display:block; margin-bottom:12px;">📭</span>
          <p style="font-size:0.95rem; margin-bottom:4px; font-weight:600;">No Active Promotion</p>
          <p style="font-size:0.8rem;">Homepage slideshow is currently running.</p>
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger); font-size:0.85rem; text-align:center;">Failed to load active promotion: ${err.message}</div>`;
  }
}

// Bind to window scope for inline HTML event attribute executions
window.previewPromoImage = previewPromoImage;
window.publishPromo = publishPromo;
window.bringDownPromo = bringDownPromo;
window.loadAndRenderPromos = loadAndRenderPromos;
