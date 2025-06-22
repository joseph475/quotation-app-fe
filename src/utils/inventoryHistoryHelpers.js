/**
 * Inventory History Helper Functions
 * Utilities for tracking all inventory operations (add stock, update, delete)
 */

/**
 * Create an inventory history record for tracking all operations
 * 
 * @param {Object} params - Parameters for creating inventory history
 * @param {string} params.itemId - The inventory item ID
 * @param {string} params.itemName - The inventory item name
 * @param {string} params.itemCode - The inventory item code
 * @param {string} params.operation - The operation type (add_stock, update_item, delete_item, create_item)
 * @param {Object} params.beforeData - Data before the operation
 * @param {Object} params.afterData - Data after the operation
 * @param {string} params.reason - The reason for the operation
 * @param {string} params.userId - The user who made the change
 * @param {string} params.userName - The user name who made the change
 * @param {string} params.branchId - The branch where the change occurred
 * @param {string} params.branchName - The branch name where the change occurred
 * @returns {Object} - Inventory history record
 */
export const createInventoryHistoryRecord = ({
  itemId,
  itemName,
  itemCode,
  operation,
  beforeData = {},
  afterData = {},
  reason = '',
  userId,
  userName,
  branchId,
  branchName
}) => {
  const timestamp = new Date().toISOString();
  const date = timestamp.split('T')[0]; // YYYY-MM-DD format
  const month = timestamp.substr(0, 7); // YYYY-MM format

  return {
    itemId,
    itemName,
    itemCode,
    operation, // 'add_stock', 'update_item', 'delete_item', 'create_item'
    beforeData,
    afterData,
    changes: calculateChanges(beforeData, afterData, operation),
    reason,
    userId: userId || 'unknown',
    userName: userName || 'Unknown User',
    branchId: branchId || 'unknown',
    branchName: branchName || 'Unknown Branch',
    timestamp,
    date,
    month
  };
};

/**
 * Calculate what changed between before and after data
 * 
 * @param {Object} beforeData - Data before the operation
 * @param {Object} afterData - Data after the operation
 * @param {string} operation - The operation type
 * @returns {Object} - Summary of changes
 */
const calculateChanges = (beforeData, afterData, operation) => {
  const changes = {
    summary: '',
    details: []
  };

  switch (operation) {
    case 'add_stock':
      const quantityAdded = (afterData.quantity || 0) - (beforeData.quantity || 0);
      const costChange = (afterData.costPrice || 0) - (beforeData.costPrice || 0);
      
      changes.summary = `Added ${quantityAdded} ${afterData.unit || 'units'}`;
      changes.details = [
        {
          field: 'quantity',
          before: beforeData.quantity || 0,
          after: afterData.quantity || 0,
          change: quantityAdded
        }
      ];
      
      if (costChange !== 0) {
        changes.summary += `, cost changed from $${(beforeData.costPrice || 0).toFixed(2)} to $${(afterData.costPrice || 0).toFixed(2)}`;
        changes.details.push({
          field: 'costPrice',
          before: beforeData.costPrice || 0,
          after: afterData.costPrice || 0,
          change: costChange
        });
      }
      break;

    case 'update_item':
      const updatedFields = [];
      const fieldsToCheck = ['name', 'itemCode', 'brand', 'model', 'category', 'quantity', 'costPrice', 'sellingPrice', 'unit', 'description'];
      
      fieldsToCheck.forEach(field => {
        if (beforeData[field] !== afterData[field]) {
          updatedFields.push(field);
          changes.details.push({
            field,
            before: beforeData[field],
            after: afterData[field],
            change: field === 'quantity' || field === 'costPrice' || field === 'sellingPrice' 
              ? (afterData[field] || 0) - (beforeData[field] || 0)
              : null
          });
        }
      });
      
      changes.summary = updatedFields.length > 0 
        ? `Updated ${updatedFields.join(', ')}`
        : 'Item updated (no changes detected)';
      break;

    case 'create_item':
      changes.summary = `Created new item with ${afterData.quantity || 0} ${afterData.unit || 'units'}`;
      changes.details = [
        { field: 'created', before: null, after: 'Item created', change: null }
      ];
      break;

    case 'delete_item':
      changes.summary = `Deleted item (had ${beforeData.quantity || 0} ${beforeData.unit || 'units'})`;
      changes.details = [
        { field: 'deleted', before: 'Item existed', after: null, change: null }
      ];
      break;

    default:
      changes.summary = 'Unknown operation';
  }

  return changes;
};

