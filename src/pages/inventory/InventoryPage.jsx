import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Modal from '../../components/common/Modal';
import { FilterSelect } from '../../components/common';
import InventoryForm from '../../components/inventory/InventoryForm';
import AddStockForm from '../../components/inventory/AddStockForm';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import { hasPermission } from '../../utils/pageHelpers';
import { getFromStorage, storeInStorage } from '../../utils/localStorageHelpers';
import { getItemStatus } from '../../utils/lowStockHelpers';
import { createCostHistoryRecord, saveCostHistory } from '../../utils/costHistoryHelpers';
import { createInventoryHistoryRecord, saveInventoryHistory } from '../../utils/inventoryHistoryHelpers';
import { useConfirmModal } from '../../contexts/ModalContext';

const InventoryPage = () => {
  // Get user data from auth context
  const { user } = useAuth();
  const confirmModal = useConfirmModal();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  
  // Add Stock modal state
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [stockItem, setStockItem] = useState(null);

  // Inventory state
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch inventory items from local storage or API
  const fetchData = async () => {
    setLoading(true);
    try {
      // Try to get inventory items from local storage
      const storedInventory = getFromStorage('inventory');
      
      if (storedInventory && Array.isArray(storedInventory)) {
        // Add status field based on quantity and unit using new low stock logic
        const itemsWithStatus = storedInventory.map(item => {
          const status = getItemStatus(item.quantity || 0, item.unit || 'pcs');
          return { ...item, status };
        });
        
        setInventoryItems(itemsWithStatus);
        setError(null);
      } else {
        // Fallback to API if not in local storage
        const inventoryResponse = await api.inventory.getAll();
        
        if (inventoryResponse && inventoryResponse.success) {
          // Add status field based on quantity and unit using new low stock logic
          const itemsWithStatus = (inventoryResponse.data || []).map(item => {
            const status = getItemStatus(item.quantity || 0, item.unit || 'pcs');
            return { ...item, status };
          });
          
          setInventoryItems(itemsWithStatus);
          setError(null);
        } else {
          throw new Error(inventoryResponse.message || 'Failed to fetch inventory items');
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [user]);

  // Available categories for filtering
  const categories = ['all', 'Widgets', 'Components', 'Parts', 'Tools'];

  // Apply client-side filtering for search term and category
  const filteredItems = inventoryItems
    .filter(item => {
      const matchesSearch = searchTerm === '' || 
                           item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (item.itemCode && item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'quantity') {
        comparison = a.quantity - b.quantity;
      } else if (sortBy === 'costPrice') {
        comparison = a.costPrice - b.costPrice;
      } else if (sortBy === 'sellingPrice') {
        comparison = a.sellingPrice - b.sellingPrice;
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
  
  // Export to CSV
  const exportToCSV = (items) => {
    // Define CSV headers
    const headers = [
      'Item Code',
      'Name',
      'Category',
      'Brand',
      'Model',
      'Quantity',
      'Unit',
      'Cost Price',
      'Selling Price',
      'Status'
    ];
    
    // Convert items to CSV rows
    const rows = items.map(item => {
      return [
        item.itemCode || '',
        item.name || '',
        item.category || '',
        item.brand || '',
        item.model || '',
        item.quantity || 0,
        item.unit || '',
        item.costPrice ? `$${item.costPrice.toFixed(2)}` : '$0.00',
        item.sellingPrice ? `$${item.sellingPrice.toFixed(2)}` : '$0.00',
        item.status
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
  
  // Calculate inventory statistics
  const inventoryStats = {
    totalItems: filteredItems.length,
    inStock: filteredItems.filter(item => item.status === 'In Stock').length,
    lowStock: filteredItems.filter(item => item.status === 'Low Stock').length,
    outOfStock: filteredItems.filter(item => item.status === 'Out of Stock').length,
    totalValue: filteredItems.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0).toFixed(2)
  };

  return (
    <div>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <p class="mt-1 text-sm text-gray-500">Manage your inventory items, stock levels, and pricing</p>
      </div>
      
      {/* Inventory Statistics */}
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div class="bg-white shadow rounded-lg p-4 flex flex-col items-center justify-center">
          <span class="text-sm font-medium text-gray-500">Total Items</span>
          <span class="text-2xl font-bold text-gray-900">{inventoryStats.totalItems}</span>
        </div>
        <div class="bg-white shadow rounded-lg p-4 flex flex-col items-center justify-center">
          <span class="text-sm font-medium text-gray-500">In Stock</span>
          <span class="text-2xl font-bold text-green-600">{inventoryStats.inStock}</span>
        </div>
        <div class="bg-white shadow rounded-lg p-4 flex flex-col items-center justify-center">
          <span class="text-sm font-medium text-gray-500">Low Stock</span>
          <span class="text-2xl font-bold text-yellow-600">{inventoryStats.lowStock}</span>
        </div>
        <div class="bg-white shadow rounded-lg p-4 flex flex-col items-center justify-center">
          <span class="text-sm font-medium text-gray-500">Out of Stock</span>
          <span class="text-2xl font-bold text-red-600">{inventoryStats.outOfStock}</span>
        </div>
        <div class="bg-white shadow rounded-lg p-4 flex flex-col items-center justify-center">
          <span class="text-sm font-medium text-gray-500">Total Value</span>
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

            {/* Category Filter */}
            <div>
              <FilterSelect
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={categories.map(category => ({
                  id: category,
                  name: category === 'all' ? 'All Categories' : category
                }))}
                optionValueKey="id"
                optionLabelKey="name"
              />
            </div>
          </div>

          {/* Actions */}
          <div class="flex space-x-3">
            <button 
              class="btn btn-outline flex items-center"
              onClick={() => exportToCSV(filteredItems)}
            >
              <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              Export CSV
            </button>
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
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div class="flex items-center cursor-pointer" onClick={() => handleSort('name')}>
                      Item
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Model
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div class="flex items-center cursor-pointer" onClick={() => handleSort('quantity')}>
                      Stock
                      {getSortIcon('quantity')}
                    </div>
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div class="flex items-center cursor-pointer" onClick={() => handleSort('costPrice')}>
                      Cost Price
                      {getSortIcon('costPrice')}
                    </div>
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div class="flex items-center cursor-pointer" onClick={() => handleSort('sellingPrice')}>
                      Selling Price
                      {getSortIcon('sellingPrice')}
                    </div>
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item._id || item.id}>
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
                      {item.itemCode}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.category}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.brand || '-'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.model || '-'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.quantity}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${item.costPrice.toFixed(2)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${item.sellingPrice.toFixed(2)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.status === 'In Stock' ? 'bg-green-100 text-green-800' : 
                        item.status === 'Out of Stock' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div class="flex justify-end space-x-2">
                        {hasPermission('inventory-edit', user) && (
                          <>
                            <button 
                              class="inline-flex items-center px-2.5 py-1.5 border border-green-300 shadow-sm text-xs font-medium rounded text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              onClick={() => {
                                setStockItem(item);
                                setIsAddStockOpen(true);
                              }}
                              title="Add Stock"
                            >
                              <svg class="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                              </svg>
                              Stock
                            </button>
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
                          </>
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
                                      itemCode: item.itemCode,
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
          initialData={currentItem}
          onCancel={() => setIsFormOpen(false)}
          onSave={async (itemData) => {
            try {
              setLoading(true);
              
              let response;
              if (currentItem) {
                // Update existing item
                response = await api.inventory.update(currentItem._id, itemData);
              } else {
                // Create new item
                response = await api.inventory.create(itemData);
              }
              
              if (response && response.success) {
                // Refresh inventory data
                await fetchData();
                setIsFormOpen(false);
                setCurrentItem(null);
                setError(null);
              } else {
                throw new Error(response.message || 'Failed to save inventory item');
              }
            } catch (err) {
              console.error('Error saving inventory item:', err);
              setError(err.message || 'Failed to save inventory item. Please try again.');
            } finally {
              setLoading(false);
            }
          }}
        />
      </Modal>

      {/* Add Stock Modal */}
      <Modal
        isOpen={isAddStockOpen}
        onClose={() => setIsAddStockOpen(false)}
        title="Add Stock"
        size="lg"
      >
        <AddStockForm
          item={stockItem}
          onCancel={() => setIsAddStockOpen(false)}
          onSave={async (stockData) => {
            try {
              setLoading(true);
              
              // Refresh inventory data after adding stock
              await fetchData();
              setIsAddStockOpen(false);
              setStockItem(null);
              setError(null);
            } catch (err) {
              console.error('Error adding stock:', err);
              setError(err.message || 'Failed to add stock. Please try again.');
            } finally {
              setLoading(false);
            }
          }}
        />
      </Modal>
    </div>
  );
};

export default InventoryPage;
