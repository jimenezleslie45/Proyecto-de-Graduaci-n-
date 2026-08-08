/**
 * Format date to ISO string
 */
const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

/**
 * Format date to local string
 */
const formatDateLocal = (date, locale = 'es-BO') => {
  if (!date) return '';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString(locale);
};

/**
 * Format datetime to local string
 */
const formatDateTimeLocal = (date, locale = 'es-BO') => {
  if (!date) return '';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '' : d.toLocaleString(locale);
};

/**
 * Format time to local string
 */
const formatTime = (date, locale = 'es-BO') => {
  if (!date) return '';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString(locale);
};

module.exports = {
  formatDate,
  formatDateLocal,
  formatDateTimeLocal,
  formatTime
};
