/**
 * Page Helper Functions
 * Common utility functions for page components
 */
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { getAuthUser, isAuthenticated } from '../utils/authHelpers';

/**
 * Check if user has permission to access a feature
 * 
 * @param {string} feature - The feature to check permission for
 * @param {Object} user - The user object
 * @returns {boolean} - Whether the user has permission
 */
export const hasPermission = (feature, user) => {
  if (!user) return false;
  
  // Define feature permissions based on roles
  const featurePermissions = {
    // User management is only for admins
    'user-management': ['admin'],
    
    // Inventory management
    'inventory-create': ['admin', 'user'],
    'inventory-edit': ['admin', 'user'],
    'inventory-view': ['admin', 'user'],
    'inventory-delete': ['admin'], // Only admin can delete
    
    // Purchase orders
    'purchase-orders-create': ['user'],
    'purchase-orders-edit': ['user'],
    'purchase-orders-view': ['admin', 'user'],
    'purchase-orders-delete': [], // No one can delete
    'purchase-orders-approve': ['admin'], // Only admin can approve
    
    // Stock transfers
    'stock-transfers-create': ['user'],
    'stock-transfers-edit': ['user'],
    'stock-transfers-view': ['admin', 'user'],
    'stock-transfers-delete': [], // No one can delete
    'stock-transfers-approve': ['admin'], // Only admin can approve
    
    // Receiving
    'purchase-receiving-create': ['user'],
    'purchase-receiving-edit': ['user'],
    'purchase-receiving-view': ['admin', 'user'],
    'purchase-receiving-delete': [], // No one can delete
    
    // Sales
    'sales-create': ['user'],
    'sales-edit': ['user'],
    'sales-view': ['admin', 'user'],
    'sales-delete': [], // No one can delete
    
    // Customers
    'customers-create': ['user'],
    'customers-edit': ['user'],
    'customers-view': ['admin', 'user'],
    'customers-delete': [], // No one can delete
    
    // Quotations
    'quotations-create': ['user'], // Only user can create quotations
    'quotations-edit': ['user'],
    'quotations-view': ['admin', 'user'],
    'quotations-delete': [], // No one can delete
    'quotations-convert-to-sale': ['user'], // Only user can convert to sale
    'quotations-reject': ['user'], // Only user can reject quotations
    
    // Suppliers - Settings
    'suppliers-create': ['admin'],
    'suppliers-edit': ['admin'],
    'suppliers-view': ['admin', 'user'],
    'suppliers-delete': [], // No one can delete
    
    
    // Reports
    'reports-view': ['admin', 'user'],
    'reports-generate': ['admin', 'user'],
  };
  
  // Check if the feature exists in the permissions map
  if (!featurePermissions[feature]) return false;
  
  // Check if the user's role is in the allowed roles for this feature
  return featurePermissions[feature].includes(user.role);
};

/**
 * Role-based route protection
 * 
 * @param {string} requiredRole - The role required to access the route
 * @returns {boolean} - Whether the user has access
 */
export const useRoleBasedAccess = (requiredRole) => {
  const user = getAuthUser();
  const authenticated = isAuthenticated();
  
  if (!authenticated) return false;
  
  // Check if user has the required role
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(user?.role);
  }
  
  return user?.role === requiredRole;
};

/**
 * Hook for common page state management
 * 
 * @param {Function} fetchData - Function to fetch data
 * @returns {Object} - Page state and handlers
 */
export const usePageState = (fetchData) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Load data
  const loadData = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetchData();
      
      if (response && response.success) {
        setData(response.data || []);
      } else {
        throw new Error(response.message || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };
  
  // Show success message with auto-hide
  const showSuccess = (message) => {
    setSuccessMessage(message);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };
  
  // Handle edit item
  const handleEdit = (item) => {
    setSelectedItem(item);
    setShowForm(true);
    setError('');
  };
  
  // Handle add new item
  const handleAdd = () => {
    setSelectedItem(null);
    setShowForm(true);
    setError('');
  };
  
  // Handle cancel form
  const handleCancel = () => {
    setShowForm(false);
    setSelectedItem(null);
    setError('');
  };
  
  return {
    data,
    setData,
    isLoading,
    setIsLoading,
    error,
    setError,
    successMessage,
    showSuccess,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    statusFilter,
    setStatusFilter,
    showForm,
    setShowForm,
    selectedItem,
    setSelectedItem,
    loadData,
    handleSort,
    handleEdit,
    handleAdd,
    handleCancel
  };
};

/**
 * Hook for handling CRUD operations
 * 
 * @param {Object} api - API service for the entity
 * @param {Function} loadData - Function to reload data after operations
 * @returns {Object} - CRUD handlers
 */
