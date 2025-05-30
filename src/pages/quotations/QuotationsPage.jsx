import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Modal from '../../components/common/Modal';
import QuotationForm from '../../components/quotations/QuotationForm';
import QuotationReceipt from '../../components/quotations/QuotationReceipt';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import { useConfirmModal, useErrorModal } from '../../contexts/ModalContext';
import { hasPermission } from '../../utils/pageHelpers';

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
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Show success message with auto-hide
  const showSuccess = (message) => {
    setSuccessMessage(message);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };
  
  // Get current user from auth context
  const { user } = useAuth();
  
  // Get modal contexts
  const { showConfirm, showDeleteConfirm } = useConfirmModal();
  const { showError } = useErrorModal();
  
  // Handle converting quotation to sale
  const handleConvertToSale = async (quotation) => {
    if (!quotation) return;
    
    try {
      setLoading(true);
      
      // Show confirmation dialog
      showConfirm({
        title: 'Convert to Sale',
        message: `Are you sure you want to convert quotation ${quotation.quotationNumber} to a sale?`,
        confirmText: 'Convert',
        cancelText: 'Cancel',
        onConfirm: async () => {
          try {
            // Call API to convert quotation to sale
            const response = await api.quotations.convertToSale(quotation._id);
            
            if (response && response.success) {
              // Refresh quotations list
              const updatedQuotations = await api.quotations.getAll();
              setQuotations(updatedQuotations.data || []);
              setError(null);
              
              // Show success message
              showSuccess('Quotation successfully converted to sale!');
            } else {
              throw new Error(response.message || 'Failed to convert quotation to sale');
            }
          } catch (err) {
            console.error('Error converting quotation to sale:', err);
            setError(err.message || 'Failed to convert quotation to sale. Please try again.');
            showError('Failed to convert quotation to sale', err.message);
          } finally {
            setLoading(false);
          }
        }
      });
    } catch (err) {
      console.error('Error preparing to convert quotation:', err);
      setError(err.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };
  
  // Handle rejecting quotation
  const handleRejectQuotation = async (quotation) => {
    if (!quotation) return;
    
    try {
      setLoading(true);
      
      // Show confirmation dialog
      showConfirm({
        title: 'Reject Quotation',
        message: `Are you sure you want to reject quotation ${quotation.quotationNumber}?`,
        confirmText: 'Reject',
        cancelText: 'Cancel',
        onConfirm: async () => {
          try {
            // Call API to reject quotation
            const response = await api.quotations.reject(quotation._id);
            
            if (response && response.success) {
              // Refresh quotations list
              const updatedQuotations = await api.quotations.getAll();
              setQuotations(updatedQuotations.data || []);
              setError(null);
              
              // Show success message
              showSuccess('Quotation successfully rejected!');
            } else {
              throw new Error(response.message || 'Failed to reject quotation');
            }
          } catch (err) {
            console.error('Error rejecting quotation:', err);
            setError(err.message || 'Failed to reject quotation. Please try again.');
            showError('Failed to reject quotation', err.message);
          } finally {
            setLoading(false);
          }
        }
      });
    } catch (err) {
      console.error('Error preparing to reject quotation:', err);
      setError(err.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };
  
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

  // Auto-print when receipt modal is opened
  useEffect(() => {
    if (isReceiptModalOpen && selectedQuotation) {
      // Small delay to ensure the modal is fully rendered
      const timer = setTimeout(() => {
        // Create a new window for printing
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (printWindow) {
          // Set the document title
          printWindow.document.title = `Quotation - ${selectedQuotation?.quotationNumber || 'Quotation'}`;
          
          // Add styles and content to the new window
          printWindow.document.write(`
            <html>
              <head>
                <title>Quotation - ${selectedQuotation?.quotationNumber || 'Quotation'}</title>
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
                    <h1>QUOTATION</h1>
                    <p class="text-gray-600 text-sm">Thank you for your interest in our products/services!</p>
                  </div>

                  <!-- Quotation Info -->
                  <div class="flex mb-3">
                    <div>
                      <p class="text-sm"><span class="font-medium">Quotation #:</span> ${selectedQuotation.quotationNumber}</p>
                      <p class="text-sm"><span class="font-medium">Branch:</span> ${selectedQuotation.branch?.name || 'Main Branch'}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-sm"><span class="font-medium">Date:</span> ${new Date(selectedQuotation.createdAt).toLocaleDateString()}</p>
                      <p class="text-sm"><span class="font-medium">Valid Until:</span> ${new Date(selectedQuotation.validUntil).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <!-- Customer Info -->
                  <div class="mb-3">
                    <p class="text-sm font-medium">Customer:</p>
                    <p class="text-sm">${typeof selectedQuotation.customer === 'string' ? selectedQuotation.customer : (selectedQuotation.customer?.name || 'Customer')}</p>
                  </div>

                  <!-- Items Table -->
                  <div class="mb-3">
                    <p class="text-sm font-medium mb-1">Quoted Items:</p>
                    <table class="w-full text-sm">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th class="text-center">Qty</th>
                          <th class="text-right">Unit Price</th>
                          <th class="text-right">Discount</th>
                          <th class="text-right">Tax</th>
                          <th class="text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${selectedQuotation.items && selectedQuotation.items.length > 0 ? 
                          selectedQuotation.items.map(item => `
                            <tr>
                              <td>${item.description}</td>
                              <td class="text-center">${item.quantity}</td>
                              <td class="text-right">$${(item.unitPrice || 0).toFixed(2)}</td>
                              <td class="text-right">${item.discount || 0}%</td>
                              <td class="text-right">${item.tax || 0}%</td>
                              <td class="text-right">$${(item.total || 0).toFixed(2)}</td>
                            </tr>
                          `).join('') : 
                          `<tr><td colspan="6" class="text-center text-gray-500">No items in this quotation</td></tr>`
                        }
                      </tbody>
                    </table>
                  </div>

                  <!-- Totals -->
                  <div class="mb-3 border-t">
                    <div class="flex">
                      <span>Subtotal:</span>
                      <span>$${(selectedQuotation.subtotal || 0).toFixed(2)}</span>
                    </div>
                    
                    <div class="flex">
                      <span>Discount:</span>
                      <span>$${(selectedQuotation.discountAmount || 0).toFixed(2)}</span>
                    </div>
                    
                    <div class="flex">
                      <span>Tax:</span>
                      <span>$${(selectedQuotation.taxAmount || 0).toFixed(2)}</span>
                    </div>
                    
                    <div class="flex font-bold border-t">
                      <span>Total:</span>
                      <span>$${(selectedQuotation.total || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <!-- Notes & Terms -->
                  ${selectedQuotation.notes ? `
                    <div class="mb-3">
                      <p class="text-sm font-medium">Notes:</p>
                      <p class="text-sm">${selectedQuotation.notes}</p>
                    </div>
                  ` : ''}
                  
                  ${selectedQuotation.terms ? `
                    <div class="mb-3">
                      <p class="text-sm font-medium">Terms & Conditions:</p>
                      <p class="text-sm">${selectedQuotation.terms}</p>
                    </div>
                  ` : ''}

                  <!-- Footer -->
                  <div class="text-center text-gray-600 text-xs mt-4 border-t">
                    <p class="font-medium">Thank you for considering our offer!</p>
                    <p>For inquiries: support@example.com</p>
                    <p>${selectedQuotation.branch?.name || 'Main Branch'} • ${new Date(selectedQuotation.createdAt).toLocaleDateString()}</p>
                    <div class="text-right text-xs text-gray-400">1/1</div>
                  </div>
                </div>
                
                <!-- Print Button - will be hidden when printing -->
                <div class="print-button no-print">
                  <button onclick="window.print(); return false;">
                    Print Quotation
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
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isReceiptModalOpen, selectedQuotation]);

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
            {/* Only show New Quotation button for non-admin users */}
            {hasPermission('quotations-create', user) && (
              <button 
                class="btn btn-primary flex items-center"
                onClick={() => setIsFormModalOpen(true)}
              >
                <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                </svg>
                New Quotation
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
                      quotation.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      quotation.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex justify-end space-x-2">
                      <button 
                        class="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        onClick={() => {
                          setSelectedQuotation(quotation);
                          setIsViewModalOpen(true);
                        }}
                      >
                        <svg class="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                        </svg>
                        View
                      </button>
                      
                      {/* Edit button only for user role */}
                      {user && user.role === 'user' && (
                        <button 
                          class="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          onClick={() => {
                            setSelectedQuotation(quotation);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <svg class="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          Edit
                        </button>
                      )}
                      
                      {/* Show Convert to Sale button only for user role and when quotation is active */}
                      {user && user.role === 'user' && quotation.status === 'active' && (
                        <button 
                          class="inline-flex items-center px-2.5 py-1.5 border border-green-300 shadow-sm text-xs font-medium rounded text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          onClick={() => handleConvertToSale(quotation)}
                        >
                          <svg class="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                          </svg>
                          Convert to Sale
                        </button>
                      )}
                      
                      {/* Show Reject button only for user role and when quotation is active */}
                      {user && user.role === 'user' && quotation.status === 'active' && (
                        <button 
                          class="inline-flex items-center px-2.5 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          onClick={() => handleRejectQuotation(quotation)}
                        >
                          <svg class="h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                          </svg>
                          Reject
                        </button>
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
                owing <span class="font-medium">1</span> to <span class="font-medium">{filteredQuotations.length}</span> of <span class="font-medium">{filteredQuotations.length}</span> results
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
                        selectedQuotation.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        selectedQuotation.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedQuotation.status.charAt(0).toUpperCase() + selectedQuotation.status.slice(1)}
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
                onClick={() => {
                  // Create a new window for printing
                  const printWindow = window.open('', '_blank', 'width=800,height=600');
                  if (printWindow) {
                    // Set the document title
                    printWindow.document.title = `Quotation - ${selectedQuotation?.quotationNumber || 'Quotation'}`;
                    
                    // Add styles and content to the new window
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Quotation - ${selectedQuotation?.quotationNumber || 'Quotation'}</title>
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
                              <h1>QUOTATION</h1>
                              <p class="text-gray-600 text-sm">Thank you for your interest in our products/services!</p>
                            </div>

                            <!-- Quotation Info -->
                            <div class="flex mb-3">
                              <div>
                                <p class="text-sm"><span class="font-medium">Quotation #:</span> ${selectedQuotation.quotationNumber}</p>
                                <p class="text-sm"><span class="font-medium">Branch:</span> ${selectedQuotation.branch?.name || 'Main Branch'}</p>
                              </div>
                              <div class="text-right">
                                <p class="text-sm"><span class="font-medium">Date:</span> ${new Date(selectedQuotation.createdAt).toLocaleDateString()}</p>
                                <p class="text-sm"><span class="font-medium">Valid Until:</span> ${new Date(selectedQuotation.validUntil).toLocaleDateString()}</p>
                              </div>
                            </div>

                            <!-- Customer Info -->
                            <div class="mb-3">
                              <p class="text-sm font-medium">Customer:</p>
                              <p class="text-sm">${typeof selectedQuotation.customer === 'string' ? selectedQuotation.customer : (selectedQuotation.customer?.name || 'Customer')}</p>
                            </div>

                            <!-- Items Table -->
                            <div class="mb-3">
                              <p class="text-sm font-medium mb-1">Quoted Items:</p>
                              <table class="w-full text-sm">
                                <thead>
                                  <tr>
                                    <th>Description</th>
                                    <th class="text-center">Qty</th>
                                    <th class="text-right">Unit Price</th>
                                    <th class="text-right">Discount</th>
                                    <th class="text-right">Tax</th>
                                    <th class="text-right">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${selectedQuotation.items && selectedQuotation.items.length > 0 ? 
                                    selectedQuotation.items.map(item => `
                                      <tr>
                                        <td>${item.description}</td>
                                        <td class="text-center">${item.quantity}</td>
                                        <td class="text-right">$${(item.unitPrice || 0).toFixed(2)}</td>
                                        <td class="text-right">${item.discount || 0}%</td>
                                        <td class="text-right">${item.tax || 0}%</td>
                                        <td class="text-right">$${(item.total || 0).toFixed(2)}</td>
                                      </tr>
                                    `).join('') : 
                                    `<tr><td colspan="6" class="text-center text-gray-500">No items in this quotation</td></tr>`
                                  }
                                </tbody>
                              </table>
                            </div>

                            <!-- Totals -->
                            <div class="mb-3 border-t">
                              <div class="flex">
                                <span>Subtotal:</span>
                                <span>$${(selectedQuotation.subtotal || 0).toFixed(2)}</span>
                              </div>
                              
                              <div class="flex">
                                <span>Discount:</span>
                                <span>$${(selectedQuotation.discountAmount || 0).toFixed(2)}</span>
                              </div>
                              
                              <div class="flex">
                                <span>Tax:</span>
                                <span>$${(selectedQuotation.taxAmount || 0).toFixed(2)}</span>
                              </div>
                              
                              <div class="flex font-bold border-t">
                                <span>Total:</span>
                                <span>$${(selectedQuotation.total || 0).toFixed(2)}</span>
                              </div>
                            </div>

                            <!-- Notes & Terms -->
                            ${selectedQuotation.notes ? `
                              <div class="mb-3">
                                <p class="text-sm font-medium">Notes:</p>
                                <p class="text-sm">${selectedQuotation.notes}</p>
                              </div>
                            ` : ''}
                            
                            ${selectedQuotation.terms ? `
                              <div class="mb-3">
                                <p class="text-sm font-medium">Terms & Conditions:</p>
                                <p class="text-sm">${selectedQuotation.terms}</p>
                              </div>
                            ` : ''}

                            <!-- Footer -->
                            <div class="text-center text-gray-600 text-xs mt-4 border-t">
                              <p class="font-medium">Thank you for considering our offer!</p>
                              <p>For inquiries: support@example.com</p>
                              <p>${selectedQuotation.branch?.name || 'Main Branch'} • ${new Date(selectedQuotation.createdAt).toLocaleDateString()}</p>
                              <div class="text-right text-xs text-gray-400">1/1</div>
                            </div>
                          </div>
                          
                          <!-- Print Button - will be hidden when printing -->
                          <div class="print-button no-print">
                            <button onclick="window.print(); return false;">
                              Print Quotation
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
                  }
                }}
              >
                <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0v3H7V4h6zm-6 8v4h6v-4H7z" clipRule="evenodd" />
                </svg>
                Print Preview
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </button>
              {/* Edit button only for user role */}
              {user && user.role === 'user' && (
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

      {/* No longer needed - Print Preview is now directly embedded in the View modal */}
    </div>
  );
};

export default QuotationsPage;
