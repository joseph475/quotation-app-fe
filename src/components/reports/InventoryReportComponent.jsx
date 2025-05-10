import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

/**
 * Inventory Report Component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.data - Inventory report data
 * @param {Object} props.dateRange - Date range for the report
 */
const InventoryReportComponent = ({ data, dateRange }) => {
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filteredData, setFilteredData] = useState([]);
  const [summary, setSummary] = useState({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0
  });
  
  // Process data when it changes or sorting/filtering changes
  useEffect(() => {
    if (!data || !data.products) return;
    
    // Calculate summary data
    let totalItems = 0;
    let totalValue = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;
    
    data.products.forEach(item => {
      totalItems += item.quantity || 0;
      totalValue += (item.quantity || 0) * (item.costPrice || 0);
      
      if (item.quantity <= 0) {
        outOfStockItems++;
      } else if (item.quantity <= (item.reorderLevel || 5)) {
        lowStockItems++;
      }
    });
    
    // Filter data based on status
    let filtered = [...data.products];
    
    if (filterStatus === 'low') {
      filtered = filtered.filter(item => 
        item.quantity > 0 && item.quantity <= (item.reorderLevel || 5)
      );
    } else if (filterStatus === 'out') {
      filtered = filtered.filter(item => item.quantity <= 0);
    } else if (filterStatus === 'in') {
      filtered = filtered.filter(item => 
        item.quantity > (item.reorderLevel || 5)
      );
    }
    
    // Sort the data
    filtered.sort((a, b) => {
      let valueA, valueB;
      
      // Determine values to compare based on sortBy
      switch (sortBy) {
        case 'name':
          valueA = a.name || '';
          valueB = b.name || '';
          break;
        case 'sku':
          valueA = a.itemCode || '';
          valueB = b.itemCode || '';
          break;
        case 'quantity':
          valueA = a.quantity || 0;
          valueB = b.quantity || 0;
          break;
        case 'value':
          valueA = (a.quantity || 0) * (a.costPrice || 0);
          valueB = (b.quantity || 0) * (b.costPrice || 0);
          break;
        default:
          valueA = a.name || '';
          valueB = b.name || '';
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
    setFilteredData(filtered);
    setSummary({
      totalItems,
      totalValue,
      lowStockItems,
      outOfStockItems
    });
  }, [data, sortBy, sortOrder, filterStatus]);
  
  // Format currency
  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };
  
  // Handle sort change
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc'); // Default to ascending when changing sort field
    }
  };
  
  // Get status badge class
  const getStatusBadgeClass = (quantity, reorderLevel) => {
    if (quantity <= 0) {
      return 'bg-red-100 text-red-800';
    } else if (quantity <= (reorderLevel || 5)) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-green-100 text-green-800';
    }
  };
  
  // Get status text
  const getStatusText = (quantity, reorderLevel) => {
    if (quantity <= 0) {
      return 'Out of Stock';
    } else if (quantity <= (reorderLevel || 5)) {
      return 'Low Stock';
    } else {
      return 'In Stock';
    }
  };
  
  return (
    <div>
      {/* Report Header - visible in both screen and print */}
      <div class="mb-6 print:mb-4">
        <h2 class="text-xl font-bold text-gray-900 print:text-lg">Inventory Report</h2>
        <p class="text-sm text-gray-500">
          As of {new Date().toLocaleDateString()}
        </p>
      </div>
      
      {/* Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 print:grid-cols-4 print:gap-2 print:mb-4">
        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h3 class="text-sm font-medium text-gray-500">Total Items</h3>
          <p class="text-2xl font-bold text-gray-900 print:text-xl">{summary.totalItems}</p>
        </div>
        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h3 class="text-sm font-medium text-gray-500">Total Value</h3>
          <p class="text-2xl font-bold text-gray-900 print:text-xl">{formatCurrency(summary.totalValue)}</p>
        </div>
        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h3 class="text-sm font-medium text-gray-500">Low Stock Items</h3>
          <p class="text-2xl font-bold text-yellow-500 print:text-xl">{summary.lowStockItems}</p>
        </div>
        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h3 class="text-sm font-medium text-gray-500">Out of Stock Items</h3>
          <p class="text-2xl font-bold text-red-500 print:text-xl">{summary.outOfStockItems}</p>
        </div>
      </div>
      
      {/* Filter Controls - hidden when printing */}
      <div class="mb-4 print:hidden">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-medium text-gray-700">Filter By Status:</span>
          <div class="flex border border-gray-300 rounded-md overflow-hidden">
            <button
              onClick={() => setFilterStatus('all')}
              class={`px-3 py-1 text-sm ${
                filterStatus === 'all'
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('in')}
              class={`px-3 py-1 text-sm ${
                filterStatus === 'in'
                  ? 'bg-green-100 text-green-700 font-medium'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              In Stock
            </button>
            <button
              onClick={() => setFilterStatus('low')}
              class={`px-3 py-1 text-sm ${
                filterStatus === 'low'
                  ? 'bg-yellow-100 text-yellow-700 font-medium'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setFilterStatus('out')}
              class={`px-3 py-1 text-sm ${
                filterStatus === 'out'
                  ? 'bg-red-100 text-red-700 font-medium'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Out of Stock
            </button>
          </div>
        </div>
      </div>
      
      {/* Inventory Data Table */}
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
                  <span>Item Name</span>
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
                <span class="hidden print:inline">Item Name</span>
              </th>
              <th 
                scope="col" 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('sku')}
              >
                <div class="flex items-center print:hidden">
                  <span>SKU</span>
                  {sortBy === 'sku' && (
                    <svg class="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      {sortOrder === 'asc' ? (
                        <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                      ) : (
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      )}
                    </svg>
                  )}
                </div>
                <span class="hidden print:inline">SKU</span>
              </th>
              <th 
                scope="col" 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('quantity')}
              >
                <div class="flex items-center print:hidden">
                  <span>Quantity</span>
                  {sortBy === 'quantity' && (
                    <svg class="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      {sortOrder === 'asc' ? (
                        <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                      ) : (
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      )}
                    </svg>
                  )}
                </div>
                <span class="hidden print:inline">Quantity</span>
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th 
                scope="col" 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('value')}
              >
                <div class="flex items-center print:hidden">
                  <span>Value</span>
                  {sortBy === 'value' && (
                    <svg class="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      {sortOrder === 'asc' ? (
                        <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                      ) : (
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      )}
                    </svg>
                  )}
                </div>
                <span class="hidden print:inline">Value</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="5" class="px-6 py-4 text-center text-sm text-gray-500">
                  No inventory data available for the selected filters.
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr key={index} class={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.name}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.itemCode || 'N/A'}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.quantity || 0}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      getStatusBadgeClass(item.quantity, item.reorderLevel)
                    }`}>
                      {getStatusText(item.quantity, item.reorderLevel)}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {formatCurrency((item.quantity || 0) * (item.costPrice || 0))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Report Footer - only visible when printing */}
      <div class="hidden print:block mt-8 text-center text-xs text-gray-500">
        <p>Report generated on {new Date().toLocaleString()}</p>
        <p>This is an automatically generated report.</p>
      </div>
    </div>
  );
};

export default InventoryReportComponent;
