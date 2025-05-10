/**
 * API Service for making HTTP requests
 * 
 * This is a simple implementation that can be expanded with actual API endpoints
 * when connecting to a backend service.
 */
import { useErrorModal } from '../contexts/ModalContext';

// Base API URL - connects to our MongoDB backend
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.example.com/api/v1' 
  : 'http://localhost:8000/api/v1';

// Store error modal context reference
let errorModalContext = null;

// Function to set error modal context
export const setErrorModalContext = (context) => {
  errorModalContext = context;
};

/**
 * Make a request to the API
 * 
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @param {boolean} [options.showErrorModal=true] - Whether to show error modal on error
 * @returns {Promise<any>} - Response data
 */
async function request(endpoint, options = {}) {
  const { showErrorModal = true, ...fetchOptions } = options;
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  // Add auth token if available
  const token = localStorage.getItem('authToken');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    ...fetchOptions,
    headers,
  };

  try {
    const response = await fetch(url, config);
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
      // Clear token but don't redirect automatically
      localStorage.removeItem('authToken');
      
      // Return a structured error response
      return {
        success: false,
        status: 401,
        message: 'Authentication failed. Please log in again.'
      };
    }
    
    // Try to parse the response as JSON
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // If not JSON, get the text and create a structured error
      const text = await response.text();
      data = {
        success: false,
        message: 'Server returned non-JSON response',
        error: text.substring(0, 100) + '...' // Include part of the response for debugging
      };
    }
    
    if (!response.ok) {
      const errorMessage = data.message || 'API request failed';
      
      // Show error modal if enabled and context is available
      if (showErrorModal && errorModalContext) {
        const errorTitle = getErrorTitle(response.status);
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          endpoint,
          data
        };
        
        errorModalContext.showError(errorMessage, errorTitle, errorDetails);
      }
      
      throw new Error(errorMessage);
    }
    
    // Ensure the response has a success property
    if (data && !data.hasOwnProperty('success')) {
      data.success = response.ok;
    }
    
    return data;
  } catch (error) {
    console.error('API request error:', error);
    
    // Show error modal for network errors if enabled and context is available
    if (showErrorModal && errorModalContext && error.name === 'TypeError') {
      errorModalContext.showError(
        'Network error. Please check your connection and try again.',
        'Connection Error',
        error.message
      );
    }
    
    throw error;
  }
}

/**
 * Get a user-friendly error title based on HTTP status code
 * 
 * @param {number} status - HTTP status code
 * @returns {string} - Error title
 */
function getErrorTitle(status) {
  switch (true) {
    case status >= 500:
      return 'Server Error';
    case status === 404:
      return 'Not Found';
    case status === 403:
      return 'Access Denied';
    case status === 401:
      return 'Authentication Error';
    case status === 400:
      return 'Bad Request';
    default:
      return 'API Error';
  }
}

/**
 * ErrorModalProvider component for API service
 * This component should be used at the top level of your application
 */
export const ApiErrorHandler = () => {
  const errorModal = useErrorModal();
  
  // Set error modal context on mount
  if (errorModal && !errorModalContext) {
    setErrorModalContext(errorModal);
  }
  
  return null;
};

/**
 * API methods
 */
