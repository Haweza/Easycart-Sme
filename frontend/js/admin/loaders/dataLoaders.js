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
