/**
 * Delivery Users Cache Management System
 * 
 * This module provides centralized delivery users caching to improve performance
 * and reduce API calls when fetching delivery personnel data.
 */

import api from '../services/api';
import { storeInStorage, getFromStorage } from './localStorageHelpers';

// Cache configuration
const CACHE_CONFIG = {
  DELIVERY_USERS_KEY: 'delivery_users_cache',
  TIMESTAMP_KEY: 'delivery_users_cache_timestamp',
  CACHE_DURATION: 10 * 60 * 1000, // 10 minutes in milliseconds (delivery users change infrequently)
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

// In-memory cache for faster access during the same session
let memoryCache = {
  data: null,
  timestamp: null,
  loading: false,
  loadingPromise: null
};

/**
 * Check if cache is valid (not expired)
 */
const isCacheValid = (timestamp) => {
  if (!timestamp) return false;
  const now = Date.now();
  return (now - timestamp) < CACHE_CONFIG.CACHE_DURATION;
};

/**
 * Get delivery users from cache (memory first, then localStorage)
 */
export const getCachedDeliveryUsers = () => {
  // Check memory cache first
  if (memoryCache.data && isCacheValid(memoryCache.timestamp)) {
    console.log('Delivery users cache: Using memory cache');
    return memoryCache.data;
  }

  // Check localStorage cache
  const cachedData = getFromStorage(CACHE_CONFIG.DELIVERY_USERS_KEY);
  const cachedTimestamp = getFromStorage(CACHE_CONFIG.TIMESTAMP_KEY);

  if (cachedData && isCacheValid(cachedTimestamp)) {
    console.log('Delivery users cache: Using localStorage cache');
    // Update memory cache
    memoryCache.data = cachedData;
    memoryCache.timestamp = cachedTimestamp;
    return cachedData;
  }

  console.log('Delivery users cache: No valid cache found');
  return null;
};

/**
 * Store delivery users data in cache (both memory and localStorage)
 */
const setCachedDeliveryUsers = (data) => {
  const timestamp = Date.now();
  
  // Update memory cache
  memoryCache.data = data;
  memoryCache.timestamp = timestamp;
  
  // Update localStorage cache
  storeInStorage(CACHE_CONFIG.DELIVERY_USERS_KEY, data);
  storeInStorage(CACHE_CONFIG.TIMESTAMP_KEY, timestamp);
  
  console.log(`Delivery users cache: Cached ${data.length} users`);
};

/**
 * Fetch delivery users data from API with retry logic
 */
const fetchDeliveryUsersFromAPI = async (retryCount = 0) => {
  try {
    console.log(`Delivery users cache: Fetching from API (attempt ${retryCount + 1})`);
    
    const response = await api.quotations.getDeliveryUsers();
    
    if (response && response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response?.message || 'Failed to fetch delivery users');
    }
  } catch (error) {
    console.error(`Delivery users cache: API fetch failed (attempt ${retryCount + 1}):`, error);
    
    // Retry logic
    if (retryCount < CACHE_CONFIG.MAX_RETRIES - 1) {
      console.log(`Delivery users cache: Retrying in ${CACHE_CONFIG.RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, CACHE_CONFIG.RETRY_DELAY));
      return fetchDeliveryUsersFromAPI(retryCount + 1);
    }
    
    throw error;
  }
};

/**
 * Get delivery users (from cache or API)
 * This is the main function that should be used throughout the app
 */
export const getDeliveryUsers = async (forceRefresh = false) => {
  // If already loading, return the existing promise
  if (memoryCache.loading && memoryCache.loadingPromise) {
    console.log('Delivery users cache: Already loading, waiting for existing request');
    return memoryCache.loadingPromise;
  }

  // Check cache first (unless force refresh is requested)
  if (!forceRefresh) {
    const cachedData = getCachedDeliveryUsers();
    if (cachedData) {
      return cachedData;
    }
  }

  // Set loading state
  memoryCache.loading = true;
  
  // Create loading promise
  memoryCache.loadingPromise = (async () => {
    try {
      const data = await fetchDeliveryUsersFromAPI();
      setCachedDeliveryUsers(data);
      return data;
    } catch (error) {
      console.error('Delivery users cache: Failed to fetch delivery users:', error);
      
      // If we have expired cache data, return it as fallback
      const expiredCache = getFromStorage(CACHE_CONFIG.DELIVERY_USERS_KEY);
      if (expiredCache && Array.isArray(expiredCache)) {
        console.log('Delivery users cache: Using expired cache as fallback');
        return expiredCache;
      }
      
      throw error;
    } finally {
      memoryCache.loading = false;
      memoryCache.loadingPromise = null;
    }
  })();

  return memoryCache.loadingPromise;
};

/**
 * Invalidate cache (clear both memory and localStorage)
 */
export const invalidateDeliveryUsersCache = () => {
  console.log('Delivery users cache: Invalidating cache');
  
  // Clear memory cache
  memoryCache.data = null;
  memoryCache.timestamp = null;
  memoryCache.loading = false;
  memoryCache.loadingPromise = null;
  
  // Clear localStorage cache
  localStorage.removeItem(CACHE_CONFIG.DELIVERY_USERS_KEY);
  localStorage.removeItem(CACHE_CONFIG.TIMESTAMP_KEY);
};

/**
 * Update a single delivery user in cache
 */
export const updateDeliveryUserInCache = (userId, updatedUser) => {
  try {
    // Update memory cache
    if (memoryCache.data && Array.isArray(memoryCache.data)) {
      memoryCache.data = memoryCache.data.map(user => 
        user.id === userId ? { ...user, ...updatedUser } : user
      );
    }
    
    // Update localStorage cache
    const cachedData = getFromStorage(CACHE_CONFIG.DELIVERY_USERS_KEY);
    if (cachedData && Array.isArray(cachedData)) {
      const updatedData = cachedData.map(user => 
        user.id === userId ? { ...user, ...updatedUser } : user
      );
      storeInStorage(CACHE_CONFIG.DELIVERY_USERS_KEY, updatedData);
    }
    
    console.log(`Delivery users cache: Updated user ${userId} in cache`);
    return true;
  } catch (error) {
    console.error('Delivery users cache: Failed to update user in cache:', error);
    return false;
  }
};

/**
 * Add a new delivery user to cache
 */
export const addDeliveryUserToCache = (newUser) => {
  try {
    // Update memory cache
    if (memoryCache.data && Array.isArray(memoryCache.data)) {
      memoryCache.data = [newUser, ...memoryCache.data];
    }
    
    // Update localStorage cache
    const cachedData = getFromStorage(CACHE_CONFIG.DELIVERY_USERS_KEY);
    if (cachedData && Array.isArray(cachedData)) {
      const updatedData = [newUser, ...cachedData];
      storeInStorage(CACHE_CONFIG.DELIVERY_USERS_KEY, updatedData);
    }
    
    console.log(`Delivery users cache: Added new user ${newUser.id} to cache`);
    return true;
  } catch (error) {
    console.error('Delivery users cache: Failed to add user to cache:', error);
    return false;
  }
};

/**
 * Remove a delivery user from cache
 */
export const removeDeliveryUserFromCache = (userId) => {
  try {
    // Update memory cache
    if (memoryCache.data && Array.isArray(memoryCache.data)) {
      memoryCache.data = memoryCache.data.filter(user => user.id !== userId);
    }
    
    // Update localStorage cache
    const cachedData = getFromStorage(CACHE_CONFIG.DELIVERY_USERS_KEY);
    if (cachedData && Array.isArray(cachedData)) {
      const updatedData = cachedData.filter(user => user.id !== userId);
      storeInStorage(CACHE_CONFIG.DELIVERY_USERS_KEY, updatedData);
    }
    
    console.log(`Delivery users cache: Removed user ${userId} from cache`);
    return true;
  } catch (error) {
    console.error('Delivery users cache: Failed to remove user from cache:', error);
    return false;
  }
};

/**
 * Get cache statistics
 */
export const getDeliveryUsersCacheStats = () => {
  const memorySize = memoryCache.data ? memoryCache.data.length : 0;
  const memoryValid = isCacheValid(memoryCache.timestamp);
  
  const localStorageData = getFromStorage(CACHE_CONFIG.DELIVERY_USERS_KEY);
  const localStorageTimestamp = getFromStorage(CACHE_CONFIG.TIMESTAMP_KEY);
  const localStorageSize = localStorageData ? localStorageData.length : 0;
  const localStorageValid = isCacheValid(localStorageTimestamp);
  
  return {
    memory: {
      size: memorySize,
      valid: memoryValid,
      timestamp: memoryCache.timestamp,
      loading: memoryCache.loading
    },
    localStorage: {
      size: localStorageSize,
      valid: localStorageValid,
      timestamp: localStorageTimestamp
    },
    config: CACHE_CONFIG
  };
};

/**
 * Preload delivery users cache (useful for app initialization)
 */
export const preloadDeliveryUsersCache = async () => {
  try {
    console.log('Delivery users cache: Preloading cache...');
    await getDeliveryUsers();
    console.log('Delivery users cache: Preload completed');
    return true;
  } catch (error) {
    console.error('Delivery users cache: Preload failed:', error);
    return false;
  }
};
