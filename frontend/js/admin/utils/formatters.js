/**
 * formatters.js — Reusable display formatters
 * Note: fmtDate, roleBadge, statusBadge are defined in api.js (classic script)
 * and are therefore already available as globals. They are NOT re-defined here.
 */

/**
 * Returns a human-readable "time ago" string from a Date object.
 * @param {Date} date
 * @returns {string}
 */
export function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
