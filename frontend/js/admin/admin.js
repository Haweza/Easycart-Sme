/**
 * admin.js — Main Entry Point for EasyCart SME Admin Panel
 * Loads all state, hooks up DOM event handlers, and exposes globals.
 */

import { adminState } from './state/adminState.js';
import { loadUsers, loadFamilies, loadRequests, loadInvites, loadServices, loadSubscriptions, loadActivities, loadPromoUsers, loadPendingPromoUsers, loadMySubscriptions, loadElectronics } from './loaders/dataLoaders.js';
import { navigateToPromoUser, navigateToServiceRequest, deleteActivityAction, clearAllActivitiesAction } from './overview/activityFeed.js';
import { initEventBindings } from './events/eventBindings.js';

// Import all actions and view switchers to expose on window
import { showView } from './navigation/viewManager.js';
import { toggleSidebar, closeSidebar } from './navigation/sidebar.js';
import { closeModal } from './utils/modal.js';
import { applyUserFilters, toggleFilterPanel, setFilter, clearFilters } from './users/userFilters.js';
import { approveUser, changeRole } from './users/userActions.js';
import { openUserDetails } from './users/userDetails.js';
import { openReviewModal } from './requests/requestReview.js';
import { openMembersModal, removeMemberFromFamily } from './families/familyMembers.js';
import { showAddMemberView, addMemberToFamily } from './families/addMemberView.js';
import { openCreateFamilyModal, updatePlansDropdown } from './families/familyModal.js';
import { setSubFilter } from './subscriptions/subscriptionRenderer.js';
import { openCreateInviteModal, updateInvitePlanInfo } from './invites/inviteModal.js';
import { previewPromoImage, publishPromo, bringDownPromo } from './promos/promoManager.js';
import { previewElectronicImage, publishElectronic, deleteElectronicAction, loadAndRenderElectronics } from './electronics/electronicsManager.js';

// NEW: Import promo and subscription actions
import { openPromoReviewModal, closePromoModal, approvePromoUser, rejectPromoUser, filterPromoUsers, deleteSubscriptionAction, activateSubscriptionAction } from './promos/promoActions.js';
import { renderPromoUsers } from './promos/promoRenderer.js';
import { renderMySubscriptions } from './subscriptions/mySubscriptionRenderer.js';

// ---- Handle Logout -----------------------------------------
function handleLogout() {
  clearAuth();
  window.location.href = 'login.html';
}

// ---- Expose to window for inline HTML & dynamic handlers ---
window.showView = showView;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.handleLogout = handleLogout;
window.closeModal = closeModal;
window.applyUserFilters = applyUserFilters;
window.toggleFilterPanel = toggleFilterPanel;
window.setFilter = setFilter;
window.clearFilters = clearFilters;
window.approveUser = approveUser;
window.changeRole = changeRole;
window.openUserDetails = openUserDetails;
window.openReviewModal = openReviewModal;
window.openMembersModal = openMembersModal;
window.removeMemberFromFamily = removeMemberFromFamily;
window.showAddMemberView = showAddMemberView;
window.addMemberToFamily = addMemberToFamily;
window.openCreateFamilyModal = openCreateFamilyModal;
window.updatePlansDropdown = updatePlansDropdown;
window.setSubFilter = setSubFilter;
window.openCreateInviteModal = openCreateInviteModal;
window.updateInvitePlanInfo = updateInvitePlanInfo;
window.previewPromoImage = previewPromoImage;
window.publishPromo = publishPromo;
window.bringDownPromo = bringDownPromo;
window.loadActivities = loadActivities;

// Electronics functions
window.previewElectronicImage = previewElectronicImage;
window.publishElectronic = publishElectronic;
window.deleteElectronicAction = deleteElectronicAction;
window.loadAndRenderElectronics = loadAndRenderElectronics;

// NEW: Expose promo and subscription functions to window
window.openPromoReviewModal = openPromoReviewModal;
window.closePromoModal = closePromoModal;
window.approvePromoUser = approvePromoUser;
window.rejectPromoUser = rejectPromoUser;
window.filterPromoUsers = filterPromoUsers;
window.renderPromoUsers = renderPromoUsers;
window.renderMySubscriptions = renderMySubscriptions;
window.loadPromoUsers = loadPromoUsers;
window.loadPendingPromoUsers = loadPendingPromoUsers;
window.loadMySubscriptions = loadMySubscriptions;
window.deleteSubscriptionAction = deleteSubscriptionAction;
window.activateSubscriptionAction = activateSubscriptionAction;

// Activity feed deep-link helpers
window.navigateToPromoUser = navigateToPromoUser;
window.navigateToServiceRequest = navigateToServiceRequest;
window.deleteActivityAction = deleteActivityAction;
window.clearAllActivitiesAction = clearAllActivitiesAction;

// ---- Boot / Initialization ---------------------------------
async function init() {
  if (!requireRole('ADMIN')) return;
  const user = getUser();
  
  const navNameEl = document.getElementById('nav-admin-name');
  if (navNameEl) navNameEl.textContent = user.fullName || 'Admin';
  
  const mobileAdminName = document.getElementById('mobile-nav-admin-name');
  if (mobileAdminName) mobileAdminName.textContent = user.fullName || 'Admin';
  
  const welcomeNameEl = document.getElementById('admin-welcome-name');
  if (welcomeNameEl) welcomeNameEl.textContent = (user.fullName || 'Admin').split(' ')[0];

  try {
    await Promise.all([
      loadUsers(),
      loadFamilies(),
      loadRequests(),
      loadInvites(),
      loadServices(),
      loadActivities(),
      loadSubscriptions(),
      loadPromoUsers(),
      loadPendingPromoUsers(),
      loadMySubscriptions(),
      loadElectronics(),
    ]);
  } catch (err) {
    console.error('Error during data initialization:', err);
  }

  // Set default view to overview
  showView('overview');
}

// Initialize event bindings first
initEventBindings();

// Run main boot sequence
init();
