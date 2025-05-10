import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Modal from '../../components/common/Modal';
import PurchaseOrderForm from '../../components/purchases/PurchaseOrderForm';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import { useConfirmModal } from '../../contexts/ModalContext';
import { hasPermission } from '../../utils/pageHelpers';

const PurchaseOrdersPage = () => {
  const { user, isAuthenticated } = useAuth();
  const confirmModal = useConfirmModal();
  // Force isAdmin to false unless explicitly set to 'admin'
  const isAdmin = user && user.role === 'admin';
  
  console.log('User object:', user);
  console.log('Is admin:', isAdmin);
  console.log('User role:', user?.role);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentPO, setCurrentPO] = useState(null);
  const [permissionError, setPermissionError] = useState(null);

  // Purchase orders state
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch purchase orders from API
  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      setLoading(true);
      try {
        const response = await api.purchaseOrders.getAll();
        setPurchaseOrders(response.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching purchase orders:', err);
        setError('Failed to load purchase orders');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPurchaseOrders();
  }, []);

  // Filter purchase orders based on active tab, search term, and date filter
  const filteredPOs = purchaseOrders.filter(po => {
    const matchesTab = activeTab === 'all' || (po.status && po.status.toLowerCase()) === activeTab.toLowerCase();
    const matchesSearch = (typeof po.supplier === 'string' 
                          ? po.supplier.toLowerCase().includes(searchTerm.toLowerCase()) 
                          : po.supplier && po.supplier.name 
                            ? po.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
                            : false) || 
                         (po.orderNumber && po.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Simple date filtering logic
    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = new Date(po.orderDate).toDateString() === new Date().toDateString();
    } else if (dateFilter === 'week') {
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      const poDate = new Date(po.orderDate);
      matchesDate = poDate >= weekAgo && poDate <= today;
    } else if (dateFilter === 'month') {
      const today = new Date();
      const monthAgo = new Date();
      monthAgo.setMonth(today.getMonth() - 1);
      const poDate = new Date(po.orderDate);
      matchesDate = poDate >= monthAgo && poDate <= today;
    }
    
    return matchesTab && matchesSearch && matchesDate;
  });

  // Calculate total purchase order amount
  const totalPOAmount = filteredPOs.reduce((total, po) => total + (po.totalAmount || 0), 0);

  // Check if user has permission to manage purchase orders
  const hasManagePermission = user && (user.role === 'admin' || user.role === 'manager' || user.role === 'user');
  
  // Handle save purchase order
  const handleSavePO = async (poData) => {
    try {
      // Check if user has permission to create/update purchase orders
      if (!hasManagePermission) {
        setPermissionError('You do not have permission to create or update purchase orders.');
        setIsFormModalOpen(false);
        return;
      }
      
      setLoading(true);
      let response;
      
      // Make sure we're not sending any id field that could conflict with MongoDB's _id
      const cleanedData = { ...poData };
      
      // For new POs, remove any id or _id fields to let MongoDB generate _id
      if (!currentPO) {
        if (cleanedData.id !== undefined) {
          delete cleanedData.id;
        }
        if (cleanedData._id !== undefined) {
          delete cleanedData._id;
        }
      }
      
      if (currentPO) {
        // Update existing purchase order
        response = await api.purchaseOrders.update(currentPO._id, cleanedData);
      } else {
        // Create new purchase order
        response = await api.purchaseOrders.create(cleanedData);
      }
      
      if (response && response.success) {
        // Refresh purchase orders list
        const updatedPOs = await api.purchaseOrders.getAll();
        setPurchaseOrders(updatedPOs.data || []);
        setError(null);
      } else {
        throw new Error('Failed to save purchase order');
      }
      
      setIsFormModalOpen(false);
      setCurrentPO(null);
    } catch (err) {
      console.error('Error saving purchase order:', err);
      setError('Failed to save purchase order');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete purchase order
  const handleDeletePO = async (poId) => {
    // Check if user has permission to delete purchase orders (admin only)
    if (!user || user.role !== 'admin') {
      setPermissionError('You do not have permission to delete purchase orders.');
      return;
    }
    
    // Use confirmation modal if available
    if (confirmModal) {
      confirmModal.showDeleteConfirm({
        itemName: 'purchase order',
        onConfirm: async () => {
          await performDeletePO(poId);
        }
      });
    } else {
      // Fallback to browser's native confirm
      if (confirm('Are you sure you want to delete this purchase order?')) {
        await performDeletePO(poId);
      }
    }
  };
  
  // Perform the actual delete operation
  const performDeletePO = async (poId) => {
    try {
      setLoading(true);
      const response = await api.purchaseOrders.delete(poId);
      
      if (response && response.success) {
        // Remove from local state
        setPurchaseOrders(prev => prev.filter(po => po._id !== poId));
        setError(null);
      } else {
        throw new Error('Failed to delete purchase order');
      }
    } catch (err) {
      console.error('Error deleting purchase order:', err);
      setError('Failed to delete purchase order');
    } finally {
      setLoading(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (poId, newStatus) => {
    // Check if user has permission to change purchase order status
    if (!hasManagePermission) {
      setPermissionError('You do not have permission to update purchase order status.');
      return;
    }
    
    // For approve/reject actions, use confirmation modal
    if ((newStatus === 'Approved' || newStatus === 'Rejected') && confirmModal) {
      const isApprove = newStatus === 'Approved';
      const modalConfig = {
        itemName: 'purchase order',
        onConfirm: async () => {
          await performStatusChange(poId, newStatus);
        }
      };
      
      if (isApprove) {
        confirmModal.showApproveConfirm(modalConfig);
      } else {
        confirmModal.showConfirm({
          title: 'Reject Purchase Order',
          message: 'Are you sure you want to reject this purchase order?',
          confirmText: 'Reject',
          cancelText: 'Cancel',
          confirmButtonClass: 'bg-red-600 hover:bg-red-700',
          onConfirm: modalConfig.onConfirm
        });
      }
    } else {
      // For other status changes, proceed without confirmation
      await performStatusChange(poId, newStatus);
    }
  };
  
  // Perform the actual status change
  const performStatusChange = async (poId, newStatus) => {
    try {
      setLoading(true);
      const response = await api.purchaseOrders.updateStatus(poId, newStatus);
      
      if (response && response.success) {
        // Update in local state
        setPurchaseOrders(prev => 
          prev.map(po => po._id === poId ? { ...po, status: newStatus } : po)
        );
        setError(null);
      } else {
        throw new Error('Failed to update purchase order status');
      }
    } catch (err) {
      console.error('Error updating purchase order status:', err);
      setError('Failed to update purchase order status');
    } finally {
      setLoading(false);
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Completed': return 'bg-blue-100 text-blue-800';
      case 'Draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Purchase Order Management</h1>
        <p class="mt-1 text-sm text-gray-500">Create and manage purchase orders for your inventory</p>
      </div>

      {/* Summary Cards */}
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8">
        {/* Total POs Card */}
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-primary-100 rounded-md p-3">
                <svg class="h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Total POs</dt>
                  <dd class="text-lg font-medium text-gray-900">{purchaseOrders.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Total Value Card */}
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-primary-100 rounded-md p-3">
                <svg class="h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Total Value</dt>
                  <dd class="text-lg font-medium text-gray-900">${totalPOAmount.toFixed(2)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Card */}
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                <svg class="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Pending</dt>
                  <dd class="text-lg font-medium text-gray-900">
                    {purchaseOrders.filter(po => po.status === 'Draft' || po.status === 'Submitted').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Approved Card */}
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-green-100 rounded-md p-3">
                <svg class="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Approved</dt>
                  <dd class="text-lg font-medium text-gray-900">
                    {purchaseOrders.filter(po => po.status === 'Approved').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Completed Card */}
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <svg class="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd class="text-lg font-medium text-gray-900">
                    {purchaseOrders.filter(po => po.status === 'Completed').length}
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
                placeholder="Search purchase orders..."
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
            {isAdmin && (
              <button class="btn btn-outline flex items-center">
                <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
                Export
              </button>
            )}
            {/* Only show New Purchase Order button for users with permission */}
            {hasPermission('purchase-orders-create', user) && (
              <button 
                class="btn btn-primary flex items-center"
                onClick={() => {
                  setCurrentPO(null);
                  setIsFormModalOpen(true);
                }}
              >
                <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                </svg>
                New Purchase Order
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div class="border-b border-gray-200 mb-6">
        <nav class="-mb-px flex space-x-8">
          {['all', 'draft', 'submitted', 'approved', 'completed', 'rejected'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              class={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'all' ? 'All Orders' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Error/Permission Messages */}
      {(error || permissionError) && (
        <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">
                {permissionError || error}
              </p>
            </div>
            <div class="ml-auto pl-3">
              <div class="-mx-1.5 -my-1.5">
                <button
                  onClick={() => {
                    setError(null);
                    setPermissionError(null);
                  }}
                  class="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <span class="sr-only">Dismiss</span>
                  <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Orders Table */}
      <div class="bg-white shadow rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Delivery</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan="7" class="px-6 py-8 text-center text-sm text-gray-500">
                    <div class="flex flex-col items-center">
                      <svg class="h-12 w-12 text-gray-300 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p>No purchase orders found</p>
                      <p class="text-xs mt-1">Try adjusting your search or filter criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => (
                  <tr key={po._id}>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">{po.orderNumber}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {typeof po.supplier === 'object' ? po.supplier.name : po.supplier}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(po.totalAmount || 0).toFixed(2)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {po.orderDate ? new Date(po.orderDate).toLocaleDateString() : ''}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : ''}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div class="flex justify-end space-x-2">
                        <button 
                          class="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          onClick={() => {
                            setCurrentPO(po);
                            setIsFormModalOpen(true);
                          }}
                        >
                          <svg class="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          Edit
                        </button>
                        
                        {po.status === 'Draft' && (
                          <button 
                            class="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            onClick={() => handleStatusChange(po._id, 'Submitted')}
                          >
                            <svg class="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clip-rule="evenodd" />
                            </svg>
                            Submit
                          </button>
                        )}
                        
                        {isAdmin && po.status === 'Submitted' && (
                          <>
                            <button 
                              class="inline-flex items-center px-2.5 py-1.5 border border-green-300 shadow-sm text-xs font-medium rounded text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              onClick={() => handleStatusChange(po._id, 'Approved')}
                            >
                              <svg class="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                              </svg>
                              Approve
                            </button>
                            <button 
                              class="inline-flex items-center px-2.5 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              onClick={() => handleStatusChange(po._id, 'Rejected')}
                            >
                              <svg class="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                              </svg>
                              Reject
                            </button>
                          </>
                        )}
                        
                        {po.status === 'Approved' && (
                          <button 
                            class="inline-flex items-center px-2.5 py-1.5 border border-blue-300 shadow-sm text-xs font-medium rounded text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            onClick={() => handleStatusChange(po._id, 'Completed')}
                          >
                            <svg class="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                            Complete
                          </button>
                        )}
                        
                        {isAdmin && (
                          <button 
                            class="inline-flex items-center px-2.5 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            onClick={() => handleDeletePO(po._id)}
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

      {/* Purchase Order Form Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={currentPO ? "Edit Purchase Order" : "Create New Purchase Order"}
        size="5xl"
      >
        <PurchaseOrderForm
          initialData={currentPO}
          onCancel={() => setIsFormModalOpen(false)}
          onSave={handleSavePO}
        />
      </Modal>
    </div>
  );
};

export default PurchaseOrdersPage;
