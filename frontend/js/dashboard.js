/**
 * EasyCart SME — Customer Dashboard Logic
 * Handles: overview stats, services, requests, invites
 */

let allServices  = [];
let allRequests  = [];
let allInvites   = [];
let currentServiceId = null;

// ---- Boot -------------------------------------------------
(async function init() {
  if (!requireRole('CUSTOMER', 'ORGANIZER', 'ADMIN')) return;

  const user = getUser();
  document.getElementById('hero-name').textContent = user.fullName?.split(' ')[0] || 'there';
  document.getElementById('nav-user-name').textContent = user.fullName || '';
  document.getElementById('nav-user-role').textContent  = user.role;
  document.getElementById('nav-user-role').className    = `badge badge-${user.role.toLowerCase()}`;

  // If admin/organizer landed here, redirect to their panel
  if (user.role === 'ADMIN')      { window.location.href = 'admin.html';     return; }
  if (user.role === 'ORGANIZER')  { window.location.href = 'organizer.html'; return; }

  await Promise.all([loadServices(), loadRequests(), loadInvites()]);
  renderOverview();
})();

// ---- View switching ---------------------------------------
function showView(name, link) {
  ['overview', 'services', 'requests', 'invites'].forEach(v => {
    document.getElementById(`view-${v}`).style.display = v === name ? 'block' : 'none';
  });
  document.querySelectorAll('.sidebar-link').forEach(a => a.classList.remove('active'));
  if (link) link.classList.add('active');
  else {
    const match = document.querySelector(`[data-view="${name}"]`);
    if (match) match.classList.add('active');
  }
  if (name === 'services') renderServices();
  if (name === 'requests') renderRequests();
  if (name === 'invites')  renderInvites();
}

// ---- Load data --------------------------------------------
async function loadServices() {
  try { allServices = await Services.listActive(); } catch(e) { allServices = []; }
}

async function loadRequests() {
  try { allRequests = await ServiceRequests.getMy(); } catch(e) { allRequests = []; }
}

async function loadInvites() {
  try {
    allInvites = await Invites.getMy();
    const pending = allInvites.filter(i => i.status === 'PENDING');
    const badge = document.getElementById('invite-badge');
    if (pending.length) { badge.textContent = pending.length; badge.style.display = 'inline-flex'; }
  } catch(e) { allInvites = []; }
}

