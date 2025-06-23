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
  }

  /**
   * Initialize WebSocket connection
   */
  connect() {
    // WebSocket is now supported in production with proper hosting platforms
    const isProduction = process.env.NODE_ENV === 'production';

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      console.log('No auth token available, skipping WebSocket connection');
      return;
    }

    try {
      // Use appropriate WebSocket URL based on environment
      const wsUrl = isProduction 
        ? 'wss://your-backend-url.railway.app/ws'  // Replace with your actual backend URL
        : 'ws://localhost:8000/ws';

      console.log('Connecting to WebSocket:', wsUrl);
      
      this.ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket connection open
   */
  handleOpen(event) {
    console.log('WebSocket connected successfully');
    this.isConnected = true;
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
    this.stopHeartbeat();
    
    // Notify listeners about disconnection
    this.notifyListeners('connection', { status: 'disconnected' });
    
    // Attempt to reconnect if not a clean close
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket errors
   */
  handleError(error) {
    console.log('WebSocket not available, will use polling fallback');
    this.isConnected = false;
    this.notifyListeners('connection', { status: 'polling_fallback' });
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isConnected) {
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
    console.log('Quotation status changed:', data);
    
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
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.connectionId = null;
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      connectionId: this.connectionId,
      reconnectAttempts: this.reconnectAttempts
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
