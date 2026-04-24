/**
 * EasyCart SME — Admin Panel Logic
 * Refactored for Service/Plan structure
 */

let allUsers     = [];
let allFamilies  = [];
let allRequests  = [];
let allInvites   = [];
let allServices  = [];
let currentReviewId = null;

// ---- Boot -------------------------------------------------
(async function init() {
  if (!requireRole('ADMIN')) return;
  const user = getUser();
  document.getElementById('nav-admin-name').textContent = user.fullName || 'Admin';

  await Promise.all([
    loadUsers(), loadFamilies(), loadRequests(), loadInvites(), loadServices()
  ]);
  renderOverview();
})();

// ---- View switching ---------------------------------------
function showView(name, link) {
  ['overview','users','requests','families','invites'].forEach(v => {
    document.getElementById(`view-${v}`).style.display = v === name ? 'block' : 'none';
  });
  document.querySelectorAll('.sidebar-link').forEach(a => a.classList.remove('active'));
  if (link) link.classList.add('active');
  else {
    const m = document.querySelector(`[data-view="${name}"]`);
    if (m) m.classList.add('active');
  }
  const renderers = {
    users: renderUsers, requests: renderRequests,
    families: renderFamilies, invites: renderInvites
  };
  if (renderers[name]) renderers[name]();
}

// ---- Data loaders -----------------------------------------
async function loadUsers()    { try { allUsers    = await Admin.getUsers();           } catch(e) { allUsers = []; } }
async function loadFamilies() { try { allFamilies = await Admin.getFamilies();        } catch(e) { allFamilies = []; } }
async function loadRequests() { try { allRequests = await ServiceRequests.getPending(); } catch(e) { allRequests = []; } }
async function loadInvites()  { try { allInvites  = await Invites.getAll();           } catch(e) { allInvites = []; } }
async function loadServices() { try { allServices = await Services.listActive();      } catch(e) { allServices = []; } }

// ---- Overview ---------------------------------------------
function renderOverview() {
  const unapproved = allUsers.filter(u => !u.isApproved).length;
  const pendingInv = allInvites.filter(i => i.status === 'PENDING').length;
  document.getElementById('s-users').textContent      = allUsers.length;
  document.getElementById('s-families').textContent   = allFamilies.length;
  document.getElementById('s-req-pending').textContent = allRequests.length;
  document.getElementById('s-inv-pending').textContent  = pendingInv;

  if (unapproved) {
    document.getElementById('unapproved-badge').textContent = unapproved;
    document.getElementById('unapproved-badge').style.display = 'inline-flex';
  }
  if (allRequests.length) {
    document.getElementById('pending-req-badge').textContent = allRequests.length;
    document.getElementById('pending-req-badge').style.display = 'inline-flex';
  }
}