const api = {
  // Auth endpoints
  auth: {
    login: (credentials) => request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
    logout: () => request('/auth/logout', {
      method: 'POST',
    }),
    register: (userData) => request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
    getProfile: () => request('/auth/me'),
    updateProfile: (userData) => request('/auth/updatedetails', {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),
  },
  
  // Inventory endpoints
  inventory: {
    getAll: (params = {}) => {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      return request(`/inventory${queryString ? `?${queryString}` : ''}`);
    },
    getById: (id) => request(`/inventory/${id}`),
    getByBranch: (branchId, params = {}) => {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      return request(`/inventory/branch/${branchId}${queryString ? `?${queryString}` : ''}`);
    },
    create: (item) => request('/inventory', {
      method: 'POST',
      body: JSON.stringify(item),
    }),
    update: (id, item) => request(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    }),
    delete: (id) => request(`/inventory/${id}`, {
      method: 'DELETE',
    }),
    search: (query) => request(`/inventory/search-items?query=${encodeURIComponent(query)}`),
  },
  
  // Customer endpoints
  customers: {
    getAll: () => request('/customers'),
    getById: (id) => request(`/customers/${id}`),
    create: (customer) => request('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    }),
    update: (id, customer) => request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customer),
    }),
    delete: (id) => request(`/customers/${id}`, {
      method: 'DELETE',
    }),
  },
  
  // Quotation endpoints
  quotations: {
    getAll: () => request('/quotations'),
    getById: (id) => request(`/quotations/${id}`),
    create: (quotation) => request('/quotations', {
      method: 'POST',
      body: JSON.stringify(quotation),
    }),
    update: (id, quotation) => request(`/quotations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(quotation),
    }),
    delete: (id) => request(`/quotations/${id}`, {
      method: 'DELETE',
    }),
    convertToSale: (id) => request(`/quotations/${id}/convert`, {
      method: 'POST',
    }),
  },
  
  // Sales endpoints
  sales: {
    getAll: (params = {}) => {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      return request(`/sales${queryString ? `?${queryString}` : ''}`);
    },
    getById: (id) => request(`/sales/${id}`),
    create: (sale) => request('/sales', {
      method: 'POST',
      body: JSON.stringify(sale),
    }),
    update: (id, sale) => request(`/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sale),
    }),
    delete: (id) => request(`/sales/${id}`, {
      method: 'DELETE',
    }),
  },
  
  // Dashboard endpoints
  dashboard: {
    getSummary: () => request('/dashboard/summary'),
    getRecentSales: () => request('/dashboard/recent-sales'),
    getLowStockItems: () => request('/dashboard/low-stock'),
  },
  
  // Supplier endpoints
  suppliers: {
    getAll: () => request('/suppliers'),
    getById: (id) => request(`/suppliers/${id}`),
    create: (supplier) => request('/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplier),
    }),
    update: (id, supplier) => request(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(supplier),
    }),
    delete: (id) => request(`/suppliers/${id}`, {
      method: 'DELETE',
    }),
    search: (query) => request(`/suppliers/search?query=${encodeURIComponent(query)}`),
  },
  
  // Purchase Order endpoints
  purchaseOrders: {
    getAll: () => request('/purchase-orders'),
    getById: (id) => request(`/purchase-orders/${id}`),
    create: (order) => request('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(order),
    }),
    update: (id, order) => request(`/purchase-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(order),
    }),
    delete: (id) => request(`/purchase-orders/${id}`, {
      method: 'DELETE',
    }),
    updateStatus: (id, status) => request(`/purchase-orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
    getReceivings: (id) => request(`/purchase-orders/${id}/receivings`),
  },
  
  // Purchase Receiving endpoints
  purchaseReceiving: {
    getAll: () => request('/purchase-receiving'),
    getById: (id) => request(`/purchase-receiving/${id}`),
    create: (receiving) => request('/purchase-receiving', {
      method: 'POST',
      body: JSON.stringify(receiving),
    }),
    update: (id, receiving) => request(`/purchase-receiving/${id}`, {
      method: 'PUT',
      body: JSON.stringify(receiving),
    }),
    delete: (id) => request(`/purchase-receiving/${id}`, {
      method: 'DELETE',
    }),
  },
  
  // Stock Transfer endpoints
  stockTransfers: {
    getAll: () => request('/stock-transfers'),
    getById: (id) => request(`/stock-transfers/${id}`),
    create: (transfer) => request('/stock-transfers/process', {
      method: 'POST',
      body: JSON.stringify(transfer),
    }),
    update: (id, transfer) => request(`/stock-transfers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transfer),
    }),
    delete: (id) => request(`/stock-transfers/${id}`, {
      method: 'DELETE',
    }),
    updateInventory: (id) => request(`/stock-transfers/${id}/update-inventory`, {
      method: 'POST',
    }),
  },
  
  // Branch endpoints
  branches: {
    getAll: () => request('/branches'),
    getById: (id) => request(`/branches/${id}`),
    create: (branch) => request('/branches', {
      method: 'POST',
      body: JSON.stringify(branch),
    }),
    update: (id, branch) => request(`/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(branch),
    }),
    delete: (id) => request(`/branches/${id}`, {
      method: 'DELETE',
    }),
    search: (query) => request(`/branches/search?query=${encodeURIComponent(query)}`),
  },
  
  // User management endpoints
  users: {
    getAll: () => request('/users'),
    getById: (id) => request(`/users/${id}`),
    create: (userData) => request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
    update: (id, userData) => request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),
    delete: (id) => request(`/users/${id}`, {
      method: 'DELETE',
    }),
  },
  
  // Reports endpoints
  reports: {
    getSalesReport: (params = {}) => {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      return request(`/reports/sales${queryString ? `?${queryString}` : ''}`);
    },
    getInventoryReport: (params = {}) => {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      return request(`/reports/inventory${queryString ? `?${queryString}` : ''}`);
    },
    getPurchasesReport: (params = {}) => {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      return request(`/reports/purchases${queryString ? `?${queryString}` : ''}`);
    },
    getCustomersReport: (params = {}) => {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      return request(`/reports/customers${queryString ? `?${queryString}` : ''}`);
    },
  },
};

export default api;
