/**
 * Cost History Helper Functions
 * Utilities for tracking inventory cost changes over time
 */

/**
 * Create a cost history record for tracking price changes
 * 
 * @param {Object} params - Parameters for creating cost history
 * @param {string} params.itemId - The inventory item ID
 * @param {string} params.itemName - The inventory item name
 * @param {string} params.itemCode - The inventory item code
 * @param {number} params.previousCost - The previous cost price
 * @param {number} params.newCost - The new cost price
 * @param {number} params.quantityAdded - The quantity added
 * @param {string} params.reason - The reason for the cost change
 * @param {string} params.userId - The user who made the change
 * @param {string} params.branchId - The branch where the change occurred
 * @returns {Object} - Cost history record
 */
export const createCostHistoryRecord = ({
  itemId,
  itemName,
  itemCode,
  previousCost,
  newCost,
  quantityAdded,
  reason,
  userId,
  branchId
}) => {
  return {
    itemId,
    itemName,
    itemCode,
    previousCost: parseFloat(previousCost) || 0,
    newCost: parseFloat(newCost) || 0,
    costChange: parseFloat(newCost) - parseFloat(previousCost),
    quantityAdded: parseInt(quantityAdded) || 0,
    reason: reason || '',
    userId: userId || '',
    branchId: branchId || '',
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format for easy filtering
    month: new Date().toISOString().substr(0, 7), // YYYY-MM format for monthly reports
    changeType: 'stock_addition'
  };
};

/**
 * Save cost history record to database
 * 
 * @param {Object} costRecord - The cost history record to save
 * @returns {Promise<Object>} - API response
 */
export const saveCostHistory = async (costRecord) => {
  try {
    // Import API dynamically to avoid circular dependencies
    const { default: api } = await import('../services/api');
    
    const response = await api.costHistory.create(costRecord);
    
    if (!response || !response.success) {
      throw new Error(response?.message || 'Failed to save cost history');
    }
    
    return response;
  } catch (error) {
    console.error('Error saving cost history:', error);
    
    // Fallback to localStorage if API fails
    try {
      const existingHistory = getCostHistoryFromStorage();
      const updatedHistory = [...existingHistory, costRecord];
      const trimmedHistory = updatedHistory.slice(-1000);
      localStorage.setItem('costHistory', JSON.stringify(trimmedHistory));
      console.warn('Saved cost history to localStorage as fallback');
      return { success: true, message: 'Cost history saved to localStorage as fallback' };
    } catch (storageError) {
      console.error('Failed to save to localStorage fallback:', storageError);
      throw error;
    }
  }
};

/**
 * Get cost history from database
 * 
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} - Array of cost history records
 */
export const getCostHistory = async (params = {}) => {
  try {
    // Import API dynamically to avoid circular dependencies
    const { default: api } = await import('../services/api');
    
    const response = await api.costHistory.getAll(params);
    
    if (response && response.success) {
      return response.data || [];
    } else {
      throw new Error(response?.message || 'Failed to fetch cost history');
    }
  } catch (error) {
    console.error('Error retrieving cost history:', error);
    
    // Fallback to localStorage if API fails
    try {
      const fallbackHistory = getCostHistoryFromStorage();
      console.warn('Retrieved cost history from localStorage as fallback');
      return fallbackHistory;
    } catch (storageError) {
      console.error('Failed to retrieve from localStorage fallback:', storageError);
      return [];
    }
  }
};

/**
 * Get cost history from localStorage (fallback)
 * 
 * @returns {Array} - Array of cost history records
 */
const getCostHistoryFromStorage = () => {
  try {
    const history = localStorage.getItem('costHistory');
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error retrieving cost history from localStorage:', error);
    return [];
  }
};

/**
 * Get cost history for a specific item
 * 
 * @param {string} itemId - The inventory item ID
 * @returns {Array} - Array of cost history records for the item
 */
export const getItemCostHistory = (itemId) => {
  const allHistory = getCostHistory();
  return allHistory.filter(record => record.itemId === itemId);
};

/**
 * Get cost history for a specific month
 * 
 * @param {string} month - Month in YYYY-MM format
 * @returns {Array} - Array of cost history records for the month
 */
export const getMonthlyCostHistory = (month) => {
  const allHistory = getCostHistory();
  return allHistory.filter(record => record.month === month);
};

/**
 * Get cost history for a date range
 * 
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Array} - Array of cost history records for the date range
 */
export const getCostHistoryByDateRange = (startDate, endDate) => {
  const allHistory = getCostHistory();
  return allHistory.filter(record => {
    return record.date >= startDate && record.date <= endDate;
  });
};

/**
 * Generate monthly cost report data
 * 
 * @param {string} month - Month in YYYY-MM format
 * @returns {Object} - Monthly cost report data
 */
export const generateMonthlyCostReport = (month) => {
  const monthlyHistory = getMonthlyCostHistory(month);
  
  // Group by item
  const itemSummary = {};
  
  monthlyHistory.forEach(record => {
    if (!itemSummary[record.itemId]) {
      itemSummary[record.itemId] = {
        itemId: record.itemId,
        itemName: record.itemName,
        itemCode: record.itemCode,
        costChanges: [],
        totalQuantityAdded: 0,
        costChangeCount: 0,
        averageCostChange: 0,
        latestCost: record.newCost
      };
    }
    
    const item = itemSummary[record.itemId];
    item.costChanges.push({
      date: record.date,
      previousCost: record.previousCost,
      newCost: record.newCost,
      costChange: record.costChange,
      quantityAdded: record.quantityAdded,
      reason: record.reason
    });
    
    item.totalQuantityAdded += record.quantityAdded;
    item.costChangeCount += 1;
    item.latestCost = record.newCost; // Keep updating to get the latest
  });
  
  // Calculate averages
  Object.values(itemSummary).forEach(item => {
    if (item.costChangeCount > 0) {
      const totalCostChange = item.costChanges.reduce((sum, change) => sum + change.costChange, 0);
      item.averageCostChange = totalCostChange / item.costChangeCount;
    }
  });
  
  return {
    month,
    totalItems: Object.keys(itemSummary).length,
    totalCostChanges: monthlyHistory.length,
    totalQuantityAdded: monthlyHistory.reduce((sum, record) => sum + record.quantityAdded, 0),
    items: Object.values(itemSummary),
    rawHistory: monthlyHistory
  };
};

/**
 * Export cost history to CSV format
 * 
 * @param {Array} history - Array of cost history records
 * @returns {string} - CSV content
 */
export const exportCostHistoryToCSV = (history) => {
  const headers = [
    'Date',
    'Item Code',
    'Item Name',
    'Previous Cost',
    'New Cost',
    'Cost Change',
    'Quantity Added',
    'Reason',
    'Change Type'
  ];
  
  const rows = history.map(record => [
    record.date,
    record.itemCode || '',
    record.itemName || '',
    `$${record.previousCost.toFixed(2)}`,
    `$${record.newCost.toFixed(2)}`,
    `$${record.costChange.toFixed(2)}`,
    record.quantityAdded,
    record.reason || '',
    record.changeType || 'stock_addition'
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
};
