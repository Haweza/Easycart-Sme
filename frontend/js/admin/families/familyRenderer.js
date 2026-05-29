/**
 * familyRenderer.js — Families view rendering (grouped by service, accordion)
 */

import { adminState } from '../state/adminState.js';
import { escHtml } from '../utils/domHelpers.js';

export function renderFamilies() {
  const container = document.getElementById('families-container');
  const { allFamilies } = adminState;

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
