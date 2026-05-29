/**
 * adminState.js — Shared Admin Panel State
 * All modules read and write state through this single object.
 * No hidden globals. No duplicated state.
 */

export const adminState = {
  allUsers: [],
  allFamilies: [],
  allRequests: [],
  allInvites: [],
  pendingRequests: [],
  currentFamily: null,   // Tracks the family open in the members/add-member flow
  allServices: [],
  currentReviewId: null,
  allActivities: [],
  allSubscriptions: [],

  // User filter state
  userFilterRole: 'ALL',
  userFilterStatus: 'ALL',

  // Subscription filter state
  subFilter: 'ALL',

  // Promo image upload state
  uploadedPromoImageBase64: '',
};
