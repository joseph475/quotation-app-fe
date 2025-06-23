/**
 * Data Synchronization Utilities
 * 
 * This module provides centralized functions to keep localStorage data
 * synchronized across all parts of the application when data is updated.
 */

import api from '../services/api';
import { storeInStorage, getFromStorage } from './localStorageHelpers';

/**
 * Refresh all data in localStorage from the API
 * This should be called after any major data changes
 */
export const refreshAllData = async () => {
  try {
    console.log('Refreshing all data from API...');
    
    // Fetch and store all data types
    const dataTypes = [
      { key: 'inventory', apiCall: api.inventory.getAll },
      { key: 'quotations', apiCall: api.quotations.getAll },
      { key: 'sales', apiCall: api.sales.getAll }
    ];
    
    const refreshPromises = dataTypes.map(async ({ key, apiCall }) => {
      try {
        const response = await apiCall();
        if (response && response.success) {
          storeInStorage(key, response.data || []);
          console.log(`Refreshed ${key} data in localStorage`);
        }
      } catch (error) {
        console.error(`Error refreshing ${key} data:`, error);
      }
    });
    
    await Promise.all(refreshPromises);
    console.log('All data refreshed successfully');
    
    return true;
  } catch (error) {
    console.error('Error refreshing all data:', error);
    return false;
  }
};

/**
 * Refresh specific data type in localStorage
 */
export const refreshDataType = async (dataType) => {
  try {
    console.log(`Refreshing ${dataType} data...`);
    
    let apiCall;
    switch (dataType) {
      case 'inventory':
        apiCall = api.inventory.getAll;
        break;
      case 'quotations':
        apiCall = api.quotations.getAll;
        break;
      case 'sales':
        apiCall = api.sales.getAll;
        break;
      default:
        console.warn(`Unknown data type: ${dataType}`);
        return false;
    }
    
    const response = await apiCall();
    if (response && response.success) {
      storeInStorage(dataType, response.data || []);
      console.log(`Refreshed ${dataType} data in localStorage`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error refreshing ${dataType} data:`, error);
    return false;
  }
};

/**
 * Update a specific item in localStorage without full refresh
 */
export const updateItemInStorage = (dataType, itemId, updatedItem) => {
  try {
    const storedData = getFromStorage(dataType);
    if (storedData && Array.isArray(storedData)) {
      const updatedData = storedData.map(item => 
        item._id === itemId ? { ...item, ...updatedItem } : item
      );
      storeInStorage(dataType, updatedData);
      console.log(`Updated ${dataType} item ${itemId} in localStorage`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error updating ${dataType} item in localStorage:`, error);
    return false;
  }
};

/**
 * Add a new item to localStorage
 */
export const addItemToStorage = (dataType, newItem) => {
  try {
    const storedData = getFromStorage(dataType) || [];
    const updatedData = [...storedData, newItem];
    storeInStorage(dataType, updatedData);
    console.log(`Added new ${dataType} item to localStorage`);
    return true;
  } catch (error) {
    console.error(`Error adding ${dataType} item to localStorage:`, error);
    return false;
  }
};

/**
 * Sync data after a quotation is converted to sale
 */
export const syncAfterQuotationConversion = async (quotationId, saleData) => {
  try {
    console.log('Syncing data after quotation conversion...');
    
    // Update quotation status in localStorage
    updateItemInStorage('quotations', quotationId, { status: 'Converted' });
    
    // Add new sale to localStorage
    if (saleData) {
      addItemToStorage('sales', saleData);
    }
    
    // Refresh quotations and sales to ensure consistency
    await Promise.all([
      refreshDataType('quotations'),
      refreshDataType('sales')
    ]);
    
    console.log('Data sync completed after quotation conversion');
    return true;
  } catch (error) {
    console.error('Error syncing data after quotation conversion:', error);
    return false;
  }
};


/**
 * Generic sync function for any data update
 */
export const syncAfterDataUpdate = async (dataTypes = []) => {
  try {
    console.log('Syncing data after update...', dataTypes);
    
    if (dataTypes.length === 0) {
      // If no specific types provided, refresh all data
      return await refreshAllData();
    }
    
    // Refresh specific data types
    const refreshPromises = dataTypes.map(dataType => refreshDataType(dataType));
    await Promise.all(refreshPromises);
    
    console.log('Data sync completed');
    return true;
  } catch (error) {
    console.error('Error syncing data after update:', error);
    return false;
  }
};

/**
 * Clear all quotation caches (for all users and roles)
 * This should be called when quotations are updated by admins
 */
export const clearAllQuotationCaches = () => {
  try {
    console.log('Clearing all quotation caches...');
    
    // Get all localStorage keys
    const keys = Object.keys(localStorage);
    
    // Find and remove all quotation-related cache keys
    const quotationKeys = keys.filter(key => 
      key.startsWith('quotations-') || 
      key.includes('quotations') && (key.includes('_timestamp') || key.includes('-admin-') || key.includes('-user-') || key.includes('-delivery-'))
    );
    
    quotationKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Removed cache key: ${key}`);
    });
    
    // Also clear session storage for quotation visits
    const sessionKeys = Object.keys(sessionStorage);
    const quotationSessionKeys = sessionKeys.filter(key => key.startsWith('quotations-visited-'));
    
    quotationSessionKeys.forEach(key => {
      sessionStorage.removeItem(key);
      console.log(`Removed session key: ${key}`);
    });
    
    console.log(`Cleared ${quotationKeys.length} cache keys and ${quotationSessionKeys.length} session keys`);
    return true;
  } catch (error) {
    console.error('Error clearing quotation caches:', error);
    return false;
  }
};

/**
 * Sync data after quotation status update (approval, rejection, etc.)
 */
export const syncAfterQuotationStatusUpdate = async (quotationId, updatedData) => {
  try {
    console.log('Syncing data after quotation status update...');
    
    // Clear all quotation caches to ensure all users see the update
    clearAllQuotationCaches();
    
    // Update the specific quotation in any remaining localStorage
    updateItemInStorage('quotations', quotationId, updatedData);
    
    console.log('Data sync completed after quotation status update');
    return true;
  } catch (error) {
    console.error('Error syncing data after quotation status update:', error);
    return false;
  }
};
