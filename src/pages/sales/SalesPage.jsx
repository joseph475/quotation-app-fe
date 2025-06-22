import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Modal from '../../components/common/Modal';
import SaleForm from '../../components/sales/SaleForm';
import SaleReceipt from '../../components/sales/SaleReceipt';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import { useConfirmModal, useErrorModal } from '../../contexts/ModalContext';
import { hasPermission } from '../../utils/pageHelpers';
import { getFromStorage, storeInStorage } from '../../utils/localStorageHelpers';
import { syncAfterDataUpdate } from '../../utils/dataSync';
import { getCustomerDisplayName } from '../../utils/customerHelpers';

const SalesPage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [createdByUser, setCreatedByUser] = useState(null);

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Get current user from auth context
  const { user } = useAuth();
  
  // Fetch sales from local storage or API
  const fetchSales = async () => {
    setLoading(true);
    try {
      // Try to get sales from local storage
      const storedSales = getFromStorage('sales');
      
      if (storedSales && Array.isArray(storedSales)) {
        setSales(storedSales);
        setError(null);
      } else {
        // Fallback to API if not in local storage
        const response = await api.sales.getAll();
        
        if (response && response.success) {
          setSales(response.data || []);
          setError(null);
        } else {
          throw new Error(response.message || 'Failed to fetch sales');
        }
      }
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError('Failed to load sales. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchSales();
  }, []);

  // Get modal contexts
  const { showConfirm, showDeleteConfirm } = useConfirmModal();
  const { showError } = useErrorModal();
  
  // Handle delete sale (soft delete)
  const handleDeleteSale = async (saleToDelete) => {
    if (!saleToDelete) return;
    
    showDeleteConfirm({
      itemName: 'sale',
      onConfirm: async () => {
        try {
          setLoading(true);
          // Implement soft delete by updating the sale status to "cancelled"
          // Using "cancelled" instead of "deleted" as it's a valid enum value in the backend
          const response = await api.sales.update(saleToDelete._id, {
            ...saleToDelete,
            status: 'cancelled'
          });
          
          if (response && response.success) {
            // Get updated sales list
            const updatedSalesResponse = await api.sales.getAll();
            
            if (updatedSalesResponse && updatedSalesResponse.success) {
              // Update local storage with new sales data
              storeInStorage('sales', updatedSalesResponse.data || []);
              
              // Update state
              setSales(updatedSalesResponse.data || []);
            } else {
              // If API call fails, just refresh sales
              await fetchSales();
            }
            
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
  // Also exclude sales with "cancelled" status as per requirement
  const filteredSales = sales.filter(sale => {
    // Skip sales with "cancelled" status
    if (sale.status === 'cancelled') return false;
    
    const matchesTab = activeTab === 'all' || sale.status?.toLowerCase() === activeTab.toLowerCase();
    
    // Handle customer which might be an object or string
    const customerName = getCustomerDisplayName(sale.customer);
      
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
            
          </div>

          {/* Actions */}
          <div class="flex space-x-3">
            {/* Only show New Sale button for non-admin users */}
            {hasPermission('sales-create', user) && (
              <button 
                class="btn btn-primary flex items-center"
                onClick={() => setIsFormModalOpen(true)}
              >
                <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                </svg>
                New Sale
              </button>
            )}
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
            onClick={() => setActiveTab('partially_paid')}
            class={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'partially_paid'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Partially Paid
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
                  <td colSpan="5" class="px-6 py-8 text-center text-sm text-gray-500">
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
                      {getCustomerDisplayName(sale.customer)}
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
                          class="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          onClick={async () => {
                            setSelectedSale(sale);
                            
                            // If createdBy is a string (ObjectId), fetch the user data
                            if (typeof sale.createdBy === 'string') {
                              try {
                                const response = await api.users.getById(sale.createdBy);
                                if (response && response.success) {
                                  setCreatedByUser(response.data);
                                }
                              } catch (err) {
                                console.error('Error fetching user data:', err);
                                setCreatedByUser(null);
                              }
                            } else {
                              setCreatedByUser(null);
                            }
                            
                            setIsViewModalOpen(true);
                          }}
                        >
                          <svg class="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                          </svg>
                          View
                        </button>
                        {sale.status === 'paid' ? (
                          <button 
                            class="inline-flex items-center px-2.5 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            onClick={() => {
                              showConfirm({
                                title: 'Confirm Refund',
                                message: 'Are you sure you want to refund this sale? This action cannot be undone.',
                                confirmText: 'Yes, Refund',
                                cancelText: 'Cancel',
                                confirmButtonClass: 'bg-red-600 hover:bg-red-700',
                                onConfirm: async () => {
                                  try {
                                    setLoading(true);
                                    const response = await api.sales.update(sale._id, {
                                      ...sale,
                                      status: 'refunded'
                                    });
                                    
                                    if (response && response.success) {
                                      // Get updated sales list
                                      const updatedSalesResponse = await api.sales.getAll();
                                      
                                      if (updatedSalesResponse && updatedSalesResponse.success) {
                                        // Update local storage with new sales data
                                        storeInStorage('sales', updatedSalesResponse.data || []);
                                        
                                        // Update state
                                        setSales(updatedSalesResponse.data || []);
                                      } else {
                                        // If API call fails, just refresh sales
                                        await fetchSales();
                                      }
                                      
                                      setError(null);
                                      
                                      // Show success message
                                      showConfirm({
                                        title: 'Success',
                                        message: 'Sale has been successfully refunded.',
                                        confirmText: 'OK',
                                        cancelText: null,
                                        confirmButtonClass: 'bg-green-600 hover:bg-green-700',
                                        onConfirm: () => {},
                                      });
                                    } else {
                                      // Check if it's an authentication error (401)
                                      if (response.status === 401) {
                                        showError(
                                          'You do not have permission to refund this sale.',
                                          'Permission Error'
                                        );
                                      } else {
                                        throw new Error(response.message || 'Failed to refund sale');
                                      }
                                    }
                                  } catch (err) {
                                    console.error('Error refunding sale:', err);
                                    showError(err.message || 'Failed to refund sale. Please try again.');
                                  } finally {
                                    setLoading(false);
                                  }
                                }
                              });
                            }}
                          >
                            <svg class="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fill-rule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 3.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L8.414 9H10a3 3 0 013 3v1a1 1 0 102 0v-1a5 5 0 00-5-5H8.414l1.293-1.293z" />
                            </svg>
                            Refund
                          </button>
                        ) : sale.status !== 'refunded' ? (
                          <button 
                            class="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            onClick={() => {
                              setSelectedSale(sale);
                              setIsEditModalOpen(true);
                            }}
                          >
                            <svg class="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                            Edit
                          </button>
                        ) : null}
                        {/* Only show delete button for admin users */}
                        {user && user.role !== 'user' && (
                          <button 
                            class="inline-flex items-center px-2.5 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            onClick={() => handleDeleteSale(sale)}
                          >
                            <svg class="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                            </svg>
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
                // Use the new data synchronization system
                await syncAfterDataUpdate(['sales']);
                
                // Refresh local sales data
                await fetchSales();
                
                setError(null);
                setIsFormModalOpen(false);
                
                // Show receipt
                setSelectedSale(response.data);
                setIsReceiptModalOpen(true);
              } else {
                throw new Error(response.message || 'Failed to create sale');
              }
            } catch (err) {
              console.error('Error creating sale:', err);
              setError(err.message || 'Failed to create sale. Please try again.');
            } finally {
              setLoading(false);
            }
          }}
        />
      </Modal>

      {/* View Sale Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Sale Details: ${selectedSale?.saleNumber || ''}`}
        size="4xl"
      >
        {selectedSale && (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 bg-gray-50">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Sale Information</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Sale Number</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{selectedSale.saleNumber}</dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Customer</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {getCustomerDisplayName(selectedSale.customer)}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Date</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {formatDate(selectedSale.createdAt)}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      ${(selectedSale.total || 0).toFixed(2)}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Created By</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {createdByUser ? createdByUser.name : 'Unknown User'}
                    </dd>
                  </div>
                  {selectedSale.notes && (
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Notes</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{selectedSale.notes}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 bg-gray-50">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Sale Items</h3>
              </div>
              <div className="border-t border-gray-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Discount
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tax
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedSale.items && selectedSale.items.length > 0 ? (
                        selectedSale.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.name || item.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ${parseFloat(item.unitPrice).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.discount}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.tax}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ${parseFloat(item.total).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                            No items in this sale
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="5" className="px-6 py-2 text-right text-sm font-medium text-gray-900">
                          Total:
                        </td>
                        <td className="px-6 py-2 text-sm font-bold text-gray-900">
                          ${(selectedSale.total || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="btn btn-outline flex items-center"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setIsReceiptModalOpen(true);
                }}
              >
                <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0v3H7V4h6zm-6 8v4h6v-4H7z" clipRule="evenodd" />
                </svg>
                Print Receipt
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </button>
              {selectedSale.status !== 'refunded' && selectedSale.status !== 'cancelled' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setIsEditModalOpen(true);
                  }}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Sale Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Sale: ${selectedSale?.saleNumber || ''}`}
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
                  // Get updated sales list
                  const updatedSalesResponse = await api.sales.getAll();
                  
                  if (updatedSalesResponse && updatedSalesResponse.success) {
                    // Update local storage with new sales data
                    storeInStorage('sales', updatedSalesResponse.data || []);
                    
                    // Update state
                    setSales(updatedSalesResponse.data || []);
                  } else {
                    // If API call fails, just refresh sales
                    await fetchSales();
                  }
                  
                  setError(null);
                  setIsEditModalOpen(false);
                } else {
                  throw new Error(response.message || 'Failed to update sale');
                }
              } catch (err) {
                console.error('Error updating sale:', err);
                setError(err.message || 'Failed to update sale. Please try again.');
              } finally {
                setLoading(false);
              }
            }}
          />
        )}
      </Modal>

      {/* Receipt Modal */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Sale Receipt"
        size="2xl"
      >
        {selectedSale && (
          <SaleReceipt sale={selectedSale} onClose={() => setIsReceiptModalOpen(false)} />
        )}
      </Modal>
    </div>
  );
};

export default SalesPage;
