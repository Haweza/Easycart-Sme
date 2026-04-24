/**
 * EasyCart SME — Customer Dashboard Logic
 */

let myRequests = [];
let myInvites  = [];
let allServices = [];

// ---- Boot -------------------------------------------------
(async function init() {
  if (!requireRole('CUSTOMER')) return;
  const user = getUser();
  if (!user) return;
  document.getElementById('nav-user-name').textContent = user.fullName || 'User';
  document.getElementById('nav-user-role').textContent = user.role || 'CUSTOMER';
  document.getElementById('hero-name').textContent = (user.fullName || 'User').split(' ')[0];

  await Promise.all([loadMyData(), loadServices()]);
  renderOverview();
})();

async function loadMyData() {
  try {
    const [reqs, invs] = await Promise.all([
      ServiceRequests.getMy(),
      Invites.getMy()
    ]);
    myRequests = reqs;
    myInvites  = invs;
  } catch(e) { console.error(e); }
}

async function loadServices() {
  try {
    allServices = await Services.listActive();
  } catch(e) { allServices = []; }
}

// ---- View Switching ---------------------------------------
function showView(name, link) {
  ['overview','services','requests','invites'].forEach(v => {
    document.getElementById(`view-${v}`).style.display = v === name ? 'block' : 'none';
  });
  document.querySelectorAll('.sidebar-link').forEach(a => a.classList.remove('active'));
  if (link) link.classList.add('active');
  
  if (name === 'services') renderServices();
  if (name === 'requests') renderRequests();
  if (name === 'invites')  renderInvites();
}

// ---- Overview ---------------------------------------------
function renderOverview() {
  document.getElementById('stat-requests').textContent = myRequests.length;
  document.getElementById('stat-invites').textContent  = myInvites.length;
  
  const activeCount = myInvites.filter(i => i.status === 'ACCEPTED').length;
  const pendingCount = myInvites.filter(i => i.status === 'PENDING').length;
  
  document.getElementById('stat-active').textContent = activeCount;
  
  const callout = document.getElementById('pending-invites-callout');
  if (pendingCount > 0) {
    document.getElementById('pending-count').textContent = pendingCount;
    callout.style.display = 'block';
    document.getElementById('invite-badge').textContent = pendingCount;
    document.getElementById('invite-badge').style.display = 'inline-flex';
  } else {
    callout.style.display = 'none';
    document.getElementById('invite-badge').style.display = 'none';
  }

  renderOverviewServices();
}

function renderOverviewServices() {
  const grid = document.getElementById('overview-services-grid');
  // Just show first 3 services
  grid.innerHTML = allServices.slice(0,3).map(s => `
    <div class="card" onclick="openRequestModal('${s.id}')" style="cursor: pointer;">
      <div style="font-size: 1.5rem; margin-bottom: 8px;">📦</div>
      <div style="font-weight: 700;">${s.name}</div>
      <div style="font-size: 0.8rem; color: var(--text-muted);">Request Plan →</div>
    </div>
  `).join('');
}

// ---- Services ---------------------------------------------
function renderServices() {
  const grid = document.getElementById('services-grid-dash');
  if (!allServices.length) {
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center;">No services available.</div>';
    return;
  }
  grid.innerHTML = allServices.map(s => `
    <div class="card">
      <div style="font-size: 2rem; margin-bottom: 1rem;">📦</div>
      <h3 style="margin-bottom: 8px;">${s.name}</h3>
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem;">${s.description || 'Premium subscription service.'}</p>
      <button class="btn btn-primary w-full" onclick="openRequestModal('${s.id}')">Request Access</button>
    </div>
  `).join('');
}

// ---- Request Modal ----------------------------------------
function openRequestModal(serviceId) {
  const s = allServices.find(x => x.id === serviceId);
  if (!s) return;

  document.getElementById('request-service-name').textContent = s.name;
  const pSel = document.getElementById('request-plan');
  pSel.innerHTML = s.plans.map(p => `
    <option value="${p.id}">${p.name} (${p.currency} ${p.price})</option>
  `).join('');

  document.getElementById('request-message').value = '';
  document.getElementById('request-modal').classList.add('open');
  
  // Form listener
  const form = document.getElementById('request-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('request-submit-btn');
    btn.disabled = true;
    try {
      await ServiceRequests.create({
        serviceId: s.id,
        planId: pSel.value,
        message: document.getElementById('request-message').value.trim()
      });
      showToast('Request Submitted!', 'success');
      closeModal('request-modal');
      loadMyData().then(renderOverview);
    } catch(e) { showToast(e.message, 'error'); }
    finally { btn.disabled = false; }
  };
}

// ---- Requests ---------------------------------------------
function renderRequests() {
  const tbody = document.getElementById('requests-table-body');
  if (!myRequests.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:40px;">You haven\'t made any requests yet.</td></tr>';
    return;
  }
  tbody.innerHTML = myRequests.map(r => `
    <tr>
      <td><strong>${r.serviceName}</strong></td>
      <td>${r.planName || '—'}</td>
      <td>${statusBadge(r.status)}</td>
      <td class="text-sm text-muted">${fmtDate(r.createdAt)}</td>
    </tr>
  `).join('');
}

// ---- Invites ----------------------------------------------
function renderInvites() {
  const list = document.getElementById('invites-list');
  if (!myInvites.length) {
    list.innerHTML = '<div style="text-align:center; padding:40px;">No invitations received.</div>';
    return;
  }
  list.innerHTML = myInvites.map(i => `
    <div class="card" style="border-left: 4px solid ${i.status === 'PENDING' ? 'var(--warning)' : 'var(--success)'};">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <div>
          <div style="font-weight: 700; font-size: 1.1rem;">${i.serviceName}</div>
          <div style="font-size: 0.9rem; color: var(--text-muted);">${i.planName} • ${i.familyName}</div>
        </div>
        ${statusBadge(i.status)}
      </div>
      <p style="font-size: 0.9rem; margin-bottom: 1rem; font-style: italic;">"${i.message || 'No message from admin'}"</p>
      ${i.status === 'PENDING' ? `
        <div style="display: flex; gap: 12px;">
          <button class="btn btn-primary btn-sm" onclick="acceptInvite('${i.id}')">Accept Invite</button>
          <button class="btn btn-outline btn-sm" onclick="declineInvite('${i.id}')">Decline</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

async function acceptInvite(id) {
  try {
    await Invites.accept(id);
    showToast('Invitation Accepted!', 'success');
    loadMyData().then(() => { renderOverview(); renderInvites(); });
  } catch(e) { showToast(e.message, 'error'); }
}

async function declineInvite(id) {
  try {
    await Invites.decline(id);
    showToast('Invitation Declined', 'info');
    loadMyData().then(() => { renderOverview(); renderInvites(); });
  } catch(e) { showToast(e.message, 'error'); }
}

// ---- Helpers ----------------------------------------------
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function handleLogout()  { clearAuth(); window.location.href = 'login.html'; }

// Sidebar Toggle
document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('burger-btn');
  const sidebar = document.getElementById('sidebar');
  if (burger && sidebar) {
    burger.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
});
