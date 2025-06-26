/**
 * API Service for making HTTP requests
 * 
 * This is a simple implementation that can be expanded with actual API endpoints
 * when connecting to a backend service.
 */
import { useErrorModal } from '../contexts/ModalContext';
import { deduplicateRequest } from '../utils/requestDeduplication';
import { getAuthToken } from '../utils/authHelpers';

// Base API URL - connects to our MongoDB backend
const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  if (process.env.NODE_ENV === 'production') {
    return 'https://quotation-app-be.onrender.com/api/v1';
  }
  
  // For local development, use the same host as the current page
  // This allows API calls to work when accessing from mobile devices
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    const protocol = window.location.protocol;
    return `${protocol}//${currentHost}:8000/api/v1`;
  }
  
  // Fallback for server-side rendering or when window is not available
  return 'http://localhost:8000/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

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
  
  // Initialize headers - don't set Content-Type for FormData
  const headers = {};
  
  // Only set Content-Type to application/json if we're not sending FormData
  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Merge with any custom headers
  Object.assign(headers, fetchOptions.headers);

  // Add auth token if available
  const token = getAuthToken();
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
      // Only clear token for auth-related endpoints
      if (endpoint.includes('/auth/')) {
        console.log('Auth endpoint returned 401, clearing token');
        localStorage.removeItem('authToken');
      } else {
        console.log('Non-auth endpoint returned 401, keeping token:', endpoint);
      }
      
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
  // Supplier Prices endpoints
  supplierPrices: {
    getBySupplier: (supplierId) => request(`/supplier-prices/supplier/${supplierId}`),
    getByItem: (itemId) => request(`/supplier-prices/item/${itemId}`),
    create: (priceData) => request('/supplier-prices', {
      method: 'POST',
      body: JSON.stringify(priceData),
    }),
    update: (supplierId, prices) => request(`/supplier-prices/supplier/${supplierId}`, {
      method: 'PUT',
      body: JSON.stringify({ prices }),
    }),
    delete: (id) => request(`/supplier-prices/${id}`, {
      method: 'DELETE',
    }),
  },
  
  // Auth endpoints
  auth: {
    login: (credentials) => {
      console.log('API: Sending login request with credentials:', {
        email: credentials.email,
        hasPassword: !!credentials.password,
        hasDeviceFingerprint: !!credentials.deviceFingerprint,
        deviceFingerprintKeys: credentials.deviceFingerprint ? Object.keys(credentials.deviceFingerprint) : []
      });
      
      return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    },
    logout: () => request('/auth/logout', {
      method: 'POST',
      showErrorModal: false, // Don't show error modal for logout failures
    }),
    register: (userData) => request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
    getProfile: () => deduplicateRequest('auth-profile', () => request('/auth/me')),
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
    search: (query) => request(`/inventory/search?query=${encodeURIComponent(query)}`),
    importExcel: (formData) => request('/inventory/import-excel', {
      method: 'POST',
      headers: {}, // Remove Content-Type header to let browser set it for FormData
      body: formData,
    }),
    importExcelBatch: (formData, onProgress) => {
      // Use chunked processing for Vercel timeout limits
      return new Promise(async (resolve, reject) => {
        const token = getAuthToken();
        const API_BASE_URL = process.env.REACT_APP_API_URL || 
          (process.env.NODE_ENV === 'production' 
            ? 'https://quotation-backend-api.vercel.app/api/v1' 
            : 'http://localhost:8000/api/v1');

        try {
          // First, upload the file and get chunks
          const initialResponse = await fetch(`${API_BASE_URL}/inventory/import-excel-batch`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          });

          if (!initialResponse.ok) {
            throw new Error(`HTTP ${initialResponse.status}: ${initialResponse.statusText}`);
          }

          const initialData = await initialResponse.json();
          
          if (!initialData.success) {
            throw new Error(initialData.message || 'Failed to parse Excel file');
          }

          const { chunks, totalChunks, totalRows, sessionId } = initialData.data;

          if (onProgress) {
            onProgress({
              type: 'info',
              message: `Excel file parsed successfully. Processing ${totalRows} items in ${totalChunks} chunks...`,
              totalRows,
              totalChunks
            });
          }

          let totalCreated = 0;
          let totalUpdated = 0;
          let totalErrors = 0;
          let allErrors = [];

          // Process each chunk
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            
            if (onProgress) {
              onProgress({
                type: 'progress',
                message: `Processing chunk ${i + 1} of ${totalChunks} (${chunk.length} items)`,
                currentChunk: i + 1,
                totalChunks,
                processed: i * 300,
                total: totalRows
              });
            }

            // Process this chunk
            const chunkResponse = await fetch(`${API_BASE_URL}/inventory/import-excel-batch`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                chunk,
                chunkIndex: i,
                totalChunks,
                sessionId
              }),
            });

            if (!chunkResponse.ok) {
              throw new Error(`HTTP ${chunkResponse.status}: Failed to process chunk ${i + 1}`);
            }

            const chunkData = await chunkResponse.json();
            
            if (!chunkData.success) {
              throw new Error(chunkData.message || `Failed to process chunk ${i + 1}`);
            }

            // Accumulate results
            totalCreated += chunkData.data.created || 0;
            totalUpdated += chunkData.data.updated || 0;
            totalErrors += chunkData.data.errors || 0;
            
            if (chunkData.data.errorDetails) {
              allErrors.push(...chunkData.data.errorDetails);
            }

            if (onProgress) {
              onProgress({
                type: 'chunk_complete',
                message: `Chunk ${i + 1} completed: ${chunkData.data.created} created, ${chunkData.data.updated} updated`,
                currentChunk: i + 1,
                totalChunks,
                processed: (i + 1) * 50,
                total: totalRows,
                created: totalCreated,
                updated: totalUpdated,
                errors: totalErrors
              });
            }
          }

          // Final completion
          const finalResult = {
            type: 'complete',
            message: `Import completed successfully! ${totalCreated} created, ${totalUpdated} updated, ${totalErrors} errors`,
            data: {
              imported: totalCreated + totalUpdated,
              created: totalCreated,
              updated: totalUpdated,
              errors: totalErrors,
              errorDetails: allErrors.slice(0, 10), // Limit errors shown
              totalRows
            }
          };

          resolve(finalResult);

        } catch (error) {
          console.error('Import error:', error);
          reject(error);
        }
      });
    },
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
    reject: (id) => request(`/quotations/${id}/reject`, {
      method: 'POST',
    }),
    approve: (id, data = {}) => request(`/quotations/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    markAsDelivered: (id) => request(`/quotations/${id}/deliver`, {
      method: 'POST',
    }),
    getDeliveryUsers: () => request('/quotations/delivery-users'),
    // Cancellation endpoints
    cancel: (id, reason) => request(`/quotations/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
    approveCancellation: (id, reason) => request(`/quotations/${id}/approve-cancellation`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
    denyCancellation: (id, reason) => request(`/quotations/${id}/deny-cancellation`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
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
    getTopSellingItems: () => request('/dashboard/top-selling'),
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
    updateStatus: (id, status) => request(`/stock-transfers/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
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
    getDeliveryReport: (params = {}) => {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      return request(`/reports/delivery${queryString ? `?${queryString}` : ''}`);
    },
  },

  // Device management endpoints
  devices: {
    getAll: () => request('/devices'),
    getById: (id) => request(`/devices/${id}`),
    update: (id, deviceData) => request(`/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(deviceData),
    }),
    revoke: (id) => request(`/devices/${id}`, {
      method: 'DELETE',
    }),
    revokeAll: (currentDeviceId) => request('/devices/revoke-all', {
      method: 'POST',
      body: JSON.stringify({ currentDeviceId }),
    }),
    getSecurityAnalysis: () => request('/devices/security-analysis'),
    getLoginHistory: (params = {}) => {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      return request(`/devices/login-history${queryString ? `?${queryString}` : ''}`);
    },
  },

  // Inventory History endpoints
  inventoryHistory: {
    getAll: (params = {}) => {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      return request(`/inventory-history${queryString ? `?${queryString}` : ''}`);
    },
    getById: (id) => request(`/inventory-history/${id}`),
    create: (historyRecord) => request('/inventory-history', {
      method: 'POST',
      body: JSON.stringify(historyRecord),
    }),
    getByItem: (itemId) => request(`/inventory-history/item/${itemId}`),
    getByDateRange: (startDate, endDate) => request(`/inventory-history/date-range?start=${startDate}&end=${endDate}`),
    getByOperation: (operation) => request(`/inventory-history/operation/${operation}`),
  },

  // Cost History endpoints
  costHistory: {
    getAll: (params = {}) => {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      return request(`/cost-history${queryString ? `?${queryString}` : ''}`);
    },
    getById: (id) => request(`/cost-history/${id}`),
    create: (historyRecord) => request('/cost-history', {
      method: 'POST',
      body: JSON.stringify(historyRecord),
    }),
    getByItem: (itemId) => request(`/cost-history/item/${itemId}`),
    getByDateRange: (startDate, endDate) => request(`/cost-history/date-range?start=${startDate}&end=${endDate}`),
  },
};

export default api;
