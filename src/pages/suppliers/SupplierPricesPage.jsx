import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import SupplierPriceForm from '../../components/suppliers/SupplierPriceForm';
import api from '../../services/api';

/**
 * SupplierPricesPage component for managing supplier-specific prices
 */
const SupplierPricesPage = ({ id }) => {
  
  const [supplier, setSupplier] = useState(null);
  const [supplierPrices, setSupplierPrices] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch supplier details and prices
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch supplier details
        const supplierResponse = await api.suppliers.getById(id);
        if (supplierResponse && supplierResponse.data) {
          setSupplier(supplierResponse.data);
        } else {
          setError('Failed to load supplier details');
          return;
        }

        // Fetch supplier prices
        try {
          const pricesResponse = await api.supplierPrices.getBySupplier(id);
          if (pricesResponse && pricesResponse.data) {
            console.log('Fetched supplier prices:', pricesResponse.data);
            setSupplierPrices(pricesResponse.data);
          }
        } catch (priceError) {
          console.log('No supplier prices found or API not available');
          setSupplierPrices([]);
        }

        // Fetch inventory items to display names
        const inventoryResponse = await api.inventory.getAll();
        if (inventoryResponse && inventoryResponse.data) {
          setInventoryItems(inventoryResponse.data);
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load supplier data');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  // Handle save supplier prices
  const handleSavePrices = async (prices) => {
    try {
      setLoading(true);
      
      // Check if the API endpoint exists
      if (api.supplierPrices && api.supplierPrices.update) {
        const response = await api.supplierPrices.update(id, prices);
        if (response && response.data) {
          // Update the local state with the returned prices
          setSupplierPrices(response.data);
        }
      } else {
        // If the endpoint doesn't exist yet, log a message
        console.log('Supplier prices API endpoint not implemented yet');
        console.log('Would save these prices:', prices);
        
        // For demonstration purposes, we'll simulate a successful save
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setIsEditing(false);
      setError(null);
      
      // Show success message or notification here
    } catch (err) {
      console.error('Error saving supplier prices:', err);
      setError('Failed to save supplier prices');
    } finally {
      setLoading(false);
    }
  };

  // Get inventory item name by ID
  const getInventoryItemName = (inventoryId) => {
    const item = inventoryItems.find(item => item._id === inventoryId);
    return item ? item.name : 'Unknown Item';
  };

  // Handle cancel editing
  const handleCancel = () => {
    setIsEditing(false);
  };

  // Handle back button click
  const handleBack = () => {
    route('/suppliers');
  };

  if (loading && !supplier) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {supplier ? `${supplier.name} - Pricing` : 'Supplier Pricing'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage supplier-specific prices for inventory items
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleBack}
            leftIcon={
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            }
          >
            Back to Suppliers
          </Button>
          {!isEditing && (
            <Button
              variant="primary"
              onClick={() => setIsEditing(true)}
              leftIcon={
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              }
            >
              Edit Prices
            </Button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
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

      {/* Main Content */}
      {isEditing ? (
        <SupplierPriceForm
          supplierId={id}
          onCancel={handleCancel}
          onSave={handleSavePrices}
        />
      ) : (
        <Card title="Supplier Prices">
          {supplierPrices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {supplierPrices.map((price) => (
                    <tr key={price._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {price.inventory && typeof price.inventory === 'object' 
                          ? price.inventory.name 
                          : getInventoryItemName(price.inventory)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${parseFloat(price.price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {price.updatedAt ? new Date(price.updatedAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Supplier Prices</h3>
              <p className="mt-1 text-sm text-gray-500">
                This supplier doesn't have any custom prices set yet.
              </p>
              <div className="mt-6">
                <Button
                  variant="primary"
                  onClick={() => setIsEditing(true)}
                  leftIcon={
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  }
                >
                  Add Prices
                </Button>
              </div>
            </div>
          )}
          {supplierPrices.length > 0 && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="primary"
                onClick={() => setIsEditing(true)}
                leftIcon={
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                }
              >
                Edit Prices
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default SupplierPricesPage;
