import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Modal from '../../components/common/Modal';
import { FilterSelect } from '../../components/common';
import InventoryForm from '../../components/inventory/InventoryForm';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { hasPermission } from '../../utils/pageHelpers';
import { getFromStorage, storeInStorage } from '../../utils/localStorageHelpers';
import { getItemStatus } from '../../utils/lowStockHelpers';
import { createCostHistoryRecord, saveCostHistory } from '../../utils/costHistoryHelpers';
import { createInventoryHistoryRecord, saveInventoryHistory } from '../../utils/inventoryHistoryHelpers';
import { useConfirmModal } from '../../contexts/ModalContext';
import { deduplicateRequest } from '../../utils/requestDeduplication';

const InventoryPage = () => {
  // Get user data from auth context
  const { user } = useAuth();
  const confirmModal = useConfirmModal();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);

  // Inventory state
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [pagination, setPagination] = useState({});
  
  // Fetch inventory items with pagination
  const fetchData = async (page = currentPage, limit = itemsPerPage, useCache = true) => {
    if (loading) return; // Prevent multiple simultaneous requests
    
    setLoading(true);
    setError(null);
    
    try {
      // For pagination, we need to fetch from API directly
      // Only use cache for the first page if useCache is true
      if (useCache && page === 1) {
        const storedInventory = getFromStorage('inventory');
        
        if (storedInventory && Array.isArray(storedInventory) && storedInventory.length > 0) {
          // Add status field based on quantity and unit using new low stock logic
          const itemsWithStatus = storedInventory.map(item => {
            const status = getItemStatus(item.quantity || 0, item.unit || 'pcs');
            return { ...item, status };
          });
          
          setInventoryItems(itemsWithStatus);
          setLoading(false);
          return;
        }
      }
      
      // Fetch from API with pagination parameters
      const params = {
        page: page,
        limit: limit,
        sort: sortOrder === 'desc' ? `-${sortBy}` : sortBy
      };
      
      const inventoryResponse = await api.inventory.getAll(params);
      
      if (inventoryResponse && inventoryResponse.success) {
        // Add status field based on quantity and unit using new low stock logic
        const itemsWithStatus = (inventoryResponse.data || []).map(item => {
          const status = getItemStatus(item.quantity || 0, item.unit || 'pcs');
          return { ...item, status };
        });
        
        setInventoryItems(itemsWithStatus);
        setPagination(inventoryResponse.pagination || {});
        setTotalItems(inventoryResponse.total || inventoryResponse.count || 0);
        
        // Store in local storage only for first page
        if (page === 1) {
          storeInStorage('inventory', inventoryResponse.data || []);
        }
      } else {
        throw new Error(inventoryResponse?.message || 'Failed to fetch inventory items');
      }
    } catch (err) {
      console.error('Error fetching inventory data:', err);
      setError(err.message || 'Failed to load inventory data. Please try again.');
      // Set empty array to stop loading state
      setInventoryItems([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Refetch when pagination or sorting changes
  useEffect(() => {
    if (user) {
      fetchData(currentPage, itemsPerPage, false);
    }
  }, [currentPage, itemsPerPage, sortBy, sortOrder]);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  // Apply client-side filtering for search term
  const filteredItems = inventoryItems
    .filter(item => {
      const matchesSearch = searchTerm === '' || 
                           item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (item.barcode && item.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (item.itemcode && item.itemcode.toString().includes(searchTerm));
      
      return matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'itemcode') {
        comparison = a.itemcode - b.itemcode;
      } else if (sortBy === 'cost') {
        comparison = a.cost - b.cost;
      } else if (sortBy === 'price') {
        comparison = a.price - b.price;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Handle sorting
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };
  
  // Export to CSV - fetch all items
  const exportToCSV = async () => {
    try {
      setLoading(true);
      
      // Fetch all items without pagination
      const allItemsResponse = await api.inventory.getAll({ 
        limit: 10000, // Large limit to get all items
        sort: sortOrder === 'desc' ? `-${sortBy}` : sortBy 
      });
      
      if (!allItemsResponse || !allItemsResponse.success) {
        throw new Error('Failed to fetch inventory items for export');
      }
      
      const allItems = allItemsResponse.data || [];
      
      // Define CSV headers
      const headers = [
        'Item Code',
        'Barcode',
        'Name',
        'Unit',
        'Cost',
        'Price'
      ];
      
      // Convert items to CSV rows
      const rows = allItems.map(item => {
        return [
          item.itemcode || '',
          item.barcode || '',
          item.name || '',
          item.unit || '',
          item.cost ? `$${item.cost.toFixed(2)}` : '$0.00',
          item.price ? `$${item.price.toFixed(2)}` : '$0.00'
        ];
      });
      
      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Show success message
      setImportSuccess(`Successfully exported ${allItems.length} inventory items to CSV!`);
      setTimeout(() => {
        setImportSuccess('');
      }, 3000);
      
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setError(err.message || 'Failed to export inventory items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
  
  // Handle Excel file import
  const handleExcelImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xlsx',
      '.xls'
    ];
    
    const isValidType = validTypes.some(type => 
      file.type === type || file.name.toLowerCase().endsWith(type)
    );
    
    if (!isValidType) {
      setError('Please select a valid Excel file (.xlsx or .xls)');
      event.target.value = ''; // Reset file input
      return;
    }

    // Validate file size (50MB limit to match server configuration)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      setError(`File size too large. Please select a file smaller than 50MB. Current file size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      event.target.value = ''; // Reset file input
      return;
    }

    setIsImporting(true);
    setError(null);
    setImportSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.inventory.importExcel(formData);

      if (response && response.success) {
        // Refresh inventory data
        await fetchData();
        setImportSuccess(`Successfully imported ${response.data.imported || 0} items from Excel file!`);
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setImportSuccess('');
        }, 5000);
      } else {
        throw new Error(response.message || 'Failed to import Excel file');
      }
    } catch (err) {
      console.error('Error importing Excel file:', err);
      let errorMessage = 'Failed to import Excel file. Please check the file format and try again.';
      
      // Handle specific error messages
      if (err.message.includes('request entity too large')) {
        errorMessage = 'File size too large. Please reduce the file size or split it into smaller files.';
      } else if (err.message.includes('Server error')) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsImporting(false);
      event.target.value = ''; // Reset file input
    }
  };

  // Calculate inventory statistics
  const inventoryStats = {
    totalItems: totalItems || filteredItems.length,
    totalValue: filteredItems.reduce((sum, item) => sum + (item.cost || 0), 0).toFixed(2)
  };

  return (
    <div>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <p class="mt-1 text-sm text-gray-500">Manage your inventory items, stock levels, and pricing</p>
      </div>
      
      {/* Inventory Statistics */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div class="bg-white shadow rounded-lg p-4 flex flex-col items-center justify-center">
          <span class="text-sm font-medium text-gray-500">Total Items</span>
          <span class="text-2xl font-bold text-gray-900">{inventoryStats.totalItems}</span>
        </div>
        <div class="bg-white shadow rounded-lg p-4 flex flex-col items-center justify-center">
          <span class="text-sm font-medium text-gray-500">Total Cost Value</span>
          <span class="text-2xl font-bold text-primary-600">${inventoryStats.totalValue}</span>
        </div>
      </div>

      {/* Filters and Actions */}
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
                placeholder="Search items..."
                value={searchTerm}
                onInput={(e) => setSearchTerm(e.target.value)}
                class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>

          </div>

            {/* Actions */}
            <div class="flex space-x-3">
              <button 
                class="btn btn-outline flex items-center"
                onClick={() => {
                  // Clear local storage and refetch from API
                  localStorage.removeItem('inventory');
                  fetchData();
                }}
                disabled={loading}
              >
                <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                </svg>
                Refresh
              </button>
              <button 
                class="btn btn-outline flex items-center"
                onClick={exportToCSV}
                disabled={loading}
              >
                <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
                Export CSV
              </button>
              {/* Import Excel button for superadmin only */}
              {user?.role === 'superadmin' && (
                <div class="relative">
                  <input
                    type="file"
                    id="excel-import"
                    accept=".xlsx,.xls"
                    onChange={handleExcelImport}
                    class="hidden"
                    disabled={isImporting}
                  />
                  <button 
                    class="btn btn-secondary flex items-center"
                    onClick={() => document.getElementById('excel-import').click()}
                    disabled={isImporting}
                  >
                    {isImporting ? (
                      <svg class="h-5 w-5 mr-2 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                      </svg>
                    )}
                    {isImporting ? 'Importing...' : 'Import Excel'}
                  </button>
                </div>
              )}
              {hasPermission('inventory-create', user) && (
                <button 
                  class="btn btn-primary flex items-center"
                  onClick={() => {
                    setCurrentItem(null);
                    setIsFormOpen(true);
                  }}
                >
                  <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                  </svg>
                  Add Item
                </button>
              )}
            </div>
        </div>
      </div>

      {/* Success message */}
      {importSuccess && (
        <div class="mb-6 bg-green-50 border-l-4 border-green-400 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-green-700">
                {importSuccess}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div class="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Loading state */}
      {loading && !isFormOpen && (
        <div class="text-center py-12 bg-white rounded-lg shadow mb-6">
          <svg class="mx-auto h-12 w-12 text-gray-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="mt-2 text-sm text-gray-500">Loading inventory items...</p>
        </div>
      )}
      
      {/* Inventory Table */}
      {!loading && (
        <div class="bg-white shadow rounded-lg overflow-hidden">
          {filteredItems.length > 0 ? (
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div class="flex items-center cursor-pointer" onClick={() => handleSort('itemcode')}>
                        Item Code
                        {getSortIcon('itemcode')}
                      </div>
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Barcode
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div class="flex items-center cursor-pointer" onClick={() => handleSort('name')}>
                        Name
                        {getSortIcon('name')}
                      </div>
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div class="flex items-center cursor-pointer" onClick={() => handleSort('cost')}>
                        Cost
                        {getSortIcon('cost')}
                      </div>
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div class="flex items-center cursor-pointer" onClick={() => handleSort('price')}>
                        Price
                        {getSortIcon('price')}
                      </div>
                    </th>
                    <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item._id || item.id}>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.itemcode}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.barcode}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <div class="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-md flex items-center justify-center text-gray-500">
                            {item.name.charAt(0)}
                          </div>
                          <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">{item.name}</div>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.unit}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${item.cost ? item.cost.toFixed(2) : '0.00'}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${item.price ? item.price.toFixed(2) : '0.00'}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex justify-end space-x-2">
                          {hasPermission('inventory-edit', user) && (
                            <button 
                              class="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                              onClick={() => {
                                setCurrentItem(item);
                                setIsFormOpen(true);
                              }}
                            >
                              <svg class="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                              Edit
                            </button>
                          )}
                          {hasPermission('inventory-delete', user) && (
                            <button 
                              class="inline-flex items-center px-2.5 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              onClick={() => {
                                confirmModal.showDeleteConfirm({
                                  itemName: 'inventory item',
                                  itemIdentifier: item.name,
                                  onConfirm: async () => {
                                    try {
                                      setLoading(true);
                                      
                                      const deleteHistoryRecord = createInventoryHistoryRecord({
                                        itemId: item._id,
                                        itemName: item.name,
                                        itemCode: item.itemcode,
                                        operation: 'delete_item',
                                        beforeData: item,
                                        afterData: {},
                                        reason: 'Item deleted by user',
                                        userId: user?._id || user?.id || 'unknown',
                                        userName: user?.name || user?.email || 'Unknown User'
                                      });
                                      
                                      // Save inventory history
                                      saveInventoryHistory(deleteHistoryRecord);
                                      
                                      const response = await api.inventory.delete(item._id);
                                      
                                      if (response && response.success) {
                                        // Get updated inventory list
                                        const updatedInventoryResponse = await api.inventory.getAll();
                                        
                                        if (updatedInventoryResponse && updatedInventoryResponse.success) {
                                          // Update local storage with new inventory data
                                          storeInStorage('inventory', updatedInventoryResponse.data || []);
                                          
                                          // Add status field based on quantity using improved logic
                                          const itemsWithStatus = (updatedInventoryResponse.data || []).map(item => {
                                            const status = getItemStatus(item.quantity || 0, item.unit || 'pcs');
                                            return { ...item, status };
                                          });
                                          
                                          // Update state
                                          setInventoryItems(itemsWithStatus);
                                        } else {
                                          // If API call fails, just remove from local state
                                          setInventoryItems(prev => prev.filter(i => i._id !== item._id));
                                        }
                                        
                                        setError(null);
                                      } else {
                                        throw new Error(response.message || 'Failed to delete inventory item');
                                      }
                                    } catch (err) {
                                      console.error('Error deleting inventory item:', err);
                                      setError(err.message || 'Failed to delete inventory item. Please try again.');
                                    } finally {
                                      setLoading(false);
                                    }
                                  }
                                });
                              }}
                            >
                              <svg class="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                              </svg>
                              Delete
                            </button>
                          )}
                          {!hasPermission('inventory-edit', user) && !hasPermission('inventory-delete', user) && (
                            <span class="text-gray-400">View Only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div class="text-center py-12">
              <svg class="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 class="mt-2 text-sm font-medium text-gray-900">No inventory items</h3>
              <p class="mt-1 text-sm text-gray-500">
                {searchTerm ? 'No items match your search criteria.' : 'Get started by adding your first inventory item.'}
              </p>
              {hasPermission('inventory-create', user) && !searchTerm && (
                <div class="mt-6">
                  <button 
                    class="btn btn-primary flex items-center mx-auto"
                    onClick={() => {
                      setCurrentItem(null);
                      setIsFormOpen(true);
                    }}
                  >
                    <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                    </svg>
                    Add First Item
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Pagination */}
          {filteredItems.length > 0 && (
            <div class="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div class="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.prev}
                  class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.next}
                  class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div class="flex items-center space-x-4">
                  <p class="text-sm text-gray-700">
                    Showing <span class="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                    <span class="font-medium">
                      {Math.min(currentPage * itemsPerPage, totalItems || filteredItems.length)}
                    </span> of{' '}
                    <span class="font-medium">{totalItems || filteredItems.length}</span> results
                  </p>
                  <div class="flex items-center space-x-2">
                    <label class="text-sm text-gray-700">Items per page:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                      class="border border-gray-300 rounded-md text-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                <div>
                  <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!pagination.prev}
                      class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span class="sr-only">Previous</span>
                      <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* Page numbers */}
                    {(() => {
                      const totalPages = Math.ceil((totalItems || filteredItems.length) / itemsPerPage);
                      const pages = [];
                      const maxVisiblePages = 5;
                      
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                      
                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                      }
                      
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => handlePageChange(i)}
                            class={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              i === currentPage
                                ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }
                      
                      return pages;
                    })()}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!pagination.next}
                      class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span class="sr-only">Next</span>
                      <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inventory Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={currentItem ? "Edit Inventory Item" : "Add New Inventory Item"}
        size="5xl"
      >
        <InventoryForm
          key={currentItem ? currentItem._id : 'new-item'}
          initialData={currentItem}
          onCancel={() => setIsFormOpen(false)}
          onSave={async (itemData) => {
            try {
              // Don't set loading state while form is open to prevent form reset
              let response;
              if (currentItem) {
                // Update existing item
                response = await api.inventory.update(currentItem._id, itemData);
              } else {
                // Create new item
                response = await api.inventory.create(itemData);
              }
              
              if (response && response.success) {
                // Update local state directly instead of calling fetchData()
                if (currentItem) {
                  // Update existing item in the list
                  setInventoryItems(prev => prev.map(item => 
                    item._id === currentItem._id 
                      ? { ...response.data, status: getItemStatus(response.data.quantity || 0, response.data.unit || 'pcs') }
                      : item
                  ));
                } else {
                  // Add new item to the list
                  const newItemWithStatus = { 
                    ...response.data, 
                    status: getItemStatus(response.data.quantity || 0, response.data.unit || 'pcs') 
                  };
                  setInventoryItems(prev => [...prev, newItemWithStatus]);
                }
                
                // Update local storage
                const updatedItems = currentItem 
                  ? inventoryItems.map(item => item._id === currentItem._id ? response.data : item)
                  : [...inventoryItems, response.data];
                storeInStorage('inventory', updatedItems);
                
                setIsFormOpen(false);
                setCurrentItem(null);
                setError(null);
              } else {
                throw new Error(response.message || 'Failed to save inventory item');
              }
            } catch (err) {
              console.error('Error saving inventory item:', err);
              setError(err.message || 'Failed to save inventory item. Please try again.');
            }
          }}
        />
      </Modal>

    </div>
  );
};

export default InventoryPage;
