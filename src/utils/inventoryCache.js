/**
 * Inventory Cache Management System
 * 
 * This module provides centralized inventory caching to improve performance
 * across the application, especially for quotation forms where inventory
 * search is frequently used.
 */

import api from '../services/api';
import { storeInStorage, getFromStorage } from './localStorageHelpers';

// Cache configuration
const CACHE_CONFIG = {
  INVENTORY_KEY: 'inventory_cache',
  TIMESTAMP_KEY: 'inventory_cache_timestamp',
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes in milliseconds
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
 * Get inventory items from cache (memory first, then localStorage)
 */
export const getCachedInventory = () => {
  // Check memory cache first
  if (memoryCache.data && isCacheValid(memoryCache.timestamp)) {
    console.log('Inventory cache: Using memory cache');
    return memoryCache.data;
  }

  // Check localStorage cache
  const cachedData = getFromStorage(CACHE_CONFIG.INVENTORY_KEY);
  const cachedTimestamp = getFromStorage(CACHE_CONFIG.TIMESTAMP_KEY);

  if (cachedData && isCacheValid(cachedTimestamp)) {
    console.log('Inventory cache: Using localStorage cache');
    // Update memory cache
    memoryCache.data = cachedData;
    memoryCache.timestamp = cachedTimestamp;
    return cachedData;
  }

  console.log('Inventory cache: No valid cache found');
  return null;
};

/**
 * Store inventory data in cache (both memory and localStorage)
 */
const setCachedInventory = (data) => {
  const timestamp = Date.now();
  
  // Update memory cache
  memoryCache.data = data;
  memoryCache.timestamp = timestamp;
  
  // Update localStorage cache
  storeInStorage(CACHE_CONFIG.INVENTORY_KEY, data);
  storeInStorage(CACHE_CONFIG.TIMESTAMP_KEY, timestamp);
  
  console.log(`Inventory cache: Cached ${data.length} items`);
};

/**
 * Fetch inventory data from API with retry logic
 */
const fetchInventoryFromAPI = async (retryCount = 0) => {
  try {
    console.log(`Inventory cache: Fetching from API (attempt ${retryCount + 1})`);
    
    const response = await api.inventory.getAll({ 
      limit: 10000, // Large limit to get all items
      sort: 'name' // Sort by name for better UX
    });
    
    if (response && response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response?.message || 'Failed to fetch inventory items');
    }
  } catch (error) {
    console.error(`Inventory cache: API fetch failed (attempt ${retryCount + 1}):`, error);
    
    // Retry logic
    if (retryCount < CACHE_CONFIG.MAX_RETRIES - 1) {
      console.log(`Inventory cache: Retrying in ${CACHE_CONFIG.RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, CACHE_CONFIG.RETRY_DELAY));
      return fetchInventoryFromAPI(retryCount + 1);
    }
    
    throw error;
  }
};

/**
 * Get inventory items (from cache or API)
 * This is the main function that should be used throughout the app
 */
export const getInventoryItems = async (forceRefresh = false) => {
  // If already loading, return the existing promise
  if (memoryCache.loading && memoryCache.loadingPromise) {
    console.log('Inventory cache: Already loading, waiting for existing request');
    return memoryCache.loadingPromise;
  }

  // Check cache first (unless force refresh is requested)
  if (!forceRefresh) {
    const cachedData = getCachedInventory();
    if (cachedData) {
      return cachedData;
    }
  }

  // Set loading state
  memoryCache.loading = true;
  
  // Create loading promise
  memoryCache.loadingPromise = (async () => {
    try {
      const data = await fetchInventoryFromAPI();
      setCachedInventory(data);
      return data;
    } catch (error) {
      console.error('Inventory cache: Failed to fetch inventory:', error);
      
      // If we have expired cache data, return it as fallback
      const expiredCache = getFromStorage(CACHE_CONFIG.INVENTORY_KEY);
      if (expiredCache && Array.isArray(expiredCache)) {
        console.log('Inventory cache: Using expired cache as fallback');
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
 * Search inventory items with caching
 */
export const searchInventoryItems = async (searchTerm, forceRefresh = false) => {
  try {
    const allItems = await getInventoryItems(forceRefresh);
    
    if (!searchTerm || searchTerm.trim() === '') {
      return allItems;
    }
    
    const query = searchTerm.toLowerCase();
    return allItems.filter(item => {
      const nameMatch = item.name?.toLowerCase().includes(query);
      const itemcodeMatch = item.itemcode?.toString().includes(query);
      const barcodeMatch = item.barcode?.toLowerCase().includes(query);
      
      return nameMatch || itemcodeMatch || barcodeMatch;
    });
  } catch (error) {
    console.error('Inventory cache: Search failed:', error);
    return [];
  }
};

/**
 * Invalidate cache (clear both memory and localStorage)
 */
export const invalidateInventoryCache = () => {
  console.log('Inventory cache: Invalidating cache');
  
  // Clear memory cache
  memoryCache.data = null;
  memoryCache.timestamp = null;
  memoryCache.loading = false;
  memoryCache.loadingPromise = null;
  
  // Clear localStorage cache
  localStorage.removeItem(CACHE_CONFIG.INVENTORY_KEY);
  localStorage.removeItem(CACHE_CONFIG.TIMESTAMP_KEY);
};

/**
 * Update a single item in cache
 */
export const updateInventoryItemInCache = (itemId, updatedItem) => {
  try {
    // Update memory cache
    if (memoryCache.data && Array.isArray(memoryCache.data)) {
      memoryCache.data = memoryCache.data.map(item => 
        item._id === itemId ? { ...item, ...updatedItem } : item
      );
    }
    
    // Update localStorage cache
    const cachedData = getFromStorage(CACHE_CONFIG.INVENTORY_KEY);
    if (cachedData && Array.isArray(cachedData)) {
      const updatedData = cachedData.map(item => 
        item._id === itemId ? { ...item, ...updatedItem } : item
      );
      storeInStorage(CACHE_CONFIG.INVENTORY_KEY, updatedData);
    }
    
    console.log(`Inventory cache: Updated item ${itemId} in cache`);
    return true;
  } catch (error) {
    console.error('Inventory cache: Failed to update item in cache:', error);
    return false;
  }
};

/**
 * Add a new item to cache
 */
export const addInventoryItemToCache = (newItem) => {
  try {
    // Update memory cache
    if (memoryCache.data && Array.isArray(memoryCache.data)) {
      memoryCache.data = [newItem, ...memoryCache.data];
    }
    
    // Update localStorage cache
    const cachedData = getFromStorage(CACHE_CONFIG.INVENTORY_KEY);
    if (cachedData && Array.isArray(cachedData)) {
      const updatedData = [newItem, ...cachedData];
      storeInStorage(CACHE_CONFIG.INVENTORY_KEY, updatedData);
    }
    
    console.log(`Inventory cache: Added new item ${newItem._id} to cache`);
    return true;
  } catch (error) {
    console.error('Inventory cache: Failed to add item to cache:', error);
    return false;
  }
};

/**
 * Remove an item from cache
 */
export const removeInventoryItemFromCache = (itemId) => {
  try {
    // Update memory cache
    if (memoryCache.data && Array.isArray(memoryCache.data)) {
      memoryCache.data = memoryCache.data.filter(item => item._id !== itemId);
    }
    
    // Update localStorage cache
    const cachedData = getFromStorage(CACHE_CONFIG.INVENTORY_KEY);
    if (cachedData && Array.isArray(cachedData)) {
      const updatedData = cachedData.filter(item => item._id !== itemId);
      storeInStorage(CACHE_CONFIG.INVENTORY_KEY, updatedData);
    }
    
    console.log(`Inventory cache: Removed item ${itemId} from cache`);
    return true;
  } catch (error) {
    console.error('Inventory cache: Failed to remove item from cache:', error);
    return false;
  }
};

/**
 * Get cache statistics
 */
export const getInventoryCacheStats = () => {
  const memorySize = memoryCache.data ? memoryCache.data.length : 0;
  const memoryValid = isCacheValid(memoryCache.timestamp);
  
  const localStorageData = getFromStorage(CACHE_CONFIG.INVENTORY_KEY);
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
 * Preload inventory cache (useful for app initialization)
 */
export const preloadInventoryCache = async () => {
  try {
    console.log('Inventory cache: Preloading cache...');
    await getInventoryItems();
    console.log('Inventory cache: Preload completed');
    return true;
  } catch (error) {
    console.error('Inventory cache: Preload failed:', error);
    return false;
  }
};
