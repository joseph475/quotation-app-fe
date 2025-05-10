import { h, Fragment } from 'preact';
import { useEffect, useState, useRef } from 'preact/hooks';
import api from '../../services/api';

/**
 * QuotationReceipt component for displaying a printable quotation
 * 
 * @param {Object} props - Component props
 * @param {Object} props.quotation - Quotation data to display in the receipt
 * @param {Function} props.onClose - Function to call when closing the receipt
 * @param {Function} props.onPrint - Function to call when printing the receipt
 */
const QuotationReceipt = ({ quotation, onClose, onPrint }) => {
  const [customerName, setCustomerName] = useState('Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [branchName, setBranchName] = useState('Main Branch');
  const [loading, setLoading] = useState({
    customer: false,
    branch: false
  });

  // Fetch customer data when the component mounts or quotation changes
  useEffect(() => {
    console.log("Quotation data:", quotation);
    
    // Process customer data
    if (quotation?.customerName) {
      // Use customerName directly if available
      setCustomerName(quotation.customerName);
      
      // If we have customer object with additional details
      if (quotation.customer && typeof quotation.customer === 'object') {
        setCustomerPhone(quotation.customer.phone || '');
        setCustomerEmail(quotation.customer.email || '');
      }
    } else if (quotation?.customer) {
      // If customer is an ID string, fetch customer details from API
      if (typeof quotation.customer === 'string' || typeof quotation.customer === 'number') {
        const customerId = quotation.customer;
        setLoading(prev => ({ ...prev, customer: true }));
        
        api.customers.getById(customerId)
          .then(response => {
            if (response && response.success && response.data) {
              setCustomerName(response.data.name || 'Customer');
              setCustomerPhone(response.data.phone || '');
              setCustomerEmail(response.data.email || '');
              console.log("Customer data fetched:", response.data);
            } else {
              setCustomerName('Customer');
              console.error("Failed to fetch customer data:", response);
            }
          })
          .catch(error => {
            console.error("Error fetching customer:", error);
            setCustomerName('Customer');
          })
          .finally(() => {
            setLoading(prev => ({ ...prev, customer: false }));
          });
      } else if (typeof quotation.customer === 'object') {
        // If customer is an object, extract all available properties
        setCustomerName(quotation.customer.name || 'Customer');
        setCustomerPhone(quotation.customer.phone || '');
        setCustomerEmail(quotation.customer.email || '');
      } else {
        // Fallback
        setCustomerName('Customer');
      }
    }
  }, [quotation]);

  // Fetch branch data when the component mounts or quotation changes
  useEffect(() => {
    // Process branch data
    if (quotation?.branchName) {
      // Use branchName directly if available
      setBranchName(quotation.branchName);
    } else if (quotation?.branch) {
      // If branch is an ID string, fetch branch details from API
      if (typeof quotation.branch === 'string' || typeof quotation.branch === 'number') {
        const branchId = quotation.branch;
        setLoading(prev => ({ ...prev, branch: true }));
        
        api.branches.getById(branchId)
          .then(response => {
            if (response && response.success && response.data) {
              setBranchName(response.data.name || 'Branch');
              console.log("Branch data fetched:", response.data);
            } else {
              setBranchName('Branch');
              console.error("Failed to fetch branch data:", response);
            }
          })
          .catch(error => {
            console.error("Error fetching branch:", error);
            setBranchName('Branch');
          })
          .finally(() => {
            setLoading(prev => ({ ...prev, branch: false }));
          });
      } else if (typeof quotation.branch === 'object') {
        // If branch is an object, extract name
        setBranchName(quotation.branch.name || 'Branch');
      } else {
        // Fallback
        setBranchName('Branch');
      }
    }
  }, [quotation]);

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

  // Get status display text
  const getStatusText = (status) => {
    if (!status) return 'Pending';
    
    switch(status.toLowerCase()) {
      case 'draft': return 'Pending';
      case 'accepted': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'converted': return 'Converted to Sale';
      case 'expired': return 'Expired';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Handle print button click
  const handlePrint = () => {
    // Call the onPrint callback if provided
    if (onPrint) {
      onPrint();
    }
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      alert("Please allow pop-ups to print the quotation.");
      return;
    }
    
    // Set the document title
    printWindow.document.title = `Quotation - ${quotation?.quotationNumber || 'Quotation'}`;
    
    // Add styles and content to the new window
    printWindow.document.write(`
      <html>
        <head>
          <title>Quotation - ${quotation?.quotationNumber || 'Quotation'}</title>
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
            .status-badge {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 12px;
              font-size: 10pt;
              font-weight: 500;
            }
            .status-pending {
              background-color: #FEF3C7;
              color: #92400E;
            }
            .status-approved {
              background-color: #D1FAE5;
              color: #065F46;
            }
            .status-rejected {
              background-color: #FEE2E2;
              color: #B91C1C;
            }
            .status-converted {
              background-color: #DBEAFE;
              color: #1E40AF;
            }
            .status-expired {
              background-color: #F3F4F6;
              color: #4B5563;
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
                <p class="text-sm"><span class="font-medium">Quotation #:</span> ${quotation.quotationNumber}</p>
                <p class="text-sm"><span class="font-medium">Branch:</span> ${branchName}</p>
              </div>
              <div class="text-right">
                <p class="text-sm"><span class="font-medium">Date:</span> ${formatDate(quotation.createdAt)}</p>
                <p class="text-sm"><span class="font-medium">Valid Until:</span> ${formatDate(quotation.validUntil)}</p>
              </div>
            </div>

            <!-- Customer Info -->
            <div class="mb-3">
              <p class="text-sm font-medium">Customer:</p>
              <p class="text-sm">${customerName}</p>
              ${customerPhone ? `<p class="text-sm">Phone: ${customerPhone}</p>` : ''}
              ${customerEmail ? `<p class="text-sm">Email: ${customerEmail}</p>` : ''}
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
                  ${quotation.items && quotation.items.length > 0 ? 
                    quotation.items.map(item => `
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
                <span>$${(quotation.subtotal || 0).toFixed(2)}</span>
              </div>
              
              <div class="flex">
                <span>Discount:</span>
                <span>$${(quotation.discountAmount || 0).toFixed(2)}</span>
              </div>
              
              <div class="flex">
                <span>Tax:</span>
                <span>$${(quotation.taxAmount || 0).toFixed(2)}</span>
              </div>
              
              <div class="flex font-bold border-t">
                <span>Total:</span>
                <span>$${(quotation.total || 0).toFixed(2)}</span>
              </div>
            </div>

            <!-- Notes & Terms -->
            ${quotation.notes ? `
              <div class="mb-3">
                <p class="text-sm font-medium">Notes:</p>
                <p class="text-sm">${quotation.notes}</p>
              </div>
            ` : ''}
            
            ${quotation.terms ? `
              <div class="mb-3">
                <p class="text-sm font-medium">Terms & Conditions:</p>
                <p class="text-sm">${quotation.terms}</p>
              </div>
            ` : ''}

            <!-- Footer -->
            <div class="text-center text-gray-600 text-xs mt-4 border-t">
              <p class="font-medium">Thank you for considering our offer!</p>
              <p>For inquiries: support@example.com</p>
              <p>${branchName} • ${formatDate(quotation.createdAt)}</p>
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
      
      // Close the window after printing (optional)
      // printWindow.close();
    };
  };

  return (
    <>
      {/* Receipt Content - visible in the modal */}
      <div className="border border-gray-200 p-4 rounded-lg max-w-2xl mx-auto bg-white shadow-md">
        {/* Header */}
        <div className="text-center mb-3">
          <h1 className="text-xl font-bold">QUOTATION</h1>
          <p className="text-gray-600 text-sm">Thank you for your interest in our products/services!</p>
        </div>

        {/* Quotation Info */}
        <div className="flex justify-between mb-3">
          <div>
            <p className="text-sm"><span className="font-medium">Quotation #:</span> {quotation.quotationNumber}</p>
            <p className="text-sm"><span className="font-medium">Branch:</span> {loading.branch ? "Loading..." : branchName}</p>
          </div>
          <div className="text-right">
            <p className="text-sm"><span className="font-medium">Date:</span> {formatDate(quotation.createdAt)}</p>
            <p className="text-sm"><span className="font-medium">Valid Until:</span> {formatDate(quotation.validUntil)}</p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-3">
          <p className="text-sm font-medium">Customer:</p>
          <p className="text-sm">{loading.customer ? "Loading customer details..." : customerName}</p>
          {customerPhone && <p className="text-sm">Phone: {customerPhone}</p>}
          {customerEmail && <p className="text-sm">Email: {customerEmail}</p>}
        </div>

        {/* Items Table */}
        <div className="mb-3">
          <p className="text-sm font-medium mb-1">Quoted Items:</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-1">Description</th>
                <th className="text-center py-1">Qty</th>
                <th className="text-right py-1">Unit Price</th>
                <th className="text-right py-1">Discount</th>
                <th className="text-right py-1">Tax</th>
                <th className="text-right py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items && quotation.items.length > 0 ? (
                quotation.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-1">{item.description}</td>
                    <td className="text-center py-1">{item.quantity}</td>
                    <td className="text-right py-1">${(item.unitPrice || 0).toFixed(2)}</td>
                    <td className="text-right py-1">{item.discount || 0}%</td>
                    <td className="text-right py-1">{item.tax || 0}%</td>
                    <td className="text-right py-1">${(item.total || 0).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-2 text-center text-gray-500">No items in this quotation</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mb-3 border-t border-gray-300 pt-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>${(quotation.subtotal || 0).toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Discount:</span>
            <span>${(quotation.discountAmount || 0).toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Tax:</span>
            <span>${(quotation.taxAmount || 0).toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-sm font-bold border-t border-gray-300 mt-1 pt-1">
            <span>Total:</span>
            <span>${(quotation.total || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Notes & Terms */}
        {quotation.notes && (
          <div className="mb-3">
            <p className="text-sm font-medium">Notes:</p>
            <p className="text-sm">{quotation.notes}</p>
          </div>
        )}
        
        {quotation.terms && (
          <div className="mb-3">
            <p className="text-sm font-medium">Terms & Conditions:</p>
            <p className="text-sm">{quotation.terms}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-gray-600 text-xs mt-4 border-t border-gray-300 pt-2">
          <p className="font-medium">Thank you for considering our offer!</p>
          <p>For inquiries: support@example.com</p>
          <p>{branchName} • {formatDate(quotation.createdAt)}</p>
          <div className="text-right text-xs text-gray-400 mt-1">1/1</div>
        </div>
      </div>

      {/* Container for UI elements (not visible when printing) */}
      <div className="bg-white p-4 no-print">
        {/* Action Buttons */}
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Quotation
          </button>
        </div>
      </div>
    </>
  );
};

export default QuotationReceipt;
