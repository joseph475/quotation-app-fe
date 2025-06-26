import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

const DeliveryReportComponent = ({ data, dateRange }) => {
  const [sortBy, setSortBy] = useState('assignedDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDeliveryUser, setSelectedDeliveryUser] = useState('all');

  if (!data) {
    return (
      <div class="text-center py-8">
        <p class="text-gray-500">No delivery data available</p>
      </div>
    );
  }

  // Get unique delivery users
  const deliveryUsers = [...new Set((data.deliveries || [])
    .map(delivery => delivery.assignedDelivery?.name || delivery.deliveryPersonnel)
    .filter(Boolean)
  )];

  // Filter deliveries by status and delivery user
  const filteredDeliveries = (data.deliveries || []).filter(delivery => {
    if (filterStatus !== 'all' && delivery.status !== filterStatus) return false;
    if (selectedDeliveryUser !== 'all') {
      const deliveryPersonName = delivery.assignedDelivery?.name || delivery.deliveryPersonnel;
      if (deliveryPersonName !== selectedDeliveryUser) return false;
    }
    return true;
  });

  // Sort deliveries
  const sortedDeliveries = [...filteredDeliveries].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'assignedDate':
        aValue = new Date(a.assignedDate || a.createdAt);
        bValue = new Date(b.assignedDate || b.createdAt);
        break;
      case 'customer':
        aValue = (a.customer?.name || a.customerName || '').toLowerCase();
        bValue = (b.customer?.name || b.customerName || '').toLowerCase();
        break;
      case 'deliveryPersonnel':
        aValue = (a.assignedDelivery?.name || a.deliveryPersonnel || '').toLowerCase();
        bValue = (b.assignedDelivery?.name || b.deliveryPersonnel || '').toLowerCase();
        break;
      case 'total':
        aValue = a.total || a.amount || 0;
        bValue = b.total || b.amount || 0;
        break;
      case 'status':
        aValue = a.status || '';
        bValue = b.status || '';
        break;
      default:
        aValue = a[sortBy] || '';
        bValue = b[sortBy] || '';
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Helper function to format currency
  const formatCurrency = (amount) => {
    return `₱${(amount || 0).toFixed(2)}`;
  };

  // Helper function to get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div class="space-y-6">
      {/* Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white p-6 rounded-lg border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Total Assignments</dt>
                <dd class="text-lg font-medium text-gray-900">{filteredDeliveries.length}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Completed</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {filteredDeliveries.filter(d => d.status === 'delivered').length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Pending</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {filteredDeliveries.filter(d => d.status === 'approved' || d.status === 'pending').length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Total Value</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {formatCurrency(filteredDeliveries.reduce((sum, d) => sum + (d.total || d.amount || 0), 0))}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Delivery Personnel</label>
              <select
                value={selectedDeliveryUser}
                onChange={(e) => setSelectedDeliveryUser(e.target.value)}
                class="block w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="all">All Personnel</option>
                {deliveryUsers.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                class="block w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="delivered">Delivered</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <div class="flex space-x-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  class="flex-1 h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="assignedDate">Date Assigned</option>
                  <option value="customer">Customer</option>
                  <option value="deliveryPersonnel">Personnel</option>
                  <option value="total">Amount</option>
                  <option value="status">Status</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  class="h-10 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex items-center justify-center"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Assignments Table */}
      <div class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Delivery Assignments
              {selectedDeliveryUser !== 'all' && (
                <span class="ml-2 text-sm text-gray-500">- {selectedDeliveryUser}</span>
              )}
            </h3>
            <div class="text-sm text-gray-500">
              {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery Personnel
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Assigned
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {sortedDeliveries.length > 0 ? (
                  sortedDeliveries.map((delivery, index) => (
                    <tr key={delivery.id || index} class="hover:bg-gray-50">
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                        {delivery.quotationNumber || `ORD-${delivery.id?.slice(-6) || index}`}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {delivery.customer?.name || delivery.customerName || 'Unknown Customer'}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div class="flex items-center">
                          <div class="flex-shrink-0 h-8 w-8">
                            <div class="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                              <span class="text-xs font-medium text-primary-700">
                                {(delivery.assignedDelivery?.name || delivery.deliveryPersonnel || 'N').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div class="ml-3">
                            <div class="text-sm font-medium text-gray-900">
                              {delivery.assignedDelivery?.name || delivery.deliveryPersonnel || 'Not Assigned'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div class="text-sm text-gray-900">
                            {formatDate(delivery.assignedDate || delivery.createdAt)}
                          </div>
                          <div class="text-xs text-gray-500">
                            {new Date(delivery.assignedDate || delivery.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(delivery.status)}`}>
                          {delivery.status || 'pending'}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(delivery.total || delivery.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-sm text-gray-500">
                      No delivery assignments found for the selected criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {sortedDeliveries.length > 0 && (
            <div class="mt-4 flex justify-between items-center text-sm text-gray-500">
              <div>
                Showing {sortedDeliveries.length} delivery assignment{sortedDeliveries.length !== 1 ? 's' : ''}
              </div>
              <div>
                Total Value: {formatCurrency(sortedDeliveries.reduce((sum, d) => sum + (d.total || d.amount || 0), 0))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryReportComponent;
