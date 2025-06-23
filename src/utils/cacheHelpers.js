/**
 * Cache Management Helper Functions
 * 
 * These functions help manage cached data across user sessions
 * to prevent data leakage between different user accounts.
 */

/**
 * Clear all cached data for a specific user
 * 
 * @param {string} userId - The user ID to clear cache for
 * @param {string} userRole - The user role to clear cache for
 */
export const clearUserCache = (userId, userRole) => {
  try {
    const keysToRemove = [];
    
    // Get all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      // Check if key contains user-specific cache data
      if (key && (
        key.includes(`-${userRole}-${userId}`) ||
        key.includes(`-${userId}`) ||
        key.startsWith('quotations-') ||
        key.startsWith('sales-') ||
        key.startsWith('customers-') ||
        key.startsWith('inventory-') ||
        key.startsWith('users-') ||
        key.startsWith('reports-') ||
        key.startsWith('dashboard-')
      )) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all identified cache keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Cleared cache key: ${key}`);
    });
    
    console.log(`Cleared ${keysToRemove.length} cache entries for user ${userId} (${userRole})`);
    return true;
  } catch (error) {
    console.error('Error clearing user cache:', error);
    return false;
  }
};

/**
 * Clear all application cache data (except auth data)
 * This is more aggressive and clears all cached application data
 */
export const clearAllAppCache = () => {
  try {
    const keysToRemove = [];
    
    // Get all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      // Keep only auth-related keys
      if (key && !key.startsWith('auth') && !key.startsWith('device')) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all non-auth cache keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Also clear sessionStorage cache markers
    sessionStorage.clear();
    
    console.log(`Cleared ${keysToRemove.length} application cache entries`);
    return true;
  } catch (error) {
    console.error('Error clearing application cache:', error);
    return false;
  }
};

/**
 * Clear cache for specific data types
 * 
 * @param {string[]} dataTypes - Array of data types to clear (e.g., ['quotations', 'sales'])
 */
export const clearCacheByType = (dataTypes) => {
  try {
    const keysToRemove = [];
    
    // Get all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      // Check if key matches any of the specified data types
      if (key && dataTypes.some(type => key.startsWith(`${type}-`))) {
        keysToRemove.push(key);
      }
    }
    
    // Remove matching cache keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log(`Cleared ${keysToRemove.length} cache entries for types: ${dataTypes.join(', ')}`);
    return true;
  } catch (error) {
    console.error('Error clearing cache by type:', error);
    return false;
  }
};

/**
 * Get cache statistics
 * 
 * @returns {Object} - Cache statistics
 */
export const getCacheStats = () => {
  try {
    const stats = {
      totalKeys: localStorage.length,
      authKeys: 0,
      cacheKeys: 0,
      otherKeys: 0,
      totalSize: 0
    };
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      
      if (key) {
        stats.totalSize += key.length + (value ? value.length : 0);
        
        if (key.startsWith('auth') || key.startsWith('device')) {
          stats.authKeys++;
        } else if (key.includes('-') && (
          key.startsWith('quotations-') ||
          key.startsWith('sales-') ||
          key.startsWith('customers-') ||
          key.startsWith('inventory-') ||
          key.startsWith('users-') ||
          key.startsWith('reports-') ||
          key.startsWith('dashboard-')
        )) {
          stats.cacheKeys++;
        } else {
          stats.otherKeys++;
        }
      }
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return null;
  }
};
