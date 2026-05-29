/**
 * modal.js — Generic modal open/close helpers
 */

/**
 * Close a modal by removing the 'open' CSS class.
 * @param {string} id  The modal element's id
 */
export function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