/**
 * Save inventory history record to database
 * 
 * @param {Object} historyRecord - The inventory history record to save
 * @returns {Promise<Object>} - API response
 */
export const saveInventoryHistory = async (historyRecord) => {
  try {
    // Import API dynamically to avoid circular dependencies
    const { default: api } = await import('../services/api');
    
    const response = await api.inventoryHistory.create(historyRecord);
    
    if (!response || !response.success) {
      throw new Error(response?.message || 'Failed to save inventory history');
    }
    
    return response;
  } catch (error) {
    console.error('Error saving inventory history:', error);
    
    // Fallback to localStorage if API fails
    try {
      const existingHistory = getInventoryHistoryFromStorage();
      const updatedHistory = [...existingHistory, historyRecord];
      const trimmedHistory = updatedHistory.slice(-2000);
      localStorage.setItem('inventoryHistory', JSON.stringify(trimmedHistory));
      console.warn('Saved inventory history to localStorage as fallback');
      return { success: true, message: 'Inventory history saved to localStorage as fallback' };
    } catch (storageError) {
      console.error('Failed to save to localStorage fallback:', storageError);
      throw error;
    }
  }
};

/**
 * Get inventory history from database
 * 
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} - Array of inventory history records
 */
export const getInventoryHistory = async (params = {}) => {
  try {
    // Import API dynamically to avoid circular dependencies
    const { default: api } = await import('../services/api');
    
    const response = await api.inventoryHistory.getAll(params);
    
    if (response && response.success) {
      return response.data || [];
    } else {
      throw new Error(response?.message || 'Failed to fetch inventory history');
    }
  } catch (error) {
    console.error('Error retrieving inventory history:', error);
    
    // Fallback to localStorage if API fails
    try {
      const fallbackHistory = getInventoryHistoryFromStorage();
      console.warn('Retrieved inventory history from localStorage as fallback');
      return fallbackHistory;
    } catch (storageError) {
      console.error('Failed to retrieve from localStorage fallback:', storageError);
      return [];
    }
  }
};

/**
 * Get inventory history from localStorage (fallback)
 * 
 * @returns {Array} - Array of inventory history records
 */
const getInventoryHistoryFromStorage = () => {
  try {
    const history = localStorage.getItem('inventoryHistory');
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error retrieving inventory history from localStorage:', error);
    return [];
  }
};

/**
 * Get inventory history for a specific item
 * 
 * @param {string} itemId - The inventory item ID
 * @returns {Array} - Array of inventory history records for the item
 */
