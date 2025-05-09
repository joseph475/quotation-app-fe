import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Modal from '../../components/common/Modal';
import QuotationForm from '../../components/quotations/QuotationForm';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import { useConfirmModal, useErrorModal } from '../../contexts/ModalContext';

const QuotationsPage = () => {
  // Export all filtered quotations to CSV
  const exportAllQuotationsToCSV = (quotations) => {
    if (!quotations || quotations.length === 0) {
      alert('No quotations to export');
      return;
    }
    
    // Define CSV headers
    const headers = [
      'Quotation Number',
      'Customer',
      'Date',
      'Valid Until',
      'Status',
      'Total Amount',
      'Notes'
    ];
    
    // Convert quotations to CSV rows
    const rows = quotations.map(quotation => {
      // Format customer name
      const customerName = typeof quotation.customer === 'string' 
        ? quotation.customer 
        : (quotation.customer?.name || 'Unknown Customer');
      
      // Format status
      let status = quotation.status;
      if (status === 'draft') status = 'Pending';
      else if (status === 'accepted') status = 'Approved';
      else status = status.charAt(0).toUpperCase() + status.slice(1);
      
      return [
        quotation.quotationNumber || '',
        customerName,
        new Date(quotation.createdAt).toLocaleDateString(),
        new Date(quotation.validUntil).toLocaleDateString(),
        status,
        `$${(quotation.total || 0).toFixed(2)}`,
        quotation.notes || ''
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
    link.setAttribute('download', `quotations_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Export single quotation details to CSV
  const exportQuotationToCSV = (quotation) => {
    if (!quotation) return;
    
    // Define CSV headers
    const headers = [
      'Quotation Number',
      'Customer',
      'Date',
      'Valid Until',
      'Status',
      'Total Amount',
      'Notes',
      'Terms & Conditions'
    ];
    
    // Format customer name
    const customerName = typeof quotation.customer === 'string' 
      ? quotation.customer 
      : (quotation.customer?.name || 'Unknown Customer');
    
    // Format status
    let status = quotation.status;
    if (status === 'draft') status = 'Pending';
    else if (status === 'accepted') status = 'Approved';
    else status = status.charAt(0).toUpperCase() + status.slice(1);
    
    // Basic quotation information
    const quotationInfo = [
      quotation.quotationNumber || '',
      customerName,
      new Date(quotation.createdAt).toLocaleDateString(),
      new Date(quotation.validUntil).toLocaleDateString(),
      status,
      `$${(quotation.total || 0).toFixed(2)}`,
      quotation.notes || '',
      quotation.terms || ''
    ];
    
    // Items headers
    const itemsHeaders = [
      '',
      'Item Description',
      'Quantity',
      'Unit Price',
      'Discount',
      'Tax',
      'Total'
    ];
    
    // Convert items to CSV rows
    const itemRows = quotation.items && quotation.items.length > 0
      ? quotation.items.map((item, index) => [
          `Item ${index + 1}`,
          item.description || '',
          item.quantity || '',
          `$${parseFloat(item.unitPrice).toFixed(2)}`,
          `${item.discount}%`,
          `${item.tax}%`,
          `$${parseFloat(item.total).toFixed(2)}`
        ])
      : [['No items', '', '', '', '', '', '']];
    
    // Combine all rows
    const csvContent = [
      headers.join(','),
      quotationInfo.join(','),
      '', // Empty row for spacing
      itemsHeaders.join(','),
      ...itemRows.map(row => row.join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `quotation_${quotation.quotationNumber}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Get current user from auth context
  const { user } = useAuth();
  
  // Get modal contexts
  const { showConfirm, showDeleteConfirm } = useConfirmModal();
  const { showError } = useErrorModal();
  
  // Fetch quotations from API
  useEffect(() => {
    const fetchQuotations = async () => {
      setLoading(true);
      try {
        const response = await api.quotations.getAll();
        
        if (response && response.success) {
          setQuotations(response.data || []);
          setError(null);
        } else {
          throw new Error(response.message || 'Failed to fetch quotations');
        }
      } catch (err) {
        console.error('Error fetching quotations:', err);
        setError('Failed to load quotations. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuotations();
  }, []);

  // Filter quotations based on active tab, search term, and date filter
  const filteredQuotations = quotations.filter(quotation => {
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'pending' && quotation.status === 'draft') ||
                      (activeTab === 'approved' && quotation.status === 'accepted') ||
                      (activeTab === 'rejected' && quotation.status === 'rejected');
    
    // Handle customer which might be an object or string
    const customerName = typeof quotation.customer === 'string' 
      ? quotation.customer 
      : (quotation.customer?.name || '');
      
    const quotationNumber = quotation.quotationNumber || '';
    
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         quotationNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Simple date filtering logic
    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = new Date(quotation.createdAt).toDateString() === new Date().toDateString();
    } else if (dateFilter === 'week') {
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      const quotationDate = new Date(quotation.createdAt);
      matchesDate = quotationDate >= weekAgo && quotationDate <= today;
    } else if (dateFilter === 'month') {
      const today = new Date();
      const monthAgo = new Date();
      monthAgo.setMonth(today.getMonth() - 1);
      const quotationDate = new Date(quotation.createdAt);
      matchesDate = quotationDate >= monthAgo && quotationDate <= today;
    }
    
    return matchesTab && matchesSearch && matchesDate;
  });

  // Calculate total quotation amount
  const totalQuotationAmount = filteredQuotations.reduce((total, quotation) => total + (quotation.total || 0), 0);

  return (
    <div>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Quotation Management</h1>
        <p class="mt-1 text-sm text-gray-500">Create and manage quotations for your customers</p>
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
      {loading && !isFormModalOpen && (
        <div class="text-center py-12 bg-white rounded-lg shadow mb-6">
          <svg class="mx-auto h-12 w-12 text-gray-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="mt-2 text-sm text-gray-500">Loading quotations...</p>
        </div>
      )}

      {/* Quotation Summary Cards */}
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
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
                  <dt class="text-sm font-medium text-gray-500 truncate">Total Quotations</dt>
                  <dd class="text-lg font-medium text-gray-900">{quotations.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

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
                  <dd class="text-lg font-medium text-gray-900">${totalQuotationAmount.toFixed(2)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

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
                    {quotations.filter(quotation => quotation.status === 'accepted').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

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
                    {quotations.filter(quotation => quotation.status === 'draft').length}
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
                placeholder="Search quotations..."
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
            <button 
              class="btn btn-outline flex items-center"
              onClick={() => exportAllQuotationsToCSV(filteredQuotations)}
            >
              <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              Export CSV
            </button>
            <button 
              class="btn btn-primary flex items-center"
              onClick={() => setIsFormModalOpen(true)}
            >
              <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
              </svg>
              New Quotation
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
            All Quotations
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
          <button
            onClick={() => setActiveTab('approved')}
            class={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'approved'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            class={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rejected'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Rejected
          </button>
        </nav>
      </div>

      {/* Quotations Table */}
      <div class="bg-white shadow rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quotation ID
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
                  Valid Until
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
              {filteredQuotations.map((quotation) => (
                <tr key={quotation._id}>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                    {quotation.quotationNumber}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {typeof quotation.customer === 'string' 
                      ? quotation.customer 
                      : (quotation.customer?.name || 'Unknown Customer')}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${(quotation.total || 0).toFixed(2)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(quotation.createdAt).toLocaleDateString()}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(quotation.validUntil).toLocaleDateString()}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      quotation.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                      quotation.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                      quotation.status === 'converted' ? 'bg-blue-100 text-blue-800' :
                      quotation.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {quotation.status === 'draft' ? 'Pending' : 
                       quotation.status === 'accepted' ? 'Approved' : 
                       quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex justify-end space-x-2">
                      <button 
                        class="text-primary-600 hover:text-primary-900"
                        onClick={() => {
                          setSelectedQuotation(quotation);
                          setIsViewModalOpen(true);
                        }}
                      >
                        View
                      </button>
                      <button 
                        class="text-primary-600 hover:text-primary-900"
                        onClick={() => {
                          setSelectedQuotation(quotation);
                          setIsEditModalOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      {/* Only show delete/convert buttons for non-user roles */}
                      {user && user.role !== 'user' && (
                        <button class="text-primary-600 hover:text-primary-900">Convert to Sale</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
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
                Showing <span class="font-medium">1</span> to <span class="font-medium">{filteredQuotations.length}</span> of <span class="font-medium">{filteredQuotations.length}</span> results
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
      </div>
      {/* New Quotation Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title="Create New Quotation"
        size="5xl"
      >
        <QuotationForm
          onCancel={() => setIsFormModalOpen(false)}
          onSave={async (quotationData) => {
            try {
              setLoading(true);
              const response = await api.quotations.create(quotationData);
              
              if (response && response.success) {
                // Refresh quotations list
                const updatedQuotations = await api.quotations.getAll();
                setQuotations(updatedQuotations.data || []);
                setError(null);
                setIsFormModalOpen(false);
              } else {
                throw new Error(response.message || 'Failed to create quotation');
              }
            } catch (err) {
              console.error('Error creating quotation:', err);
              setError(err.message || 'Failed to create quotation. Please try again.');
            } finally {
              setLoading(false);
            }
          }}
        />
      </Modal>

      {/* View Quotation Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Quotation Details: ${selectedQuotation?.quotationNumber || ''}`}
        size="4xl"
      >
        {selectedQuotation && (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 bg-gray-50">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Quotation Information</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Quotation Number</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{selectedQuotation.quotationNumber}</dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Customer</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {typeof selectedQuotation.customer === 'string' 
                        ? selectedQuotation.customer 
                        : (selectedQuotation.customer?.name || 'Unknown Customer')}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Date</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {new Date(selectedQuotation.createdAt).toLocaleDateString()}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Valid Until</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {new Date(selectedQuotation.validUntil).toLocaleDateString()}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        selectedQuotation.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                        selectedQuotation.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                        selectedQuotation.status === 'converted' ? 'bg-blue-100 text-blue-800' :
                        selectedQuotation.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedQuotation.status === 'draft' ? 'Pending' : 
                         selectedQuotation.status === 'accepted' ? 'Approved' : 
                         selectedQuotation.status.charAt(0).toUpperCase() + selectedQuotation.status.slice(1)}
                      </span>
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      ${(selectedQuotation.total || 0).toFixed(2)}
                    </dd>
                  </div>
                  {selectedQuotation.notes && (
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Notes</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{selectedQuotation.notes}</dd>
                    </div>
                  )}
                  {selectedQuotation.terms && (
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Terms & Conditions</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{selectedQuotation.terms}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 bg-gray-50">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Quotation Items</h3>
              </div>
              <div className="border-t border-gray-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
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
                      {selectedQuotation.items && selectedQuotation.items.length > 0 ? (
                        selectedQuotation.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.description}
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
                            No items in this quotation
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
                          ${(selectedQuotation.total || 0).toFixed(2)}
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
                onClick={() => exportQuotationToCSV(selectedQuotation)}
              >
                <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Export CSV
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </button>
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
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Quotation Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Quotation: ${selectedQuotation?.quotationNumber || ''}`}
        size="5xl"
      >
        {selectedQuotation && (
          <QuotationForm
            initialData={selectedQuotation}
            onCancel={() => setIsEditModalOpen(false)}
            onSave={async (quotationData) => {
              try {
                setLoading(true);
                const response = await api.quotations.update(selectedQuotation._id, quotationData);
                
                if (response && response.success) {
                  // Refresh quotations list
                  const updatedQuotations = await api.quotations.getAll();
                  setQuotations(updatedQuotations.data || []);
                  setError(null);
                  setIsEditModalOpen(false);
                } else {
                  throw new Error(response.message || 'Failed to update quotation');
                }
              } catch (err) {
                console.error('Error updating quotation:', err);
                setError(err.message || 'Failed to update quotation. Please try again.');
              } finally {
                setLoading(false);
              }
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default QuotationsPage;
