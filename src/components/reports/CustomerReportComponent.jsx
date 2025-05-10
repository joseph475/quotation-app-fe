import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

/**
 * Customer Report Component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.data - Customer report data
 * @param {Object} props.dateRange - Date range for the report
 */
const CustomerReportComponent = ({ data, dateRange }) => {
  const [sortBy, setSortBy] = useState('totalSpent');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filteredData, setFilteredData] = useState([]);
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    newCustomers: 0,
    activeCustomers: 0,
    totalRevenue: 0
  });
  
  // Process data when it changes or sorting changes
  useEffect(() => {
    if (!data) return;
    
    // Calculate summary data
    const startDate = new Date(dateRange.startDate);
    let totalCustomers = data.customers.length;
    let newCustomers = 0;
    let activeCustomers = 0;
    let totalRevenue = 0;
    
    // Process customer data
    const processedCustomers = data.customers.map(customer => {
      // Calculate customer metrics
      const customerSales = data.sales.filter(sale => 
        (typeof sale.customer === 'string' && sale.customer === customer._id) ||
        (sale.customer?._id === customer._id)
      );
      
      const totalSpent = customerSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      const purchaseCount = customerSales.length;
      const averageSpent = purchaseCount > 0 ? totalSpent / purchaseCount : 0;
      
      // Check if customer is new (created during the report period)
      const isNew = new Date(customer.createdAt) >= startDate;
      if (isNew) {
        newCustomers++;
      }
      
      // Check if customer is active (has purchases during the report period)
      const isActive = purchaseCount > 0;
      if (isActive) {
        activeCustomers++;
        totalRevenue += totalSpent;
      }
      
      // Get last purchase date
      const lastPurchaseDate = customerSales.length > 0 
        ? new Date(Math.max(...customerSales.map(sale => new Date(sale.createdAt))))
        : null;
      
      return {
        ...customer,
        totalSpent,
        purchaseCount,
        averageSpent,
        isNew,
        isActive,
        lastPurchaseDate
      };
    });
    
    // Sort the data
    processedCustomers.sort((a, b) => {
      let valueA, valueB;
      
      // Determine values to compare based on sortBy
      switch (sortBy) {
        case 'name':
          valueA = a.name || '';
          valueB = b.name || '';
          break;
        case 'totalSpent':
          valueA = a.totalSpent || 0;
          valueB = b.totalSpent || 0;
          break;
        case 'purchaseCount':
          valueA = a.purchaseCount || 0;
          valueB = b.purchaseCount || 0;
          break;
        case 'averageSpent':
          valueA = a.averageSpent || 0;
          valueB = b.averageSpent || 0;
          break;
        case 'lastPurchase':
          valueA = a.lastPurchaseDate ? a.lastPurchaseDate.getTime() : 0;
          valueB = b.lastPurchaseDate ? b.lastPurchaseDate.getTime() : 0;
          break;
        default:
          valueA = a.totalSpent || 0;
          valueB = b.totalSpent || 0;
      }
      
      // Apply sort order
      if (sortOrder === 'asc') {
        if (typeof valueA === 'string') {
          return valueA.localeCompare(valueB);
        }
        return valueA - valueB;
      } else {
        if (typeof valueA === 'string') {
          return valueB.localeCompare(valueA);
        }
        return valueB - valueA;
      }
    });
    
    // Update state
    setFilteredData(processedCustomers);
    setSummary({
      totalCustomers,
      newCustomers,
      activeCustomers,
      totalRevenue
    });
  }, [data, dateRange, sortBy, sortOrder]);
  
  // Format currency
  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };
  
  // Handle sort change
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc'); // Default to descending when changing sort field
    }
  };
  
  return (
    <div>
      {/* Report Header - visible in both screen and print */}
      <div class="mb-6 print:mb-4">
        <h2 class="text-xl font-bold text-gray-900 print:text-lg">Customer Report</h2>
        <p class="text-sm text-gray-500">
          {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
        </p>
      </div>
      
      {/* Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 print:grid-cols-4 print:gap-2 print:mb-4">
        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h3 class="text-sm font-medium text-gray-500">Total Customers</h3>
          <p class="text-2xl font-bold text-gray-900 print:text-xl">{summary.totalCustomers}</p>
        </div>
        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h3 class="text-sm font-medium text-gray-500">New Customers</h3>
          <p class="text-2xl font-bold text-primary-600 print:text-xl">{summary.newCustomers}</p>
        </div>
        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h3 class="text-sm font-medium text-gray-500">Active Customers</h3>
          <p class="text-2xl font-bold text-green-600 print:text-xl">{summary.activeCustomers}</p>
        </div>
        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h3 class="text-sm font-medium text-gray-500">Total Revenue</h3>
          <p class="text-2xl font-bold text-gray-900 print:text-xl">{formatCurrency(summary.totalRevenue)}</p>
        </div>
      </div>
      
      {/* Customer Data Table */}
      <div class="mb-6 overflow-x-auto print:mb-4">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50 print:bg-gray-100">
            <tr>
              <th 
                scope="col" 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('name')}
              >
                <div class="flex items-center print:hidden">
                  <span>Customer Name</span>
                  {sortBy === 'name' && (
                    <svg class="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      {sortOrder === 'asc' ? (
                        <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                      ) : (
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      )}
                    </svg>
                  )}
                </div>
                <span class="hidden print:inline">Customer Name</span>
              </th>
              <th 
                scope="col" 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('purchaseCount')}
              >
                <div class="flex items-center print:hidden">
                  <span>Purchases</span>
                  {sortBy === 'purchaseCount' && (
                    <svg class="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      {sortOrder === 'asc' ? (
                        <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                      ) : (
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      )}
                    </svg>
                  )}
                </div>
                <span class="hidden print:inline">Purchases</span>
              </th>
              <th 
                scope="col" 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('totalSpent')}
              >
                <div class="flex items-center print:hidden">
                  <span>Total Spent</span>
                  {sortBy === 'totalSpent' && (
                    <svg class="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      {sortOrder === 'asc' ? (
                        <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                      ) : (
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      )}
                    </svg>
                  )}
                </div>
                <span class="hidden print:inline">Total Spent</span>
              </th>
              <th 
                scope="col" 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('averageSpent')}
              >
                <div class="flex items-center print:hidden">
                  <span>Average Order</span>
                  {sortBy === 'averageSpent' && (
                    <svg class="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      {sortOrder === 'asc' ? (
                        <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                      ) : (
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      )}
                    </svg>
                  )}
                </div>
                <span class="hidden print:inline">Average Order</span>
              </th>
              <th 
                scope="col" 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('lastPurchase')}
              >
                <div class="flex items-center print:hidden">
                  <span>Last Purchase</span>
                  {sortBy === 'lastPurchase' && (
                    <svg class="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      {sortOrder === 'asc' ? (
                        <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                      ) : (
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      )}
                    </svg>
                  )}
                </div>
                <span class="hidden print:inline">Last Purchase</span>
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="6" class="px-6 py-4 text-center text-sm text-gray-500">
                  No customer data available for the selected period.
                </td>
              </tr>
            ) : (
              filteredData.map((customer, index) => (
                <tr key={index} class={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {customer.name}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.purchaseCount}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {formatCurrency(customer.totalSpent)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(customer.averageSpent)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.lastPurchaseDate ? formatDate(customer.lastPurchaseDate) : 'N/A'}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    {customer.isNew ? (
                      <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-100 text-primary-800">
                        New
                      </span>
                    ) : customer.isActive ? (
                      <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Customer Segments */}
      <div class="mb-6 print:mb-4">
        <h3 class="text-lg font-medium text-gray-900 mb-3 print:text-base">Customer Segments</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
          {/* Top Customers by Spend */}
          <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h4 class="text-sm font-medium text-gray-700 mb-2">Top Customers by Spend</h4>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Spent
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  {filteredData
                    .filter(customer => customer.totalSpent > 0)
                    .sort((a, b) => b.totalSpent - a.totalSpent)
                    .slice(0, 5)
                    .map((customer, index) => (
                      <tr key={index}>
                        <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {customer.name}
                        </td>
                        <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(customer.totalSpent)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Top Customers by Frequency */}
          <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h4 class="text-sm font-medium text-gray-700 mb-2">Top Customers by Frequency</h4>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purchases
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  {filteredData
                    .filter(customer => customer.purchaseCount > 0)
                    .sort((a, b) => b.purchaseCount - a.purchaseCount)
                    .slice(0, 5)
                    .map((customer, index) => (
                      <tr key={index}>
                        <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {customer.name}
                        </td>
                        <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                          {customer.purchaseCount}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      {/* Report Footer - only visible when printing */}
      <div class="hidden print:block mt-8 text-center text-xs text-gray-500">
        <p>Report generated on {new Date().toLocaleString()}</p>
        <p>This is an automatically generated report.</p>
      </div>
    </div>
  );
};

export default CustomerReportComponent;
