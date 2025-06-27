/**
 * Real-time Data Synchronization Utilities
 * 
 * This module provides real-time data synchronization using WebSocket connections
 * to keep data updated across all users without requiring page refreshes.
 */

import api from '../services/api';
import { getAuthToken } from './authHelpers';
import { clearAllQuotationCaches } from './dataSync';

class RealTimeSync {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.listeners = new Map();
    this.isConnected = false;
    this.heartbeatInterval = null;
    this.connectionId = null;
    this.isConnecting = false; // Prevent multiple simultaneous connections
    this.lastEventTimestamps = new Map(); // Track event timestamps for deduplication
    this.reconnectTimeout = null; // Track reconnection timeout
    this.lastDisconnectTime = null; // Track when we last disconnected
    this.minReconnectInterval = 5000; // Minimum 5 seconds between reconnection attempts
    this.isDestroyed = false; // Flag to prevent reconnection after cleanup
    this.connectionAttemptCount = 0; // Track total connection attempts
    this.maxConnectionAttempts = 10; // Maximum total connection attempts before giving up
  }

  /**
   * Initialize WebSocket connection
   */
  connect() {
    // Check if we've been destroyed or hit max attempts
    if (this.isDestroyed) {
      console.log('RealTimeSync has been destroyed, skipping connection');
      return;
    }

    if (this.connectionAttemptCount >= this.maxConnectionAttempts) {
      console.log('Maximum connection attempts reached, giving up permanently');
      this.notifyListeners('connection', { status: 'permanently_failed' });
      return;
    }

    // Enforce minimum interval between reconnection attempts
    const now = Date.now();
    if (this.lastDisconnectTime && (now - this.lastDisconnectTime) < this.minReconnectInterval) {
      console.log('Too soon to reconnect, waiting...');
      return;
    }

    // Enable WebSocket in both development and production
    const isProduction = process.env.NODE_ENV === 'production';

    // Prevent multiple simultaneous connections
    if (this.isConnecting) {
      console.log('WebSocket connection already in progress');
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    // Close any existing connection before creating a new one
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      console.log('Closing existing WebSocket connection before reconnecting');
      this.ws.close();
      this.ws = null;
    }

    const token = getAuthToken();
    if (!token) {
      console.log('No auth token available, skipping WebSocket connection');
      return;
    }

    this.isConnecting = true;
    this.connectionAttemptCount++;

    try {
      // Use appropriate WebSocket URL based on environment
      let wsUrl;
      if (isProduction) {
        // In production, use the Railway backend URL
        // Get the API URL and replace http/https with ws/wss
        const apiUrl = process.env.REACT_APP_API_URL || '';
        if (apiUrl) {
          // Extract the base URL from API URL (remove /api/v1)
          const baseUrl = apiUrl.replace('/api/v1', '');
          wsUrl = baseUrl.replace(/^https?:/, baseUrl.startsWith('https:') ? 'wss:' : 'ws:') + '/ws';
        } else {
          // Fallback: use current host with wss
          const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${wsProtocol}//${window.location.host}/ws`;
        }
      } else {
        // For local development, try to use the same host as the current page
        // This allows WebSocket to work when accessing from mobile devices
        const currentHost = window.location.hostname;
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${wsProtocol}//${currentHost}:8000/ws`;
      }

      console.log('Connecting to WebSocket:', wsUrl);
      
      this.ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket connection open
   */
  handleOpen(event) {
    console.log('WebSocket connected successfully');
    this.isConnected = true;
    this.isConnecting = false; // Reset connecting flag
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    
    // Start heartbeat to keep connection alive
    this.startHeartbeat();
    
    // Notify listeners about connection
    this.notifyListeners('connection', { status: 'connected' });
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      console.log('Received WebSocket message:', message);
      
      switch (message.type) {
        case 'quotation_created':
          this.handleQuotationCreated(message.data);
          break;
        case 'quotation_updated':
          this.handleQuotationUpdated(message.data);
          break;
        case 'quotation_status_changed':
          this.handleQuotationStatusChanged(message.data);
          break;
        case 'heartbeat':
          // Respond to server heartbeat
          this.sendMessage({ type: 'heartbeat_response' });
          break;
        case 'connection_id':
          this.connectionId = message.data.connectionId;
          console.log('Received connection ID:', this.connectionId);
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket connection close
   */
  handleClose(event) {
    console.log('WebSocket connection closed:', event.code, event.reason);
    this.isConnected = false;
    this.isConnecting = false; // Reset connecting flag
    this.lastDisconnectTime = Date.now(); // Track disconnect time
    this.stopHeartbeat();
    
    // Notify listeners about disconnection
    this.notifyListeners('connection', { status: 'disconnected' });
    
    // Attempt to reconnect if not a clean close and not destroyed
    if (event.code !== 1000 && !this.isDestroyed) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket errors
   */
  handleError(error) {
    console.log('WebSocket not available, will use polling fallback');
    this.isConnected = false;
    this.isConnecting = false; // Reset connecting flag
    this.lastDisconnectTime = Date.now(); // Track disconnect time
    this.notifyListeners('connection', { status: 'polling_fallback' });
  }

  /**
   * Schedule reconnection attempt with improved safeguards
   */
  scheduleReconnect() {
    // Check if we should stop trying
    if (this.isDestroyed) {
      console.log('RealTimeSync destroyed, cancelling reconnection');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached, giving up');
      this.notifyListeners('connection', { status: 'failed' });
      return;
    }

    if (this.connectionAttemptCount >= this.maxConnectionAttempts) {
      console.log('Max total connection attempts reached, giving up permanently');
      this.notifyListeners('connection', { status: 'permanently_failed' });
      return;
    }

    // Prevent multiple reconnection attempts
    if (this.isConnecting || this.reconnectTimeout) {
      console.log('Reconnection already scheduled or in progress, skipping');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000); // Cap at 30 seconds
    
    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null; // Clear timeout reference
      
      // Double-check we're not already connected or connecting and not destroyed
      if (!this.isConnected && !this.isConnecting && !this.isDestroyed) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
        this.sendMessage({ type: 'heartbeat' });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send message through WebSocket
   */
  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  }

  /**
   * Handle quotation created event
   */
  handleQuotationCreated(data) {
    console.log('New quotation created:', data);
    
    // Clear quotation caches to force refresh
    clearAllQuotationCaches();
    
    // Notify listeners
    this.notifyListeners('quotation_created', data);
  }

  /**
   * Handle quotation updated event
   */
  handleQuotationUpdated(data) {
    console.log('Quotation updated:', data);
    
    // Clear quotation caches to force refresh
    clearAllQuotationCaches();
    
    // Notify listeners
    this.notifyListeners('quotation_updated', data);
  }

  /**
   * Handle quotation status changed event
   */
  handleQuotationStatusChanged(data) {
    console.log('RealTimeSync: Quotation status changed:', data);
    console.log('RealTimeSync: Number of listeners for quotation_status_changed:', this.listeners.get('quotation_status_changed')?.size || 0);
    
    // Clear quotation caches to force refresh
    clearAllQuotationCaches();
    
    // Notify listeners
    this.notifyListeners('quotation_status_changed', data);
  }

  /**
   * Add event listener
   */
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
      }
    };
  }

  /**
   * Remove event listener
   */
  removeEventListener(event, callback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  /**
   * Notify all listeners for an event
   */
  notifyListeners(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    console.log('Disconnecting WebSocket...');
    this.stopHeartbeat();
    
    // Clear any pending reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionId = null;
  }

  /**
   * Destroy the WebSocket connection and prevent reconnection
   */
  destroy() {
    console.log('Destroying RealTimeSync...');
    this.isDestroyed = true;
    this.disconnect();
    
    // Clear all listeners
    this.listeners.clear();
    
    // Reset counters
    this.reconnectAttempts = 0;
    this.connectionAttemptCount = 0;
  }

  /**
   * Reset connection attempts (useful for manual reconnection)
   */
  resetConnectionAttempts() {
    console.log('Resetting connection attempts');
    this.reconnectAttempts = 0;
    this.connectionAttemptCount = 0;
    this.isDestroyed = false;
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      connectionId: this.connectionId,
      reconnectAttempts: this.reconnectAttempts,
      connectionAttemptCount: this.connectionAttemptCount,
      isDestroyed: this.isDestroyed,
      lastDisconnectTime: this.lastDisconnectTime
    };
  }
}

// Create singleton instance
const realTimeSync = new RealTimeSync();

// Auto-connect when module is loaded (if token is available)
if (typeof window !== 'undefined') {
  // Connect after a short delay to ensure auth context is ready
  setTimeout(() => {
    const token = getAuthToken();
    if (token) {
      realTimeSync.connect();
    }
  }, 1000);
}

export default realTimeSync;

/**
 * Hook for using real-time sync in components
 */
export const useRealTimeSync = () => {
  return {
    connect: () => realTimeSync.connect(),
    disconnect: () => realTimeSync.disconnect(),
    destroy: () => realTimeSync.destroy(),
    resetConnectionAttempts: () => realTimeSync.resetConnectionAttempts(),
    addEventListener: (event, callback) => realTimeSync.addEventListener(event, callback),
    removeEventListener: (event, callback) => realTimeSync.removeEventListener(event, callback),
    getStatus: () => realTimeSync.getStatus(),
    sendMessage: (message) => realTimeSync.sendMessage(message)
  };
};

/**
 * Fallback polling mechanism for when WebSocket is not available
 */
export class PollingSync {
  constructor() {
    this.intervals = new Map();
    this.listeners = new Map();
    this.throttleTimers = new Map(); // Add throttle timers
  }

  /**
   * Start polling for a specific data type
   */
  startPolling(dataType, interval = 30000) { // 30 seconds default
    if (this.intervals.has(dataType)) {
      console.log(`Polling already active for ${dataType}`);
      return;
    }

    console.log(`Starting polling for ${dataType} every ${interval}ms`);
    
    const intervalId = setInterval(async () => {
      try {
        await this.checkForUpdates(dataType);
      } catch (error) {
        console.error(`Error polling ${dataType}:`, error);
      }
    }, interval);

    this.intervals.set(dataType, intervalId);
  }

  /**
   * Stop polling for a specific data type
   */
  stopPolling(dataType) {
    const intervalId = this.intervals.get(dataType);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(dataType);
      console.log(`Stopped polling for ${dataType}`);
    }
  }

  /**
   * Check for updates by comparing with cached data
   */
  async checkForUpdates(dataType) {
    try {
      let apiCall;
      switch (dataType) {
        case 'quotations':
          apiCall = api.quotations.getAll;
          break;
        default:
          return;
      }

      const response = await apiCall();
      if (response && response.success) {
        // Compare with cached data to detect changes
        const cachedData = localStorage.getItem(`${dataType}-polling-cache`);
        const currentDataHash = this.hashData(response.data);
        
        if (cachedData !== currentDataHash) {
          console.log(`Detected changes in ${dataType}`);
          localStorage.setItem(`${dataType}-polling-cache`, currentDataHash);
          
          // Clear caches to force refresh
          if (dataType === 'quotations') {
            clearAllQuotationCaches();
          }
          
          // Notify listeners
          this.notifyListeners(`${dataType}_updated`, response.data);
        }
      }
    } catch (error) {
      console.error(`Error checking updates for ${dataType}:`, error);
    }
  }

  /**
   * Simple hash function for data comparison
   */
  hashData(data) {
    return JSON.stringify(data).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0).toString();
  }

  /**
   * Add event listener
   */
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
      }
    };
  }

  /**
   * Notify listeners with throttling
   */
  notifyListeners(event, data) {
    // Throttle notifications to prevent excessive updates
    const throttleKey = `${event}_throttle`;
    
    if (this.throttleTimers.has(throttleKey)) {
      clearTimeout(this.throttleTimers.get(throttleKey));
    }
    
    this.throttleTimers.set(throttleKey, setTimeout(() => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error('Error in polling listener:', error);
          }
        });
      }
      this.throttleTimers.delete(throttleKey);
    }, 2000)); // Wait 2 seconds before notifying to batch updates
  }

  /**
   * Stop all polling
   */
  stopAll() {
    this.intervals.forEach((intervalId, dataType) => {
      clearInterval(intervalId);
      console.log(`Stopped polling for ${dataType}`);
    });
    this.intervals.clear();
  }
}

// Create polling sync instance
export const pollingSync = new PollingSync();
