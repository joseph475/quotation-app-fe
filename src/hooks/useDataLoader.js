import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { getFromStorage, storeInStorage } from '../utils/localStorageHelpers';
import { deduplicateRequest } from '../utils/requestDeduplication';
import api from '../services/api';

/**
 * Custom hook for lazy loading and caching data
 * 
 * @param {string} key - Storage key for the data
 * @param {Function} fetchFunction - API function to fetch data
 * @param {Object} options - Configuration options
 * @returns {Object} - { data, loading, error, refresh, isStale }
 */
const useDataLoader = (key, fetchFunction, options = {}) => {
  const {
    cacheTimeout = 5 * 60 * 1000, // 5 minutes default
    autoLoad = true,
    dependencies = []
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);
  
  // Add throttling to prevent excessive updates
  const updateThrottleRef = useRef(null);
  const lastUpdateRef = useRef(0);

  // Check if cached data is stale
  const isCacheStale = useCallback((timestamp) => {
    if (!timestamp || !cacheTimeout) return false;
    return Date.now() - timestamp > cacheTimeout;
  }, [cacheTimeout]);

  // Load data from cache or API
  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Try to get from cache first
      const cachedData = getFromStorage(key);
      const cacheTimestamp = getFromStorage(`${key}_timestamp`);
      
      const shouldUseCached = !forceRefresh && 
                             cachedData && 
                             cacheTimestamp && 
                             !isCacheStale(cacheTimestamp);

      if (shouldUseCached) {
        setData(cachedData);
        setIsStale(false);
        setLoading(false);
        return cachedData;
      }

      // Mark as stale if we have old data
      if (cachedData && isCacheStale(cacheTimestamp)) {
        setIsStale(true);
      }

      // Fetch from API with deduplication (bypass deduplication for force refresh)
      console.log(`Fetching fresh data for ${key}...`);
      const response = forceRefresh 
        ? await fetchFunction()
        : await deduplicateRequest(`dataloader-${key}`, fetchFunction);

      if (response && response.success) {
        const freshData = response.data || [];
        
        // Update cache
        storeInStorage(key, freshData);
        storeInStorage(`${key}_timestamp`, Date.now());
        
        setData(freshData);
        setIsStale(false);
        setError(null);
        
        return freshData;
      } else {
        throw new Error(response?.message || `Failed to fetch ${key}`);
      }
    } catch (err) {
      console.error(`Error loading ${key}:`, err);
      setError(err.message);
      
      // If we have cached data, use it even if stale
      const cachedData = getFromStorage(key);
      if (cachedData) {
        setData(cachedData);
        setIsStale(true);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [key, fetchFunction, isCacheStale]);

  // Refresh data with throttling
  const refresh = useCallback(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    
    // Throttle refresh calls to prevent excessive updates (minimum 1 second between calls)
    if (timeSinceLastUpdate < 1000) {
      console.log(`Throttling refresh for ${key}, last update was ${timeSinceLastUpdate}ms ago`);
      
      // Clear existing timeout and set a new one
      if (updateThrottleRef.current) {
        clearTimeout(updateThrottleRef.current);
      }
      
      return new Promise((resolve) => {
        updateThrottleRef.current = setTimeout(() => {
          lastUpdateRef.current = Date.now();
          resolve(loadData(true));
        }, 1000 - timeSinceLastUpdate);
      });
    }
    
    lastUpdateRef.current = now;
    return loadData(true);
  }, [loadData, key]);

  // Auto-load on mount and dependency changes
  useEffect(() => {
    if (autoLoad) {
      loadData();
    }
  }, [autoLoad, loadData, ...dependencies]);

  return {
    data,
    loading,
    error,
    refresh,
    isStale,
    loadData
  };
};

export default useDataLoader;
