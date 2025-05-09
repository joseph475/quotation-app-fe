/**
 * CRUD Helper Functions
 * Common utility functions for CRUD operations
 */
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { hasPermission } from './pageHelpers';
import useAuth from '../hooks/useAuth';

/**
 * Hook for handling data fetching with pagination, filtering, and sorting
 * 
 * @param {Function} fetchFunction - API function to fetch data
 * @param {Object} options - Additional options
 * @returns {Object} - Data and handlers
 */
export const useFetchData = (fetchFunction, options = {}) => {
  const {
    initialSort = '',
    initialSortOrder = 'asc',
    initialFilter = 'all',
    dependencies = [],
    transformResponse = (data) => data,
    autoFetch = true
  } = options;
  
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState(initialSort);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Fetch data
  const fetchData = async (params = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetchFunction({
        page,
        limit: 10,
        sort: sortBy,
        order: sortOrder,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm || undefined,
        ...params
      });
      
      if (response && response.success) {
        const transformedData = transformResponse(response.data || []);
        setData(transformedData);
        
        // Handle pagination if available in response
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages || 1);
          setTotalItems(response.pagination.totalItems || transformedData.length);
        }
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
  
  // Initial data fetch
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [page, sortBy, sortOrder, statusFilter, searchTerm, ...dependencies]);
  
  // Handle sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1); // Reset to first page when sorting changes
  };
  
  // Get sort icon
  const getSortIcon = (field) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? (
      <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
    ) : (
      <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
      </svg>
    );
  };
  
  return {
    data,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    totalPages,
    totalItems,
    fetchData,
    handleSort,
    getSortIcon
  };
};

/**
 * Hook for handling CRUD operations with permission checks
 * 
 * @param {Object} api - API service for the entity
 * @param {Object} options - Additional options
 * @returns {Object} - CRUD handlers and state
 */
