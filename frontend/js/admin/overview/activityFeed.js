/**
 * activityFeed.js — Activity loading and rendering
 * Tightly coupled: loadActivities fetches, renderActivitiesFeed renders.
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

export function renderActivitiesFeed(activities) {
  const container = document.getElementById('activities-feed');
  if (!container) return;

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
      <div style="display:flex; gap:12px; padding:12px 16px; background:var(--surface-hover); border-radius:var(--radius); border-left:4px solid ${act.action === 'REMOVE_MEMBER' ? 'var(--danger)' : 'var(--accent)'}; transition:var(--transition); align-items:flex-start;">
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
}
