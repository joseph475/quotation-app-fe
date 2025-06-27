import { h, Fragment } from 'preact';
import { useEffect, useState, useRef } from 'preact/hooks';
import api from '../../services/api';

/**
 * SaleReceipt component for displaying a printable receipt
 * 
 * @param {Object} props - Component props
 * @param {Object} props.sale - Sale data to display in the receipt
 * @param {Function} props.onClose - Function to call when closing the receipt
 * @param {Function} props.onPrint - Function to call when printing the receipt
 */
const SaleReceipt = ({ sale, onClose, onPrint }) => {
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [branchName, setBranchName] = useState('Main Branch');
  const [loading, setLoading] = useState({
    customer: false,
    branch: false
  });

  // Fetch customer data when the component mounts or sale changes
  useEffect(() => {
    console.log("Sale data:", sale);
    
    // Process customer data
    if (sale?.customerName) {
      // Use customerName directly if available (this is set in SaleForm)
      setCustomerName(sale.customerName);
      
      // If we have customer object with additional details
      if (sale.customer && typeof sale.customer === 'object') {
        setCustomerPhone(sale.customer.phone || '');
        setCustomerEmail(sale.customer.email || '');
      }
    } else if (sale?.customer) {
      // If customer is an ID string, fetch customer details from API
      if (typeof sale.customer === 'string' || typeof sale.customer === 'number') {
        const customerId = sale.customer;
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
      } else if (typeof sale.customer === 'object') {
        // If customer is an object, extract all available properties
        setCustomerName(sale.customer.name || 'Customer');
        setCustomerPhone(sale.customer.phone || '');
        setCustomerEmail(sale.customer.email || '');
      } else {
        // Fallback
        setCustomerName('Customer');
      }
    }
  }, [sale]);

  // Fetch branch data when the component mounts or sale changes
  useEffect(() => {
    // Process branch data
    if (sale?.branchName) {
      // Use branchName directly if available (this is set in SaleForm)
      setBranchName(sale.branchName);
    } else if (sale?.branch) {
      // If branch is an ID string, fetch branch details from API
      if (typeof sale.branch === 'string' || typeof sale.branch === 'number') {
        const branchId = sale.branch;
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
      } else if (typeof sale.branch === 'object') {
        // If branch is an object, extract name
        setBranchName(sale.branch.name || 'Branch');
      } else {
        // Fallback
        setBranchName('Branch');
      }
    }
  }, [sale]);

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

  // Handle print button click
  const handlePrint = () => {
    // Call the onPrint callback if provided
    if (onPrint) {
      onPrint();
    }
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      alert("Please allow pop-ups to print the receipt.");
      return;
    }
    
    // Set the document title
    printWindow.document.title = `Sale Receipt - ${sale?.saleNumber || 'Receipt'}`;
    
    // Add styles and content to the new window
    printWindow.document.write(`
      <html>
        <head>
          <title>Sale Receipt - ${sale?.saleNumber || 'Receipt'}</title>
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
                <p class="text-sm"><span class="font-medium">Sale #:</span> ${sale.saleNumber}</p>
                <p class="text-sm"><span class="font-medium">Branch:</span> ${branchName}</p>
              </div>
              <div class="text-right">
                <p class="text-sm"><span class="font-medium">Date:</span> ${formatDate(sale.createdAt)}</p>
                <p class="text-sm"><span class="font-medium">Time:</span> ${formatTime(sale.createdAt)}</p>
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
                  ${sale.items && sale.items.length > 0 ? 
                    sale.items.map(item => `
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
                  ${sale.paymentMethod === 'cash' ? 'Cash' :
                   sale.paymentMethod === 'check' ? 'Check' :
                   sale.paymentMethod === 'credit_card' ? 'Credit Card' :
                   sale.paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
                   sale.paymentMethod === 'online_payment' ? 'Online Payment' :
                   sale.paymentMethod}
                </span>
              </div>
              
              ${sale.paymentReference ? `
                <div class="flex">
                  <span>Reference:</span>
                  <span>${sale.paymentReference}</span>
                </div>
              ` : ''}
              
              <div class="flex">
                <span>Subtotal:</span>
                <span>$${(sale.subtotal || 0).toFixed(2)}</span>
              </div>
              
              <div class="flex">
                <span>Discount:</span>
                <span>$${(sale.discountAmount || 0).toFixed(2)}</span>
              </div>
              
              <div class="flex">
                <span>Tax:</span>
                <span>$${(sale.taxAmount || 0).toFixed(2)}</span>
              </div>
              
              <div class="flex font-bold border-t">
                <span>Total:</span>
                <span>$${(sale.total || 0).toFixed(2)}</span>
              </div>
            </div>

            <!-- Footer -->
            <div class="text-center text-gray-600 text-xs mt-4 border-t">
              <p class="font-medium">Thank you for your business!</p>
              <p>For inquiries: support@example.com</p>
              <p>${branchName} • ${formatDate(sale.createdAt)}</p>
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
      
      // Close the window after printing (optional)
      // printWindow.close();
    };
  };

  return (
    <>
      {/* Receipt Content - visible in the modal */}
      <div className="border border-gray-200 p-3 sm:p-4 rounded-lg max-w-2xl mx-auto bg-white shadow-md">
        {/* Header */}
        <div className="text-center mb-3">
          <h1 className="text-xl font-bold">SALES RECEIPT</h1>
          <p className="text-gray-600 text-sm">Thank you for your purchase!</p>
        </div>

        {/* Sale Info */}
        <div className="flex justify-between mb-3">
          <div>
            <p className="text-sm"><span className="font-medium">Sale #:</span> {sale.saleNumber}</p>
            <p className="text-sm"><span className="font-medium">Branch:</span> {loading.branch ? "Loading..." : branchName}</p>
          </div>
          <div className="text-right">
            <p className="text-sm"><span className="font-medium">Date:</span> {formatDate(sale.createdAt)}</p>
            <p className="text-sm"><span className="font-medium">Time:</span> {formatTime(sale.createdAt)}</p>
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
          <p className="text-sm font-medium mb-1">Items Purchased:</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-1">Item</th>
                <th className="text-center py-1">Qty</th>
                <th className="text-right py-1">Price</th>
                <th className="text-right py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items && sale.items.length > 0 ? (
                sale.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-1">{item.description}</td>
                    <td className="text-center py-1">{item.quantity}</td>
                    <td className="text-right py-1">${(item.unitPrice || 0).toFixed(2)}</td>
                    <td className="text-right py-1">${(item.total || 0).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-2 text-center text-gray-500">No items in this sale</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mb-3 border-t border-gray-300 pt-2">
          <div className="flex justify-between text-sm">
            <span>Payment Method:</span>
            <span>
              {sale.paymentMethod === 'cash' ? 'Cash' :
               sale.paymentMethod === 'check' ? 'Check' :
               sale.paymentMethod === 'credit_card' ? 'Credit Card' :
               sale.paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
               sale.paymentMethod === 'online_payment' ? 'Online Payment' :
               sale.paymentMethod}
            </span>
          </div>
          
          {sale.paymentReference && (
            <div className="flex justify-between text-sm">
              <span>Reference:</span>
              <span>{sale.paymentReference}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>${(sale.subtotal || 0).toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Discount:</span>
            <span>${(sale.discountAmount || 0).toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Tax:</span>
            <span>${(sale.taxAmount || 0).toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-sm font-bold border-t border-gray-300 mt-1 pt-1">
            <span>Total:</span>
            <span>${(sale.total || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-600 text-xs mt-4 border-t border-gray-300 pt-2">
          <p className="font-medium">Thank you for your business!</p>
          <p>For inquiries: support@example.com</p>
          <p>{branchName} • {formatDate(sale.createdAt)}</p>
          <div className="text-right text-xs text-gray-400 mt-1">1/1</div>
        </div>
      </div>

      {/* Container for UI elements (not visible when printing) */}
      <div className="bg-white p-3 sm:p-4 no-print">
        {/* Action Buttons */}
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors duration-200"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors duration-200"
          >
            Print Receipt
          </button>
        </div>
      </div>
    </>
  );
};

export default SaleReceipt;
