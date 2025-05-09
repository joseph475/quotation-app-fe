import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Modal from '../../components/common/Modal';
import SaleForm from '../../components/sales/SaleForm';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import { useConfirmModal, useErrorModal } from '../../contexts/ModalContext';

const SalesPage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  const [sales, setSales] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Get current user from auth context
  const { user } = useAuth();
  
  // Fetch sales and branches from API
  const fetchSales = async () => {
    setLoading(true);
    try {
      // Build query parameters
      const queryParams = {};
      if (branchFilter) {
        queryParams.branch = branchFilter;
      }
      
      const response = await api.sales.getAll(queryParams);
      
      if (response && response.success) {
        setSales(response.data || []);
        setError(null);
      } else {
        throw new Error(response.message || 'Failed to fetch sales');
      }
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError('Failed to load sales. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch branches
  const fetchBranches = async () => {
    try {
      const response = await api.branches.getAll();
      if (response && response.success) {
        setBranches(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };
  
  // Set default branch filter based on user's branch
  useEffect(() => {
    if (user && user.branch && user.role !== 'admin') {
      setBranchFilter(user.branch._id);
    }
  }, [user]);
  
  useEffect(() => {
    fetchBranches();
    fetchSales();
  }, [branchFilter]);

  // Get modal contexts
  const { showConfirm, showDeleteConfirm } = useConfirmModal();
  const { showError } = useErrorModal();
  
  // Handle delete sale
  const handleDeleteSale = async () => {
    if (!selectedSale) return;
    
    showDeleteConfirm({
      itemName: 'sale',
      onConfirm: async () => {
        try {
          setLoading(true);
          const response = await api.sales.delete(selectedSale._id);
          
          if (response && response.success) {
            // Refresh sales list
            await fetchSales();
            setError(null);
            // Show success message
            showConfirm({
              title: 'Success',
              message: 'Sale has been successfully deleted.',
              confirmText: 'OK',
              cancelText: null,
              confirmButtonClass: 'bg-green-600 hover:bg-green-700',
              onConfirm: () => {},
            });
          } else {
            // Check if it's an authentication error (401)
            if (response.status === 401) {
              showError(
                'You do not have permission to delete this sale.',
                'Permission Error'
              );
            } else {
              throw new Error(response.message || 'Failed to delete sale');
            }
          }
        } catch (err) {
          console.error('Error deleting sale:', err);
          showError(err.message || 'Failed to delete sale. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Filter sales data based on active tab, search term, and date filter
  const filteredSales = sales.filter(sale => {
    const matchesTab = activeTab === 'all' || sale.status?.toLowerCase() === activeTab.toLowerCase();
    
    // Handle customer which might be an object or string
    const customerName = typeof sale.customer === 'string' 
      ? sale.customer 
      : (sale.customer?.name || '');
      
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (sale.saleNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    // Simple date filtering logic
    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = new Date(sale.createdAt).toDateString() === new Date().toDateString();
    } else if (dateFilter === 'week') {
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      const saleDate = new Date(sale.createdAt);
      matchesDate = saleDate >= weekAgo && saleDate <= today;
    } else if (dateFilter === 'month') {
      const today = new Date();
      const monthAgo = new Date();
      monthAgo.setMonth(today.getMonth() - 1);
      const saleDate = new Date(sale.createdAt);
      matchesDate = saleDate >= monthAgo && saleDate <= today;
    }
    
    return matchesTab && matchesSearch && matchesDate;
  });

  // Calculate total sales amount
  const totalSalesAmount = filteredSales.reduce((total, sale) => total + (sale.total || 0), 0);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Sales Management</h1>
        <p class="mt-1 text-sm text-gray-500">Track and manage your sales transactions</p>
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
      {loading && !isFormModalOpen && !isViewModalOpen && !isEditModalOpen && (
        <div class="text-center py-12 bg-white rounded-lg shadow mb-6">
          <svg class="mx-auto h-12 w-12 text-gray-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="mt-2 text-sm text-gray-500">Loading sales...</p>
        </div>
      )}

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
                placeholder="Search sales..."
                value={searchTerm}
                onInput={(e) => setSearchTerm(e.target.value)}
                class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>

            {/* Date Filter */}
            <div class="w-48">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            
            {/* Branch Filter - Only visible to admin users */}
            {user && user.role === 'admin' && (
              <div class="w-48">
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                >
                  <option value="">All Branches</option>
                  {branches.map(branch => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div class="flex space-x-3">
            <button 
              class="btn btn-primary flex items-center"
              onClick={() => setIsFormModalOpen(true)}
            >
              <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
              </svg>
              New Sale
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div class="border-b border-gray-200 mb-6">
        <nav class="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            class={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Sales
          </button>
          <button
            onClick={() => setActiveTab('paid')}
            class={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'paid'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Paid
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            class={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending
          </button>
        </nav>
      </div>

      {/* Sales Table */}
      <div class="bg-white shadow rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sale Number
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
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
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="6" class="px-6 py-8 text-center text-sm text-gray-500">
                    <div class="flex flex-col items-center">
                      <p>No sales found</p>
                      <p class="text-xs mt-1">Try adjusting your filters or create a new sale</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale._id}>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                      {sale.saleNumber}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {typeof sale.customer === 'string' 
                        ? sale.customer 
                        : (sale.customer?.name || 'Unknown Customer')}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {typeof sale.branch === 'string'
                        ? sale.branch
                        : (sale.branch?.name || 'Unknown Branch')}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(sale.total || 0).toFixed(2)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(sale.createdAt)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        sale.status === 'paid' ? 'bg-green-100 text-green-800' : 
                        sale.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sale.status === 'paid' ? 'Paid' : 
                         sale.status === 'partially_paid' ? 'Partially Paid' :
                         sale.status === 'pending' ? 'Pending' :
                         sale.status === 'cancelled' ? 'Cancelled' :
                         sale.status === 'refunded' ? 'Refunded' : 
                         sale.status}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div class="flex justify-end space-x-2">
                        <button 
                          class="text-primary-600 hover:text-primary-900"
                          onClick={() => {
                            setSelectedSale(sale);
                            setIsViewModalOpen(true);
                          }}
                        >
                          View
                        </button>
                        <button 
                          class="text-primary-600 hover:text-primary-900"
                          onClick={() => {
                            setSelectedSale(sale);
                            setIsEditModalOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        {/* Only show delete button for admin users */}
                        {user && user.role !== 'user' && (
                          <button 
                            class="text-red-600 hover:text-red-900"
                            onClick={() => {
                              setSelectedSale(sale);
                              handleDeleteSale();
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Sale Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title="Create New Sale"
        size="5xl"
      >
        <SaleForm
          onCancel={() => setIsFormModalOpen(false)}
          onSave={async (saleData) => {
            try {
              setLoading(true);
              const response = await api.sales.create(saleData);
              
              if (response && response.success) {
                // Refresh sales list
                await fetchSales();
                setError(null);
                setIsFormModalOpen(false);
                
                // Show success message
                showConfirm({
                  title: 'Success',
                  message: 'Sale has been successfully created.',
                  confirmText: 'OK',
                  cancelText: null,
                  confirmButtonClass: 'bg-green-600 hover:bg-green-700',
                  onConfirm: () => {},
                });
              } else {
                // Check if it's an authentication error (401)
                if (response.status === 401) {
                  showError(
                    'You do not have permission to create a sale.',
                    'Permission Error'
                  );
                } else {
                  throw new Error(response.message || 'Failed to create sale');
                }
              }
            } catch (err) {
              console.error('Error creating sale:', err);
              showError(err.message || 'Failed to create sale. Please try again.');
            } finally {
              setLoading(false);
            }
          }}
        />
      </Modal>

      {/* Edit Sale Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Sale"
        size="5xl"
      >
        {selectedSale && (
          <SaleForm
            initialData={selectedSale}
            onCancel={() => setIsEditModalOpen(false)}
            onSave={async (saleData) => {
              try {
                setLoading(true);
                const response = await api.sales.update(selectedSale._id, saleData);
                
                if (response && response.success) {
                  // Refresh sales list
                  await fetchSales();
                  setError(null);
                  setIsEditModalOpen(false);
                  
                  // Show success message
                  showConfirm({
                    title: 'Success',
                    message: 'Sale has been successfully updated.',
                    confirmText: 'OK',
                    cancelText: null,
                    confirmButtonClass: 'bg-green-600 hover:bg-green-700',
                    onConfirm: () => {},
                  });
                } else {
                  // Check if it's an authentication error (401)
                  if (response.status === 401) {
                    showError(
                      'You do not have permission to update this sale.',
                      'Permission Error'
                    );
                  } else {
                    throw new Error(response.message || 'Failed to update sale');
                  }
                }
              } catch (err) {
                console.error('Error updating sale:', err);
                showError(err.message || 'Failed to update sale. Please try again.');
              } finally {
                setLoading(false);
              }
            }}
          />
        )}
      </Modal>

      {/* Delete button now uses the showDeleteConfirm from ModalContext directly */}

      {/* View Sale Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Sale Details: ${selectedSale?.saleNumber || ''}`}
        size="5xl"
      >
        {selectedSale && (
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Sale Information</h3>
                <div class="bg-gray-50 p-4 rounded-lg">
                  <p class="mb-2"><span class="font-medium">Sale Number:</span> {selectedSale.saleNumber}</p>
                  <p class="mb-2"><span class="font-medium">Date:</span> {formatDate(selectedSale.createdAt)}</p>
                  <p class="mb-2"><span class="font-medium">Status:</span> 
                    <span class={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      selectedSale.status === 'paid' ? 'bg-green-100 text-green-800' : 
                      selectedSale.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedSale.status === 'paid' ? 'Paid' : 
                       selectedSale.status === 'partially_paid' ? 'Partially Paid' :
                       selectedSale.status === 'pending' ? 'Pending' :
                       selectedSale.status === 'cancelled' ? 'Cancelled' :
                       selectedSale.status === 'refunded' ? 'Refunded' : 
                       selectedSale.status}
                    </span>
                  </p>
                  <p class="mb-2"><span class="font-medium">Branch:</span> {
                    typeof selectedSale.branch === 'string'
                      ? selectedSale.branch
                      : (selectedSale.branch?.name || 'Unknown Branch')
                  }</p>
                  <p class="mb-2"><span class="font-medium">Created By:</span> {
                    typeof selectedSale.createdBy === 'string'
                      ? selectedSale.createdBy
                      : (selectedSale.createdBy?.name || 'Unknown User')
                  }</p>
                  <p class="mb-2"><span class="font-medium">Created At:</span> {formatDate(selectedSale.createdAt)}</p>
                  <p class="mb-2"><span class="font-medium">Updated At:</span> {formatDate(selectedSale.updatedAt)}</p>
                </div>
              </div>
              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Customer Information</h3>
                <div class="bg-gray-50 p-4 rounded-lg">
                  <p class="mb-2"><span class="font-medium">Customer:</span> {
                    typeof selectedSale.customer === 'string' 
                      ? selectedSale.customer 
                      : (selectedSale.customer?.name || 'Unknown Customer')
                  }</p>
                  {selectedSale.customer?.phone && (
                    <p class="mb-2"><span class="font-medium">Phone:</span> {selectedSale.customer.phone}</p>
                  )}
                </div>

                <h3 class="text-lg font-medium text-gray-900 mt-4 mb-2">Payment Information</h3>
                <div class="bg-gray-50 p-4 rounded-lg">
                  <p class="mb-2"><span class="font-medium">Payment Method:</span> {
                    selectedSale.paymentMethod === 'cash' ? 'Cash' :
                    selectedSale.paymentMethod === 'check' ? 'Check' :
                    selectedSale.paymentMethod === 'credit_card' ? 'Credit Card' :
                    selectedSale.paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
                    selectedSale.paymentMethod === 'online_payment' ? 'Online Payment' :
                    selectedSale.paymentMethod
                  }</p>
                  <p class="mb-2"><span class="font-medium">Total Amount:</span> ${(selectedSale.total || 0).toFixed(2)}</p>
                  <p class="mb-2"><span class="font-medium">Amount Paid:</span> ${(selectedSale.amountPaid || 0).toFixed(2)}</p>
                  <p class="mb-2"><span class="font-medium">Balance:</span> ${(selectedSale.balance || 0).toFixed(2)}</p>
                  {selectedSale.dueDate && (
                    <p class="mb-2"><span class="font-medium">Due Date:</span> {formatDate(selectedSale.dueDate)}</p>
                  )}
                  {selectedSale.paymentDetails && (
                    <p class="mb-2"><span class="font-medium">Payment Details:</span> {selectedSale.paymentDetails}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sale Items */}
            <div class="mb-6">
              <h3 class="text-lg font-medium text-gray-900 mb-2">Sale Items</h3>
              <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Discount
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tax
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      {selectedSale.items && selectedSale.items.length > 0 ? (
                        selectedSale.items.map((item, index) => (
                          <tr key={index}>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {typeof item.inventory === 'string' 
                                ? item.inventory 
                                : (item.inventory?.name || 'Unknown Item')}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.description}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.quantity}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ${(item.unitPrice || 0).toFixed(2)}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {(item.discount || 0)}%
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {(item.tax || 0)}%
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ${(item.total || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" class="px-6 py-4 text-center text-sm text-gray-500">
                            No items found for this sale.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot class="bg-gray-50">
                      <tr>
                        <td colSpan="4" class="px-6 py-2 text-right text-sm font-medium text-gray-900">
                          Subtotal:
                        </td>
                        <td colSpan="3" class="px-6 py-2 text-sm text-gray-500">
                          ${(selectedSale.subtotal || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan="4" class="px-6 py-2 text-right text-sm font-medium text-gray-900">
                          Discount:
                        </td>
                        <td colSpan="3" class="px-6 py-2 text-sm text-gray-500">
                          ${(selectedSale.discountAmount || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan="4" class="px-6 py-2 text-right text-sm font-medium text-gray-900">
                          Tax:
                        </td>
                        <td colSpan="3" class="px-6 py-2 text-sm text-gray-500">
                          ${(selectedSale.taxAmount || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr class="border-t border-gray-200">
                        <td colSpan="4" class="px-6 py-2 text-right text-sm font-medium text-gray-900">
                          Total:
                        </td>
                        <td colSpan="3" class="px-6 py-2 text-sm font-bold text-gray-900">
                          ${(selectedSale.total || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedSale.notes && (
              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Notes</h3>
                <div class="bg-gray-50 p-4 rounded-lg">
                  <p class="text-sm text-gray-700">{selectedSale.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SalesPage;
