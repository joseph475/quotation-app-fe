import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Card from '../common/Card';
import Button from '../common/Button';
import api from '../../services/api';

/**
 * SupplierPriceForm component for managing supplier-specific prices
 * 
 * @param {Object} props - Component props
 * @param {string} props.supplierId - The ID of the supplier
 * @param {Function} props.onCancel - Cancel handler
 * @param {Function} props.onSave - Save handler
 */
const SupplierPriceForm = ({ supplierId, onCancel, onSave }) => {
  // State for supplier and inventory items
  const [supplier, setSupplier] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [supplierPrices, setSupplierPrices] = useState([]);
  const [loading, setLoading] = useState({ supplier: false, inventory: false, prices: false });
  const [error, setError] = useState(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);

  // Fetch supplier, inventory items, and existing supplier prices
  useEffect(() => {
    const fetchData = async () => {
      setLoading({ supplier: true, inventory: true, prices: true });
      try {
        // Fetch supplier details
        const supplierResponse = await api.suppliers.getById(supplierId);
        if (supplierResponse && supplierResponse.data) {
          setSupplier(supplierResponse.data);
        }

        // Fetch all inventory items
        const inventoryResponse = await api.inventory.getAll();
        if (inventoryResponse && inventoryResponse.data) {
          setInventoryItems(inventoryResponse.data);
        }

  // Fetch existing supplier prices if the API endpoint exists
  try {
    const pricesResponse = await api.supplierPrices.getBySupplier(supplierId);
    if (pricesResponse && pricesResponse.data) {
      // Map the response data to ensure we have the correct field names
      const mappedPrices = pricesResponse.data.map(price => ({
        supplierId: price.supplier,
        inventoryId: price.inventory,
        price: price.price
      }));
      console.log('Fetched supplier prices:', mappedPrices);
      setSupplierPrices(mappedPrices);
    }
  } catch (priceError) {
    console.log('Supplier prices endpoint not available or no prices found');
    // Initialize with empty array if endpoint doesn't exist yet
    setSupplierPrices([]);
  }

        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading({ supplier: false, inventory: false, prices: false });
      }
    };

    if (supplierId) {
      fetchData();
    }
  }, [supplierId]);

  // Filter inventory items based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredItems(inventoryItems);
    } else {
      const filtered = inventoryItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.itemCode && item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredItems(filtered);
    }
  }, [searchTerm, inventoryItems]);

  // Handle price change for an item
  const handlePriceChange = (itemId, value) => {
    const price = parseFloat(value) || 0;
    
    setSupplierPrices(prev => {
      // Check if we already have a price for this item
      const existingPriceIndex = prev.findIndex(p => p.inventoryId === itemId);
      
      if (existingPriceIndex >= 0) {
        // Update existing price
        const updatedPrices = [...prev];
        updatedPrices[existingPriceIndex] = {
          ...updatedPrices[existingPriceIndex],
          price
        };
        return updatedPrices;
      } else {
        // Add new price
        return [...prev, {
          supplierId,
          inventoryId: itemId,
          price
        }];
      }
    });
  };

  // Get current price for an item
  const getCurrentPrice = (itemId) => {
    const priceEntry = supplierPrices.find(p => {
      // Check if we have inventoryId directly or if it's in the inventory field
      return p.inventoryId === itemId || p.inventory === itemId;
    });
    return priceEntry ? priceEntry.price : '';
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Filter out prices that are 0 or empty
    const validPrices = supplierPrices.filter(p => p.price > 0);
    
    // Call the save handler with the supplier prices
    onSave(validPrices);
  };

  // Common input classes for consistency
  const inputClasses = "block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-2 px-3 sm:text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

  if (loading.supplier || loading.inventory) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Information */}
      {supplier && (
        <Card title={`Supplier: ${supplier.name}`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Contact Person</p>
              <p className="mt-1 text-sm text-gray-900">{supplier.contactPerson || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="mt-1 text-sm text-gray-900">{supplier.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Phone</p>
              <p className="mt-1 text-sm text-gray-900">{supplier.phone || 'N/A'}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Search Bar */}
      <Card title="Manage Supplier Prices">
        <div className="mb-4">
          <label htmlFor="search" className={labelClasses}>
            Search Items
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              id="search"
              placeholder="Search by item name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${inputClasses} pl-10`}
            />
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Code
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Default Cost Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier Price
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.itemCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${parseFloat(item.costPrice).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500">$</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={getCurrentPrice(item._id)}
                          onChange={(e) => handlePriceChange(item._id, e.target.value)}
                          className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-1 px-2 pl-7 sm:text-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                    {searchTerm ? 'No items found matching your search.' : 'No inventory items available.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
        >
          Save Prices
        </Button>
      </div>
    </form>
  );
};

export default SupplierPriceForm;
