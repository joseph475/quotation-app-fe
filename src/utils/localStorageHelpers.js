/**
 * Local Storage Helper Functions
 * 
 * These functions provide a standardized way to interact with localStorage
 * for storing and retrieving data with optional expiration.
 */

import api from '../services/api';

/**
 * Store data in localStorage with optional expiration
 * 
 * @param {string} key - The key to store the data under
 * @param {any} data - The data to store
 * @param {number} expirationMinutes - Optional expiration time in minutes
 */
export const storeInStorage = (key, data, expirationMinutes = null) => {
  try {
    const item = {
      data,
      timestamp: new Date().getTime()
    };
    
    // Add expiration if provided
    if (expirationMinutes) {
      item.expiration = expirationMinutes * 60 * 1000; // Convert to milliseconds
    }
    
    localStorage.setItem(key, JSON.stringify(item));
    return true;
  } catch (error) {
    console.error(`Error storing data in localStorage for key "${key}":`, error);
    return false;
  }
};

/**
 * Get data from localStorage, checking for expiration if applicable
 * 
 * @param {string} key - The key to retrieve data from
 * @returns {any|null} - The stored data or null if not found or expired
 */
export const getFromStorage = (key) => {
  try {
    const itemStr = localStorage.getItem(key);
    
    // Return null if the item doesn't exist
    if (!itemStr) {
      return null;
    }
    
    const item = JSON.parse(itemStr);
    const now = new Date().getTime();
    
    // Check for expiration
    if (item.expiration && now > item.timestamp + item.expiration) {
      // Item has expired, remove it from localStorage
      localStorage.removeItem(key);
      return null;
    }
    
    return item.data;
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
 * Check if a key exists in localStorage and is not expired
 * 
 * @param {string} key - The key to check
 * @returns {boolean} - True if the key exists and is not expired
 */
export const hasValidStorage = (key) => {
  return getFromStorage(key) !== null;
};

/**
 * Get the timestamp of when data was stored
 * 
 * @param {string} key - The key to check
 * @returns {number|null} - Timestamp in milliseconds or null if not found
 */
export const getStorageTimestamp = (key) => {
  try {
    const itemStr = localStorage.getItem(key);
    
    if (!itemStr) {
      return null;
    }
    
    const item = JSON.parse(itemStr);
    return item.timestamp;
  } catch (error) {
    console.error(`Error getting timestamp from localStorage for key "${key}":`, error);
    return null;
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

/**
 * Initialize app data by fetching from API and storing in localStorage
 * 
 * @param {boolean} forceRefresh - Whether to force refresh data from API
 */
export const initializeAppData = async (forceRefresh = false) => {
  try {
    console.log('Initializing app data...');
    
    // Fetch suppliers
    await fetchAndStoreData('suppliers', api.suppliers.getAll, forceRefresh);
    
    // Fetch customers
    await fetchAndStoreData('customers', api.customers.getAll, forceRefresh);
    
    // Fetch stock transfers
    await fetchAndStoreData('stockTransfers', api.stockTransfers.getAll, forceRefresh);
    
    // Fetch inventory
    await fetchAndStoreData('inventory', api.inventory.getAll, forceRefresh);
    
    // Fetch sales
    await fetchAndStoreData('sales', api.sales.getAll, forceRefresh);
    
    // Fetch quotations
    await fetchAndStoreData('quotations', api.quotations.getAll, forceRefresh);
    
    // Fetch purchase orders
    await fetchAndStoreData('purchaseOrders', api.purchaseOrders.getAll, forceRefresh);
    
    // Fetch purchase receiving
    await fetchAndStoreData('purchaseReceiving', api.purchaseReceiving.getAll, forceRefresh);
    
    console.log('App data initialization complete');
  } catch (error) {
    console.error('Error initializing app data:', error);
    throw error;
  }
};

/**
 * Fetch data from API and store in localStorage
 * 
 * @param {string} key - The key to store the data under
 * @param {Function} fetchFunction - The API function to call
 * @param {boolean} forceRefresh - Whether to force refresh data from API
 * @param {number} expirationMinutes - Optional expiration time in minutes
 */
export const fetchAndStoreData = async (key, fetchFunction, forceRefresh = false, expirationMinutes = null) => {
  try {
    // Check if data exists in localStorage and is not expired
    const existingData = getFromStorage(key);
    
    if (!forceRefresh && existingData) {
      console.log(`Using cached data for ${key}`);
      return existingData;
    }
    
    console.log(`Fetching ${key} data from API...`);
    const response = await fetchFunction();
    
    if (response && response.success) {
      const data = response.data || [];
      storeInStorage(key, data, expirationMinutes);
      console.log(`${key} data stored in localStorage`);
      return data;
    } else {
      console.error(`Failed to fetch ${key} data:`, response?.message || 'Unknown error');
      throw new Error(response?.message || `Failed to fetch ${key} data`);
    }
  } catch (error) {
    console.error(`Error fetching and storing ${key} data:`, error);
    throw error;
  }
};
