/**
 * Dashboard Cache Management System
 * 
 * This module provides centralized dashboard data caching to improve performance
 * and reduce API calls when loading dashboard statistics and data.
 */

import api from '../services/api';
import { storeInStorage, getFromStorage } from './localStorageHelpers';

// Cache configuration
const CACHE_CONFIG = {
  DASHBOARD_KEY: 'dashboard_cache',
  TIMESTAMP_KEY: 'dashboard_cache_timestamp',
  CACHE_DURATION: 2 * 60 * 1000, // 2 minutes in milliseconds (dashboard data changes more frequently)
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
 * Get dashboard data from cache (memory first, then localStorage)
 */
export const getCachedDashboardData = () => {
  // Check memory cache first
  if (memoryCache.data && isCacheValid(memoryCache.timestamp)) {
    console.log('Dashboard cache: Using memory cache');
    return memoryCache.data;
  }

  // Check localStorage cache
  const cachedData = getFromStorage(CACHE_CONFIG.DASHBOARD_KEY);
  const cachedTimestamp = getFromStorage(CACHE_CONFIG.TIMESTAMP_KEY);

  if (cachedData && isCacheValid(cachedTimestamp)) {
    console.log('Dashboard cache: Using localStorage cache');
    // Update memory cache
    memoryCache.data = cachedData;
    memoryCache.timestamp = cachedTimestamp;
    return cachedData;
  }

  console.log('Dashboard cache: No valid cache found');
  return null;
};

/**
 * Store dashboard data in cache (both memory and localStorage)
 */
const setCachedDashboardData = (data) => {
  const timestamp = Date.now();
  
  // Update memory cache
  memoryCache.data = data;
  memoryCache.timestamp = timestamp;
  
  // Update localStorage cache
  storeInStorage(CACHE_CONFIG.DASHBOARD_KEY, data);
  storeInStorage(CACHE_CONFIG.TIMESTAMP_KEY, timestamp);
  
  console.log('Dashboard cache: Cached dashboard data');
};

/**
 * Fetch dashboard data from API with retry logic
 */
const fetchDashboardDataFromAPI = async (retryCount = 0) => {
  try {
    console.log(`Dashboard cache: Fetching from API (attempt ${retryCount + 1})`);
    
    // Fetch all dashboard data in parallel
    const [summaryResponse, recentSalesResponse, topSellingResponse] = await Promise.all([
      api.dashboard.getSummary(),
      api.dashboard.getRecentSales(),
      api.dashboard.getTopSellingItems()
    ]);
    
    // Validate responses
    if (!summaryResponse?.success || !recentSalesResponse?.success || !topSellingResponse?.success) {
      throw new Error('One or more dashboard API calls failed');
    }
    
    return {
      summary: summaryResponse.data,
      recentSales: recentSalesResponse.data,
      topSellingItems: topSellingResponse.data
    };
  } catch (error) {
    console.error(`Dashboard cache: API fetch failed (attempt ${retryCount + 1}):`, error);
    
    // Retry logic
    if (retryCount < CACHE_CONFIG.MAX_RETRIES - 1) {
      console.log(`Dashboard cache: Retrying in ${CACHE_CONFIG.RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, CACHE_CONFIG.RETRY_DELAY));
      return fetchDashboardDataFromAPI(retryCount + 1);
    }
    
    throw error;
  }
};

/**
 * Get dashboard data (from cache or API)
 * This is the main function that should be used throughout the app
 */
export const getDashboardData = async (forceRefresh = false) => {
  // If already loading, return the existing promise
  if (memoryCache.loading && memoryCache.loadingPromise) {
    console.log('Dashboard cache: Already loading, waiting for existing request');
    return memoryCache.loadingPromise;
  }

  // Check cache first (unless force refresh is requested)
  if (!forceRefresh) {
    const cachedData = getCachedDashboardData();
    if (cachedData) {
      return cachedData;
    }
  }

  // Set loading state
  memoryCache.loading = true;
  
  // Create loading promise
  memoryCache.loadingPromise = (async () => {
    try {
      const data = await fetchDashboardDataFromAPI();
      setCachedDashboardData(data);
      return data;
    } catch (error) {
      console.error('Dashboard cache: Failed to fetch dashboard data:', error);
      
      // If we have expired cache data, return it as fallback
      const expiredCache = getFromStorage(CACHE_CONFIG.DASHBOARD_KEY);
      if (expiredCache && typeof expiredCache === 'object') {
        console.log('Dashboard cache: Using expired cache as fallback');
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
export const invalidateDashboardCache = () => {
  console.log('Dashboard cache: Invalidating cache');
  
  // Clear memory cache
  memoryCache.data = null;
  memoryCache.timestamp = null;
  memoryCache.loading = false;
  memoryCache.loadingPromise = null;
  
  // Clear localStorage cache
  localStorage.removeItem(CACHE_CONFIG.DASHBOARD_KEY);
  localStorage.removeItem(CACHE_CONFIG.TIMESTAMP_KEY);
};

/**
 * Get cache statistics
 */
export const getDashboardCacheStats = () => {
  const memoryValid = isCacheValid(memoryCache.timestamp);
  
  const localStorageData = getFromStorage(CACHE_CONFIG.DASHBOARD_KEY);
  const localStorageTimestamp = getFromStorage(CACHE_CONFIG.TIMESTAMP_KEY);
  const localStorageValid = isCacheValid(localStorageTimestamp);
  
  return {
    memory: {
      hasData: !!memoryCache.data,
      valid: memoryValid,
      timestamp: memoryCache.timestamp,
      loading: memoryCache.loading
    },
    localStorage: {
      hasData: !!localStorageData,
      valid: localStorageValid,
      timestamp: localStorageTimestamp
    },
    config: CACHE_CONFIG
  };
};

/**
 * Preload dashboard cache (useful for app initialization)
 */
export const preloadDashboardCache = async () => {
  try {
    console.log('Dashboard cache: Preloading cache...');
    await getDashboardData();
    console.log('Dashboard cache: Preload completed');
    return true;
  } catch (error) {
    console.error('Dashboard cache: Preload failed:', error);
    return false;
  }
};
