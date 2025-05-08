import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import api from '../../services/api';
import { FilterSelect } from '../../components/common';
import useAuth from '../../hooks/useAuth';

const DashboardPage = () => {
  // Get user data from auth context
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardData, setDashboardData] = useState({
    stats: [
      { name: 'Total Sales', value: '₱0', change: '0%', changeType: 'neutral' },
      { name: 'Pending Quotations', value: '0', change: '0%', changeType: 'neutral' },
      { name: 'Inventory Items', value: '0', change: '0%', changeType: 'neutral' },
      { name: 'Active Customers', value: '0', change: '0%', changeType: 'neutral' },
    ],
    recentSales: [],
    lowStockItems: [],
    branches: []
  });
  
  // State for user's branch
  const [userBranchName, setUserBranchName] = useState('');
  const [userBranchId, setUserBranchId] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

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

  // Set default branch filter to 'all' initially
  useEffect(() => {
    if (!selectedBranch) {
      setSelectedBranch('all');
    }
  }, [selectedBranch]);

  // Update branch filter when user data is available
  useEffect(() => {
    if (user) {
      const updateBranchFilter = async () => {
        try {
          // Fetch branches
          const branchesResponse = await api.branches.getAll();
          const branches = branchesResponse?.data || [];
          
          // If user has a branch assigned, find it and set as default filter
          if (user.branch) {
            // Check if branch is an ObjectId or a string like 'All'
            if (user.branch === 'All') {
              // For admin users with 'All' branch
              setSelectedBranch('all');
              setUserBranchName('All Branches');
            } else {
              // For users with a specific branch ID
              const userBranch = branches.find(branch => {
                return branch._id === user.branch || branch.name === 'Main Branch';
              });
              
              if (userBranch) {
                setUserBranchName(userBranch.name);
                setUserBranchId(userBranch._id);
                
                // Always set branch filter to user's branch name
                setSelectedBranch(userBranch.name);
              } else {
                // Default to Main Branch if available
                const mainBranch = branches.find(branch => branch.name === 'Main Branch');
                if (mainBranch) {
                  setSelectedBranch(mainBranch.name);
                  setUserBranchName(mainBranch.name);
                  setUserBranchId(mainBranch._id);
                }
              }
            }
          } else if (user.role === 'admin') {
            // For admin users without a branch, set to 'all'
            setSelectedBranch('all');
          }
        } catch (err) {
          console.error('Error updating branch filter:', err);
        }
      };
      
      updateBranchFilter();
    }
  }, [user]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        try {
          // Fetch branches first so we have them available
          const branchesResponse = await api.branches.getAll();
          const branches = branchesResponse?.data || [];
          
          // Fetch dashboard summary
          const summaryResponse = await api.dashboard.getSummary();
          
          // Fetch recent sales
          const recentSalesResponse = await api.dashboard.getRecentSales();
          
          // Fetch low stock items
          const lowStockResponse = await api.dashboard.getLowStockItems();
          
          // Get change percentages from API or use zeros if not available
          const changes = summaryResponse.data.changes || {
            sales: '0%',
            quotations: '0%',
            inventory: '0%',
            customers: '0%'
          };

          // Format stats data
          const stats = [
            { 
              name: 'Total Sales', 
              value: formatCurrency(summaryResponse.data.sales?.total || 0), 
              change: changes.sales, 
              changeType: changes.sales.startsWith('+') ? 'increase' : 
                         changes.sales.startsWith('-') ? 'decrease' : 'neutral'
            },
            { 
              name: 'Pending Quotations', 
              value: (summaryResponse.data.counts?.quotations || 0).toString(), 
              change: changes.quotations, 
              changeType: changes.quotations.startsWith('+') ? 'increase' : 
                         changes.quotations.startsWith('-') ? 'decrease' : 'neutral'
            },
            { 
              name: 'Inventory Items', 
              value: (summaryResponse.data.counts?.inventory || 0).toString(), 
              change: changes.inventory, 
              changeType: changes.inventory.startsWith('+') ? 'increase' : 
                         changes.inventory.startsWith('-') ? 'decrease' : 'neutral'
            },
            { 
              name: 'Active Customers', 
              value: (summaryResponse.data.counts?.customers || 0).toString(), 
              change: changes.customers, 
              changeType: changes.customers.startsWith('+') ? 'increase' : 
                         changes.customers.startsWith('-') ? 'decrease' : 'neutral'
            },
          ];

          // Create a map of branch IDs to names for easy lookup
          const branchMap = {};
          branches.forEach(branch => {
            branchMap[branch._id] = branch.name;
          });

          // Format the sales data to ensure it has the right structure
          const formattedSales = recentSalesResponse.data.map(sale => {
            // Format the ID to be more user-friendly (remove ObjectId format)
            let formattedId = sale._id;
            if (formattedId && formattedId.length > 8) {
              // If it's a MongoDB ObjectId, use the last 8 characters
              formattedId = `S-${formattedId.substring(formattedId.length - 8)}`;
            }
            
            // Get branch name from the branch map or use the branch name directly if available
            let branchName = '';
            if (sale.branch) {
              if (typeof sale.branch === 'string') {
                // If branch is just an ID
                branchName = branchMap[sale.branch] || '';
              } else if (sale.branch._id) {
                // If branch is an object with _id
                branchName = branchMap[sale.branch._id] || sale.branch.name || '';
              } else if (sale.branch.name) {
                // If branch has a name property
                branchName = sale.branch.name;
              }
            }
            
            return {
              id: formattedId,
              customer: sale.customer,
              total: sale.total,
              status: sale.status,
              createdAt: sale.createdAt,
              branch: branchName
            };
          });

          // Format the low stock items to ensure they have the right structure
          const formattedLowStockItems = lowStockResponse.data.map(item => {
            // Get branch name from the branch map or use the branch name directly if available
            let branchName = '';
            if (item.branch) {
              if (typeof item.branch === 'string') {
                // If branch is just an ID
                branchName = branchMap[item.branch] || '';
              } else if (item.branch._id) {
                // If branch is an object with _id
                branchName = branchMap[item.branch._id] || item.branch.name || '';
              } else if (item.branch.name) {
                // If branch has a name property
                branchName = item.branch.name;
              }
            }
            
            return {
              id: item._id,
              name: item.name,
              quantity: item.quantity,
              reorderLevel: item.reorderLevel,
              branch: branchName
            };
          });

          setDashboardData({
            stats,
            recentSales: formattedSales,
            lowStockItems: formattedLowStockItems,
            branches
          });
          
          console.log('Dashboard data loaded from API successfully');
        } catch (apiError) {
          console.error('Error fetching dashboard data from API:', apiError);
          
          // Set a user-friendly error message
          setError('Failed to load dashboard data. Please check your connection and try again.');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error in dashboard data loading:', err);
        setError('Failed to load dashboard data. Please check your connection and try again.');
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
         item.customer.name.toLowerCase().includes(searchLower)) ||
        // Search by branch
        (item.branch && item.branch.toLowerCase().includes(searchLower))
      );
    }
    
    // For inventory items
    if (item.name) {
      return (
        // Search by item name
        item.name.toLowerCase().includes(searchLower) ||
        // Search by branch
        (item.branch && item.branch.toLowerCase().includes(searchLower))
      );
    }
    
    return false;
  };

  // Filter items by selected branch and search query
  const filteredSales = dashboardData.recentSales
    .filter(sale => (selectedBranch === 'all' || sale.branch === selectedBranch))
    .filter(sale => matchesSearch(sale, searchQuery));

  const filteredLowStockItems = dashboardData.lowStockItems
    .filter(item => (selectedBranch === 'all' || item.branch === selectedBranch))
    .filter(item => matchesSearch(item, searchQuery));

  // Extract data for rendering
  const { stats, branches } = dashboardData;

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
                  placeholder="Search customer, item, sales ID, branch..."
                  class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={searchQuery}
                  onInput={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Branch Filter */}
              <div>
                <FilterSelect
                  id="branch-filter"
                  name="branch-filter"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  options={[{ id: 'all', name: 'All Branches' }, ...branches]}
                  optionValueKey="id"
                  optionLabelKey="name"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} class="bg-white overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <div class="flex items-center">
                <div class="flex-shrink-0 bg-primary-100 rounded-md p-3">
                  <svg class="h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                    <dd>
                      <div class="text-lg font-medium text-gray-900">{stat.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
              <div class="mt-4">
                <div class={`inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium ${
                  stat.changeType === 'increase' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {stat.changeType === 'increase' ? (
                    <svg class="-ml-1 mr-0.5 flex-shrink-0 self-center h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                  ) : (
                    <svg class="-ml-1 mr-0.5 flex-shrink-0 self-center h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  )}
                  <span>{stat.change}</span>
                </div>
                <div class="text-xs text-gray-500 mt-1">Compared to last month</div>
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
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id}>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">{sale.id}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.customer ? sale.customer.name : 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(sale.total)}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        sale.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        sale.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sale.status ? sale.status.charAt(0).toUpperCase() + sale.status.slice(1) : 'N/A'}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.branch || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(sale.createdAt)}</td>
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

      {/* Low Stock Items */}
      <div class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900">Low Stock Items</h3>
        </div>
        {loading ? (
          <div class="p-6 text-center">Loading low stock items...</div>
        ) : error ? (
          <div class="p-6 text-center text-red-500">{error}</div>
        ) : filteredLowStockItems.length === 0 ? (
          <div class="p-6 text-center text-gray-500">No low stock items found</div>
        ) : (
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Stock</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {filteredLowStockItems.map((item) => (
                  <tr key={item.id}>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.reorderLevel}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.branch || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class={`h-2.5 w-2.5 rounded-full mr-2 ${item.quantity < item.reorderLevel / 2 ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                        <span class="text-sm text-gray-500">
                          {item.quantity < item.reorderLevel / 2 ? 'Critical' : 'Low'}
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
