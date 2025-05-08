import { h } from 'preact';
import { useState } from 'preact/hooks';
import { FilterSelect } from '../../components/common';

const DevDashboardPage = () => {
  // Sample branches for filtering
  const branches = [
    { _id: 'BR001', name: 'Main Branch' },
    { _id: 'BR002', name: 'North Branch' },
    { _id: 'BR003', name: 'South Branch' },
  ];

  // State for branch filter
  const [selectedBranch, setSelectedBranch] = useState('all');

  // Sample data for development
  const stats = [
    { name: 'Total Sales', value: '₱24,500', change: '+12%', changeType: 'increase' },
    { name: 'Pending Quotations', value: '18', change: '+5%', changeType: 'increase' },
    { name: 'Inventory Items', value: '245', change: '-2%', changeType: 'decrease' },
    { name: 'Active Customers', value: '64', change: '+8%', changeType: 'increase' },
  ];

  const recentSales = [
    { id: 'S-20230001', customer: { name: 'ABC Corporation' }, total: 5200, status: 'completed', createdAt: '2023-05-01', branch: 'Main Branch' },
    { id: 'S-20230002', customer: { name: 'XYZ Ltd' }, total: 3750, status: 'completed', createdAt: '2023-04-28', branch: 'North Branch' },
    { id: 'S-20230003', customer: { name: 'Acme Inc' }, total: 8900, status: 'pending', createdAt: '2023-04-25', branch: 'Main Branch' },
    { id: 'S-20230004', customer: { name: 'Global Services' }, total: 2300, status: 'cancelled', createdAt: '2023-04-22', branch: 'South Branch' },
    { id: 'S-20230005', customer: { name: 'Tech Solutions' }, total: 6100, status: 'completed', createdAt: '2023-04-20', branch: 'North Branch' },
  ];

  const lowStockItems = [
    { id: 'I-001', name: 'Widget A', quantity: 5, reorderLevel: 10, branch: 'Main Branch' },
    { id: 'I-002', name: 'Component B', quantity: 3, reorderLevel: 15, branch: 'North Branch' },
    { id: 'I-003', name: 'Part C', quantity: 8, reorderLevel: 20, branch: 'Main Branch' },
    { id: 'I-004', name: 'Tool D', quantity: 2, reorderLevel: 5, branch: 'South Branch' },
  ];

  // Filter items by selected branch
  const filteredSales = selectedBranch === 'all' 
    ? recentSales 
    : recentSales.filter(sale => sale.branch === selectedBranch);

  const filteredLowStockItems = selectedBranch === 'all'
    ? lowStockItems
    : lowStockItems.filter(item => item.branch === selectedBranch);

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

  return (
    <div>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Dashboard (Development Mode)</h1>
        <p class="mt-1 text-sm text-gray-500">Overview of your business performance and key metrics</p>
        <div class="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded-md">
          <p class="text-sm font-medium">⚠️ Using demo data. This is a development version of the dashboard.</p>
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
                  placeholder="Search..."
                  class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>

              {/* Branch Filter */}
              <div>
                <FilterSelect
                  id="branch-filter"
                  name="branch-filter"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  options={[{ id: 'all', name: 'All Branches' }, ...branches.map(branch => ({ id: branch.name, name: branch.name }))]}
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
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan="6" class="px-6 py-4 text-center text-gray-500">No recent sales data available</td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.id}>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">{sale.id}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.customer.name}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(sale.total)}</td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          sale.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          sale.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.branch || 'N/A'}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(sale.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div class="px-4 py-3 border-t border-gray-200 text-right sm:px-6">
            <a href="#" class="text-sm font-medium text-primary-600 hover:text-primary-500">
              View all sales<span aria-hidden="true"> &rarr;</span>
            </a>
          </div>
        </div>

        {/* Low Stock Items */}
        <div class="bg-white shadow rounded-lg">
          <div class="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900">Low Stock Items</h3>
          </div>
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
                {filteredLowStockItems.length === 0 ? (
                  <tr>
                    <td colSpan="5" class="px-6 py-4 text-center text-gray-500">No low stock items found</td>
                  </tr>
                ) : (
                  filteredLowStockItems.map((item) => (
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
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div class="px-4 py-3 border-t border-gray-200 text-right sm:px-6">
            <a href="#" class="text-sm font-medium text-primary-600 hover:text-primary-500">
              View inventory<span aria-hidden="true"> &rarr;</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevDashboardPage;
