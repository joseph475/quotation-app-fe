import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

/**
 * Sales Report Component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.data - Sales report data
 * @param {Object} props.dateRange - Date range for the report
 */
const SalesReportComponent = ({ data, dateRange }) => {
  const [groupBy, setGroupBy] = useState('day');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [processedData, setProcessedData] = useState([]);
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalItems: 0,
    averageSale: 0,
    topSellingItems: []
  });
  
  // Process data when it changes or grouping/sorting changes
  useEffect(() => {
    if (!data) return;
    
    // Process the data based on groupBy
    let grouped = {};
    let totalSales = 0;
    let totalItems = 0;
    let itemSales = {};
    
    // Group sales data
    data.sales.forEach(sale => {
      const date = new Date(sale.createdAt);
      let groupKey;
      
      // Determine group key based on groupBy
      switch (groupBy) {
        case 'day':
          groupKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'week':
          // Get the week number
          const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
          const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
          const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
          groupKey = `${date.getFullYear()}-W${weekNum}`;
          break;
        case 'month':
          groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          groupKey = date.toISOString().split('T')[0];
      }
      
      // Initialize group if it doesn't exist
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          date: groupKey,
          count: 0,
          total: 0,
          items: 0
        };
      }
      
      // Update group data
      grouped[groupKey].count += 1;
      grouped[groupKey].total += sale.total || 0;
      
      // Count items and track item sales for top selling items
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          totalItems += item.quantity || 0;
          grouped[groupKey].items += item.quantity || 0;
          
          const itemName = typeof item.inventory === 'string' 
            ? item.inventory 
            : (item.inventory?.name || item.description || 'Unknown Item');
            
          if (!itemSales[itemName]) {
            itemSales[itemName] = {
              name: itemName,
              quantity: 0,
              total: 0
            };
          }
          
          itemSales[itemName].quantity += item.quantity || 0;
          itemSales[itemName].total += item.total || 0;
        });
      }
      
      totalSales += sale.total || 0;
    });
    
    // Convert grouped object to array for sorting
    let result = Object.values(grouped);
    
    // Sort the data
    result.sort((a, b) => {
      let valueA, valueB;
      
      // Determine values to compare based on sortBy
      switch (sortBy) {
        case 'date':
          valueA = a.date;
          valueB = b.date;
          break;
        case 'count':
          valueA = a.count;
          valueB = b.count;
          break;
        case 'total':
          valueA = a.total;
          valueB = b.total;
          break;
        case 'items':
          valueA = a.items;
          valueB = b.items;
          break;
        default:
          valueA = a.date;
          valueB = b.date;
      }
      
      // Apply sort order
      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
    
    // Get top selling items
    const topItems = Object.values(itemSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
    
    // Calculate average sale
    const averageSale = data.sales.length > 0 ? totalSales / data.sales.length : 0;
    
    // Update state
    setProcessedData(result);
    setSummary({
      totalSales,
      totalItems,
      averageSale,
      topSellingItems: topItems
    });
  }, [data, groupBy, sortBy, sortOrder]);
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    // Handle different date formats based on groupBy
    if (groupBy === 'day') {
      return new Date(dateString).toLocaleDateString();
    } else if (groupBy === 'week') {
      const [year, week] = dateString.split('-W');
      return `Week ${week}, ${year}`;
    } else if (groupBy === 'month') {
      const [year, month] = dateString.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
    }
    
    return dateString;
  };
  
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
      setSortOrder('desc'); // Default to descending when changing sort field
    }
  };
  
  return (
    <div>
      {/* Report Header - visible in both screen and print */}
      <div class="mb-6 print:mb-4">
        <h2 class="text-xl font-bold text-gray-900 print:text-lg">Sales Report</h2>
        <p class="text-sm text-gray-500">
          {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
        </p>
      </div>
      
      {/* Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:grid-cols-3 print:gap-2 print:mb-4">
        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h3 class="text-sm font-medium text-gray-500">Total Sales</h3>
          <p class="text-2xl font-bold text-gray-900 print:text-xl">{formatCurrency(summary.totalSales)}</p>
        </div>
        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h3 class="text-sm font-medium text-gray-500">Total Items Sold</h3>
          <p class="text-2xl font-bold text-gray-900 print:text-xl">{summary.totalItems}</p>
        </div>
        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h3 class="text-sm font-medium text-gray-500">Average Sale Value</h3>
          <p class="text-2xl font-bold text-gray-900 print:text-xl">{formatCurrency(summary.averageSale)}</p>
        </div>
      </div>
      
      {/* Group By Controls - hidden when printing */}
      <div class="mb-4 print:hidden">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-medium text-gray-700">Group By:</span>
          <div class="flex border border-gray-300 rounded-md overflow-hidden">
            <button
              onClick={() => setGroupBy('day')}
              class={`px-3 py-1 text-sm ${
                groupBy === 'day'
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setGroupBy('week')}
              class={`px-3 py-1 text-sm ${
                groupBy === 'week'
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setGroupBy('month')}
              class={`px-3 py-1 text-sm ${
                groupBy === 'month'
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </div>
      
      {/* Sales Data Table */}
      <div class="mb-6 overflow-x-auto print:mb-4">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50 print:bg-gray-100">
            <tr>
              <th 
                scope="col" 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('date')}
              >
                <div class="flex items-center print:hidden">
                  <span>Date</span>
                  {sortBy === 'date' && (
                    <svg class="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      {sortOrder === 'asc' ? (
                        <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                      ) : (
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      )}
                    </svg>
                  )}
                </div>
                <span class="hidden print:inline">Date</span>
              </th>
              <th 
                scope="col" 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('count')}
              >
                <div class="flex items-center print:hidden">
                  <span>Sales Count</span>
                  {sortBy === 'count' && (
                    <svg class="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      {sortOrder === 'asc' ? (
                        <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                      ) : (
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      )}
                    </svg>
                  )}
                </div>
                <span class="hidden print:inline">Sales Count</span>
              </th>
              <th 
                scope="col" 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('items')}
              >
                <div class="flex items-center print:hidden">
                  <span>Items Sold</span>
                  {sortBy === 'items' && (
                    <svg class="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      {sortOrder === 'asc' ? (
                        <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                      ) : (
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      )}
                    </svg>
                  )}
                </div>
                <span class="hidden print:inline">Items Sold</span>
              </th>
              <th 
                scope="col" 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('total')}
              >
                <div class="flex items-center print:hidden">
                  <span>Total Sales</span>
                  {sortBy === 'total' && (
                    <svg class="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      {sortOrder === 'asc' ? (
                        <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                      ) : (
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      )}
                    </svg>
                  )}
                </div>
                <span class="hidden print:inline">Total Sales</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {processedData.length === 0 ? (
              <tr>
                <td colSpan="4" class="px-6 py-4 text-center text-sm text-gray-500">
                  No sales data available for the selected period.
                </td>
              </tr>
            ) : (
              processedData.map((row, index) => (
                <tr key={index} class={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatDate(row.date)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.count}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.items}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {formatCurrency(row.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Top Selling Items */}
      <div class="mb-6 print:mb-4">
        <h3 class="text-lg font-medium text-gray-900 mb-3 print:text-base">Top Selling Items</h3>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50 print:bg-gray-100">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity Sold
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Sales
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {summary.topSellingItems.length === 0 ? (
                <tr>
                  <td colSpan="3" class="px-6 py-4 text-center text-sm text-gray-500">
                    No item sales data available.
                  </td>
                </tr>
              ) : (
                summary.topSellingItems.map((item, index) => (
                  <tr key={index} class={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.quantity}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

export default SalesReportComponent;
