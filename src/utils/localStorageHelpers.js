/**
 * Simple Local Storage Helper Functions
 * 
 * Simplified version that focuses on basic localStorage operations
 * without complex caching mechanisms.
 */

/**
 * Store data in localStorage
 * 
 * @param {string} key - The key to store the data under
 * @param {any} data - The data to store
 */
export const storeInStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error storing data in localStorage for key "${key}":`, error);
    return false;
  }
};

/**
 * Get data from localStorage
 * 
 * @param {string} key - The key to retrieve data from
 * @returns {any|null} - The stored data or null if not found
 */
export const getFromStorage = (key) => {
  try {
    const itemStr = localStorage.getItem(key);
    
    if (!itemStr) {
      return null;
    }
    
    return JSON.parse(itemStr);
  } catch (error) {
    console.error(`Error retrieving data from localStorage for key "${key}":`, error);
    return null;
  }
};

/**
 * Remove data from localStorage
 * 
 * @param {string} key - The key to remove
 */
export const removeFromStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing data from localStorage for key "${key}":`, error);
    return false;
  }
};

/**
 * Clear all data from localStorage
 */
export const clearStorage = () => {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
};

/**
 * Store authenticated user data in localStorage
 * 
 * @param {Object} userData - User data to store
 */
export const storeAuthUser = (userData) => {
  storeInStorage('authUser', userData);
};

/**
 * Get authenticated user data from localStorage
 * 
 * @returns {Object|null} - User data or null if not found
 */
export const getAuthUser = () => {
  return getFromStorage('authUser');
};

/**
 * Clear authenticated user data from localStorage
 */
export const clearAuthUser = () => {
  removeFromStorage('authUser');
};
