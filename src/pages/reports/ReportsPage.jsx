import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { RoleProtectedRoute } from '../../utils/pageHelpers';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import SalesReportComponent from '../../components/reports/SalesReportComponent';
import InventoryReportComponent from '../../components/reports/InventoryReportComponent';
import PurchaseReportComponent from '../../components/reports/PurchaseReportComponent';
import CustomerReportComponent from '../../components/reports/CustomerReportComponent';

const ReportsPage = () => {
  const [activeReport, setActiveReport] = useState('sales');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], // Default to last 30 days
    endDate: new Date().toISOString().split('T')[0] // Today
  });
  const [branchFilter, setBranchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [branches, setBranches] = useState([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  
  // Get current user from auth context
  const { user } = useAuth();
  
  // Fetch branches for filter
  useEffect(() => {
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
    
    fetchBranches();
  }, []);
  
  // Generate report based on active report type and filters
  const generateReport = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      const queryParams = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };
      
      if (branchFilter) {
        queryParams.branch = branchFilter;
      }
      
      let response;
      
      try {
        // Call appropriate API endpoint based on report type
        switch (activeReport) {
          case 'sales':
            response = await api.reports.getSalesReport(queryParams);
            break;
          case 'inventory':
            response = await api.reports.getInventoryReport(queryParams);
            break;
          case 'purchases':
            response = await api.reports.getPurchasesReport(queryParams);
            break;
          case 'customers':
            response = await api.reports.getCustomersReport(queryParams);
            break;
          default:
            throw new Error('Invalid report type');
        }
        
        if (response && response.success) {
          setReportData(response.data);
        } else {
          throw new Error(response.message || 'Failed to generate report');
        }
      } catch (apiError) {
        console.error('API Error:', apiError);
        
        // If the API call fails, generate mock data for demonstration
        console.log('Generating mock data for demonstration');
        
        // Show a notification that we're using mock data
        setError('Backend API endpoint not available. Using demo data for visualization purposes.');
        
        let mockData;
        
        switch (activeReport) {
          case 'sales':
            mockData = generateMockSalesData();
            break;
          case 'inventory':
            mockData = generateMockInventoryData();
            break;
          case 'purchases':
            mockData = generateMockPurchasesData();
            break;
          case 'customers':
            mockData = generateMockCustomersData();
            break;
          default:
            throw new Error('Invalid report type');
        }
        
        // Ensure the mock data structure matches what the components expect
        if (activeReport === 'inventory') {
          // Rename products to match what the component expects
          mockData = { ...mockData, products: mockData.products };
        } else if (activeReport === 'purchases') {
          // Make sure purchase totals are properly calculated
          mockData.purchases.forEach(purchase => {
            // Recalculate total from items if needed
            if (!purchase.totalAmount || purchase.totalAmount === 0) {
              purchase.totalAmount = purchase.items.reduce((sum, item) => sum + item.total, 0);
            }
          });
          
          // Recalculate summary data
          mockData.totalSpent = mockData.purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
          mockData.averagePurchase = mockData.purchases.length > 0 ? mockData.totalSpent / mockData.purchases.length : 0;
        }
        
        setReportData(mockData);
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err.message || 'Failed to generate report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate mock sales data
  const generateMockSalesData = () => {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    // Generate sales for each day in the range
    const sales = [];
    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Generate 1-5 sales for each day
      const dailySalesCount = Math.floor(Math.random() * 5) + 1;
      
      for (let j = 0; j < dailySalesCount; j++) {
        const items = [];
        const itemCount = Math.floor(Math.random() * 5) + 1;
        
        for (let k = 0; k < itemCount; k++) {
          const productNames = ['Widget A', 'Widget B', 'Product X', 'Product Y', 'Tool Z'];
          const price = Math.floor(Math.random() * 100) + 10;
          const quantity = Math.floor(Math.random() * 5) + 1;
          
          items.push({
            product: productNames[Math.floor(Math.random() * productNames.length)],
            price,
            quantity,
            total: price * quantity
          });
        }
        
        const total = items.reduce((sum, item) => sum + item.total, 0);
        
        sales.push({
          _id: `sale-${i}-${j}`,
          createdAt: date.toISOString(),
          customer: {
            _id: `customer-${Math.floor(Math.random() * 10)}`,
            name: `Customer ${Math.floor(Math.random() * 10)}`
          },
          items,
          total,
          paymentMethod: Math.random() > 0.5 ? 'Cash' : 'Credit Card'
        });
      }
    }
    
    return {
      sales,
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, sale) => sum + sale.total, 0),
      averageSale: sales.length > 0 ? sales.reduce((sum, sale) => sum + sale.total, 0) / sales.length : 0
    };
  };
  
  // Generate mock inventory data
  const generateMockInventoryData = () => {
    const products = [];
    const categories = ['Electronics', 'Office Supplies', 'Furniture', 'Tools', 'Accessories'];
    
    for (let i = 0; i < 20; i++) {
      const price = Math.floor(Math.random() * 100) + 10;
      const quantity = Math.floor(Math.random() * 100);
      const reorderLevel = 10;
      
      products.push({
        _id: `product-${i}`,
        name: `Product ${i}`,
        itemCode: `SKU-${1000 + i}`,
        category: categories[Math.floor(Math.random() * categories.length)],
        price,
        costPrice: price * 0.7, // Cost price is 70% of selling price
        quantity,
        reorderLevel,
        status: quantity === 0 ? 'Out of Stock' : quantity < reorderLevel ? 'Low Stock' : 'In Stock',
        lastUpdated: new Date().toISOString()
      });
    }
    
    return {
      products,
      totalProducts: products.length,
      lowStockCount: products.filter(p => p.quantity < p.reorderLevel && p.quantity > 0).length,
      outOfStockCount: products.filter(p => p.quantity === 0).length,
      totalValue: products.reduce((sum, product) => sum + (product.price * product.quantity), 0)
    };
  };
  
  // Generate mock purchases data
  const generateMockPurchasesData = () => {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    const purchases = [];
    const suppliers = ['Supplier A', 'Supplier B', 'Supplier C', 'Supplier D'];
    
    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Generate 1-3 purchases for each day (ensure at least 1 purchase)
      const dailyPurchasesCount = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 0; j < dailyPurchasesCount; j++) {
        const items = [];
        const itemCount = Math.floor(Math.random() * 5) + 1;
        
        for (let k = 0; k < itemCount; k++) {
          const productNames = ['Raw Material A', 'Component B', 'Part X', 'Supply Y', 'Material Z'];
          const price = Math.floor(Math.random() * 50) + 5;
          const quantity = Math.floor(Math.random() * 20) + 1;
          const itemTotal = price * quantity;
          
          items.push({
            product: productNames[Math.floor(Math.random() * productNames.length)],
            price,
            quantity,
            total: itemTotal
          });
        }
        
        const total = items.reduce((sum, item) => sum + item.total, 0);
        const supplierName = suppliers[Math.floor(Math.random() * suppliers.length)];
        
        purchases.push({
          _id: `purchase-${i}-${j}`,
          createdAt: date.toISOString(),
          supplier: {
            _id: `supplier-${supplierName.charAt(supplierName.length - 1).toLowerCase()}`,
            name: supplierName
          },
          items,
          totalAmount: total,
          status: Math.random() > 0.2 ? 'Received' : 'Pending'
        });
      }
    }
    
    return {
      purchases,
      totalPurchases: purchases.length,
      totalSpent: purchases.reduce((sum, purchase) => sum + purchase.totalAmount || purchase.total || 0, 0),
      averagePurchase: purchases.length > 0 ? purchases.reduce((sum, purchase) => sum + purchase.totalAmount || purchase.total || 0, 0) / purchases.length : 0
    };
  };
  
  // Generate mock customers data
  const generateMockCustomersData = () => {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    
    const customers = [];
    const sales = [];
    
    // Generate 15 customers
    for (let i = 0; i < 15; i++) {
      const createdAt = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
      
      customers.push({
        _id: `customer-${i}`,
        name: `Customer ${i}`,
        email: `customer${i}@example.com`,
        phone: `555-${1000 + i}`,
        createdAt: createdAt.toISOString()
      });
      
      // Generate 0-5 sales for each customer
      const customerSalesCount = Math.floor(Math.random() * 6);
      
      for (let j = 0; j < customerSalesCount; j++) {
        const saleDate = new Date(createdAt.getTime() + Math.random() * (endDate.getTime() - createdAt.getTime()));
        if (saleDate > endDate) continue; // Skip if sale date is after end date
        
        const items = [];
        const itemCount = Math.floor(Math.random() * 5) + 1;
        
        for (let k = 0; k < itemCount; k++) {
          const productNames = ['Widget A', 'Widget B', 'Product X', 'Product Y', 'Tool Z'];
          const price = Math.floor(Math.random() * 100) + 10;
          const quantity = Math.floor(Math.random() * 5) + 1;
          
          items.push({
            product: productNames[Math.floor(Math.random() * productNames.length)],
            price,
            quantity,
            total: price * quantity
          });
        }
        
        const total = items.reduce((sum, item) => sum + item.total, 0);
        
        sales.push({
          _id: `sale-${i}-${j}`,
          createdAt: saleDate.toISOString(),
          customer: `customer-${i}`,
          items,
          total
        });
      }
    }
    
    return {
      customers,
      sales,
      totalCustomers: customers.length,
      newCustomers: customers.filter(c => new Date(c.createdAt) >= startDate).length,
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, sale) => sum + sale.total, 0)
    };
  };
  
  // Handle print button click
  const handlePrint = () => {
    if (!reportData) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      alert("Please allow pop-ups to print the report.");
      return;
    }
    
    // Set the document title
    printWindow.document.title = `${
      activeReport === 'sales' ? 'Sales Report' :
      activeReport === 'inventory' ? 'Inventory Report' :
      activeReport === 'purchases' ? 'Purchase Report' :
      'Customer Report'
    } (${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)})`;
    
    // Add styles and content to the new window
    printWindow.document.write(`
      <html>
        <head>
          <title>${printWindow.document.title}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              font-size: 12pt;
              margin: 0;
              padding: 1cm;
              background-color: white;
              color: black;
            }
            .report-container {
              max-width: 1000px;
              margin: 0 auto;
            }
            h1, h2, h3 {
              margin-top: 0;
            }
            h1 {
              font-size: 18pt;
              margin-bottom: 5px;
            }
            h2 {
              font-size: 16pt;
              margin-bottom: 5px;
            }
            h3 {
              font-size: 14pt;
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
            .mb-4 {
              margin-bottom: 20px;
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
              margin-bottom: 20px;
            }
            th {
              text-align: left;
              border-bottom: 1px solid #ddd;
              padding: 8px;
              font-weight: 600;
            }
            td {
              padding: 8px;
              border-bottom: 1px solid #eee;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
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
            .grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-bottom: 20px;
            }
            .card {
              border: 1px solid #ddd;
              border-radius: 5px;
              padding: 15px;
              background-color: #f9f9f9;
            }
            .card h3 {
              margin-top: 0;
              margin-bottom: 5px;
              font-size: 12pt;
              color: #666;
            }
            .card p {
              margin: 0;
              font-size: 16pt;
              font-weight: bold;
            }
            hr {
              border: 0;
              border-top: 1px solid #ddd;
              margin: 20px 0;
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
          <div class="report-container">
            <!-- Header -->
            <div class="text-center mb-4">
              <h1>YOUR COMPANY NAME</h1>
              <p class="text-gray-600">123 Business Street, City, Country</p>
              <p class="text-gray-600">Phone: (123) 456-7890 | Email: info@yourcompany.com</p>
              <hr />
              <h2>${
                activeReport === 'sales' ? 'SALES REPORT' :
                activeReport === 'inventory' ? 'INVENTORY REPORT' :
                activeReport === 'purchases' ? 'PURCHASE REPORT' :
                'CUSTOMER REPORT'
              }</h2>
              <p class="text-gray-600">Period: ${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}</p>
              ${branchFilter ? `<p class="text-gray-600">Branch: ${branches.find(b => b._id === branchFilter)?.name || branchFilter}</p>` : ''}
            </div>

            <!-- Report Content -->
            <div id="report-content">
              <!-- This div will be populated with the report content -->
            </div>

            <!-- Footer -->
            <div class="text-center text-gray-600 text-xs mt-4 border-t">
              <p class="font-medium">Report generated on ${new Date().toLocaleString()}</p>
              <p>This is an automatically generated report.</p>
            </div>
          </div>
          
          <!-- Print Button - will be hidden when printing -->
          <div class="print-button no-print">
            <button onclick="window.print(); return false;">
              Print Report
            </button>
          </div>
        </body>
      </html>
    `);
    
    // Get the report content
    const reportContent = renderReportComponent();
    
    // Wait for the document to load
    printWindow.onload = function() {
      try {
        // Find the report content container
        const contentContainer = printWindow.document.getElementById('report-content');
        
        if (contentContainer) {
          // Create a temporary container in the current document
          const tempContainer = document.createElement('div');
          
          // Render the report component into the temporary container
          // This is a simplified approach - in a real app, you might need to use
          // a more sophisticated method to render React components to HTML
          tempContainer.innerHTML = `
            ${activeReport === 'sales' ? renderSalesReportHTML(reportData) : ''}
            ${activeReport === 'inventory' ? renderInventoryReportHTML(reportData) : ''}
            ${activeReport === 'purchases' ? renderPurchasesReportHTML(reportData) : ''}
            ${activeReport === 'customers' ? renderCustomersReportHTML(reportData) : ''}
          `;
          
          // Set the content
          contentContainer.innerHTML = tempContainer.innerHTML;
        }
      } catch (error) {
        console.error('Error rendering report content:', error);
        printWindow.document.getElementById('report-content').innerHTML = 
          '<p class="text-center">Error rendering report content. Please try again.</p>';
      }
      
      // Print the document automatically
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
    
    // Close the document for writing
    printWindow.document.close();
  };
  
  // Helper function to render sales report as HTML
  const renderSalesReportHTML = (data) => {
    if (!data || !data.sales) return '<p>No sales data available</p>';
    
    return `
      <!-- Summary Cards -->
      <div class="grid">
        <div class="card">
          <h3>Total Sales</h3>
          <p>$${(data.totalRevenue || 0).toFixed(2)}</p>
        </div>
        <div class="card">
          <h3>Total Transactions</h3>
          <p>${data.totalSales || 0}</p>
        </div>
        <div class="card">
          <h3>Average Sale</h3>
          <p>$${(data.averageSale || 0).toFixed(2)}</p>
        </div>
      </div>
      
      <!-- Sales Table -->
      <h3>Sales Transactions</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Customer</th>
            <th>Items</th>
            <th class="text-right">Amount</th>
            <th class="text-center">Payment Method</th>
          </tr>
        </thead>
        <tbody>
          ${data.sales.map(sale => `
            <tr>
              <td>${new Date(sale.createdAt).toLocaleDateString()}</td>
              <td>${sale.customer?.name || 'Walk-in Customer'}</td>
              <td>${sale.items?.length || 0}</td>
              <td class="text-right">$${(sale.total || 0).toFixed(2)}</td>
              <td class="text-center">${sale.paymentMethod || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };
  
  // Helper function to render inventory report as HTML
  const renderInventoryReportHTML = (data) => {
    if (!data || !data.products) return '<p>No inventory data available</p>';
    
    // Helper function to get status text - same as in InventoryReportComponent
    const getStatusText = (quantity, reorderLevel) => {
      if (quantity <= 0) {
        return 'Out of Stock';
      } else if (quantity <= (reorderLevel || 5)) {
        return 'Low Stock';
      } else {
        return 'In Stock';
      }
    };
    
    // Helper function to get status badge class
    const getStatusBadgeClass = (quantity, reorderLevel) => {
      if (quantity <= 0) {
        return 'color: #e53e3e;'; // Red for out of stock
      } else if (quantity <= (reorderLevel || 5)) {
        return 'color: #dd6b20;'; // Orange for low stock
      } else {
        return 'color: #38a169;'; // Green for in stock
      }
    };
    
    return `
      <!-- Summary Cards -->
      <div class="grid">
        <div class="card">
          <h3>Total Products</h3>
          <p>${data.totalProducts || 0}</p>
        </div>
        <div class="card">
          <h3>Low Stock Items</h3>
          <p>${data.lowStockCount || 0}</p>
        </div>
        <div class="card">
          <h3>Total Value</h3>
          <p>$${(data.totalValue || 0).toFixed(2)}</p>
        </div>
      </div>
      
      <!-- Inventory Table -->
      <h3>Inventory Items</h3>
      <table>
        <thead>
          <tr>
            <th>Item Code</th>
            <th>Name</th>
            <th>Category</th>
            <th class="text-right">Price</th>
            <th class="text-right">Quantity</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.products.map(product => `
            <tr>
              <td>${product.itemCode || 'N/A'}</td>
              <td>${product.name || 'Unnamed Product'}</td>
              <td>${product.category || 'Uncategorized'}</td>
              <td class="text-right">$${(product.costPrice || 0).toFixed(2)}</td>
              <td class="text-right">${product.quantity || 0}</td>
              <td style="${getStatusBadgeClass(product.quantity, product.reorderLevel)}">${getStatusText(product.quantity, product.reorderLevel)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };
  
  // Helper function to render purchases report as HTML
  const renderPurchasesReportHTML = (data) => {
    if (!data || !data.purchases) return '<p>No purchase data available</p>';
    
    return `
      <!-- Summary Cards -->
      <div class="grid">
        <div class="card">
          <h3>Total Purchases</h3>
          <p>${data.totalPurchases || 0}</p>
        </div>
        <div class="card">
          <h3>Total Spent</h3>
          <p>$${(data.totalSpent || 0).toFixed(2)}</p>
        </div>
        <div class="card">
          <h3>Average Purchase</h3>
          <p>$${(data.averagePurchase || 0).toFixed(2)}</p>
        </div>
      </div>
      
      <!-- Purchases Table -->
      <h3>Purchase Transactions</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Supplier</th>
            <th>Items</th>
            <th class="text-right">Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.purchases.map(purchase => `
            <tr>
              <td>${new Date(purchase.createdAt).toLocaleDateString()}</td>
              <td>${purchase.supplier?.name || 'Unknown Supplier'}</td>
              <td>${purchase.items?.length || 0}</td>
              <td class="text-right">$${(purchase.totalAmount || 0).toFixed(2)}</td>
              <td>${purchase.status || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };
  
  // Helper function to render customers report as HTML
  const renderCustomersReportHTML = (data) => {
    if (!data || !data.customers) return '<p>No customer data available</p>';
    
    return `
      <!-- Summary Cards -->
      <div class="grid">
        <div class="card">
          <h3>Total Customers</h3>
          <p>${data.totalCustomers || 0}</p>
        </div>
        <div class="card">
          <h3>New Customers</h3>
          <p>${data.newCustomers || 0}</p>
        </div>
        <div class="card">
          <h3>Total Revenue</h3>
          <p>$${(data.totalRevenue || 0).toFixed(2)}</p>
        </div>
      </div>
      
      <!-- Customers Table -->
      <h3>Customer List</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Date Added</th>
            <th class="text-right">Total Purchases</th>
          </tr>
        </thead>
        <tbody>
          ${data.customers.map(customer => {
            // Count sales for this customer
            const customerSales = data.sales.filter(sale => 
              sale.customer === customer._id || 
              (sale.customer && sale.customer._id === customer._id)
            );
            const totalPurchases = customerSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
            
            return `
              <tr>
                <td>${customer.name || 'Unnamed Customer'}</td>
                <td>${customer.email || 'N/A'}</td>
                <td>${customer.phone || 'N/A'}</td>
                <td>${new Date(customer.createdAt).toLocaleDateString()}</td>
                <td class="text-right">$${totalPurchases.toFixed(2)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  };
  
  // Render the appropriate report component based on active report type
  const renderReportComponent = () => {
    if (!reportData) return null;
    
    switch (activeReport) {
      case 'sales':
        return <SalesReportComponent data={reportData} dateRange={dateRange} />;
      case 'inventory':
        return <InventoryReportComponent data={reportData} dateRange={dateRange} />;
      case 'purchases':
        return <PurchaseReportComponent data={reportData} dateRange={dateRange} />;
      case 'customers':
        return <CustomerReportComponent data={reportData} dateRange={dateRange} />;
      default:
        return <div>Select a report type</div>;
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };
  
  return (
    <div>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Reports</h1>
        <p class="mt-1 text-sm text-gray-500">Generate and view business reports</p>
      </div>
      
      {/* Message area - can be error or info */}
      {error && (
        <div class={`mb-6 ${error.includes('demo data') ? 'bg-blue-50 border-l-4 border-blue-400' : 'bg-red-50 border-l-4 border-red-400'} p-4`}>
          <div class="flex">
            <div class="flex-shrink-0">
              {error.includes('demo data') ? (
                <svg class="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              ) : (
                <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              )}
            </div>
            <div class="ml-3">
              <p class={`text-sm ${error.includes('demo data') ? 'text-blue-700' : 'text-red-700'}`}>{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Loading state */}
      {isLoading && (
        <div class="text-center py-12 bg-white rounded-lg shadow mb-6">
          <svg class="mx-auto h-12 w-12 text-gray-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="mt-2 text-sm text-gray-500">Generating report...</p>
        </div>
      )}
      
      {/* Report Controls */}
      <div class="bg-white shadow rounded-lg mb-6">
        <div class="p-4 sm:p-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">Report Settings</h2>
          
          {/* Report Type Selection */}
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <div class="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setActiveReport('sales');
                  setReportData(null); // Clear report data when changing report type
                }}
                class={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeReport === 'sales'
                    ? 'bg-primary-100 text-primary-700 border border-primary-300'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Sales Report
              </button>
              <button
                onClick={() => {
                  setActiveReport('inventory');
                  setReportData(null); // Clear report data when changing report type
                }}
                class={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeReport === 'inventory'
                    ? 'bg-primary-100 text-primary-700 border border-primary-300'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Inventory Report
              </button>
              <button
                onClick={() => {
                  setActiveReport('purchases');
                  setReportData(null); // Clear report data when changing report type
                }}
                class={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeReport === 'purchases'
                    ? 'bg-primary-100 text-primary-700 border border-primary-300'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Purchase Report
              </button>
              <button
                onClick={() => {
                  setActiveReport('customers');
                  setReportData(null); // Clear report data when changing report type
                }}
                class={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeReport === 'customers'
                    ? 'bg-primary-100 text-primary-700 border border-primary-300'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Customer Report
              </button>
            </div>
          </div>
          
          {/* Filters */}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Date Range */}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            
            {/* Branch Filter - Only visible to admin users */}
            {user && user.role === 'admin' && (
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
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
          
          {/* Generate Button */}
          <div class="flex justify-end">
            <button
              onClick={generateReport}
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate Report
            </button>
          </div>
        </div>
      </div>
      
      {/* Report Content */}
      {reportData && !isLoading && (
        <div class="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div class="p-4 sm:p-6 border-b border-gray-200">
            <div class="flex justify-between items-center">
              <h2 class="text-lg font-medium text-gray-900">
                {activeReport === 'sales' && 'Sales Report'}
                {activeReport === 'inventory' && 'Inventory Report'}
                {activeReport === 'purchases' && 'Purchase Report'}
                {activeReport === 'customers' && 'Customer Report'}
                <span class="ml-2 text-sm text-gray-500">
                  {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
                </span>
              </h2>
              <button
                onClick={handlePrint}
                class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <svg class="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Report
              </button>
            </div>
          </div>
          
          <div class="p-4 sm:p-6">
            {renderReportComponent()}
          </div>
        </div>
      )}
      
      {/* Print Modal */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={`${
          activeReport === 'sales' ? 'Sales Report' :
          activeReport === 'inventory' ? 'Inventory Report' :
          activeReport === 'purchases' ? 'Purchase Report' :
          'Customer Report'
        } (${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)})`}
        size="4xl"
        className="print-report-modal"
      >
        {reportData && (
          <div class="p-4">
            {/* Printable Report Content */}
            <div class="print-container">
              {/* Add company info at the top of the printed report */}
              <div class="mb-6 print:mb-4 hidden print:block">
                <h1 class="text-2xl font-bold text-center">Your Company Name</h1>
                <p class="text-center text-gray-600">123 Business Street, City, Country</p>
                <p class="text-center text-gray-600">Phone: (123) 456-7890 | Email: info@yourcompany.com</p>
                <hr class="my-4" />
              </div>
              
              {renderReportComponent()}
            </div>
            
            {/* Print Button */}
            <div class="mt-6 flex justify-end space-x-3 print:hidden">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Add a small delay to ensure styles are applied
                  setTimeout(() => {
                    window.print();
                  }, 100);
                }}
                class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                <svg class="h-4 w-4 mr-1.5 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Report
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// Wrap the component with role protection
export default () => (
  <RoleProtectedRoute
    component={ReportsPage}
    allowedRoles={['admin']}
  />
);
