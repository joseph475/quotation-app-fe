import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Modal from '../../components/common/Modal';
import { FilterSelect } from '../../components/common';
import StockTransferForm from '../../components/inventory/StockTransferForm';
import api from '../../services/api';

const StockTransferPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // State for branches
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);

  // State for inventory items and transfers
  const [inventoryItems, setInventoryItems] = useState([]);
  const [transferHistory, setTransferHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch inventory items, stock transfers, and branches from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch inventory items
        const inventoryResponse = await api.inventory.getAll();
        if (inventoryResponse && inventoryResponse.success) {
          setInventoryItems(inventoryResponse.data || []);
        } else {
          throw new Error('Failed to fetch inventory items');
        }
        
        // Fetch stock transfers
        const transfersResponse = await api.stockTransfers.getAll();
        if (transfersResponse && transfersResponse.success) {
          setTransferHistory(transfersResponse.data || []);
        } else {
          throw new Error('Failed to fetch stock transfers');
        }
        
        // Fetch branches
        setLoadingBranches(true);
        const branchesResponse = await api.branches.getAll();
        if (branchesResponse && branchesResponse.data) {
          setBranches(branchesResponse.data);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
        setLoadingBranches(false);
      }
    };
    
    fetchData();
  }, []);

  // Get branch names for filtering
  const branchNames = ['all', ...branches.map(branch => branch.name)];

  // Filter and sort transfer history
  const filteredTransfers = transferHistory
    .filter(transfer => {
      // Get item name and SKU from the populated itemId field
      const itemName = transfer.itemId?.name || '';
      const itemSku = transfer.itemId?.itemCode || '';
      
      const matchesSearch = 
        itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        itemSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transfer.transferNumber && transfer.transferNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesBranch = 
        branchFilter === 'all' || 
        transfer.fromBranch === branchFilter || 
        transfer.toBranch === branchFilter;
      
      return matchesSearch && matchesBranch;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.transferDate || a.createdAt) - new Date(b.transferDate || b.createdAt);
      } else if (sortBy === 'quantity') {
        comparison = a.quantity - b.quantity;
      } else if (sortBy === 'item') {
        const aName = a.itemId?.name || '';
        const bName = b.itemId?.name || '';
        comparison = aName.localeCompare(bName);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
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

  // Handle stock transfer
  const handleTransfer = async (transferData) => {
    setLoading(true);
    try {
      console.log('Creating stock transfer with data:', {
        itemId: transferData.itemId,
        fromBranch: transferData.fromBranch,
        fromBranchId: transferData.fromBranchId,
        toBranch: transferData.toBranch,
        toBranchId: transferData.toBranchId,
        quantity: transferData.quantity
      });
      
      // Create stock transfer in the API
      const requestData = {
        itemId: transferData.itemId,
        fromBranch: transferData.fromBranch,
        fromBranchId: transferData.fromBranchId,
        toBranch: transferData.toBranch,
        toBranchId: transferData.toBranchId,
        quantity: parseInt(transferData.quantity),
        notes: transferData.notes,
        transferDate: new Date().toISOString(),
        status: 'Completed'
      };
      
      console.log('Full request data being sent to API:', requestData);
      console.log('API endpoint being used:', '/stock-transfers/process');
      
      try {
        console.log('Sending API request...');
        const response = await api.stockTransfers.create(requestData);
        console.log('API response received:', response);
        
        if (response && response.success) {
          console.log('Stock transfer created successfully');
          
          // Refresh the transfer history
          console.log('Refreshing transfer history...');
          const transfersResponse = await api.stockTransfers.getAll();
          console.log('Transfer history response:', transfersResponse);
          
          if (transfersResponse && transfersResponse.success) {
            setTransferHistory(transfersResponse.data || []);
            console.log('Transfer history updated with', transfersResponse.data?.length || 0, 'items');
          }
          
          // Refresh inventory items to get updated quantities
          console.log('Refreshing inventory items...');
          const inventoryResponse = await api.inventory.getAll();
          console.log('Inventory response:', inventoryResponse);
          
          if (inventoryResponse && inventoryResponse.success) {
            setInventoryItems(inventoryResponse.data || []);
            console.log('Inventory items updated with', inventoryResponse.data?.length || 0, 'items');
          }
          
          setError(null);
          console.log('Stock transfer process completed successfully');
        } else {
          console.error('API returned error response:', response);
          throw new Error('Failed to create stock transfer: ' + (response?.message || 'Unknown error'));
        }
      } catch (apiError) {
        console.error('API error details:', apiError);
        console.error('API error message:', apiError.message);
        console.error('API error stack:', apiError.stack);
        throw apiError;
      }
    } catch (err) {
      console.error('Error creating stock transfer:', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      setError('Failed to create stock transfer: ' + (err.message || 'Please try again.'));
    } finally {
      setLoading(false);
      // Close the form
      setIsFormOpen(false);
    }
  };
  
  // Helper function to determine status based on stock level
  const getStatusFromStock = (stock) => {
    if (stock <= 0) return 'Out of Stock';
    if (stock <= 5) return 'Low Stock';
    return 'In Stock';
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Stock Transfers</h1>
        <p class="mt-1 text-sm text-gray-500">Transfer inventory items between branches</p>
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
                placeholder="Search transfers..."
                value={searchTerm}
                onInput={(e) => setSearchTerm(e.target.value)}
                class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>

            {/* Branch Filter */}
            <div>
              <FilterSelect
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                options={[{ id: 'all', name: 'All Branches' }, ...branches.map(branch => ({ id: branch.name, name: branch.name }))]}
                optionValueKey="id"
                optionLabelKey="name"
                disabled={loadingBranches}
              />
            </div>
          </div>

          {/* Actions */}
          <div class="flex space-x-3">
            <button class="btn btn-outline flex items-center">
              <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              Export
            </button>
            <button 
              class="btn btn-primary flex items-center"
              onClick={() => setIsFormOpen(true)}
            >
              <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
              </svg>
              New Transfer
            </button>
          </div>
        </div>
      </div>

      {/* Transfer History Table */}
      <div class="bg-white shadow rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div class="flex items-center cursor-pointer" onClick={() => handleSort('date')}>
                    Date
                    {getSortIcon('date')}
                  </div>
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div class="flex items-center cursor-pointer" onClick={() => handleSort('item')}>
                    Item
                    {getSortIcon('item')}
                  </div>
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  From
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  To
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div class="flex items-center cursor-pointer" onClick={() => handleSort('quantity')}>
                    Quantity
                    {getSortIcon('quantity')}
                  </div>
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {filteredTransfers.map((transfer) => {
                // Get item details from the populated itemId field
                const itemName = transfer.itemId?.name || '';
                const itemSku = transfer.itemId?.itemCode || '';
                const firstLetter = itemName.charAt(0) || 'I';
                
                return (
                  <tr key={transfer._id}>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transfer.transferDate || transfer.createdAt)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-md flex items-center justify-center text-gray-500">
                          {firstLetter}
                        </div>
                        <div class="ml-4">
                          <div class="text-sm font-medium text-gray-900">{itemName}</div>
                          <div class="text-sm text-gray-500">{itemSku}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transfer.fromBranch}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transfer.toBranch}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transfer.quantity}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {transfer.status}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {transfer.notes || '-'}
                    </td>
                  </tr>
                );
              })}
              {filteredTransfers.length === 0 && (
                <tr>
                  <td colSpan="7" class="px-6 py-4 text-center text-sm text-gray-500">
                    No transfers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {filteredTransfers.length > 0 && (
          <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div class="flex-1 flex justify-between sm:hidden">
              <a href="#" class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Previous
              </a>
              <a href="#" class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Next
              </a>
            </div>
            <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p class="text-sm text-gray-700">
                  Showing <span class="font-medium">1</span> to <span class="font-medium">{filteredTransfers.length}</span> of <span class="font-medium">{filteredTransfers.length}</span> results
                </p>
              </div>
              <div>
                <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <a href="#" class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    <span class="sr-only">Previous</span>
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </a>
                  <a href="#" class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                    1
                  </a>
                  <a href="#" class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    <span class="sr-only">Next</span>
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                  </a>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stock Transfer Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Transfer Stock Between Branches"
        size="lg"
      >
        <StockTransferForm
          inventoryItems={inventoryItems}
          onCancel={() => setIsFormOpen(false)}
          onTransfer={handleTransfer}
        />
      </Modal>
    </div>
  );
};

export default StockTransferPage;