export const useCrudHandlers = (api, loadData) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Show success message with auto-hide
  const showSuccess = (message) => {
    setSuccessMessage(message);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };
  
  // Handle create/update
  const handleSubmit = async (formData, id = null) => {
    setIsLoading(true);
    setError('');
    
    try {
      let response;
      
      if (id) {
        // Update existing item
        response = await api.update(id, formData);
      } else {
        // Create new item
        response = await api.create(formData);
      }
      
      if (response && response.success) {
        // Refresh data
        await loadData();
        
        showSuccess(id ? 'Item updated successfully!' : 'Item created successfully!');
        return true;
      } else {
        throw new Error(response.message || 'Failed to save item');
      }
    } catch (err) {
      console.error('Error saving item:', err);
      setError(err.message || 'Failed to save item. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle delete
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return false;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await api.delete(id);
      
      if (response && response.success) {
        // Refresh data
        await loadData();
        
        showSuccess('Item deleted successfully!');
        return true;
      } else {
        throw new Error(response.message || 'Failed to delete item');
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(err.message || 'Failed to delete item. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    isLoading,
    error,
    successMessage,
    handleSubmit,
    handleDelete,
    showSuccess,
    setError
  };
};

/**
 * Filter and sort data
 * 
 * @param {Array} data - Data to filter and sort
 * @param {Object} options - Filter and sort options
 * @returns {Array} - Filtered and sorted data
 */
export const filterAndSortData = (data, options) => {
  const {
    searchTerm = '',
    searchFields = [],
    sortBy = '',
    sortOrder = 'asc',
    statusFilter = 'all',
    statusField = 'status',
    customFilters = []
  } = options;
  
  return data
    .filter(item => {
      // Apply search filter
      const matchesSearch = !searchTerm || searchFields.some(field => {
        const value = getNestedValue(item, field);
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (typeof value === 'number') {
          return value.toString().includes(searchTerm);
        }
        return false;
      });
      
      // Apply status filter
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && getActiveStatus(item, statusField)) ||
                           (statusFilter === 'inactive' && !getActiveStatus(item, statusField));
      
      // Apply custom filters
      const matchesCustomFilters = customFilters.every(filter => filter(item));
      
      return matchesSearch && matchesStatus && matchesCustomFilters;
    })
    .sort((a, b) => {
      if (!sortBy) return 0;
      
      const valueA = getNestedValue(a, sortBy);
      const valueB = getNestedValue(b, sortBy);
      
      // Handle string comparison
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortOrder === 'asc' 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA);
      }
      
      // Handle number comparison
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortOrder === 'asc' 
          ? valueA - valueB 
          : valueB - valueA;
      }
      
      // Handle date comparison
      if (valueA instanceof Date && valueB instanceof Date) {
        return sortOrder === 'asc' 
          ? valueA - valueB 
          : valueB - valueA;
      }
      
      return 0;
    });
};

/**
 * Get nested value from an object using dot notation
 * 
 * @param {Object} obj - Object to get value from
 * @param {string} path - Path to the value using dot notation
 * @returns {*} - Value at the path
 */
export const getNestedValue = (obj, path) => {
  if (!obj || !path) return undefined;
  
  const keys = path.split('.');
  let value = obj;
  
  for (const key of keys) {
    if (value === null || value === undefined) return undefined;
    value = value[key];
  }
  
  return value;
};

/**
 * Get active status from an item
 * 
 * @param {Object} item - Item to get status from
 * @param {string} statusField - Field name for status
 * @returns {boolean} - Whether the item is active
 */
export const getActiveStatus = (item, statusField) => {
  const status = getNestedValue(item, statusField);
  
  if (typeof status === 'boolean') {
    return status;
  }
  
  if (typeof status === 'string') {
    return ['active', 'approved', 'completed'].includes(status.toLowerCase());
  }
  
  return true; // Default to active if status is not found
};

/**
 * Format date for display
 * 
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const defaultOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  
  try {
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(new Date(date));
  } catch (e) {
    return '';
  }
};

/**
 * Get status color class based on status
 * 
 * @param {string} status - Status value
 * @returns {string} - Tailwind CSS class for the status
 */
export const getStatusColorClass = (status) => {
  if (!status) return 'bg-gray-100 text-gray-800';
  
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

/**
 * Protected route component with role-based access control
 * 
 * @param {Object} props - Component props
 * @returns {h.JSX.Element} - Protected component or redirect
 */
export const RoleProtectedRoute = ({ component: Component, allowedRoles = [], ...rest }) => {
  const user = getAuthUser();
  const authenticated = isAuthenticated();
  
  // Check if user has permission based on role
  const hasAccess = () => {
    if (!authenticated || !user) return false;
    
    // If no specific roles are required, just check authentication
    if (!allowedRoles.length) return true;
    
    // Check if user's role is in the allowed roles
    return allowedRoles.includes(user.role);
  };
  
  // Redirect to login page if not authenticated, or dashboard if authenticated but not authorized
  if (!hasAccess()) {
    if (!authenticated) {
      route('/login', true);
    } else {
      route('/', true);
    }
    return null;
  }
  
  // Render the component if authorized, passing user as prop
  return <Component {...rest} user={user} />;
};
