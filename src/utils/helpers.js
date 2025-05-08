/**
 * Helper utility functions for the application
 */

/**
 * Format a number as currency
 * 
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - The currency code (default: USD)
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount, currencyCode = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
};

/**
 * Format a date string
 * 
 * @param {string} dateString - The date string to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date string
 */
export const formatDate = (dateString, options = {}) => {
  const date = new Date(dateString);
  const defaultOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  
  return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
};

/**
 * Truncate text to a specified length
 * 
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} - Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Generate a unique ID
 * 
 * @returns {string} - Unique ID
 */
export const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

/**
 * Debounce a function call
 * 
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Deep clone an object
 * 
 * @param {Object} obj - The object to clone
 * @returns {Object} - Cloned object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Calculate the total amount from an array of items
 * 
 * @param {Array} items - Array of items with price and quantity properties
 * @returns {number} - Total amount
 */
export const calculateTotal = (items) => {
  if (!items || !items.length) return 0;
  
  return items.reduce((total, item) => {
    const itemTotal = (item.price || 0) * (item.quantity || 1);
    return total + itemTotal;
  }, 0);
};

/**
 * Sort an array of objects by a property
 * 
 * @param {Array} array - Array to sort
 * @param {string} property - Property to sort by
 * @param {string} direction - Sort direction ('asc' or 'desc')
 * @returns {Array} - Sorted array
 */
export const sortByProperty = (array, property, direction = 'asc') => {
  const sortedArray = [...array];
  
  return sortedArray.sort((a, b) => {
    let valueA = a[property];
    let valueB = b[property];
    
    // Handle string comparison
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      valueA = valueA.toLowerCase();
      valueB = valueB.toLowerCase();
    }
    
    if (valueA < valueB) return direction === 'asc' ? -1 : 1;
    if (valueA > valueB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Filter an array of objects by a search term
 * 
 * @param {Array} array - Array to filter
 * @param {string} searchTerm - Search term
 * @param {Array} properties - Properties to search in
 * @returns {Array} - Filtered array
 */
export const filterBySearchTerm = (array, searchTerm, properties) => {
  if (!searchTerm || !array || !array.length) return array;
  
  const term = searchTerm.toLowerCase();
  
  return array.filter(item => {
    return properties.some(prop => {
      const value = item[prop];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(term);
      }
      if (typeof value === 'number') {
        return value.toString().includes(term);
      }
      return false;
    });
  });
};

/**
 * Get status color class based on status
 * 
 * @param {string} status - Status value
 * @returns {string} - Tailwind CSS class for the status
 */
export const getStatusColorClass = (status) => {
  const statusLower = status.toLowerCase();
  
  switch (statusLower) {
    case 'active':
    case 'completed':
    case 'approved':
    case 'paid':
    case 'in stock':
      return 'bg-green-100 text-green-800';
      
    case 'pending':
    case 'processing':
    case 'low stock':
      return 'bg-yellow-100 text-yellow-800';
      
    case 'inactive':
    case 'cancelled':
    case 'rejected':
    case 'out of stock':
      return 'bg-red-100 text-red-800';
      
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