// ---- Overview ---------------------------------------------
function renderOverview() {
  document.getElementById('stat-requests').textContent = allRequests.length;
  document.getElementById('stat-invites').textContent  = allInvites.length;
  document.getElementById('stat-active').textContent   = allInvites.filter(i => i.status === 'ACCEPTED').length;
  const pendingInvites = allInvites.filter(i => i.status === 'PENDING');
  document.getElementById('stat-pending').textContent  = pendingInvites.length;

  if (pendingInvites.length > 0) {
    document.getElementById('pending-invites-callout').style.display = 'block';
    document.getElementById('pending-count').textContent = pendingInvites.length;
  }

  const tbody = document.getElementById('overview-requests-list');
  if (!allRequests.length) {
    tbody.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div>
      <h3>No requests yet</h3><p>Browse services and submit your first request.</p>
      <a href="#" onclick="showView('services')" class="btn btn-primary mt-4">Browse Services</a></div>`;
    return;
  }
  tbody.innerHTML = `
    <div class="table-wrapper" style="border:none">
    <table>
      <thead><tr><th>Service</th><th>Status</th><th>Admin Note</th><th>Date</th></tr></thead>
      <tbody>
        ${allRequests.slice(0,5).map(r => `
          <tr>
            <td><strong>${r.serviceName}</strong></td>
            <td>${statusBadge(r.status)}</td>
            <td class="text-muted text-sm">${r.adminNote || '—'}</td>
            <td class="text-muted text-sm">${fmtDate(r.createdAt)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table></div>`;
}

// ---- Services view ----------------------------------------
function renderServices() {
  const icons = ['📦', '⚡', '🚀', '🏆'];
  const grid  = document.getElementById('services-grid-dash');
  if (!allServices.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><h3>No services available</h3></div>`;
    return;
  }
  grid.innerHTML = allServices.map((s, i) => {
    const alreadyRequested = allRequests.some(
      r => r.serviceId === s.id && r.status === 'PENDING'
    );
    const alreadyMember = allInvites.some(
      inv => inv.serviceId === s.id && inv.status === 'ACCEPTED'
    );
    let btnHtml = `<button class="btn btn-primary btn-sm" onclick="openRequestModal('${s.id}','${escHtml(s.name)}','${s.currency} ${Number(s.price).toLocaleString()} / ${s.billingCycle?.toLowerCase()}')">
      Request Access</button>`;
    if (alreadyRequested) btnHtml = `<span class="badge badge-pending">Requested</span>`;
    if (alreadyMember)    btnHtml = `<span class="badge badge-accepted">✓ Member</span>`;
    return `
    <div class="service-card fade-in" style="animation-delay:${i*.07}s">
      <div class="service-card-icon">${icons[i % icons.length]}</div>
      <div class="service-card-name">${s.name}</div>
      <div class="service-card-desc">${s.description || 'Subscription service plan.'}</div>
      <div class="service-card-price">${s.currency} ${Number(s.price).toLocaleString()}<span>/ ${s.billingCycle?.toLowerCase()}</span></div>
      <div class="service-card-footer">
        <span class="badge badge-active">Active</span>
        ${btnHtml}
      </div>
    </div>`;
  }).join('');
}

// ---- Requests view ----------------------------------------
function renderRequests() {
  const tbody = document.getElementById('requests-table-body');
  if (!allRequests.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">
      <div class="empty-state-icon">📋</div><h3>No requests yet</h3>
      <p>Go to <a href="#" onclick="showView('services')" style="color:var(--blue)">Browse Services</a> to get started.</p>
    </div></td></tr>`;
    return;
  }
  tbody.innerHTML = allRequests.map(r => `
    <tr>
      <td><strong>${r.serviceName}</strong></td>
      <td class="text-sm text-muted">${r.message || '—'}</td>
      <td>${statusBadge(r.status)}</td>
      <td class="text-sm text-muted">${r.adminNote || '—'}</td>
      <td class="text-sm text-muted">${fmtDate(r.createdAt)}</td>
    </tr>`).join('');
}

// ---- Invites view -----------------------------------------
function renderInvites() {
  const container = document.getElementById('invites-list');
  if (!allInvites.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📬</div>
      <h3>No invitations yet</h3>
      <p>When an admin invites you to a family, it will appear here.</p>
    </div>`;
    return;
  }
  container.innerHTML = allInvites.map(inv => `
    <div class="invite-card ${inv.status.toLowerCase()} fade-in">
      <div class="invite-card-header">
        <div class="invite-card-title">📬 Invitation to <strong>${inv.familyName}</strong></div>
        ${statusBadge(inv.status)}
      </div>
      <div class="invite-card-meta">
        <span>💼 Service: <strong>${inv.serviceName}</strong></span>
        <span>📅 Expires: <strong>${fmtDate(inv.expiresAt)}</strong></span>
        ${inv.respondedAt ? `<span>✅ Responded: ${fmtDate(inv.respondedAt)}</span>` : ''}
      </div>
      ${inv.message ? `<p class="text-sm text-muted mt-4" style="font-style:italic">"${inv.message}"</p>` : ''}
      ${inv.status === 'PENDING' ? `
      <div class="invite-card-actions">
        <button class="btn btn-primary btn-sm" onclick="respondInvite('${inv.id}','accept')">✅ Accept Invite</button>
        <button class="btn btn-outline btn-sm" onclick="respondInvite('${inv.id}','decline')" style="border-color:var(--danger);color:var(--danger)">✕ Decline</button>
      </div>` : ''}
    </div>`).join('');
}

// ---- Request modal ----------------------------------------
function openRequestModal(serviceId, name, priceStr) {
  currentServiceId = serviceId;
  document.getElementById('request-service-name').textContent  = name;
  document.getElementById('request-service-price').textContent = priceStr;
  document.getElementById('request-message').value = '';
  document.getElementById('request-alert').style.display = 'none';
  document.getElementById('request-modal').classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.getElementById('request-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('request-submit-btn');
  const alert = document.getElementById('request-alert');
  btn.disabled = true; btn.textContent = 'Submitting…';
  alert.style.display = 'none';
  try {
    const msg = document.getElementById('request-message').value.trim();
    await ServiceRequests.create({ serviceId: currentServiceId, message: msg || null });
    await loadRequests();
    closeModal('request-modal');
    renderServices();
    showToast('Request submitted successfully!', 'success');
  } catch(err) {
    alert.className = 'alert alert-danger';
    alert.textContent = err.message;
    alert.style.display = 'flex';
  } finally {
    btn.disabled = false; btn.textContent = 'Submit Request';
  }
});

// ---- Invite responses -------------------------------------
async function respondInvite(inviteId, action) {
  try {
    if (action === 'accept')  await Invites.accept(inviteId);
    if (action === 'decline') await Invites.decline(inviteId);
    showToast(action === 'accept' ? '✅ Invite accepted! You are now a family member.' : 'Invite declined.', action === 'accept' ? 'success' : 'info');
    await loadInvites();
    renderInvites();
    renderOverview();
  } catch(err) {
    showToast(err.message, 'error');
  }
}

// ---- Logout -----------------------------------------------
function handleLogout() {
  clearAuth();
  window.location.href = 'login.html';
}

// ---- Helpers ----------------------------------------------
function escHtml(str) { return str.replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

// Mobile burger
document.getElementById('burger-btn')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});
