import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { getDashboardData } from '../../utils/dashboardCache';

const DashboardPage = () => {
  // Get user data from auth context
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardData, setDashboardData] = useState({
    stats: [
      { name: 'Total Sales', value: '₱0', change: '0%', changeType: 'neutral' },
      { name: 'Pending Orders', value: '0', change: '0%', changeType: 'neutral' },
      { name: 'Inventory Items', value: '0', change: '0%', changeType: 'neutral' },
      { name: 'Active Customers', value: '0', change: '0%', changeType: 'neutral' },
    ],
    recentSales: [],
    topSellingItems: []
  });

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use cached dashboard data
        const cachedData = await getDashboardData();
        
        // Get change percentages from API or use zeros if not available
        const changes = cachedData.summary.changes || {
          sales: '0%',
          quotations: '0%',
          inventory: '0%',
          customers: '0%'
        };

        // Format stats data
        const stats = [
          { 
            name: 'Total Sales', 
            value: formatCurrency(cachedData.summary.sales?.total || 0), 
            change: changes.sales, 
            changeType: changes.sales.startsWith('+') ? 'increase' : 
                       changes.sales.startsWith('-') ? 'decrease' : 'neutral'
          },
          { 
            name: 'Pending Orders', 
            value: (cachedData.summary.counts?.quotations || 0).toString(), 
            change: changes.quotations, 
            changeType: changes.quotations.startsWith('+') ? 'increase' : 
                       changes.quotations.startsWith('-') ? 'decrease' : 'neutral'
          },
          { 
            name: 'Inventory Items', 
            value: (cachedData.summary.counts?.inventory || 0).toString(), 
            change: changes.inventory, 
            changeType: changes.inventory.startsWith('+') ? 'increase' : 
                       changes.inventory.startsWith('-') ? 'decrease' : 'neutral'
          },
          { 
            name: 'Active Customers', 
            value: (cachedData.summary.counts?.customers || 0).toString(), 
            change: changes.customers, 
            changeType: changes.customers.startsWith('+') ? 'increase' : 
                       changes.customers.startsWith('-') ? 'decrease' : 'neutral'
          },
        ];

        // Format the sales data to ensure it has the right structure
        const formattedSales = cachedData.recentSales.map(sale => {
          // Format the ID to be more user-friendly (remove ObjectId format)
          let formattedId = sale.id;
          if (formattedId && formattedId.length > 8) {
            // If it's a MongoDB ObjectId, use the last 8 characters
            formattedId = `S-${formattedId.substring(formattedId.length - 8)}`;
          }
          
          return {
            id: formattedId,
            customer: sale.customer,
            total: sale.total,
            status: sale.status,
            createdAt: sale.createdAt
          };
        });

        // Format the top selling items to ensure they have the right structure
        const formattedTopSellingItems = cachedData.topSellingItems.map(item => {
          return {
            id: item._id || item.id, // Handle both _id and id formats
            name: item.name,
            itemCode: item.itemCode,
            currentStock: item.currentStock || 0,
            totalQuantitySold: item.totalQuantitySold || 0,
            totalRevenue: item.totalRevenue || 0,
            salesCount: item.salesCount || 0
          };
        });

        setDashboardData({
          stats,
          recentSales: formattedSales,
          topSellingItems: formattedTopSellingItems
        });
        
        console.log('Dashboard data loaded from cache successfully');
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load dashboard data. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Search function to check if an item matches the search query
  const matchesSearch = (item, query) => {
    if (!query) return true;
    
    const searchLower = query.toLowerCase();
    
    // For sales items
    if (item.id) {
      return (
        // Search by sales ID
        item.id.toLowerCase().includes(searchLower) ||
        // Search by customer name
        (item.customer && item.customer.name && 
         item.customer.name.toLowerCase().includes(searchLower))
      );
    }
    
    // For inventory items
    if (item.name) {
      return (
        // Search by item name
        item.name.toLowerCase().includes(searchLower)
      );
    }
    
    return false;
  };

  // Filter items by search query
  const filteredSales = dashboardData.recentSales
    .filter(sale => matchesSearch(sale, searchQuery));

  const filteredTopSellingItems = dashboardData.topSellingItems
    .filter(item => matchesSearch(item, searchQuery));

  // Extract data for rendering
  const { stats } = dashboardData;

  return (
    <div>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p class="mt-1 text-sm text-gray-500">Overview of your business performance and key metrics</p>
        
        {error && (
          <div class="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded-md">
            <p class="text-sm font-medium">⚠️ {error}</p>
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
                  placeholder="Search customer, item, sales ID..."
                  class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={searchQuery}
                  onInput={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div class="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} class="bg-white overflow-hidden shadow rounded-lg">
            <div class="px-3 py-4 sm:px-4 sm:py-5 lg:p-6">
              <div class="flex flex-col sm:flex-row sm:items-center">
                <div class="flex items-center mb-3 sm:mb-0">
                  <div class="flex-shrink-0 bg-primary-100 rounded-md p-2 sm:p-3">
                    <svg class="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div class="ml-3 sm:ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-xs sm:text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                      <dd>
                        <div class="text-base sm:text-lg font-medium text-gray-900">{stat.value}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div class="mt-3 sm:mt-4">
                <div class={`inline-flex items-baseline px-2 py-0.5 sm:px-2.5 rounded-full text-xs sm:text-sm font-medium ${
                  stat.changeType === 'increase' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {stat.changeType === 'increase' ? (
                    <svg class="-ml-1 mr-0.5 flex-shrink-0 self-center h-4 w-4 sm:h-5 sm:w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                  ) : (
                    <svg class="-ml-1 mr-0.5 flex-shrink-0 self-center h-4 w-4 sm:h-5 sm:w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  )}
                  <span>{stat.change}</span>
                </div>
                <div class="text-xs text-gray-500 mt-1 hidden sm:block">Compared to last month</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Recent Sales */}
      <div class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900">Recent Sales</h3>
        </div>
        {loading ? (
          <div class="p-6 text-center">Loading recent sales...</div>
        ) : error ? (
          <div class="p-6 text-center text-red-500">{error}</div>
        ) : filteredSales.length === 0 ? (
          <div class="p-6 text-center text-gray-500">No recent sales data available</div>
        ) : (
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-3 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th scope="col" class="px-3 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th scope="col" class="px-3 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th scope="col" class="px-3 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                  <th scope="col" class="px-3 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id}>
                    <td class="px-3 py-4 sm:px-6 whitespace-nowrap text-xs sm:text-sm font-medium text-primary-600">{sale.id}</td>
                    <td class="px-3 py-4 sm:px-6 whitespace-nowrap text-xs sm:text-sm text-gray-900">{sale.customer ? sale.customer.name : 'N/A'}</td>
                    <td class="px-3 py-4 sm:px-6 whitespace-nowrap text-xs sm:text-sm text-gray-900">{formatCurrency(sale.total)}</td>
                    <td class="px-3 py-4 sm:px-6 whitespace-nowrap hidden sm:table-cell">
                      <span class={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        sale.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        sale.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sale.status ? sale.status.charAt(0).toUpperCase() + sale.status.slice(1) : 'N/A'}
                      </span>
                    </td>
                    <td class="px-3 py-4 sm:px-6 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden md:table-cell">{formatDate(sale.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div class="px-4 py-3 border-t border-gray-200 text-right sm:px-6">
          <a href="/sales" class="text-sm font-medium text-primary-600 hover:text-primary-500">
            View all sales<span aria-hidden="true"> &rarr;</span>
          </a>
        </div>
      </div>

      {/* Top Selling Items */}
      <div class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900">Top Selling Items</h3>
        </div>
        {loading ? (
          <div class="p-6 text-center">Loading top selling items...</div>
        ) : error ? (
          <div class="p-6 text-center text-red-500">{error}</div>
        ) : filteredTopSellingItems.length === 0 ? (
          <div class="p-6 text-center text-gray-500">No top selling items found</div>
        ) : (
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-3 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th scope="col" class="px-3 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Sold</th>
                  <th scope="col" class="px-3 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Revenue</th>
                  <th scope="col" class="px-3 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Sales Count</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {filteredTopSellingItems.map((item) => (
                  <tr key={item.id}>
                    <td class="px-3 py-4 sm:px-6 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">{item.name}</td>
                    <td class="px-3 py-4 sm:px-6 whitespace-nowrap text-xs sm:text-sm text-gray-900">{item.totalQuantitySold}</td>
                    <td class="px-3 py-4 sm:px-6 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden sm:table-cell">{formatCurrency(item.totalRevenue)}</td>
                    <td class="px-3 py-4 sm:px-6 whitespace-nowrap hidden md:table-cell">
                      <div class="flex items-center">
                        <div class="h-2.5 w-2.5 rounded-full mr-2 bg-green-500"></div>
                        <span class="text-xs sm:text-sm text-gray-500">
                          {item.salesCount} sales
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
          <div class="px-4 py-3 border-t border-gray-200 text-right sm:px-6">
            <a href="/inventory" class="text-sm font-medium text-primary-600 hover:text-primary-500">
              View inventory<span aria-hidden="true"> &rarr;</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
