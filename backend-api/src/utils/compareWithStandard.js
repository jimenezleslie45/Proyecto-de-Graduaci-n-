/**
 * Compare actual time with standard time
 */
const compareWithStandard = (actualMinutes, standardMinutes) => {
  if (!actualMinutes || !standardMinutes) return null;
  
  const difference = actualMinutes - standardMinutes;
  const percentage = (difference / standardMinutes) * 100;
  
  return {
    difference,
    percentage,
    status: difference <= 0 ? 'on_time' : 'over_time'
  };
};

/**
 * Check if task was completed on time
 */
const isOnTime = (actualMinutes, standardMinutes) => {
  if (!actualMinutes || !standardMinutes) return false;
  return actualMinutes <= standardMinutes;
};

module.exports = {
  compareWithStandard,
  isOnTime
};
