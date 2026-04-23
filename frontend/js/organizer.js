/**
 * EasyCart SME — Organizer Panel Logic
 * Scope: only assigned families + their members
 */

let myFamilies = [];
let memberCache = {};

// ---- Boot -------------------------------------------------
(async function init() {
  if (!requireRole('ORGANIZER')) return;
  const user = getUser();
  document.getElementById('nav-org-name').textContent = user.fullName || 'Organizer';

  await loadMyFamilies();
  renderOverview();
  populateFamilySelect();
})();

// ---- View switching ---------------------------------------
function showView(name, link) {
  ['overview', 'families', 'members'].forEach(v => {
    document.getElementById(`view-${v}`).style.display = v === name ? 'block' : 'none';
  });
  document.querySelectorAll('.sidebar-link').forEach(a => a.classList.remove('active'));
  if (link) link.classList.add('active');
  else {
    const m = document.querySelector(`[data-view="${name}"]`);
    if (m) m.classList.add('active');
  }
  if (name === 'families') renderFamiliesTable();
  if (name === 'members')  populateFamilySelect();
}

// ---- Data -------------------------------------------------
async function loadMyFamilies() {
  try {
    myFamilies = await Organizer.getMyFamilies();
  } catch(e) {
    myFamilies = [];
    showToast('Could not load families', 'error');
  }
}

async function getMembersForFamily(familyId) {
  if (memberCache[familyId]) return memberCache[familyId];
  try {
    const members = await Organizer.getMembers(familyId);
    memberCache[familyId] = members;
    return members;
  } catch(e) { return []; }
}

// ---- Overview ---------------------------------------------
async function renderOverview() {
  document.getElementById('stat-my-families').textContent = myFamilies.length;
  const stats = document.getElementById('stat-total-members');
  const active = document.getElementById('stat-active-members');
  stats.textContent = '…'; active.textContent = '…';

  let total = 0, activeCount = 0;
  for (const f of myFamilies) {
    const members = await getMembersForFamily(f.id);
    total += members.length;
    activeCount += members.filter(m => m.status === 'ACTIVE').length;
  }
  document.getElementById('stat-total-members').textContent  = total;
  document.getElementById('stat-active-members').textContent = activeCount;

  // Render family cards
  const container = document.getElementById('family-cards');
  if (!myFamilies.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">🏠</div>
      <h3>No families assigned</h3>
      <p>Contact the admin to be assigned as organizer of a family.</p>
    </div>`;
    return;
  }
  container.innerHTML = await Promise.all(myFamilies.map(async (f) => {
    const members = await getMembersForFamily(f.id);
    const activeM = members.filter(m => m.status === 'ACTIVE').length;
    return `
    <div class="card" style="cursor:pointer" onclick="showView('members');document.getElementById('family-select').value='${f.id}';loadMembersForFamily('${f.id}')">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div style="width:44px;height:44px;background:var(--blue);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:1.3rem">🏠</div>
        <div>
          <div style="font-weight:700;color:var(--blue)">${f.name}</div>
          <div class="text-sm text-muted">${f.description || 'Family group'}</div>
        </div>
      </div>
      <div style="display:flex;gap:20px">
        <div>
          <div style="font-size:1.4rem;font-weight:800;color:var(--blue)">${activeM}</div>
          <div class="text-sm text-muted">Active Members</div>
        </div>
        <div>
          <div style="font-size:1.4rem;font-weight:800;color:var(--blue)">${f.maxMembers}</div>
          <div class="text-sm text-muted">Max Capacity</div>
        </div>
      </div>
      <div style="margin-top:16px">
        <div style="height:6px;background:var(--border);border-radius:99px;overflow:hidden">
          <div style="height:100%;background:var(--blue);border-radius:99px;width:${Math.min(100, Math.round(activeM/f.maxMembers*100))}%;transition:width .4s"></div>
        </div>
        <div class="text-sm text-muted mt-4">${activeM} / ${f.maxMembers} slots used</div>
      </div>
      <div style="margin-top:14px;color:var(--blue);font-size:.8rem;font-weight:600">View Members →</div>
    </div>`;
  })).then(cards => cards.join(''));
}

// ---- Families table ---------------------------------------
function renderFamiliesTable() {
  const tbody = document.getElementById('families-tbody');
  if (!myFamilies.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">
      <div class="empty-state-icon">🏠</div><h3>No families assigned</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = myFamilies.map(f => `
    <tr>
      <td><strong>${f.name}</strong>${f.description ? `<br/><span class="text-sm text-muted">${f.description}</span>` : ''}</td>
      <td>${f.maxMembers}</td>
      <td>${f.isActive ? `<span class="badge badge-active">Active</span>` : `<span class="badge badge-expired">Inactive</span>`}</td>
      <td class="text-sm text-muted">${fmtDate(f.createdAt)}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="showView('members');document.getElementById('family-select').value='${f.id}';loadMembersForFamily('${f.id}')">
          View Members
        </button>
      </td>
    </tr>`).join('');
}

// ---- Members table ----------------------------------------
function populateFamilySelect() {
  const sel = document.getElementById('family-select');
  sel.innerHTML = '<option value="">— Select a family —</option>';
  myFamilies.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id; opt.textContent = f.name;
    sel.appendChild(opt);
  });
}

async function loadMembersForFamily(familyId) {
  const tbody = document.getElementById('members-tbody');
  if (!familyId) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-state-icon">👥</div><h3>Select a family above</h3></div></td></tr>`;
    document.getElementById('members-subtitle').textContent = 'Select a family to view members';
    return;
  }
  tbody.innerHTML = `<tr><td colspan="4" class="loading-row"><div class="spinner"></div></td></tr>`;

  const family = myFamilies.find(f => f.id === familyId);
  document.getElementById('members-subtitle').textContent = family ? `Viewing: ${family.name}` : '';

  const members = await getMembersForFamily(familyId);
  if (!members.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state">
      <div class="empty-state-icon">👥</div>
      <h3>No members yet</h3>
      <p>Members join when they accept an admin-sent invite.</p>
    </div></td></tr>`;
    return;
  }
  tbody.innerHTML = members.map(m => `
    <tr>
      <td><strong>${m.user?.fullName || m.userId}</strong></td>
      <td class="text-sm text-muted">${m.user?.email || '—'}</td>
      <td>${statusBadge(m.status)}</td>
      <td class="text-sm text-muted">${fmtDate(m.joinedAt)}</td>
    </tr>`).join('');
}

function handleLogout() { clearAuth(); window.location.href = 'login.html'; }
document.getElementById('burger-btn')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});
