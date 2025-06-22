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
      { key: 'customers', apiCall: api.customers.getAll },
      { key: 'suppliers', apiCall: api.suppliers.getAll },
      { key: 'branches', apiCall: api.branches.getAll },
      { key: 'inventory', apiCall: api.inventory.getAll },
      { key: 'quotations', apiCall: api.quotations.getAll },
      { key: 'purchaseOrders', apiCall: api.purchaseOrders.getAll },
      { key: 'purchaseReceiving', apiCall: api.purchaseReceiving.getAll },
      { key: 'sales', apiCall: api.sales.getAll },
      { key: 'stockTransfers', apiCall: api.stockTransfers.getAll }
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
      case 'customers':
        apiCall = api.customers.getAll;
        break;
      case 'suppliers':
        apiCall = api.suppliers.getAll;
        break;
      case 'branches':
        apiCall = api.branches.getAll;
        break;
      case 'inventory':
        apiCall = api.inventory.getAll;
        break;
      case 'quotations':
        apiCall = api.quotations.getAll;
        break;
      case 'purchaseOrders':
        apiCall = api.purchaseOrders.getAll;
        break;
      case 'purchaseReceiving':
        apiCall = api.purchaseReceiving.getAll;
        break;
      case 'sales':
        apiCall = api.sales.getAll;
        break;
      case 'stockTransfers':
        apiCall = api.stockTransfers.getAll;
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
 * Remove an item from localStorage
 */
export const removeItemFromStorage = (dataType, itemId) => {
  try {
    const storedData = getFromStorage(dataType);
    if (storedData && Array.isArray(storedData)) {
      const updatedData = storedData.filter(item => item._id !== itemId);
      storeInStorage(dataType, updatedData);
      console.log(`Removed ${dataType} item ${itemId} from localStorage`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error removing ${dataType} item from localStorage:`, error);
    return false;
  }
};

/**
 * Sync data after a purchase order is converted to sale
 */
export const syncAfterPurchaseOrderConversion = async (purchaseOrderId, saleData) => {
  try {
    console.log('Syncing data after purchase order conversion...');
    
    // Update purchase order status in localStorage
    updateItemInStorage('purchaseOrders', purchaseOrderId, { status: 'Completed' });
    
    // Add new sale to localStorage
    if (saleData) {
      addItemToStorage('sales', saleData);
    }
    
    // Refresh purchase orders and sales to ensure consistency
    await Promise.all([
      refreshDataType('purchaseOrders'),
      refreshDataType('sales')
    ]);
    
    console.log('Data sync completed after purchase order conversion');
    return true;
  } catch (error) {
    console.error('Error syncing data after purchase order conversion:', error);
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
 * Sync data after purchase receiving
 */
export const syncAfterPurchaseReceiving = async (purchaseOrderId, receivingData) => {
  try {
    console.log('Syncing data after purchase receiving...');
    
    // Update purchase order status in localStorage
    updateItemInStorage('purchaseOrders', purchaseOrderId, { status: 'Completed' });
    
    // Add new receiving record to localStorage
    if (receivingData) {
      addItemToStorage('purchaseReceiving', receivingData);
    }
    
    // Refresh related data to ensure consistency
    await Promise.all([
      refreshDataType('purchaseOrders'),
      refreshDataType('purchaseReceiving'),
      refreshDataType('inventory') // Inventory might be updated after receiving
    ]);
    
    console.log('Data sync completed after purchase receiving');
    return true;
  } catch (error) {
    console.error('Error syncing data after purchase receiving:', error);
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
 * Check if localStorage data is stale and needs refresh
 */
export const isDataStale = (dataType, maxAgeMinutes = 30) => {
  try {
    const itemStr = localStorage.getItem(dataType);
    if (!itemStr) return true;
    
    const item = JSON.parse(itemStr);
    const now = new Date().getTime();
    const dataAge = now - item.timestamp;
    const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds
    
    return dataAge > maxAge;
  } catch (error) {
    console.error(`Error checking if ${dataType} data is stale:`, error);
    return true; // Assume stale if there's an error
  }
};

/**
 * Auto-refresh stale data
 */
export const autoRefreshStaleData = async () => {
  try {
    const dataTypes = [
      'customers', 'suppliers', 'branches', 'inventory', 
      'quotations', 'purchaseOrders', 'purchaseReceiving', 
      'sales', 'stockTransfers'
    ];
    
    const staleDataTypes = dataTypes.filter(dataType => isDataStale(dataType));
    
    if (staleDataTypes.length > 0) {
      console.log('Auto-refreshing stale data:', staleDataTypes);
      await syncAfterDataUpdate(staleDataTypes);
    }
    
    return true;
  } catch (error) {
    console.error('Error auto-refreshing stale data:', error);
    return false;
  }
};
