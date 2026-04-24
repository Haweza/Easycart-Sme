/**
 * EasyCart SME — Admin Panel Logic
 * Full control: users, families, service requests, invites
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
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
      <div class="empty-state-icon">👤</div><h3>No users found</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = filteredUsers.map(u => `
    <tr>
      <td><strong>${u.fullName}</strong></td>
      <td class="text-sm text-muted">${u.email}</td>
      <td>${roleBadge(u.role)}</td>
      <td>
        ${u.isApproved
          ? `<span class="badge badge-accepted">✓ Approved</span>`
          : `<button class="btn btn-primary btn-sm" onclick="approveUser('${u.id}')">Approve</button>`}
      </td>
      <td class="text-sm text-muted">${fmtDate(u.createdAt)}</td>
      <td>
        <select class="form-control" style="width:130px;padding:4px 8px;font-size:.8rem"
          onchange="changeRole('${u.id}', this.value)">
          <option value="">Change Role</option>
          ${['CUSTOMER','ORGANIZER','ADMIN'].filter(r => r !== u.role).map(r =>
            `<option value="${r}">${r}</option>`
          ).join('')}
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
    populateInviteRecipients();
    showToast(`Role updated to ${newRole}`, 'success');
  } catch(e) { showToast(e.message, 'error'); }
}

// ---- Service Requests -------------------------------------
function renderRequests() {
  const tbody = document.getElementById('requests-tbody');
  if (!allRequests.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
      <div class="empty-state-icon">📋</div>
      <h3>No pending requests</h3><p>All requests have been reviewed.</p>
    </div></td></tr>`;
    return;
  }
  tbody.innerHTML = allRequests.map(r => `
    <tr>
      <td><strong>${r.userName}</strong><br/><span class="text-sm text-muted">${r.userId.substring(0,8)}…</span></td>
      <td>${r.serviceName}</td>
      <td class="text-sm text-muted">${r.message || '—'}</td>
      <td>${statusBadge(r.status)}</td>
      <td class="text-sm text-muted">${fmtDate(r.createdAt)}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="openReviewModal('${r.id}','${escHtml(r.userName)}')">
          Review
        </button>
      </td>
    </tr>`).join('');
}

function openReviewModal(requestId, userName) {
  currentReviewId = requestId;
  document.getElementById('review-modal-title').textContent = `Review Request — ${userName}`;
  document.getElementById('review-note').value = '';
  document.getElementById('review-alert').style.display = 'none';
  document.getElementById('review-modal').classList.add('open');
}

document.getElementById('review-approve-btn').addEventListener('click', () => doReview(true));
document.getElementById('review-reject-btn').addEventListener('click',  () => doReview(false));

async function doReview(approved) {
  const note = document.getElementById('review-note').value.trim();
  const alertEl = document.getElementById('review-alert');
  try {
    await ServiceRequests.review(currentReviewId, { approved, adminNote: note || null });
    await loadRequests();
    renderRequests();
    renderOverview();
    closeModal('review-modal');
    showToast(approved ? '✅ Request approved' : 'Request rejected', approved ? 'success' : 'info');
  } catch(e) {
    alertEl.className = 'alert alert-danger';
    alertEl.textContent = e.message;
    alertEl.style.display = 'flex';
  }
}

// ---- Families ---------------------------------------------
function renderFamilies() {
  const tbody = document.getElementById('families-tbody');
  if (!allFamilies.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
      <div class="empty-state-icon">🏠</div><h3>No families yet</h3>
      <button class="btn btn-primary mt-4" onclick="openCreateFamilyModal()">Create First Family</button>
    </div></td></tr>`;
    return;
  }
  tbody.innerHTML = allFamilies.map(f => `
    <tr>
      <td><strong>${f.name}</strong>
        ${f.description ? `<br/><span class="text-sm text-muted">${f.description}</span>` : ''}
      </td>
      <td>${f.organizerName ? `<span class="badge badge-organizer">${f.organizerName}</span>` : '<span class="text-muted text-sm">Unassigned</span>'}</td>
      <td class="text-sm">${f.maxMembers}</td>
      <td>${f.isActive ? `<span class="badge badge-active">Active</span>` : `<span class="badge badge-expired">Inactive</span>`}</td>
      <td class="text-sm text-muted">${fmtDate(f.createdAt)}</td>
      <td>
        <button class="btn btn-outline-white btn-sm" onclick="openAssignOrgModal('${f.id}','${escHtml(f.name)}')">
          Assign Organizer
        </button>
        <button class="btn btn-outline btn-sm" onclick="openMembersModal('${f.id}','${escHtml(f.name)}')">
          View Members
        </button>
      </td>
    </tr>`).join('');
}

// Create Family form
function openCreateFamilyModal() {
  document.getElementById('family-name').value = '';
  document.getElementById('family-desc').value = '';
  document.getElementById('family-max').value  = 10;
  // Populate organizers
  const sel = document.getElementById('family-organizer');
  sel.innerHTML = '<option value="">— Assign later —</option>';
  allUsers.filter(u => u.role === 'ORGANIZER').forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id; opt.textContent = u.fullName;
    sel.appendChild(opt);
  });
  document.getElementById('family-alert').style.display = 'none';
  document.getElementById('family-modal').classList.add('open');
}

document.getElementById('family-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('family-name').value.trim();
  const alertEl = document.getElementById('family-alert');
  if (!name) {
    document.getElementById('family-name-err').classList.add('show'); return;
  }
  document.getElementById('family-name-err').classList.remove('show');

  const btn = document.getElementById('family-submit-btn');
  btn.disabled = true; btn.textContent = 'Creating…';
  alertEl.style.display = 'none';

  try {
    await Admin.createFamily({
      name,
      description: document.getElementById('family-desc').value.trim() || null,
      organizerId: document.getElementById('family-organizer').value || null,
      maxMembers:  parseInt(document.getElementById('family-max').value) || 10,
    });
    await loadFamilies();
    renderFamilies();
    renderOverview();
    closeModal('family-modal');
    showToast('Family created!', 'success');
  } catch(e) {
    alertEl.className = 'alert alert-danger';
    alertEl.textContent = e.message;
    alertEl.style.display = 'flex';
  } finally {
    btn.disabled = false; btn.textContent = 'Create Family';
  }
});

// View Members Modal Logic
async function openMembersModal(familyId, familyName) {
  document.getElementById('members-modal-title').textContent = `Members — ${familyName}`;
  const tbody = document.getElementById('members-tbody');
  tbody.innerHTML = '<tr><td colspan="4" class="loading-row"><div class="spinner"></div></td></tr>';
  document.getElementById('members-modal').classList.add('open');

  try {
    const members = await Organizer.getMembers(familyId);
    if (!members.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-muted text-center" style="padding:20px">No members found in this family.</td></tr>';
      return;
    }
    tbody.innerHTML = members.map(m => `
      <tr>
        <td><strong>${escHtml(m.user.fullName)}</strong></td>
        <td class="text-sm text-muted">${escHtml(m.user.email)}</td>
        <td>${statusBadge(m.status)}</td>
        <td class="text-sm text-muted">${fmtDate(m.joinedAt)}</td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-danger" style="padding:20px">Error loading members: ${e.message}</td></tr>`;
  }
}

// ---- Invites ----------------------------------------------
function renderInvites() {
  const tbody = document.getElementById('invites-tbody');
  if (!allInvites.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
      <div class="empty-state-icon">📬</div><h3>No invites sent yet</h3>
      <button class="btn btn-primary mt-4" onclick="openCreateInviteModal()">Send First Invite</button>
    </div></td></tr>`;
    return;
  }
  tbody.innerHTML = allInvites.map(inv => `
    <tr>
      <td><strong>${inv.recipientName}</strong></td>
      <td>${inv.familyName}</td>
      <td>${inv.serviceName}</td>
      <td>${statusBadge(inv.status)}</td>
      <td class="text-sm text-muted">${fmtDate(inv.expiresAt)}</td>
      <td class="text-sm text-muted">${fmtDate(inv.respondedAt)}</td>
    </tr>`).join('');
}

function populateInviteRecipients() {
  const sel = document.getElementById('invite-recipient');
  const cur = sel.value;
  sel.innerHTML = '<option value="">— Select a customer —</option>';
  allUsers.filter(u => u.role === 'CUSTOMER').forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = `${u.fullName} (${u.email})`;
    sel.appendChild(opt);
  });
  if (cur) sel.value = cur;
}

function openCreateInviteModal() {
  populateInviteRecipients();

  const fs = document.getElementById('invite-family');
  fs.innerHTML = '<option value="">— Select a family —</option>';
  allFamilies.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id; opt.textContent = f.name;
    fs.appendChild(opt);
  });

  const ss = document.getElementById('invite-service');
  ss.innerHTML = '<option value="">— Select a service —</option>';
  allServices.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id; opt.textContent = `${s.name} — ${s.currency} ${Number(s.price).toLocaleString()}/${s.billingCycle?.toLowerCase()}`;
    ss.appendChild(opt);
  });

  document.getElementById('invite-message').value = '';
  document.getElementById('invite-alert').style.display = 'none';
  ['invite-recipient-err','invite-family-err','invite-service-err'].forEach(id =>
    document.getElementById(id).classList.remove('show'));
  document.getElementById('invite-modal').classList.add('open');
}

document.getElementById('invite-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const recipientId = document.getElementById('invite-recipient').value;
  const familyId    = document.getElementById('invite-family').value;
  const serviceId   = document.getElementById('invite-service').value;
  const alertEl     = document.getElementById('invite-alert');
  let valid = true;

  document.getElementById('invite-recipient-err').classList.toggle('show', !recipientId);
  document.getElementById('invite-family-err').classList.toggle('show', !familyId);
  document.getElementById('invite-service-err').classList.toggle('show', !serviceId);
  if (!recipientId || !familyId || !serviceId) return;

  const btn = document.getElementById('invite-submit-btn');
  btn.disabled = true; btn.textContent = 'Sending…';
  alertEl.style.display = 'none';

  try {
    await Invites.create({
      recipientId,
      familyId,
      serviceId,
      message: document.getElementById('invite-message').value.trim() || null,
    });
    await loadInvites();
    renderInvites();
    renderOverview();
    closeModal('invite-modal');
    showToast('✅ Invite sent successfully!', 'success');
  } catch(e) {
    alertEl.className = 'alert alert-danger';
    alertEl.textContent = e.message;
    alertEl.style.display = 'flex';
  } finally {
    btn.disabled = false; btn.textContent = 'Send Invite';
  }
});

// ---- Organizer assignment ---------------------------------
let assignFamilyId = null;
function openAssignOrgModal(familyId, familyName) {
  assignFamilyId = familyId;
  // Reuse invite modal with custom UI — or use a simple prompt
  const org = allUsers.filter(u => u.role === 'ORGANIZER');
  if (!org.length) { showToast('No organizers available. Assign ORGANIZER role to a user first.', 'error'); return; }
  const chosen = org[prompt(`Organizers:\n${org.map((o,i)=>`${i}: ${o.fullName}`).join('\n')}\nEnter number:`, 0)];
  if (!chosen) return;
  Admin.assignOrganizer(familyId, chosen.id)
    .then(() => loadFamilies().then(renderFamilies))
    .then(() => showToast(`Organizer assigned to ${familyName}`, 'success'))
    .catch(e => showToast(e.message, 'error'));
}

// ---- Shared helpers ---------------------------------------
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function handleLogout()  { clearAuth(); window.location.href = 'login.html'; }
function escHtml(str)    { return str.replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

document.getElementById('burger-btn')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});
