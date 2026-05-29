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
  const mobileOrgName = document.getElementById('mobile-nav-org-name');
  if (mobileOrgName) mobileOrgName.textContent = user.fullName || 'Organizer';

  await loadMyFamilies();
  renderOverview();
  populateFamilySelect();
  loadOrganizerActivities();
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
  closeSidebar();
}

// Sidebar toggle (Mobile)
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) overlay.classList.toggle('active');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) overlay.classList.remove('active');
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
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px;">Select a family from the list.</td></tr>`;
    return;
  }
  tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:40px;"><div class="spinner"></div></td></tr>`;

  const members = await getMembersForFamily(familyId);
  if (!members.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px;">No members yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = members.map(m => `
    <tr>
      <td><strong>${m.user?.fullName || 'User'}</strong></td>
      <td class="text-sm text-muted">${m.user?.email || '—'}</td>
      <td>${statusBadge(m.status)}</td>
      <td class="text-sm text-muted">${fmtDate(m.joinedAt)}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="removeMember('${familyId}', '${m.userId}')" style="color:var(--danger); border-color:rgba(220,38,38,0.2); padding: 4px 8px; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 4px;">
          🗑️ Remove
        </button>
      </td>
    </tr>`).join('');
}

async function removeMember(familyId, userId) {
  if (!confirm('Are you sure you want to remove this member from your family?')) return;
  try {
    await Organizer.removeFamilyMember(familyId, userId);
    showToast('Member removed successfully!', 'success');
    
    // Clear cache for this family to force re-fetch
    delete memberCache[familyId];
    
    // Re-load and re-render
    await loadMembersForFamily(familyId);
    await loadMyFamilies();
    renderOverview();
  } catch (err) {
    showToast(err.message, 'error');
  }
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

async function loadOrganizerActivities() {
  const container = document.getElementById('organizer-activities-feed');
  if (!container) return;

  container.innerHTML = `<div class="empty-state" style="padding: 20px;"><div class="spinner"></div></div>`;

  try {
    const activities = await Organizer.getActivities();
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
        <div style="display:flex; gap:12px; padding:12px 16px; background:var(--surface-hover); border-radius:var(--radius); border-left:4px solid ${act.action === 'REMOVE_MEMBER' ? 'var(--danger)' : 'var(--accent)'}; transition:var(--transition); align-items:flex-start; text-align: left;">
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
  } catch (e) {
    container.innerHTML = `<div style="color:var(--danger); padding:10px;">Failed to load activities: ${e.message}</div>`;
  }
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
