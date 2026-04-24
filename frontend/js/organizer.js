/**
 * EasyCart SME — Organizer Panel Logic
 */

let myFamilies = [];
let memberCache = {};

// ---- Boot -------------------------------------------------
(async function init() {
  if (!requireRole('ORGANIZER')) return;
  const user = getUser();
  if (!user) return;
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
  
  let total = 0, activeCount = 0;
  for (const f of myFamilies) {
    const members = await getMembersForFamily(f.id);
    total += members.length;
    activeCount += members.filter(m => m.status === 'ACTIVE').length;
  }
  document.getElementById('stat-total-members').textContent  = total;
  document.getElementById('stat-active-members').textContent = activeCount;

  const container = document.getElementById('family-cards');
  if (!myFamilies.length) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px;">No families assigned to you.</div>`;
    return;
  }

  container.innerHTML = (await Promise.all(myFamilies.map(async (f) => {
    const members = await getMembersForFamily(f.id);
    const activeM = members.filter(m => m.status === 'ACTIVE').length;
    return `
    <div class="card" onclick="showView('members');document.getElementById('family-select').value='${f.id}';loadMembersForFamily('${f.id}')" style="cursor:pointer">
      <div style="font-weight: 700; margin-bottom: 4px; font-size: 1.1rem;">${f.name}</div>
      <div style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">${f.serviceName} - ${f.planName}</div>
      <div style="display:flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <div style="font-size: 1.5rem; font-weight: 800;">${activeM} / ${f.maxMembers}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Slots Used</div>
        </div>
        ${f.isActive ? '<span class="badge badge-accepted">Active</span>' : '<span class="badge badge-expired">Inactive</span>'}
      </div>
    </div>`;
  }))).join('');
}

// ---- Families table ---------------------------------------
function renderFamiliesTable() {
  const tbody = document.getElementById('families-tbody');
  if (!myFamilies.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:40px;">No families assigned.</td></tr>`;
    return;
  }
  tbody.innerHTML = myFamilies.map(f => `
    <tr>
      <td><strong>${f.name}</strong></td>
      <td>${f.serviceName} - ${f.planName}</td>
      <td>${f.isActive ? `<span class="badge badge-accepted">Active</span>` : `<span class="badge badge-expired">Inactive</span>`}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="showView('members');document.getElementById('family-select').value='${f.id}';loadMembersForFamily('${f.id}')">
          Members
        </button>
      </td>
    </tr>`).join('');
}

// ---- Members table ----------------------------------------
function populateFamilySelect() {
  const sel = document.getElementById('family-select');
  const cur = sel.value;
  sel.innerHTML = '<option value="">Select a family</option>';
  myFamilies.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id; opt.textContent = f.name;
    sel.appendChild(opt);
  });
  if (cur) sel.value = cur;
}

async function loadMembersForFamily(familyId) {
  const tbody = document.getElementById('members-tbody');
  if (!familyId) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:40px;">Select a family from the list.</td></tr>`;
    return;
  }
  tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding:40px;"><div class="spinner"></div></td></tr>`;

  const members = await getMembersForFamily(familyId);
  if (!members.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:40px;">No members yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = members.map(m => `
    <tr>
      <td><strong>${m.user?.fullName || 'User'}</strong></td>
      <td class="text-sm text-muted">${m.user?.email || '—'}</td>
      <td>${statusBadge(m.status)}</td>
      <td class="text-sm text-muted">${fmtDate(m.joinedAt)}</td>
    </tr>`).join('');
}

function handleLogout() { clearAuth(); window.location.href = 'login.html'; }

// Sidebar Toggle
document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('burger-btn');
  const sidebar = document.getElementById('sidebar');
  if (burger && sidebar) {
    burger.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
});
