import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Modal from '../../components/common/Modal';
import SaleForm from '../../components/sales/SaleForm';
import SaleReceipt from '../../components/sales/SaleReceipt';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import { useConfirmModal, useErrorModal } from '../../contexts/ModalContext';
import { hasPermission } from '../../utils/pageHelpers';

const SalesPage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [createdByUser, setCreatedByUser] = useState(null);

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
                        {/* Only show delete button for admin users */}
                        {user && user.role !== 'user' && (
                          <button 
                            class="inline-flex items-center px-2.5 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            onClick={() => {
                              setSelectedSale(sale);
                              handleDeleteSale();
                            }}
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
                // Refresh sales list
                await fetchSales();
                setError(null);
                setIsFormModalOpen(false);
                
                // Store the created sale data
                setSelectedSale(response.data);
                
                // Show print receipt confirmation
                showConfirm({
                  title: 'Sale Created Successfully',
                  message: 'Would you like to print a receipt?',
                  confirmText: 'Yes, Print Receipt',
                  cancelText: 'No, Thanks',
                  confirmButtonClass: 'bg-primary-600 hover:bg-primary-700',
                  onConfirm: () => {
                    // Instead of showing the modal, directly open print preview
                    const printWindow = window.open('', '_blank', 'width=800,height=600');
                    
                    if (!printWindow) {
                      alert("Please allow pop-ups to print the receipt.");
                      return;
                    }
                    
                    // Set the document title
                    printWindow.document.title = `Sale Receipt - ${response.data?.saleNumber || 'Receipt'}`;
                    
                    // Get customer and branch names
                    const customerName = response.data?.customerName || 'Customer';
                    const branchName = response.data?.branchName || 'Branch';
                    
                    // Format date for display
                    const formatDate = (dateString) => {
                      if (!dateString) return '';
                      return new Date(dateString).toLocaleDateString();
                    };
                    
                    // Format time for display
                    const formatTime = (dateString) => {
                      if (!dateString) return '';
                      return new Date(dateString).toLocaleTimeString();
                    };
                    
                    // Add styles and content to the new window
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Sale Receipt - ${response.data?.saleNumber || 'Receipt'}</title>
                          <style>
                            body {
                              font-family: Arial, sans-serif;
                              font-size: 12pt;
                              margin: 0;
                              padding: 1cm;
                              background-color: white;
                              color: black;
                            }
                            .receipt-container {
                              max-width: 800px;
                              margin: 0 auto;
                            }
                            h1 {
                              font-size: 16pt;
                              margin-bottom: 5px;
                            }
                            .text-center {
                              text-align: center;
                            }
                            .text-right {
                              text-align: right;
                            }
                            .flex {
                              display: flex;
                              justify-content: space-between;
                            }
                            .mb-3 {
                              margin-bottom: 15px;
                            }
                            .text-sm {
                              font-size: 10pt;
                            }
                            .text-xs {
                              font-size: 8pt;
                            }
                            .font-medium {
                              font-weight: 500;
                            }
                            .font-bold {
                              font-weight: 700;
                            }
                            table {
                              width: 100%;
                              border-collapse: collapse;
                            }
                            th {
                              text-align: left;
                              border-bottom: 1px solid #ddd;
                              padding: 5px;
                            }
                            td {
                              padding: 5px;
                              border-bottom: 1px solid #eee;
                            }
                            .border-t {
                              border-top: 1px solid #ddd;
                              padding-top: 10px;
                              margin-top: 10px;
                            }
                            .text-gray-600 {
                              color: #666;
                            }
                            .text-gray-500 {
                              color: #888;
                            }
                            .text-gray-400 {
                              color: #aaa;
                            }
                            @media print {
                              .no-print {
                                display: none !important;
                              }
                            }
                            .print-button {
                              text-align: center;
                              margin-top: 20px;
                            }
                            .print-button button {
                              padding: 10px 20px;
                              background-color: #4F46E5;
                              color: white;
                              border: none;
                              border-radius: 4px;
                              font-size: 14px;
                              cursor: pointer;
                              box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
                            }
                          </style>
                        </head>
                        <body>
                          <div class="receipt-container">
                            <!-- Header -->
                            <div class="text-center mb-3">
                              <h1>SALES RECEIPT</h1>
                              <p class="text-gray-600 text-sm">Thank you for your purchase!</p>
                            </div>

                            <!-- Sale Info -->
                            <div class="flex mb-3">
                              <div>
                                <p class="text-sm"><span class="font-medium">Sale #:</span> ${response.data.saleNumber}</p>
                                <p class="text-sm"><span class="font-medium">Branch:</span> ${branchName}</p>
                              </div>
                              <div class="text-right">
                                <p class="text-sm"><span class="font-medium">Date:</span> ${formatDate(response.data.createdAt)}</p>
                                <p class="text-sm"><span class="font-medium">Time:</span> ${formatTime(response.data.createdAt)}</p>
                              </div>
                            </div>

                            <!-- Customer Info -->
                            <div class="mb-3">
                              <p class="text-sm font-medium">Customer:</p>
                              <p class="text-sm">${customerName}</p>
                              ${response.data.customer?.phone ? `<p class="text-sm">Phone: ${response.data.customer.phone}</p>` : ''}
                              ${response.data.customer?.email ? `<p class="text-sm">Email: ${response.data.customer.email}</p>` : ''}
                            </div>

                            <!-- Items Table -->
                            <div class="mb-3">
                              <p class="text-sm font-medium mb-1">Items Purchased:</p>
                              <table class="w-full text-sm">
                                <thead>
                                  <tr>
                                    <th>Item</th>
                                    <th class="text-center">Qty</th>
                                    <th class="text-right">Price</th>
                                    <th class="text-right">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${response.data.items && response.data.items.length > 0 ? 
                                    response.data.items.map(item => `
                                      <tr>
                                        <td>${item.description}</td>
                                        <td class="text-center">${item.quantity}</td>
                                        <td class="text-right">$${(item.unitPrice || 0).toFixed(2)}</td>
                                        <td class="text-right">$${(item.total || 0).toFixed(2)}</td>
                                      </tr>
                                    `).join('') : 
                                    `<tr><td colspan="4" class="text-center text-gray-500">No items in this sale</td></tr>`
                                  }
                                </tbody>
                              </table>
                            </div>

                            <!-- Totals -->
                            <div class="mb-3 border-t">
                              <div class="flex">
                                <span>Payment Method:</span>
                                <span>
                                  ${response.data.paymentMethod === 'cash' ? 'Cash' :
                                   response.data.paymentMethod === 'check' ? 'Check' :
                                   response.data.paymentMethod === 'credit_card' ? 'Credit Card' :
                                   response.data.paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
                                   response.data.paymentMethod === 'online_payment' ? 'Online Payment' :
                                   response.data.paymentMethod}
                                </span>
                              </div>
                              
                              ${response.data.paymentReference ? `
                                <div class="flex">
                                  <span>Reference:</span>
                                  <span>${response.data.paymentReference}</span>
                                </div>
                              ` : ''}
                              
                              <div class="flex">
                                <span>Subtotal:</span>
                                <span>$${(response.data.subtotal || 0).toFixed(2)}</span>
                              </div>
                              
                              <div class="flex">
                                <span>Discount:</span>
                                <span>$${(response.data.discountAmount || 0).toFixed(2)}</span>
                              </div>
                              
                              <div class="flex">
                                <span>Tax:</span>
                                <span>$${(response.data.taxAmount || 0).toFixed(2)}</span>
                              </div>
                              
                              <div class="flex font-bold border-t">
                                <span>Total:</span>
                                <span>$${(response.data.total || 0).toFixed(2)}</span>
                              </div>
                            </div>

                            <!-- Footer -->
                            <div class="text-center text-gray-600 text-xs mt-4 border-t">
                              <p class="font-medium">Thank you for your business!</p>
                              <p>For inquiries: support@example.com</p>
                              <p>${branchName} • ${formatDate(response.data.createdAt)}</p>
                              <div class="text-right text-xs text-gray-400">1/1</div>
                            </div>
                          </div>
                          
                          <!-- Print Button - will be hidden when printing -->
                          <div class="print-button no-print">
                            <button onclick="window.print(); return false;">
                              Print Receipt
                            </button>
                          </div>
                        </body>
                      </html>
                    `);
                    
                    // Close the document for writing
                    printWindow.document.close();
                    
                    // Wait for the document to load before printing
                    printWindow.onload = function() {
                      // Print the document automatically
                      printWindow.print();
                    };
                  },
                  onCancel: () => {
                    // Just close the form modal
                  }
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

      {/* Receipt Modal - This modal will be hidden when printing */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Sale Receipt"
        size="3xl"
        className="print-receipt-modal no-print-modal"
      >
        {selectedSale && (
          <SaleReceipt
            sale={selectedSale}
            onClose={() => setIsReceiptModalOpen(false)}
            onPrint={() => {
              console.log('Printing receipt for sale:', selectedSale.saleNumber);
            }}
          />
        )}
      </Modal>

      {/* View Sale Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={
          <div class="flex items-center">
            <span class="text-xl font-bold text-gray-900 mr-3">{selectedSale?.saleNumber || ''}</span>
            {selectedSale && (
              <span class={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                selectedSale.status === 'paid' ? 'bg-green-100 text-green-800' : 
                selectedSale.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                selectedSale.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                selectedSale.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                selectedSale.status === 'refunded' ? 'bg-purple-100 text-purple-800' : 
                'bg-gray-100 text-gray-800'
              }`}>
                {selectedSale.status === 'paid' ? 'Paid' : 
                 selectedSale.status === 'partially_paid' ? 'Partially Paid' :
                 selectedSale.status === 'pending' ? 'Pending' :
                 selectedSale.status === 'cancelled' ? 'Cancelled' :
                 selectedSale.status === 'refunded' ? 'Refunded' : 
                 selectedSale.status}
              </span>
            )}
          </div>
        }
        size="5xl"
      >
        {selectedSale && (
          <div class="p-6">
            {/* Summary Bar */}
            <div class="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg shadow-sm p-4 mb-6">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p class="text-xs text-gray-500 uppercase tracking-wider">Total Amount</p>
                  <p class="text-xl font-bold text-primary-600">${(selectedSale.total || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 uppercase tracking-wider">Date</p>
                  <p class="text-sm font-medium">{formatDate(selectedSale.createdAt)}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 uppercase tracking-wider">Payment Method</p>
                  <p class="text-sm font-medium capitalize">
                    {selectedSale.paymentMethod?.replace('_', ' ') || 'N/A'}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 uppercase tracking-wider">Branch</p>
                  <p class="text-sm font-medium">
                    {typeof selectedSale.branch === 'string'
                      ? selectedSale.branch
                      : (selectedSale.branch?.name || 'Unknown Branch')}
                  </p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Sale Information */}
              <div class="md:col-span-1">
                <div class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 class="text-sm font-medium text-gray-900 flex items-center">
                      <svg class="h-4 w-4 text-gray-500 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                      </svg>
                      Sale Information
                    </h3>
                  </div>
                  <div class="px-4 py-3 divide-y divide-gray-200">
                    <div class="py-2 flex justify-between">
                      <span class="text-sm text-gray-500">Sale Number</span>
                      <span class="text-sm font-medium text-gray-900">{selectedSale.saleNumber}</span>
                    </div>
                    <div class="py-2 flex justify-between">
                      <span class="text-sm text-gray-500">Created By</span>
                      <span class="text-sm font-medium text-gray-900">
                        {createdByUser 
                          ? (createdByUser.name || createdByUser.username || createdByUser.email || 'Unknown User')
                          : (typeof selectedSale.createdBy === 'object' && selectedSale.createdBy !== null
                              ? (selectedSale.createdBy.name || selectedSale.createdBy.username || selectedSale.createdBy.email || 'Unknown User')
                              : (selectedSale.createdByName || 'Unknown User'))}
                      </span>
                    </div>
                    <div class="py-2 flex justify-between">
                      <span class="text-sm text-gray-500">Created At</span>
                      <span class="text-sm font-medium text-gray-900">{formatDate(selectedSale.createdAt)}</span>
                    </div>
                    <div class="py-2 flex justify-between">
                      <span class="text-sm text-gray-500">Updated At</span>
                      <span class="text-sm font-medium text-gray-900">{formatDate(selectedSale.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Customer Information */}
              <div class="md:col-span-1">
                <div class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden h-full">
                  <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 class="text-sm font-medium text-gray-900 flex items-center">
                      <svg class="h-4 w-4 text-gray-500 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                      </svg>
                      Customer Information
                    </h3>
                  </div>
                  <div class="px-4 py-3">
                    <div class="flex items-center mb-3">
                      <div class="h-10 w-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center mr-3 text-sm font-medium">
                        {typeof selectedSale.customer === 'string' 
                          ? selectedSale.customer.charAt(0).toUpperCase()
                          : (selectedSale.customer?.name?.charAt(0).toUpperCase() || 'C')}
                      </div>
                      <div>
                        <p class="text-sm font-medium text-gray-900">
                          {typeof selectedSale.customer === 'string' 
                            ? selectedSale.customer 
                            : (selectedSale.customer?.name || 'Unknown Customer')}
                        </p>
                        {selectedSale.customer?.email && (
                          <p class="text-xs text-gray-500">{selectedSale.customer.email}</p>
                        )}
                      </div>
                    </div>
                    
                    {selectedSale.customer?.phone && (
                      <div class="flex items-center text-sm text-gray-500 mt-2">
                        <svg class="h-4 w-4 text-gray-400 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                        {selectedSale.customer.phone}
                      </div>
                    )}
                    
                    {selectedSale.customer?.address && (
                      <div class="flex items-start text-sm text-gray-500 mt-2">
                        <svg class="h-4 w-4 text-gray-400 mr-1.5 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                        </svg>
                        <span>{selectedSale.customer.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div class="md:col-span-1">
                <div class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden h-full">
                  <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 class="text-sm font-medium text-gray-900 flex items-center">
                      <svg class="h-4 w-4 text-gray-500 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                        <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd" />
                      </svg>
                      Payment Details
                    </h3>
                  </div>
                  <div class="px-4 py-3 divide-y divide-gray-200">
                    <div class="py-2 flex justify-between">
                      <span class="text-sm text-gray-500">Amount Paid</span>
                      <span class="text-sm font-medium text-green-600">${(selectedSale.amountPaid || 0).toFixed(2)}</span>
                    </div>
                    <div class="py-2 flex justify-between">
                      <span class="text-sm text-gray-500">Balance</span>
                      <span class="text-sm font-medium text-red-600">${(selectedSale.balance || 0).toFixed(2)}</span>
                    </div>
                    {selectedSale.dueDate && (
                      <div class="py-2 flex justify-between">
                        <span class="text-sm text-gray-500">Due Date</span>
                        <span class="text-sm font-medium text-gray-900">{formatDate(selectedSale.dueDate)}</span>
                      </div>
                    )}
                    {selectedSale.paymentDetails && (
                      <div class="py-2">
                        <span class="text-sm text-gray-500 block mb-1">Payment Details</span>
                        <span class="text-sm font-medium text-gray-900">{selectedSale.paymentDetails}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sale Items */}
            <div class="mb-6">
              <div class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div class="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                  <h3 class="text-sm font-medium text-gray-900 flex items-center">
                    <svg class="h-4 w-4 text-gray-500 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                    </svg>
                    Sale Items
                  </h3>
                  <span class="text-xs text-gray-500">{selectedSale.items?.length || 0} items</span>
                </div>
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
                          <tr key={index} class={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {typeof item.inventory === 'string' 
                                ? item.inventory 
                                : (item.inventory?.name || 'Unknown Item')}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.description}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                              {item.quantity}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                              ${(item.unitPrice || 0).toFixed(2)}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                              {item.discount > 0 ? (
                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  {(item.discount || 0)}%
                                </span>
                              ) : (
                                <span>-</span>
                              )}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                              {item.tax > 0 ? (
                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  {(item.tax || 0)}%
                                </span>
                              ) : (
                                <span>-</span>
                              )}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
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
            
            {/* Action Buttons */}
            <div class="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  // Create a new window for printing
                  const printWindow = window.open('', '_blank', 'width=800,height=600');
                  
                  if (!printWindow) {
                    alert("Please allow pop-ups to print the receipt.");
                    return;
                  }
                  
                  // Set the document title
                  printWindow.document.title = `Sale Receipt - ${selectedSale?.saleNumber || 'Receipt'}`;
                  
                  // Add styles and content to the new window
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Sale Receipt - ${selectedSale?.saleNumber || 'Receipt'}</title>
                        <style>
                          body {
                            font-family: Arial, sans-serif;
                            font-size: 12pt;
                            margin: 0;
                            padding: 1cm;
                            background-color: white;
                            color: black;
                          }
                          .receipt-container {
                            max-width: 800px;
                            margin: 0 auto;
                          }
                          h1 {
                            font-size: 16pt;
                            margin-bottom: 5px;
                          }
                          .text-center {
                            text-align: center;
                          }
                          .text-right {
                            text-align: right;
                          }
                          .flex {
                            display: flex;
                            justify-content: space-between;
                          }
                          .mb-3 {
                            margin-bottom: 15px;
                          }
                          .text-sm {
                            font-size: 10pt;
                          }
                          .text-xs {
                            font-size: 8pt;
                          }
                          .font-medium {
                            font-weight: 500;
                          }
                          .font-bold {
                            font-weight: 700;
                          }
                          table {
                            width: 100%;
                            border-collapse: collapse;
                          }
                          th {
                            text-align: left;
                            border-bottom: 1px solid #ddd;
                            padding: 5px;
                          }
                          td {
                            padding: 5px;
                            border-bottom: 1px solid #eee;
                          }
                          .border-t {
                            border-top: 1px solid #ddd;
                            padding-top: 10px;
                            margin-top: 10px;
                          }
                          .text-gray-600 {
                            color: #666;
                          }
                          .text-gray-500 {
                            color: #888;
                          }
                          .text-gray-400 {
                            color: #aaa;
                          }
                          @media print {
                            .no-print {
                              display: none !important;
                            }
                          }
                          .print-button {
                            text-align: center;
                            margin-top: 20px;
                          }
                          .print-button button {
                            padding: 10px 20px;
                            background-color: #4F46E5;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            font-size: 14px;
                            cursor: pointer;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
                          }
                        </style>
                      </head>
                      <body>
                        <div class="receipt-container">
                          <!-- Header -->
                          <div class="text-center mb-3">
                            <h1>SALES RECEIPT</h1>
                            <p class="text-gray-600 text-sm">Thank you for your purchase!</p>
                          </div>

                          <!-- Sale Info -->
                          <div class="flex mb-3">
                            <div>
                              <p class="text-sm"><span class="font-medium">Sale #:</span> ${selectedSale.saleNumber}</p>
                              <p class="text-sm"><span class="font-medium">Branch:</span> ${typeof selectedSale.branch === 'string' ? selectedSale.branch : (selectedSale.branch?.name || 'Main Branch')}</p>
                            </div>
                            <div class="text-right">
                              <p class="text-sm"><span class="font-medium">Date:</span> ${new Date(selectedSale.createdAt).toLocaleDateString()}</p>
                              <p class="text-sm"><span class="font-medium">Time:</span> ${new Date(selectedSale.createdAt).toLocaleTimeString()}</p>
                            </div>
                          </div>

                          <!-- Customer Info -->
                          <div class="mb-3">
                            <p class="text-sm font-medium">Customer:</p>
                            <p class="text-sm">${typeof selectedSale.customer === 'string' ? selectedSale.customer : (selectedSale.customer?.name || 'Customer')}</p>
                            ${selectedSale.customer?.phone ? `<p class="text-sm">Phone: ${selectedSale.customer.phone}</p>` : ''}
                            ${selectedSale.customer?.email ? `<p class="text-sm">Email: ${selectedSale.customer.email}</p>` : ''}
                          </div>

                          <!-- Items Table -->
                          <div class="mb-3">
                            <p class="text-sm font-medium mb-1">Items Purchased:</p>
                            <table class="w-full text-sm">
                              <thead>
                                <tr>
                                  <th>Item</th>
                                  <th class="text-center">Qty</th>
                                  <th class="text-right">Price</th>
                                  <th class="text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${selectedSale.items && selectedSale.items.length > 0 ? 
                                  selectedSale.items.map(item => `
                                    <tr>
                                      <td>${item.description}</td>
                                      <td class="text-center">${item.quantity}</td>
                                      <td class="text-right">$${(item.unitPrice || 0).toFixed(2)}</td>
                                      <td class="text-right">$${(item.total || 0).toFixed(2)}</td>
                                    </tr>
                                  `).join('') : 
                                  `<tr><td colspan="4" class="text-center text-gray-500">No items in this sale</td></tr>`
                                }
                              </tbody>
                            </table>
                          </div>

                          <!-- Totals -->
                          <div class="mb-3 border-t">
                            <div class="flex">
                              <span>Payment Method:</span>
                              <span>
                                ${selectedSale.paymentMethod === 'cash' ? 'Cash' :
                                 selectedSale.paymentMethod === 'check' ? 'Check' :
                                 selectedSale.paymentMethod === 'credit_card' ? 'Credit Card' :
                                 selectedSale.paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
                                 selectedSale.paymentMethod === 'online_payment' ? 'Online Payment' :
                                 selectedSale.paymentMethod}
                              </span>
                            </div>
                            
                            ${selectedSale.paymentReference ? `
                              <div class="flex">
                                <span>Reference:</span>
                                <span>${selectedSale.paymentReference}</span>
                              </div>
                            ` : ''}
                            
                            <div class="flex">
                              <span>Subtotal:</span>
                              <span>$${(selectedSale.subtotal || 0).toFixed(2)}</span>
                            </div>
                            
                            <div class="flex">
                              <span>Discount:</span>
                              <span>$${(selectedSale.discountAmount || 0).toFixed(2)}</span>
                            </div>
                            
                            <div class="flex">
                              <span>Tax:</span>
                              <span>$${(selectedSale.taxAmount || 0).toFixed(2)}</span>
                            </div>
                            
                            <div class="flex font-bold border-t">
                              <span>Total:</span>
                              <span>$${(selectedSale.total || 0).toFixed(2)}</span>
                            </div>
                          </div>

                          <!-- Footer -->
                          <div class="text-center text-gray-600 text-xs mt-4 border-t">
                            <p class="font-medium">Thank you for your business!</p>
                            <p>For inquiries: support@example.com</p>
                            <p>${typeof selectedSale.branch === 'string' ? selectedSale.branch : (selectedSale.branch?.name || 'Main Branch')} • ${new Date(selectedSale.createdAt).toLocaleDateString()}</p>
                            <div class="text-right text-xs text-gray-400">1/1</div>
                          </div>
                        </div>
                        
                        <!-- Print Button - will be hidden when printing -->
                        <div class="print-button no-print">
                          <button onclick="window.print(); return false;">
                            Print Receipt
                          </button>
                        </div>
                      </body>
                    </html>
                  `);
                  
                  // Close the document for writing
                  printWindow.document.close();
                  
                  // Wait for the document to load before printing
                  printWindow.onload = function() {
                    // Print the document automatically
                    printWindow.print();
                  };
                }}
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Receipt
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SalesPage;
