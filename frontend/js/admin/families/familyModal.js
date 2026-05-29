/**
 * familyModal.js — Create Family modal and plans dropdown
 */

import { adminState } from '../state/adminState.js';

export function openCreateFamilyModal() {
  const { allServices, allUsers } = adminState;

  const sSel = document.getElementById('family-service');
  sSel.innerHTML = '<option value="">Select Service</option>';
  allServices.filter(s => s.isFamilyType).forEach(s => {
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

export function updatePlansDropdown(serviceElementId, planDropdownId) {
  const serviceId = document.getElementById(serviceElementId).value;
  const sel = document.getElementById(planDropdownId);
  sel.innerHTML = '<option value="">Select Plan</option>';

  if (!serviceId) return;
  const s = adminState.allServices.find(x => x.id === serviceId);
  if (!s || !s.plans) return;

  s.plans.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} (${p.currency} ${p.price})`;
    sel.appendChild(opt);
  });
}
