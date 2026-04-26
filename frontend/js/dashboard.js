/**
 * EasyCart SME — Customer Dashboard Logic
 */

let myRequests = [];
let myInvites = [];
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
    myInvites = invs;
  } catch (e) { console.error(e); }
}

async function loadServices() {
  try {
    allServices = await Services.listActive();
  } catch (e) { allServices = []; }
}

// ---- View Switching ---------------------------------------
function showView(name, link) {
  ['overview', 'services', 'requests', 'invites'].forEach(v => {
    document.getElementById(`view-${v}`).style.display = v === name ? 'block' : 'none';
  });
  document.querySelectorAll('.sidebar-link').forEach(a => a.classList.remove('active'));
  if (link) link.classList.add('active');

  if (name === 'services') renderServices();
  if (name === 'requests') renderRequests();
  if (name === 'invites') renderInvites();
}

// ---- Overview ---------------------------------------------
function renderOverview() {
  document.getElementById('stat-requests').textContent = myRequests.length;
  document.getElementById('stat-invites').textContent = myInvites.length;

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

const serviceMeta = {
  "Prime Video": { icon: "assets/prime.png", category: "🎬 Video / OTT Streaming Services" },
  "Netflix": { icon: "assets/netflix.png", category: "🎬 Video / OTT Streaming Services" },
  "Disney+": { icon: "assets/disney.png", category: "🎬 Video / OTT Streaming Services" },
  "Showmax": { icon: "assets/showmax.png", category: "🎬 Video / OTT Streaming Services" },
  "Crunchyroll": { icon: "assets/crunchyroll.png", category: "🎬 Video / OTT Streaming Services" },
  "Hulu": { icon: "assets/hulu.png", category: "🎬 Video / OTT Streaming Services" },
  "HBO Max": { icon: "assets/hbo.png", category: "🎬 Video / OTT Streaming Services" },
  "DStv Now": { icon: "assets/dstv.png", category: "📡 Hybrid / Live TV + Streaming" },
  "Apple Music": { icon: "assets/apple_music.png", category: "🎧 Music Streaming Services" },
  "Spotify Premium": { icon: "assets/spotify.png", category: "🎧 Music Streaming Services" },
  "iCloud": { icon: "assets/icloud.png", category: "☁️ Cloud Services" },
  "iCloud + Snapchat+": { icon: "assets/icloud_snap.png", category: "☁️ Cloud Services" }
};

function renderOverviewServices() {
  const grid = document.getElementById('overview-services-grid');
  // Show first 4 services in a horizontal mini-card style
  grid.innerHTML = allServices.slice(0, 4).map(s => {
    const meta = serviceMeta[s.name] || { icon: "assets/default_icon.png" };
    return `
      <div class="service-card" onclick="openRequestModal('${s.id}')" style="cursor: pointer; display: flex; flex-direction: row; align-items: center; justify-content: flex-start; padding: 12px; gap: 16px; margin: 0;">
        <img src="${meta.icon}" alt="${s.name}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover;" onerror="this.src='assets/default_icon.png'">
        <div style="text-align: left;">
          <div style="font-weight: 700;">${s.name}</div>
          <div style="font-size: 0.8rem; color: var(--primary-color, #007aff); font-weight: 600; margin-top: 4px;">Request Plan &rarr;</div>
        </div>
      </div>
    `;
  }).join('');
}

// ---- Services ---------------------------------------------
function renderServices() {
  const container = document.getElementById('services-grid-dash');

  // Remove the default grid class since we are building categorized sub-grids
  container.classList.remove('services-grid');

  if (!allServices.length) {
    container.innerHTML = '<div style="text-align:center; padding: 40px;">No services available.</div>';
    return;
  }

  // Group services by category
  const grouped = {};
  allServices.forEach(s => {
    const meta = serviceMeta[s.name] || { icon: "assets/default_icon.png", category: "Other Services" };
    s.icon = meta.icon; // Attach icon for easy use
    if (!grouped[meta.category]) grouped[meta.category] = [];
    grouped[meta.category].push(s);
  });

  let html = '';
  Object.keys(grouped).forEach(cat => {
    html += `
      <div class="category-section" style="margin-top: 2rem;">
        <h3 class="category-title" style="margin-bottom: 1.5rem;">${cat}</h3>
        <div class="services-grid">
          ${grouped[cat].map(s => `
            <div class="service-card" style="margin: 0;">
              <img src="${s.icon}" alt="${s.name}" class="service-icon" onerror="this.src='assets/default_icon.png'">
              <h4 style="margin-bottom: 8px;">${s.name}</h4>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
                Starting at ZMW ${s.plans && s.plans.length ? Math.min(...s.plans.map(p => parseFloat(p.price))) : (s.price || '...')}
              </p>
              <button class="btn btn-primary" style="width: 100%;" onclick="openRequestModal('${s.id}')">
                Request Access
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
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
    } catch (e) { showToast(e.message, 'error'); }
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
  } catch (e) { showToast(e.message, 'error'); }
}

async function declineInvite(id) {
  try {
    await Invites.decline(id);
    showToast('Invitation Declined', 'info');
    loadMyData().then(() => { renderOverview(); renderInvites(); });
  } catch (e) { showToast(e.message, 'error'); }
}

// ---- Helpers ----------------------------------------------
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function handleLogout() { clearAuth(); window.location.href = 'login.html'; }

// Sidebar Toggle
document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('burger-btn');
  const sidebar = document.getElementById('sidebar');
  if (burger && sidebar) {
    burger.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
});
