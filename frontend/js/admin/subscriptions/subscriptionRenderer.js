/**
 * subscriptionRenderer.js — Subscription tracker rendering and filter
 * setSubFilter and renderSubscriptions are kept tightly coupled.
 */

import { adminState } from '../state/adminState.js';

export function setSubFilter(filter, btnEl) {
  adminState.subFilter = filter;
  const container = btnEl.parentElement;
  container.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');
  renderSubscriptions();
}

export function renderSubscriptions() {
  const { allFamilies, allSubscriptions, subFilter } = adminState;

  const container = document.getElementById('subscriptions-list');
  const indContainer = document.getElementById('individual-subscriptions-list');

  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let expiringCount = 0;
  const groupByService = (items) => {
    const grouped = {};

    items.forEach(item => {
      const key = item.serviceName || 'Unknown Service';

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    return grouped;
  };


  // Enrich families with status
  const enrichedFamilies = allFamilies.map(f => {
    let subStatus = 'ACTIVE';
    let isExpiringSoon = false;
    let isExpired = false;

    if (f.expiresAt) {
      const exp = new Date(f.expiresAt);
      if (exp < now) {
        subStatus = 'EXPIRED';
        isExpired = true;
      } else if (exp <= next7Days) {
        subStatus = 'EXPIRING';
        isExpiringSoon = true;
        expiringCount++;
      }
    } else if (!f.isActive) {
      subStatus = 'EXPIRED';
      isExpired = true;
    }

    return { ...f, subStatus, isExpiringSoon, isExpired };
  });
  // Enrich individual subscriptions with status
  const enrichedRequests = allSubscriptions
    .filter(s => !(s.familyId || s.isFamilyMember || (s.scope && s.scope.includes('family'))))
    .map(s => {
      let subStatus = s.status || 'ACTIVE'; // 'ACTIVE', 'PENDING', or 'EXPIRED'
      let isExpiringSoon = false;
      let isExpired = s.status === 'EXPIRED';
      let isPending = s.status === 'PENDING';

      if (s.expiresAt) {
        const exp = new Date(s.expiresAt);
        if (exp < now) {
          subStatus = 'EXPIRED';
          isExpired = true;
          isPending = false;
        } else if (exp <= next7Days && s.status === 'ACTIVE') {
          subStatus = 'EXPIRING';
          isExpiringSoon = true;
          expiringCount++;
        }
      }

      return { ...s, subStatus, isExpiringSoon, isExpired, isPending };
    });

  // Update Alert Banner
  const alertBanner = document.getElementById('expiry-alert-banner');
  if (expiringCount > 0) {
    document.getElementById('expiry-alert-count').textContent = expiringCount;
    alertBanner.style.display = 'block';
  } else {
    alertBanner.style.display = 'none';
  }

  // Filter families
  const filteredFamilies = enrichedFamilies.filter(f => {
    if (subFilter === 'ALL') return true;
    return f.subStatus === subFilter;
  });

  // Filter individual subscriptions
  const filteredRequests = enrichedRequests.filter(r => {
    if (subFilter === 'ALL') return true;
    return r.subStatus === subFilter;
  });
  // Render Families
  const groupedFamilies = groupByService(filteredFamilies);

  if (!Object.keys(groupedFamilies).length) {
    container.innerHTML = `<div class="empty-state"><h3>No family subscriptions match.</h3></div>`;
  } else {
    container.innerHTML = Object.keys(groupedFamilies).map(service => `
    <div class="accordion-item">
      <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
        <span>
          ${service}
          <small style="margin-left:8px;color:var(--text-muted);">
            (${groupedFamilies[service].length} families)
          </small>
        </span>
        <span>▼</span>
      </div>

      <div class="accordion-content">
        ${groupedFamilies[service].map(f => {
      let cardClass = 'active';
      let badgeHtml = '<span class="badge badge-status-active">Active</span>';

      if (f.isExpired) {
        cardClass = 'expired';
        badgeHtml = '<span class="badge badge-status-expired">Expired</span>';
      } else if (f.isExpiringSoon) {
        cardClass = 'expiring-soon';
        badgeHtml = '<span class="badge badge-status-expiring">Expiring Soon</span>';
      }

      return `
            <div class="subscription-card ${cardClass}">
              <div style="flex:1;">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
                  <h3 style="margin:0;font-size:1.1rem;">${f.name}</h3>
                  ${badgeHtml}
                </div>
                <div style="font-size:0.85rem;color:var(--text-muted);">
                  ${f.planName || 'No plan'} • Organizer: ${f.organizerName || 'Unassigned'}
                </div>
                <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">
                  Start: ${f.startDate ? fmtDate(f.startDate) : 'Not set'} • 
                  Expires: <span style="${f.isExpiringSoon ? 'color:#C2410C;' : ''}${f.isExpired ? 'color:var(--danger);' : ''}">
                    ${f.expiresAt ? fmtDate(f.expiresAt) : 'Not set'}
                  </span>
                </div>
              </div>
            </div>
          `;
    }).join('')}
      </div>
    </div>
  `).join('');
  }
  const groupedIndividuals = groupByService(filteredRequests);
  // Render Individual Subscriptions
  if (!Object.keys(groupedIndividuals).length) {
    indContainer.innerHTML = `<div class="empty-state"><h3>No individual subscriptions match.</h3></div>`;
  } else {
    indContainer.innerHTML = Object.keys(groupedIndividuals).map(service => `
    <div class="accordion-item">
      <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
        <span>
          ${service}
          <small style="margin-left:8px;color:var(--text-muted);">
            (${groupedIndividuals[service].length} users)
          </small>
        </span>
        <span>▼</span>
      </div>

      <div class="accordion-content">
        ${groupedIndividuals[service].map(r => {
      let cardClass = 'active';
      let badgeHtml = '<span class="badge badge-status-active">Active</span>';
      let actionButtons = `
        <button class="btn btn-sm btn-danger" onclick="deleteSubscriptionAction('${r.id}')" title="Delete subscription">
          🗑 Delete
        </button>
      `;

      if (r.isExpired) {
        cardClass = 'expired';
        badgeHtml = '<span class="badge badge-status-expired">Expired</span>';
      } else if (r.isExpiringSoon) {
        cardClass = 'expiring-soon';
        badgeHtml = '<span class="badge badge-status-expiring">Expiring Soon</span>';
      } else if (r.isPending) {
        cardClass = 'pending';
        badgeHtml = '<span class="badge badge-status-pending">Pending Activation</span>';
        actionButtons = `
          <button class="btn btn-sm btn-success" onclick="activateSubscriptionAction('${r.id}')" title="Activate subscription" style="margin-right: 6px;">
            ⚡ Activate
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteSubscriptionAction('${r.id}')" title="Delete subscription">
            🗑 Delete
          </button>
        `;
      }

      return `
            <div class="subscription-card ${cardClass}">
              <div style="flex:1;">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
                  <h3 style="margin:0;font-size:1.1rem;">${r.userName}</h3>
                  ${badgeHtml}
                </div>
                <div style="font-size:0.85rem;color:var(--text-muted);">
                  ${r.planName || 'No plan'} • ${r.userEmail || ''}
                </div>
                <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">
                  Start: ${r.startDate ? fmtDate(r.startDate) : 'Not set'} • 
                  Expires: <span style="${r.isExpiringSoon ? 'color:#C2410C;' : ''}${r.isExpired ? 'color:var(--danger);' : ''}">
                    ${r.expiresAt ? fmtDate(r.expiresAt) : 'Not set'}
                  </span>
                </div>
              </div>
              <div class="subscription-actions">
                ${actionButtons}
              </div>
            </div>
          `;
    }).join('')}
      </div>
    </div>
  `).join('');
  }
}
