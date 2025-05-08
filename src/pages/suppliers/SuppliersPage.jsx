import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import SupplierForm from '../../components/suppliers/SupplierForm';
import api from '../../services/api';

const SuppliersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch suppliers on component mount
  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Fetch suppliers from API
  const fetchSuppliers = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.suppliers.getAll();
      
      if (response && response.success) {
        setSuppliers(response.data || []);
      } else {
        throw new Error(response.message || 'Failed to fetch suppliers');
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError('Failed to fetch suppliers. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle supplier form submission
  const handleSubmitSupplier = async (formData) => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      let response;
      
      if (selectedSupplier) {
        // Update existing supplier
        response = await api.suppliers.update(selectedSupplier._id, formData);
      } else {
        // Create new supplier
        response = await api.suppliers.create(formData);
      }
      
      if (response && response.success) {
        // Refresh suppliers list
        await fetchSuppliers();
        
        setSuccessMessage(selectedSupplier ? 
          'Supplier updated successfully!' : 
          'Supplier created successfully!');
      } else {
        throw new Error(response.message || 'Failed to save supplier');
      }
      
      setIsLoading(false);
      setShowForm(false);
      setSelectedSupplier(null);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error saving supplier:', err);
      setError(err.message || 'Failed to save supplier. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle edit supplier
  const handleEditSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setShowForm(true);
    setError('');
  };

  // Handle delete supplier
  const handleDeleteSupplier = async (supplierId) => {
    if (!confirm('Are you sure you want to delete this supplier?')) {
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await api.suppliers.delete(supplierId);
      
      if (response && response.success) {
        // Refresh suppliers list
        await fetchSuppliers();
        setSuccessMessage('Supplier deleted successfully!');
      } else {
        throw new Error(response.message || 'Failed to delete supplier');
      }
      
      setIsLoading(false);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error deleting supplier:', err);
      setError(err.message || 'Failed to delete supplier. Please try again.');
      setIsLoading(false);
    }
  };

  // Filter and sort suppliers
  const filteredSuppliers = suppliers
    .filter(supplier => {
      // Apply search filter
      const matchesSearch = 
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (supplier.phone && supplier.phone.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Apply status filter
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && supplier.isActive) ||
                           (statusFilter === 'inactive' && !supplier.isActive);
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'contactPerson') {
        comparison = (a.contactPerson || '').localeCompare(b.contactPerson || '');
      } else if (sortBy === 'email') {
        comparison = (a.email || '').localeCompare(b.email || '');
      } else if (sortBy === 'phone') {
        comparison = (a.phone || '').localeCompare(b.phone || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Supplier Management</h1>
        <p class="mt-1 text-sm text-gray-500">Manage your supplier information and track their details</p>
      </div>

      {/* Success message */}
      {successMessage && (
        <div class="mb-6 bg-green-50 border-l-4 border-green-400 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && !showForm && (
        <div class="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Form */}
      {showForm && (
        <div class="mb-8">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-gray-800">
              {selectedSupplier ? 'Edit Supplier' : 'Create New Supplier'}
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                setSelectedSupplier(null);
                setError('');
              }}
              class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
          </div>
          <SupplierForm
            supplier={selectedSupplier}
            onSubmit={handleSubmitSupplier}
            isLoading={isLoading}
            error={error}
          />
        </div>
      )}

      {!showForm && (
        <div>
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
                    placeholder="Search suppliers..."
                    value={searchTerm}
                    onInput={(e) => setSearchTerm(e.target.value)}
                    class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>

                {/* Status Filter */}
                <div class="w-48">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  >
                    <option value="all">All Suppliers</option>
                    <option value="active">Active Suppliers</option>
                    <option value="inactive">Inactive Suppliers</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div class="flex space-x-3">
                <button 
                  class="btn btn-primary flex items-center"
                  onClick={() => {
                    setSelectedSupplier(null);
                    setShowForm(true);
                    setError('');
                  }}
                >
                  <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                  </svg>
                  Add Supplier
                </button>
              </div>
            </div>
          </div>

          {/* Suppliers Table */}
          {isLoading && !suppliers.length ? (
            <div class="text-center py-12 bg-white rounded-lg shadow">
              <p class="mt-2 text-sm text-gray-500">Loading suppliers...</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div class="text-center py-12 bg-white rounded-lg shadow">
              <h3 class="mt-2 text-sm font-medium text-gray-900">No suppliers found</h3>
              <p class="mt-1 text-sm text-gray-500">Get started by creating a new supplier.</p>
              <div class="mt-6">
                <button
                  onClick={() => {
                    setSelectedSupplier(null);
                    setShowForm(true);
                  }}
                  class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Add Supplier
                </button>
              </div>
            </div>
          ) : (
            <div class="bg-white shadow rounded-lg overflow-hidden">
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div class="flex items-center cursor-pointer" onClick={() => handleSort('name')}>
                          Supplier
                        </div>
                      </th>
                      <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div class="flex items-center cursor-pointer" onClick={() => handleSort('contactPerson')}>
                          Contact Person
                        </div>
                      </th>
                      <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div class="flex items-center cursor-pointer" onClick={() => handleSort('email')}>
                          Email
                        </div>
                      </th>
                      <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div class="flex items-center cursor-pointer" onClick={() => handleSort('phone')}>
                          Phone
                        </div>
                      </th>
                      <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    {filteredSuppliers.map((supplier) => (
                      <tr key={supplier._id}>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <div class="flex items-center">
                            <div class="h-10 w-10 flex-shrink-0 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium">
                              {supplier.name.charAt(0)}
                            </div>
                            <div class="ml-4">
                              <div class="text-sm font-medium text-gray-900">{supplier.name}</div>
                            </div>
                          </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <div class="text-sm text-gray-900">{supplier.contactPerson || 'N/A'}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <div class="text-sm text-gray-500">{supplier.email || 'N/A'}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {supplier.phone || 'N/A'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <span class={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            supplier.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {supplier.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div class="flex justify-end space-x-2">
                            <button 
                              class="text-primary-600 hover:text-primary-900"
                              onClick={() => handleEditSupplier(supplier)}
                            >
                              Edit
                            </button>
                            <button 
                              class="text-red-600 hover:text-red-900"
                              onClick={() => handleDeleteSupplier(supplier._id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;
