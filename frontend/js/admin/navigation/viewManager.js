/**
 * viewManager.js — Switch dashboard views and run corresponding renderers
 */

import { closeSidebar } from './sidebar.js';
import { renderOverview } from '../overview/overviewRenderer.js';
import { loadActivities } from '../overview/activityFeed.js';
import { renderUsers } from '../users/userRenderer.js';
import { renderRequests } from '../requests/requestRenderer.js';
import { renderFamilies } from '../families/familyRenderer.js';
import { renderSubscriptions } from '../subscriptions/subscriptionRenderer.js';
import { renderInvites } from '../invites/inviteRenderer.js';
import { loadAndRenderPromos } from '../promos/promoManager.js';

export function showView(name, link) {
  ['overview', 'users', 'requests', 'families', 'subscriptions', 'invites', 'add-member', 'promos'].forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.style.display = v === name ? 'block' : 'none';
  });
  
  document.querySelectorAll('.sidebar-link').forEach(a => a.classList.remove('active'));
  if (link) {
    link.classList.add('active');
  } else {
    const m = document.querySelector(`[data-view="${name}"]`);
    if (m) m.classList.add('active');
  }

  const renderers = {
    overview: () => {
      renderOverview();
      loadActivities();
    },
    users: renderUsers,
    requests: renderRequests,
    families: renderFamilies,
    subscriptions: renderSubscriptions,
    invites: renderInvites,
    promos: loadAndRenderPromos
  };

  if (renderers[name]) renderers[name]();
  closeSidebar();
}
