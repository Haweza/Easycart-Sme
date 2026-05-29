/**
 * domHelpers.js — DOM utility helpers
 */

/**
 * Escape a string for safe use inside HTML attribute values.
 * Protects against XSS in dynamically-built onclick attributes.
 */
export function escHtml(str) {
  return str ? str.replace(/'/g, "\\'").replace(/"/g, '&quot;') : '';
}
