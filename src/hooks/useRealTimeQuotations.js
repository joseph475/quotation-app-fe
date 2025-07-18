import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { useAuth } from '../contexts/AuthContext';
import useDataLoader from './useDataLoader';
import { useRealTimeSync, pollingSync } from '../utils/realTimeSync';
import api from '../services/api';

/**
 * Custom hook for real-time quotations data
 * Combines the existing data loader with real-time updates
 * 
 * @param {Object} options - Configuration options
 * @returns {Object} - { data, loading, error, refresh, isStale, connectionStatus }
 */
const useRealTimeQuotations = (options = {}) => {
  const {
    cacheTimeout = 5 * 60 * 1000, // 5 minutes cache (increased from 2 minutes)
    enableRealTime = true, // Enable real-time but with better throttling
    fallbackToPolling = false, // Completely disable polling
    pollingInterval = 60000 // 60 seconds (increased from 30)
  } = options;

  const { user } = useAuth();
  const realTimeSync = useRealTimeSync();
  
  // State for connection status
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [updateCount, setUpdateCount] = useState(0);

  // Generate cache key based on user role and ID
  const userRole = user?.role || user?.data?.role || 'guest';
  const userId = user?._id || user?.data?._id || 'anonymous';
  const cacheKey = `quotations-${userRole}-${userId}`;

  // Use the existing data loader
  const {
    data,
    loading,
    error,
    refresh: refreshQuotations,
    isStale,
    loadData
  } = useDataLoader(cacheKey, api.quotations.getAll, {
    cacheTimeout,
    autoLoad: true
  });

  // Throttle function to prevent too many rapid updates
  const throttleRef = useRef(null);
  
  // Handle real-time quotation events with aggressive throttling
  const handleQuotationEvent = useCallback((eventData) => {
    console.log('Received quotation event:', eventData);
    
    // Update counters immediately
    setLastUpdateTime(new Date());
    setUpdateCount(prev => prev + 1);
    
    // Aggressive throttle: wait 5 seconds before refreshing to batch multiple updates
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
    }
    
    throttleRef.current = setTimeout(() => {
      console.log('Refreshing quotations after throttle delay...');
      refreshQuotations();
    }, 2000); // Wait 2 seconds before refreshing (reduced from 5s for better real-time feel)
  }, [refreshQuotations]);

  // Handle connection status changes
  const handleConnectionChange = useCallback((statusData) => {
    console.log('Connection status changed:', statusData);
    setConnectionStatus(statusData.status);
  }, []);

  // Setup real-time listeners
  useEffect(() => {
    if (!enableRealTime || !user) return;

    console.log('Setting up real-time quotations listeners...');

    // Add event listeners for quotation events
    const unsubscribeCreated = realTimeSync.addEventListener('quotation_created', handleQuotationEvent);
    const unsubscribeUpdated = realTimeSync.addEventListener('quotation_updated', handleQuotationEvent);
    const unsubscribeStatusChanged = realTimeSync.addEventListener('quotation_status_changed', handleQuotationEvent);
    const unsubscribeConnection = realTimeSync.addEventListener('connection', handleConnectionChange);

    // Try to connect to WebSocket
    realTimeSync.connect();

    // Setup fallback polling if enabled
    let pollingUnsubscribe = null;
    if (fallbackToPolling) {
      // Start polling as fallback
      pollingSync.startPolling('quotations', pollingInterval);
      
      // Listen for polling updates
      pollingUnsubscribe = pollingSync.addEventListener('quotations_updated', handleQuotationEvent);
      
      // Stop polling if WebSocket connects successfully
      const checkConnection = setInterval(() => {
        const status = realTimeSync.getStatus();
        if (status.isConnected) {
          console.log('WebSocket connected, stopping fallback polling');
          pollingSync.stopPolling('quotations');
          clearInterval(checkConnection);
        }
      }, 5000);

      // Cleanup interval on unmount
      return () => {
        clearInterval(checkConnection);
      };
    }

    // Cleanup function
    return () => {
      console.log('Cleaning up real-time quotations listeners...');
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeStatusChanged();
      unsubscribeConnection();
      
      if (pollingUnsubscribe) {
        pollingUnsubscribe();
      }
      
      if (fallbackToPolling) {
        pollingSync.stopPolling('quotations');
      }
    };
  }, [enableRealTime, user, handleQuotationEvent, handleConnectionChange, fallbackToPolling, pollingInterval, realTimeSync]);

  // Enhanced refresh function that also updates real-time status
  const refresh = useCallback(async () => {
    try {
      const result = await refreshQuotations();
      setLastUpdateTime(new Date());
      return result;
    } catch (error) {
      console.error('Error refreshing quotations:', error);
      throw error;
    }
  }, [refreshQuotations]);

  // Force reconnect function with safety checks
  const reconnect = useCallback(() => {
    console.log('Forcing real-time reconnection...');
    const status = realTimeSync.getStatus();
    
    // Don't reconnect if already connected or if we've hit max attempts
    if (status.isConnected) {
      console.log('Already connected, skipping reconnect');
      return;
    }
    
    if (status.reconnectAttempts >= 5) {
      console.log('Max reconnect attempts reached, not forcing reconnection');
      return;
    }
    
    realTimeSync.disconnect();
    setTimeout(() => {
      const currentStatus = realTimeSync.getStatus();
      if (!currentStatus.isConnected) {
        realTimeSync.connect();
      }
    }, 1000);
  }, [realTimeSync]);

  // Get detailed status information
  const getDetailedStatus = useCallback(() => {
    const rtStatus = realTimeSync.getStatus();
    return {
      connectionStatus,
      isConnected: rtStatus.isConnected,
      connectionId: rtStatus.connectionId,
      reconnectAttempts: rtStatus.reconnectAttempts,
      lastUpdateTime,
      updateCount,
      enableRealTime,
      fallbackToPolling
    };
  }, [connectionStatus, lastUpdateTime, updateCount, enableRealTime, fallbackToPolling, realTimeSync]);

  return {
    data,
    loading,
    error,
    refresh,
    isStale,
    loadData,
    connectionStatus,
    lastUpdateTime,
    updateCount,
    reconnect,
    getDetailedStatus
  };
};

export default useRealTimeQuotations;
