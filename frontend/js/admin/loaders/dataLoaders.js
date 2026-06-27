/**
 * dataLoaders.js — API fetching and state population
 * No rendering logic lives here.
 */

import { adminState } from '../state/adminState.js';

export async function loadUsers() {
  try { adminState.allUsers = await Admin.getUsers(); } catch (e) { adminState.allUsers = []; }
}

export async function loadFamilies() {
  try { adminState.allFamilies = await Admin.getFamilies(); } catch (e) { adminState.allFamilies = []; }
}

export async function loadRequests() {
  try { adminState.allRequests = await ServiceRequests.getAll(); } catch (e) { adminState.allRequests = []; }
}

export async function loadInvites() {
  try { adminState.allInvites = await Invites.getAll(); } catch (e) { adminState.allInvites = []; }
}

export async function loadServices() {
  try { adminState.allServices = await Services.listActive(); } catch (e) { adminState.allServices = []; }
}

export async function loadSubscriptions() {
  try { adminState.allSubscriptions = await Admin.getSubscriptions(); } catch (e) { adminState.allSubscriptions = []; }
}

export async function loadActivities() {
  try { adminState.allActivities = await Admin.getActivities(); } catch (e) { adminState.allActivities = []; }
}

// NEW: Load promo users (for admin)
export async function loadPromoUsers() {
  try {
    const response = await PromoUsers.getAll();
    // Handle both page and non-page responses
    adminState.allPromoUsers = response.content || response.data || response || [];
  } catch (error) {
    console.error('Error loading promo users:', error);
    adminState.allPromoUsers = [];
  }
}

// NEW: Load pending promo users (for review)
export async function loadPendingPromoUsers() {
  try {
    const response = await PromoUsers.getPending();
    adminState.pendingPromoUsers = response.data || response || [];
  } catch (error) {
    console.error('Error loading pending promo users:', error);
    adminState.pendingPromoUsers = [];
  }
}

// NEW: Load customer's own subscriptions
export async function loadMySubscriptions() {
  try {
    const response = await Subscriptions.getMy();
    adminState.customerSubscriptions = response.data || response || [];
  } catch (error) {
    console.error('Error loading my subscriptions:', error);
    adminState.customerSubscriptions = [];
  }
}

// Load electronic product listings (admin view — includes expired)
export async function loadElectronics() {
  try {
    adminState.allElectronics = await Electronics.getAll();
  } catch (error) {
    console.error('Error loading electronics:', error);
    adminState.allElectronics = [];
  }
}