export const getItemInventoryHistory = (itemId) => {
  const allHistory = getInventoryHistory();
  return allHistory.filter(record => record.itemId === itemId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Most recent first
};

/**
 * Get inventory history for a specific date range
 * 
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Array} - Array of inventory history records for the date range
 */
export const getInventoryHistoryByDateRange = (startDate, endDate) => {
  const allHistory = getInventoryHistory();
  return allHistory.filter(record => {
    return record.date >= startDate && record.date <= endDate;
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Most recent first
};

/**
 * Get inventory history for a specific month
 * 
 * @param {string} month - Month in YYYY-MM format
 * @returns {Array} - Array of inventory history records for the month
 */
export const getMonthlyInventoryHistory = (month) => {
  const allHistory = getInventoryHistory();
  return allHistory.filter(record => record.month === month)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Most recent first
};

/**
 * Get inventory history by operation type
 * 
 * @param {string} operation - Operation type (add_stock, update_item, delete_item, create_item)
 * @returns {Array} - Array of inventory history records for the operation
 */
export const getInventoryHistoryByOperation = (operation) => {
  const allHistory = getInventoryHistory();
  return allHistory.filter(record => record.operation === operation)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Most recent first
};

/**
 * Generate monthly inventory activity report
 * 
 * @param {string} month - Month in YYYY-MM format
 * @returns {Object} - Monthly inventory activity report
 */
export const generateMonthlyInventoryReport = (month) => {
  const monthlyHistory = getMonthlyInventoryHistory(month);
  
  // Group by operation type
  const operationSummary = {
    add_stock: monthlyHistory.filter(r => r.operation === 'add_stock'),
    update_item: monthlyHistory.filter(r => r.operation === 'update_item'),
    create_item: monthlyHistory.filter(r => r.operation === 'create_item'),
    delete_item: monthlyHistory.filter(r => r.operation === 'delete_item')
  };
  
  // Group by item
  const itemSummary = {};
  monthlyHistory.forEach(record => {
    if (!itemSummary[record.itemId]) {
      itemSummary[record.itemId] = {
        itemId: record.itemId,
        itemName: record.itemName,
        itemCode: record.itemCode,
        operations: [],
        operationCount: 0,
        lastActivity: record.timestamp
      };
    }
    
    const item = itemSummary[record.itemId];
    item.operations.push({
      operation: record.operation,
      timestamp: record.timestamp,
      summary: record.changes.summary,
      userName: record.userName,
      reason: record.reason
    });
    item.operationCount += 1;
    
    // Keep track of most recent activity
    if (new Date(record.timestamp) > new Date(item.lastActivity)) {
      item.lastActivity = record.timestamp;
    }
  });
  
  // Calculate totals
  const totalStockAdded = operationSummary.add_stock.reduce((sum, record) => {
    const quantityChange = record.changes.details.find(d => d.field === 'quantity');
    return sum + (quantityChange ? quantityChange.change : 0);
  }, 0);
  
  return {
    month,
    totalOperations: monthlyHistory.length,
    operationBreakdown: {
      stockAdditions: operationSummary.add_stock.length,
      itemUpdates: operationSummary.update_item.length,
      itemCreations: operationSummary.create_item.length,
      itemDeletions: operationSummary.delete_item.length
    },
    totalStockAdded,
    totalItemsAffected: Object.keys(itemSummary).length,
    itemDetails: Object.values(itemSummary),
    rawHistory: monthlyHistory
  };
};

/**
 * Export inventory history to CSV format
 * 
 * @param {Array} history - Array of inventory history records
 * @returns {string} - CSV content
 */
export const exportInventoryHistoryToCSV = (history) => {
  const headers = [
    'Date',
    'Time',
    'Operation',
    'Item Code',
    'Item Name',
    'Summary',
    'User',
    'Branch',
    'Reason'
  ];
  
  const rows = history.map(record => [
    record.date,
    new Date(record.timestamp).toLocaleTimeString(),
    record.operation.replace('_', ' ').toUpperCase(),
    record.itemCode || '',
    record.itemName || '',
    record.changes.summary || '',
    record.userName || '',
    record.branchName || '',
    record.reason || ''
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
};

/**
 * Get operation display name
 * 
 * @param {string} operation - Operation type
 * @returns {string} - Display name for the operation
 */
export const getOperationDisplayName = (operation) => {
  const operationNames = {
    'add_stock': 'Stock Addition',
    'update_item': 'Item Update',
    'create_item': 'Item Creation',
    'delete_item': 'Item Deletion'
  };
  
  return operationNames[operation] || operation;
};

/**
 * Get operation icon class
 * 
 * @param {string} operation - Operation type
 * @returns {string} - CSS class for the operation icon
 */
export const getOperationIconClass = (operation) => {
  const iconClasses = {
    'add_stock': 'text-green-600',
    'update_item': 'text-blue-600',
    'create_item': 'text-purple-600',
    'delete_item': 'text-red-600'
  };
  
  return iconClasses[operation] || 'text-gray-600';
};