export const useCrud = (api, options = {}) => {
  const {
    entityName = 'item',
    fetchFunction = api.getAll,
    createPermission,
    updatePermission,
    deletePermission,
    onSuccess = () => {},
    refreshData = () => {}
  } = options;
  
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  
  // Check permissions
  const canCreate = !createPermission || hasPermission(createPermission, user);
  const canUpdate = !updatePermission || hasPermission(updatePermission, user);
  const canDelete = !deletePermission || hasPermission(deletePermission, user);
  
  // Show success message with auto-hide
  const showSuccess = (message) => {
    setSuccessMessage(message);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };
  
  // Handle create/update
  const handleSubmit = async (formData) => {
    if (selectedItem && !canUpdate) {
      setError(`You don't have permission to update this ${entityName}`);
      return false;
    }
    
    if (!selectedItem && !canCreate) {
      setError(`You don't have permission to create a new ${entityName}`);
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      let response;
      
      if (selectedItem) {
        // Update existing item - use MongoDB's _id if available, fallback to id
        const itemId = selectedItem._id || selectedItem.id;
        response = await api.update(itemId, formData);
      } else {
        // Create new item - let MongoDB generate the _id
        response = await api.create(formData);
      }
      
      if (response && response.success) {
        // Refresh data
        if (typeof refreshData === 'function') {
          await refreshData();
        } else if (typeof fetchFunction === 'function') {
          await fetchFunction();
        }
        
        showSuccess(selectedItem ? 
          `${entityName.charAt(0).toUpperCase() + entityName.slice(1)} updated successfully!` : 
          `${entityName.charAt(0).toUpperCase() + entityName.slice(1)} created successfully!`);
        
        setShowForm(false);
        setSelectedItem(null);
        
        if (typeof onSuccess === 'function') {
          onSuccess(response.data);
        }
        
        return true;
      } else {
        throw new Error(response.message || `Failed to save ${entityName}`);
      }
    } catch (err) {
      console.error(`Error saving ${entityName}:`, err);
      setError(err.message || `Failed to save ${entityName}. Please try again.`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle delete
  const handleDelete = async (id, confirmModalContext = null) => {
    if (!canDelete) {
      setError(`You don't have permission to delete this ${entityName}`);
      return false;
    }
    
    // If confirm modal context is provided, use it for confirmation
    if (confirmModalContext) {
      return new Promise((resolve) => {
        confirmModalContext.showDeleteConfirm({
          itemName: entityName,
          onConfirm: async () => {
            const result = await performDelete(id);
            resolve(result);
          },
          onCancel: () => {
            resolve(false);
          }
        });
      });
    } else {
      // Fallback to browser's native confirm
      if (!confirm(`Are you sure you want to delete this ${entityName}?`)) {
        return false;
      }
      
      return await performDelete(id);
    }
  };
  
  // Perform the actual delete operation
  const performDelete = async (id) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.delete(id);
      
      if (response && response.success) {
        // Refresh data
        if (typeof refreshData === 'function') {
          await refreshData();
        } else if (typeof fetchFunction === 'function') {
          await fetchFunction();
        }
        
        showSuccess(`${entityName.charAt(0).toUpperCase() + entityName.slice(1)} deleted successfully!`);
        return true;
      } else {
        throw new Error(response.message || `Failed to delete ${entityName}`);
      }
    } catch (err) {
      console.error(`Error deleting ${entityName}:`, err);
      setError(err.message || `Failed to delete ${entityName}. Please try again.`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle edit
  const handleEdit = (item) => {
    if (!canUpdate) {
      setError(`You don't have permission to update this ${entityName}`);
      return;
    }
    
    setSelectedItem(item);
    setShowForm(true);
    setError(null);
  };
  
  // Handle add new
  const handleAdd = () => {
    if (!canCreate) {
      setError(`You don't have permission to create a new ${entityName}`);
      return;
    }
    
    setSelectedItem(null);
    setShowForm(true);
    setError(null);
  };
  
  // Handle cancel form
  const handleCancel = () => {
    setShowForm(false);
    setSelectedItem(null);
    setError(null);
  };
  
  return {
    isLoading,
    error,
    setError,
    successMessage,
    selectedItem,
    setSelectedItem,
    showForm,
    setShowForm,
    handleSubmit,
    handleDelete,
    handleEdit,
    handleAdd,
    handleCancel,
    showSuccess,
    canCreate,
    canUpdate,
    canDelete
  };
};

/**
 * Component for displaying success message
 * 
 * @param {Object} props - Component props
 * @returns {h.JSX.Element} - Success message component
 */
export const SuccessMessage = ({ message }) => {
  if (!message) return null;
  
  return (
    <div class="mb-6 bg-green-50 border-l-4 border-green-400 p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-green-700">{message}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Component for displaying error message
 * 
 * @param {Object} props - Component props
 * @returns {h.JSX.Element} - Error message component
 */
export const ErrorMessage = ({ message }) => {
  if (!message) return null;
  
  return (
    <div class="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-red-700">{message}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Component for displaying loading state
 * 
 * @param {Object} props - Component props
 * @returns {h.JSX.Element} - Loading component
 */
export const LoadingState = ({ message = 'Loading...' }) => {
  return (
    <div class="text-center py-12 bg-white rounded-lg shadow">
      <svg class="mx-auto h-12 w-12 text-gray-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="mt-2 text-sm text-gray-500">{message}</p>
    </div>
  );
};

/**
 * Component for displaying empty state
 * 
 * @param {Object} props - Component props
 * @returns {h.JSX.Element} - Empty state component
 */
export const EmptyState = ({ 
  title = 'No items found', 
  description = 'Get started by creating a new item.',
  buttonText = 'Add Item',
  onButtonClick = () => {},
  icon = null
}) => {
  return (
    <div class="text-center py-12 bg-white rounded-lg shadow">
      {icon || (
        <svg class="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      )}
      <h3 class="mt-2 text-sm font-medium text-gray-900">{title}</h3>
      <p class="mt-1 text-sm text-gray-500">{description}</p>
      <div class="mt-6">
        <button
          onClick={onButtonClick}
          class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

/**
 * Component for displaying search and filter controls
 * 
 * @param {Object} props - Component props
 * @returns {h.JSX.Element} - Search and filter controls component
 */
export const SearchAndFilterControls = ({
  searchTerm = '',
  onSearchChange = () => {},
  statusFilter = 'all',
  onStatusFilterChange = () => {},
  onAddClick = () => {},
  addButtonText = 'Add New',
  showExport = false,
  onExportClick = () => {},
  statusOptions = [
    { value: 'all', label: 'All Items' },
    { value: 'active', label: 'Active Items' },
    { value: 'inactive', label: 'Inactive Items' }
  ],
  additionalFilters = null,
  canAdd = true
}) => {
  return (
    <div class="bg-white shadow rounded-lg mb-6">
      <div class="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div class="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          {/* Search */}
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onInput={(e) => onSearchChange(e.target.value)}
              class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>

          {/* Status Filter */}
          <div class="w-48">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          {/* Additional Filters */}
          {additionalFilters}
        </div>

        {/* Actions */}
        <div class="flex space-x-3">
          {showExport && (
            <button 
              class="btn btn-outline flex items-center"
              onClick={onExportClick}
            >
              <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              Export
            </button>
          )}
          
          {canAdd && (
            <button 
              class="btn btn-primary flex items-center"
              onClick={onAddClick}
            >
              <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
              </svg>
              {addButtonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Component for displaying pagination controls
 * 
 * @param {Object} props - Component props
 * @returns {h.JSX.Element} - Pagination controls component
 */
export const PaginationControls = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  onPageChange = () => {}
}) => {
  // Don't show pagination if there's only one page
  if (totalPages <= 1) return null;
  
  // Calculate start and end item numbers
  const itemsPerPage = Math.ceil(totalItems / totalPages);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages if there are few
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      // Calculate start and end of page range
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust if at the beginning
      if (currentPage <= 2) {
        endPage = 4;
      }
      
      // Adjust if at the end
      if (currentPage >= totalPages - 1) {
        startPage = totalPages - 3;
      }
      
      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pages.push('...');
      }
      
      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };
  
  return (
    <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
      <div class="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          class={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
            currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          class={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
            currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Next
        </button>
      </div>
      <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p class="text-sm text-gray-700">
            Showing <span class="font-medium">{startItem}</span> to <span class="font-medium">{endItem}</span> of{' '}
            <span class="font-medium">{totalItems}</span> results
          </p>
        </div>
        <div>
          <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            {/* Previous page button */}
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              class={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span class="sr-only">Previous</span>
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
            
            {/* Page numbers */}
            {getPageNumbers().map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  ...
                </span>
              ) : (
                <button
                  key={`page-${page}`}
                  onClick={() => onPageChange(page)}
                  class={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    currentPage === page
                      ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              )
            ))}
            
            {/* Next page button */}
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              class={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span class="sr-only">Next</span>
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};
