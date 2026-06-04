/**
 * activityFeed.js — Activity loading and rendering
 * Supports deep-linking into views and enhanced icon/badge mapping
 * for all known action types.
 */

import { adminState } from '../state/adminState.js';
import { formatTimeAgo } from '../utils/formatters.js';

export async function loadActivities() {
  try {
    adminState.allActivities = await Admin.getActivities();
    renderActivitiesFeed(adminState.allActivities);
  } catch (e) {
    adminState.allActivities = [];
    const container = document.getElementById('activities-feed');
    if (container) {
      container.innerHTML = `<div style="color:var(--danger); padding:10px;">Failed to load activities: ${e.message}</div>`;
    }
  }
}

// ---- Icon & badge config per action type ----
const ACTION_CONFIG = {
  // Family
  ADD_MEMBER:          { icon: '👤', border: 'var(--accent)',   badge: 'badge-accepted' },
  REMOVE_MEMBER:       { icon: '🗑️', border: 'var(--danger)',   badge: 'badge-declined' },
  // Promo
  PROMO_USER_CREATED:  { icon: '🎁', border: 'var(--accent)',   badge: 'badge-pending'  },
  PROMO_USER_APPROVED: { icon: '✅', border: 'var(--success)',  badge: 'badge-accepted' },
  PROMO_USER_REJECTED: { icon: '❌', border: 'var(--danger)',   badge: 'badge-declined' },
  PROMO_USER_EXPIRED:  { icon: '⏰', border: 'var(--warning)',  badge: 'badge-expired'  },
  // Subscriptions
  SUBSCRIPTION_DELETED:{ icon: '🗑️', border: 'var(--danger)',   badge: 'badge-declined' },
  EXPIRING_SOON:       { icon: '⚠️', border: '#F59E0B',         badge: 'badge-pending'  },
  // Service Requests
  SERVICE_APPROVED:    { icon: '📋', border: 'var(--success)',  badge: 'badge-accepted' },
  SERVICE_REJECTED:    { icon: '📋', border: 'var(--danger)',   badge: 'badge-declined' },
};

const DEFAULT_CONFIG = { icon: 'ℹ️', border: 'var(--border)', badge: 'badge-pending' };

function getConfig(action) {
  return ACTION_CONFIG[action] || DEFAULT_CONFIG;
}

// ---- Deep-link helpers ----

/** Navigate to the Requests view and open review modal for that request */
export function navigateToServiceRequest(referenceId) {
  if (typeof showView === 'function') showView('requests');
  if (!referenceId) return;
  setTimeout(() => {
    const req = adminState.allRequests?.find(r => r.id === referenceId);
    if (req && typeof openReviewModal === 'function') openReviewModal(referenceId);
  }, 150);
}

/** Navigate to the Promo Users view and open review modal for that promo */
export function navigateToPromoUser(referenceId) {
  if (typeof showView === 'function') showView('promo-users-view');
  if (!referenceId) return;
  setTimeout(() => {
    if (typeof openPromoReviewModal === 'function') openPromoReviewModal(referenceId);
  }, 150);
}

// ---- Renderer ----

export function renderActivitiesFeed(activities) {
  const container = document.getElementById('activities-feed');
  if (!container) return;

  if (!activities || !activities.length) {
    container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); font-size:0.9rem;">No recent activities logged.</div>`;
    return;
  }

  container.innerHTML = activities.map(act => {
    const { icon, border, badge } = getConfig(act.action);
    const timeAgoStr = formatTimeAgo(new Date(act.createdAt));
    const referenceId = act.referenceId || null;

    // Build optional deep-link button and delete button
    let actionButtons = '';
    if (referenceId) {
      if (act.action.startsWith('PROMO_USER')) {
        actionButtons += `<button class="btn btn-sm" style="font-size:0.7rem;padding:2px 8px;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;background:transparent;color:var(--accent);"
          onclick="navigateToPromoUser('${referenceId}')">View Promo →</button>`;
      } else if (act.action.startsWith('SERVICE')) {
        actionButtons += `<button class="btn btn-sm" style="font-size:0.7rem;padding:2px 8px;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;background:transparent;color:var(--accent);"
          onclick="navigateToServiceRequest('${referenceId}')">View Request →</button>`;
      }
    }
    // Only show delete button for actual persistent logs (not EXPIRING_SOON warning which has a transient id)
    if (act.action !== 'EXPIRING_SOON') {
      actionButtons += `<button class="btn btn-sm" style="font-size:0.7rem;padding:2px 8px;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;background:transparent;color:var(--danger);"
        onclick="deleteActivityAction('${act.id}')">🗑️ Delete</button>`;
    }

    return `
      <div style="display:flex; gap:12px; padding:12px 16px; background:var(--surface-hover); border-radius:var(--radius); border-left:4px solid ${border}; transition:var(--transition); align-items:flex-start; width:100%;">
        <span style="font-size:1.25rem; margin-top:2px;">${icon}</span>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:baseline; gap:8px;">
            <span style="font-weight:600; font-size:0.95rem;">${act.actorName}</span>
            <span style="font-size:0.75rem; color:var(--text-muted); white-space:nowrap;">${timeAgoStr}</span>
          </div>
          <p style="font-size:0.875rem; color:var(--text-muted); margin:4px 0 6px 0;">${act.description}</p>
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
            <span class="badge ${badge}" style="font-size:0.65rem; text-transform:uppercase; letter-spacing:0.04em;">${act.action}</span>
            <span style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;">${fmtDate(act.createdAt)}</span>
          </div>
          <div style="display:flex; gap:6px; margin-top:8px;">
            ${actionButtons}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

export async function deleteActivityAction(id) {
  if (!id) return;
  const confirmed = confirm('Are you sure you want to delete this activity log?');
  if (!confirmed) return;

  try {
    await Admin.deleteActivity(id);
    if (typeof window.showToast === 'function') {
      window.showToast('Activity log deleted', 'success');
    }
    await loadActivities();
  } catch (err) {
    if (typeof window.showToast === 'function') {
      window.showToast('Failed to delete activity log: ' + err.message, 'error');
    }
  }
}

export async function clearAllActivitiesAction() {
  const confirmed = confirm('Are you sure you want to delete ALL activity logs? This cannot be undone.');
  if (!confirmed) return;

  try {
    await Admin.clearActivities();
    if (typeof window.showToast === 'function') {
      window.showToast('All activity logs deleted', 'success');
    }
    await loadActivities();
  } catch (err) {
    if (typeof window.showToast === 'function') {
      window.showToast('Failed to clear activity logs: ' + err.message, 'error');
    }
  }
}
