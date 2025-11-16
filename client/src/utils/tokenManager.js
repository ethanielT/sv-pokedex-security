
export const isTokenExpired = () => {
  const tokenExpire = localStorage.getItem('tokenExpire');
  if (!tokenExpire) return false;
  
  return Date.now() > parseInt(tokenExpire);
};

export const getToken = () => {
  if (isTokenExpired()) {
    // Token expired, clear storage
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpire');
    localStorage.removeItem('userRole');
    return null;
  }
  
  return localStorage.getItem('token');
};

export const getTimeUntilExpiry = () => {
  const tokenExpire = localStorage.getItem('tokenExpire');
  if (!tokenExpire) return null;
  
  const remaining = parseInt(tokenExpire) - Date.now();
  if (remaining < 0) return 0;
  
  return Math.floor(remaining / 1000); // Return in seconds
};

export const formatTimeRemaining = (seconds) => {
  if (!seconds) return 'Token expired';
  
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
};

export const clearTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('tokenExpire');
  localStorage.removeItem('userRole');
};
