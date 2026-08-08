/**
 * Calculate duration between two dates in minutes
 */
const calculateDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return null;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  
  const diffMs = end - start;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  return diffMinutes > 0 ? diffMinutes : 0;
};

/**
 * Format duration for display
 */
const formatDuration = (minutes) => {
  if (!minutes || minutes < 0) return '0 min';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins} min`;
  }
  
  if (mins === 0) {
    return `${hours} h`;
  }
  
  return `${hours} h ${mins} min`;
};

module.exports = {
  calculateDuration,
  formatDuration
};