// ---- Users ------------------------------------------------
let filteredUsers = [];
function renderUsers() {
  filteredUsers = allUsers;
  renderUsersTable();
}
function filterUsers() {
  const q = document.getElementById('user-search').value.toLowerCase();
  filteredUsers = allUsers.filter(u =>
    u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  );
  renderUsersTable();
}
function renderUsersTable() {
  const tbody = document.getElementById('users-tbody');
  if (!filteredUsers.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><h3>No users found</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = filteredUsers.map(u => `
    <tr>
      <td><strong>${u.fullName}</strong></td>
      <td class="text-sm text-muted">${u.email}</td>
      <td>${roleBadge(u.role)}</td>
      <td>
        ${u.isApproved 
          ? `<span class="badge badge-accepted">Approved</span>`
          : `<button class="btn btn-primary btn-sm" onclick="approveUser('${u.id}')">Approve</button>`}
      </td>
      <td>
        <select class="form-control" style="width:140px; font-size: 0.85rem;" onchange="changeRole('${u.id}', this.value)">
          <option value="">Change Role</option>
          <option value="CUSTOMER">Customer</option>
          <option value="ORGANIZER">Organizer</option>
          <option value="ADMIN">Admin</option>
        </select>
      </td>
    </tr>`).join('');
}

async function approveUser(userId) {
  try {
    await Admin.approveUser(userId);
    const u = allUsers.find(u => u.id === userId);
    if (u) u.isApproved = true;
    renderUsersTable();
    renderOverview();
    showToast('User approved!', 'success');
  } catch(e) { showToast(e.message, 'error'); }
}

async function changeRole(userId, newRole) {
  if (!newRole) return;
  try {
    await Admin.assignRole(userId, newRole);
    const u = allUsers.find(u => u.id === userId);
    if (u) u.role = newRole;
    renderUsersTable();
    showToast(`Role updated to ${newRole}`, 'success');
  } catch(e) { showToast(e.message, 'error'); }
}

// ---- Service Requests -------------------------------------
function renderRequests() {
  const tbody = document.getElementById('requests-tbody');
  if (!allRequests.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 40px;">No pending requests.</td></tr>`;
    return;
  }
  tbody.innerHTML = allRequests.map(r => `
    <tr>
      <td><strong>${r.userName}</strong></td>
      <td>${r.serviceName}</td>
      <td>${r.planName || '<span class="text-muted">Not specified</span>'}</td>
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

document.getElementById('review-approve-btn').addEventListener('click', () => doReview(true));
document.getElementById('review-reject-btn').addEventListener('click', () => doReview(false));

async function doReview(approved) {
  const note = document.getElementById('review-note').value.trim();
  try {
    await ServiceRequests.review(currentReviewId, { approved, adminNote: note || null });
    await loadRequests();
    renderRequests();
    renderOverview();
    closeModal('review-modal');
    showToast(approved ? 'Request Approved' : 'Request Rejected', 'success');
  } catch(e) { showToast(e.message, 'error'); }
}

// ---- Families (Grouped by Service) ------------------------
function renderFamilies() {
  const container = document.getElementById('families-container');
  if (!allFamilies.length) {
    container.innerHTML = `<div style="text-align: center; padding: 40px;">No families created yet.</div>`;
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
    <div class="accordion-item" id="acc-${sName.replace(/\s/g,'-')}">
      <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
        <span>${sName} <small style="font-weight: 500; color: var(--text-muted); margin-left: 8px;">(${grouped[sName].length} families)</small></span>
        <span>▼</span>
      </div>
      <div class="accordion-content">
        <div class="table-container">
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

// Create Family Modal
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

  document.getElementById('family-modal').classList.add('open');
}

function updatePlansDropdown(serviceId, planDropdownId) {
  const sel = document.getElementById(planDropdownId);
  sel.innerHTML = '<option value="">Select Plan</option>';
  
  const s = allServices.find(x => x.id === serviceId);
  if (!s || !s.plans) return;

  s.plans.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} (${p.currency} ${p.price})`;
    sel.appendChild(opt);
  });
}


document.getElementById('family-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('family-submit-btn');
  btn.disabled = true; btn.textContent = 'Creating...';
  
  try {
    await Admin.createFamily({
      name: document.getElementById('family-name').value.trim(),
      planId: document.getElementById('family-plan').value,
      organizerId: document.getElementById('family-organizer').value || null,
      maxMembers: 10
    });
    await loadFamilies();
    renderFamilies();
    closeModal('family-modal');
    showToast('Family Created!', 'success');
  } catch(e) { showToast(e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Create Family'; }
});

// Members Modal
async function openMembersModal(familyId, familyName) {
  // Simple implementation or reuse from previous version
  showToast(`Loading members for ${familyName}...`, 'info');
  // ... similar to previous openMembersModal ...
}

// ---- Invites ----------------------------------------------
function renderInvites() {
  const tbody = document.getElementById('invites-tbody');
  if (!allInvites.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:40px">No invites sent.</td></tr>`;
    return;
  }
  tbody.innerHTML = allInvites.map(i => `
    <tr>
      <td><strong>${i.recipientName}</strong></td>
      <td>${i.familyName}</td>
      <td>${i.planName} (${i.serviceName})</td>
      <td>${statusBadge(i.status)}</td>
      <td class="text-muted text-sm">${fmtDate(i.expiresAt)}</td>
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

document.getElementById('invite-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('invite-submit-btn');
  btn.disabled = true;
  try {
    await Invites.create({
      recipientId: document.getElementById('invite-recipient').value,
      familyId: document.getElementById('invite-family').value,
      planId: document.getElementById('invite-plan-id').value,
      message: document.getElementById('invite-message').value.trim()
    });
    await loadInvites();
    renderInvites();
    closeModal('invite-modal');
    showToast('Invite Sent!', 'success');
  } catch(e) { showToast(e.message, 'error'); }
  finally { btn.disabled = false; }
});

// ---- Shared Helpers ---------------------------------------
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function handleLogout()  { clearAuth(); window.location.href = 'login.html'; }
function escHtml(str)    { return str ? str.replace(/'/g, "\\'").replace(/"/g, '&quot;') : ''; }

// Sidebar Toggle
document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('burger-btn');
  const sidebar = document.getElementById('sidebar');
  if (burger && sidebar) {
    burger.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
});
