import { h, Fragment } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import Modal from '../../components/common/Modal';
import PurchaseReceivingForm from '../../components/purchases/PurchaseReceivingForm';
import PurchaseReceivingDetails from '../../components/purchases/PurchaseReceivingDetails';
import api from '../../services/api';
import { useConfirmModal } from '../../contexts/ModalContext';
import useAuth from '../../hooks/useAuth';
import { hasPermission } from '../../utils/pageHelpers';

const PurchaseReceivingPage = () => {
  const confirmModal = useConfirmModal();
  const { user } = useAuth();
  // Force isAdmin to false unless explicitly set to 'admin'
  const isAdmin = user && user.role === 'admin';
  
  console.log('User object:', user);
  console.log('Is admin:', isAdmin);
  console.log('User role:', user?.role);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);

  // Purchase receipts state
  const [purchaseReceipts, setPurchaseReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch purchase receipts from API
  useEffect(() => {
    const fetchPurchaseReceipts = async () => {
      setLoading(true);
      try {
        const response = await api.purchaseReceiving.getAll();
        setPurchaseReceipts(response.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching purchase receipts:', err);
        setError('Failed to load purchase receipts');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPurchaseReceipts();
  }, []);

  // Filter purchase receipts based on search term and date filter
  const filteredReceipts = purchaseReceipts.filter(receipt => {
    // Handle supplier which might be an object or string
    const supplierName = typeof receipt.supplier === 'string' 
      ? receipt.supplier 
      : (receipt.supplier?.name || '');
      
    // Handle purchase order which might be an object or string
    const poNumber = typeof receipt.purchaseOrder === 'string'
      ? receipt.purchaseOrder
      : (receipt.purchaseOrder?.orderNumber || '');
      
    const matchesSearch = 
      supplierName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (receipt._id?.toString() || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (receipt.receivingNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      poNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Simple date filtering logic
    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = new Date(receipt.receivingDate).toDateString() === new Date().toDateString();
    } else if (dateFilter === 'week') {
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      const receiptDate = new Date(receipt.receivingDate);
      matchesDate = receiptDate >= weekAgo && receiptDate <= today;
    } else if (dateFilter === 'month') {
      const today = new Date();
      const monthAgo = new Date();
      monthAgo.setMonth(today.getMonth() - 1);
      const receiptDate = new Date(receipt.receivingDate);
      matchesDate = receiptDate >= monthAgo && receiptDate <= today;
    }
    
    return matchesSearch && matchesDate;
  });

  // Track submission state to prevent duplicate submissions
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Use a ref to track if a submission is in progress
  const submissionInProgressRef = useRef(false);

  // Handle save purchase receipt - this is the ONLY place where API calls to save data should happen
  const handleSaveReceipt = async (formData) => {
    console.log('handleSaveReceipt called with form data:', formData);
    
    // Multiple checks to prevent duplicate submissions
    if (isSubmitting || submissionInProgressRef.current) {
      console.log('Submission already in progress, ignoring duplicate request');
      return;
    }
    
    // Set flags to prevent duplicate submissions
    setIsSubmitting(true);
    submissionInProgressRef.current = true;
    
    try {
      setLoading(true);
      setError(null);
      console.log('Processing submission in page component...');
      
      // When a new receipt is created, all items should be fully received
      // Set the status to Completed
      formData.status = 'Completed';
      
      // This is now the ONLY place where the API call happens
      let response;
      
      if (currentReceipt) {
        // Update existing purchase receipt
        console.log('Updating existing receipt:', currentReceipt._id);
        response = await api.purchaseReceiving.update(currentReceipt._id, formData);
      } else {
        // Create new receiving
        console.log('Creating new receipt');
        response = await api.purchaseReceiving.create(formData);
      }
      
      console.log('API response:', response);
      
      if (response && response.success) {
        // If the purchase order status needs to be updated based on receiving
        if (formData.purchaseOrder && typeof formData.purchaseOrder !== 'object') {
          // Get the purchase order ID
          const poId = formData.purchaseOrder;
          
          // Get the full purchase order data
          const poResponse = await api.purchaseOrders.getById(poId);
          
          if (poResponse && poResponse.data) {
            const po = poResponse.data;
            
            // When a new receipt is created, all items should be fully received
            // Update purchase order status to Completed
            if (po.status !== 'Completed') {
              await api.purchaseOrders.updateStatus(poId, 'Completed');
            }
          }
        }
        
        // Refresh purchase receipts list
        console.log('Refreshing receipt list');
        const updatedReceipts = await api.purchaseReceiving.getAll();
        setPurchaseReceipts(updatedReceipts.data || []);
        setError(null);
        setIsFormModalOpen(false);
        setCurrentReceipt(null);
      } else {
        throw new Error('Failed to save purchase receipt');
      }
    } catch (err) {
      console.error('Error saving purchase receipt:', err);
      // Extract error message from API response if available
      const errorMessage = err.response?.data?.message || err.message || 'Failed to save purchase receipt';
      setError(errorMessage);
      
      // Don't close the modal if there's an error
      if (errorMessage.includes('duplicate key') || errorMessage.includes('already exists')) {
        // If it's a duplicate record error, show a more helpful message
        setError('A receiving record with this number already exists. This may be due to a duplicate submission. Please check the existing records or try again.');
      } else {
        setError(`Failed to save purchase receipt: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
      // Reset submission state after a delay to prevent immediate resubmission
      setTimeout(() => {
        setIsSubmitting(false);
        submissionInProgressRef.current = false;
      }, 1000);
    }
  };

  // Handle delete purchase receipt
  const handleDeleteReceipt = async (receiptId) => {
    // Use confirmation modal if available
    if (confirmModal) {
      confirmModal.showDeleteConfirm({
        itemName: 'purchase receipt',
        onConfirm: async () => {
          await performDeleteReceipt(receiptId);
        }
      });
    } else {
      // Fallback to browser's native confirm
      if (confirm('Are you sure you want to delete this receipt?')) {
        await performDeleteReceipt(receiptId);
      }
    }
  };
  
  // Perform the actual delete operation
  const performDeleteReceipt = async (receiptId) => {
    try {
      setLoading(true);
      const response = await api.purchaseReceiving.delete(receiptId);
      
      if (response && response.success) {
        // Remove from local state
        setPurchaseReceipts(prev => prev.filter(receipt => receipt._id !== receiptId));
        setError(null);
      } else {
        throw new Error('Failed to delete purchase receipt');
      }
    } catch (err) {
      console.error('Error deleting purchase receipt:', err);
      setError('Failed to delete purchase receipt');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total received items
  const totalReceivedItems = purchaseReceipts.reduce((total, receipt) => {
    if (!Array.isArray(receipt.items)) return total;
    return total + receipt.items.reduce((itemTotal, item) => itemTotal + (item.quantityReceived || 0), 0);
  }, 0);

  return (
    <div>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Purchase Receiving</h1>
        <p class="mt-1 text-sm text-gray-500">Manage goods receipt from purchase orders</p>
      </div>

      {/* Summary Cards */}
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        {/* Total Receipts Card */}
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-primary-100 rounded-md p-3">
                <svg class="h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Total Receipts</dt>
                  <dd class="text-lg font-medium text-gray-900">{purchaseReceipts.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Total Items Received Card */}
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-green-100 rounded-md p-3">
                <svg class="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Items Received</dt>
                  <dd class="text-lg font-medium text-gray-900">{totalReceivedItems}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* This Month Card */}
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <svg class="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">This Month</dt>
                  <dd class="text-lg font-medium text-gray-900">
                    {purchaseReceipts.filter(receipt => {
                      const today = new Date();
                      const monthAgo = new Date();
                      monthAgo.setMonth(today.getMonth() - 1);
                      const receiptDate = new Date(receipt.receivingDate);
                      return receiptDate >= monthAgo && receiptDate <= today;
                    }).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
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
                placeholder="Search receipts..."
                value={searchTerm}
                onInput={(e) => setSearchTerm(e.target.value)}
                class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>

            {/* Date Filter */}
            <div>
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
            {isAdmin && (
              <button class="btn btn-outline flex items-center">
                <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
                Export
              </button>
            )}
            {/* Only show New Receipt button for non-admin users */}
            {hasPermission('purchase-receiving-create', user) && (
              <button 
                class="btn btn-primary flex items-center"
                onClick={() => {
                  setCurrentReceipt(null);
                  setIsFormModalOpen(true);
                }}
              >
                <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                </svg>
                New Receipt
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Purchase Receipts Table */}
      <div class="bg-white shadow rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt ID</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receiving Date</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items Received</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan="7" class="px-6 py-8 text-center text-sm text-gray-500">
                    <div class="flex flex-col items-center">
                      <svg class="h-12 w-12 text-gray-300 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p>No receipts found</p>
                      <p class="text-xs mt-1">Try adjusting your search or filter criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((receipt) => (
                  <tr key={receipt._id}>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">{receipt.receivingNumber || receipt._id}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.purchaseOrder?.orderNumber || 
                       (typeof receipt.purchaseOrder === 'string' ? receipt.purchaseOrder : 'N/A')}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {typeof receipt.supplier === 'string' 
                        ? receipt.supplier 
                        : (receipt.supplier?.name || 'Unknown Supplier')}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {receipt.receivingDate ? new Date(receipt.receivingDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Array.isArray(receipt.items) 
                        ? receipt.items.reduce((total, item) => total + (item.quantityReceived || 0), 0)
                        : 0}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        Completed
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div class="flex justify-end space-x-2">
                        <button 
                          class="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          onClick={() => {
                            setCurrentReceipt(receipt);
                            setIsDetailsModalOpen(true);
                          }}
                        >
                          <svg class="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                          </svg>
                          View
                        </button>
                        
                        {/* Edit button removed - all receipts are now completed */}
                        {isAdmin && (
                          <button 
                            class="inline-flex items-center px-2.5 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            onClick={() => handleDeleteReceipt(receipt._id)}
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
        
        {/* Pagination */}
        <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-700">
                Showing <span class="font-medium">1</span> to <span class="font-medium">{filteredReceipts.length}</span> of <span class="font-medium">{filteredReceipts.length}</span> results
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Receiving Form Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={currentReceipt ? "Edit Receipt" : "Create New Receipt"}
        size="5xl"
      >
        <PurchaseReceivingForm
          initialData={currentReceipt}
          onCancel={() => setIsFormModalOpen(false)}
          onSave={handleSaveReceipt}
        />
      </Modal>

      {/* Purchase Receiving Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="Receipt Details"
        size="4xl"
      >
        <PurchaseReceivingDetails purchaseReceipt={currentReceipt} />
      </Modal>
    </div>
  );
};

export default PurchaseReceivingPage;
