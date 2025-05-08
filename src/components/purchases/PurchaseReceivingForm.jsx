import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Card from '../common/Card';
import Button from '../common/Button';
import api from '../../services/api';

/**
 * PurchaseReceivingForm component for receiving items from purchase orders
 * 
 * @param {Object} props - Component props
 * @param {Object} [props.initialData] - Initial purchase order data for receiving
 * @param {Function} props.onCancel - Cancel handler
 * @param {Function} props.onSave - Save handler
 */
const PurchaseReceivingForm = ({ initialData, onCancel, onSave }) => {
  // State for purchase orders
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch purchase orders
  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      setLoading(true);
      try {
        const response = await api.purchaseOrders.getAll();
        // Filter only approved purchase orders that can be received
        const approvedPOs = (response.data || []).filter(po => 
          po.status === 'Approved' || po.status === 'Partial'
        );
        setPurchaseOrders(approvedPOs);
        setError(null);
      } catch (err) {
        console.error('Error fetching purchase orders:', err);
        setError('Failed to load purchase orders');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPurchaseOrders();
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    purchaseOrderId: '',
    supplier: '',
    receivingDate: new Date().toISOString().split('T')[0], // Today's date
    notes: '',
    items: [],
  });

  // Selected purchase order
  const [selectedPO, setSelectedPO] = useState(null);

  // Form validation
  const [errors, setErrors] = useState({});

  // Search state
  const [poSearch, setPoSearch] = useState('');
  const [filteredPOs, setFilteredPOs] = useState([]);
  const [showPOResults, setShowPOResults] = useState(false);

  // Initialize form with data if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        receivingDate: initialData.receivingDate || new Date().toISOString().split('T')[0],
      });
      
      // Find the corresponding purchase order
      const po = purchaseOrders.find(po => po.id === initialData.purchaseOrderId);
      if (po) {
        setSelectedPO(po);
      }
    }
  }, [initialData]);

  // Filter purchase orders based on search term
  useEffect(() => {
    if (poSearch) {
      const filtered = purchaseOrders.filter(po => {
        // Handle supplier which might be an object or string
        const supplierName = typeof po.supplier === 'string' 
          ? po.supplier 
          : (po.supplier?.name || '');
          
        return (po.id?.toLowerCase() || '').includes(poSearch.toLowerCase()) ||
               supplierName.toLowerCase().includes(poSearch.toLowerCase());
      });
      setFilteredPOs(filtered);
    } else {
      setFilteredPOs([]);
      setShowPOResults(false);
    }
  }, [poSearch]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close PO search results if clicked outside
      if (showPOResults && !event.target.closest('#poSearchContainer')) {
        setShowPOResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPOResults]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Handle purchase order selection from search results
  const handlePOSelect = async (po) => {
    try {
      setLoading(true);
      // Get detailed purchase order data
      const response = await api.purchaseOrders.getById(po._id);
      const detailedPO = response.data;
      
      if (!detailedPO) {
        throw new Error('Failed to fetch purchase order details');
      }
      
      setSelectedPO(detailedPO);
      setFormData(prev => ({
        ...prev,
        purchaseOrderId: detailedPO._id,
        supplier: detailedPO.supplier.name, // Assuming supplier is populated
        items: detailedPO.items.map(item => ({
          ...item,
          receivedQuantity: 0,
          notes: ''
        }))
      }));
      
      setPoSearch('');
      setShowPOResults(false);
      
      // Clear PO error if it exists
      if (errors.purchaseOrderId) {
        setErrors(prev => ({
          ...prev,
          purchaseOrderId: ''
        }));
      }
    } catch (err) {
      console.error('Error fetching purchase order details:', err);
      setError('Failed to load purchase order details');
    } finally {
      setLoading(false);
    }
  };

  // Handle received quantity change
  const handleQuantityChange = (itemId, value) => {
    const quantity = parseInt(value, 10) || 0;
    
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId 
          ? { ...item, receivedQuantity: quantity } 
          : item
      )
    }));
  };

  // Handle item notes change
  const handleItemNotesChange = (itemId, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId 
          ? { ...item, notes: value } 
          : item
      )
    }));
  };

  // Calculate total received items
  const totalReceivedItems = formData.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    if (!formData.purchaseOrderId) newErrors.purchaseOrderId = 'Purchase order is required';
    if (!formData.receivingDate) newErrors.receivingDate = 'Receiving date is required';
    if (formData.items.length === 0) newErrors.items = 'No items to receive';
    if (totalReceivedItems === 0) newErrors.items = 'At least one item must be received';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      setLoading(true);
      
      // Prepare data for API
      const receivingData = {
        purchaseOrder: formData.purchaseOrderId,
        receivingDate: formData.receivingDate,
        notes: formData.notes,
        items: formData.items
          .filter(item => item.receivedQuantity > 0) // Only include items being received
          .map(item => ({
            purchaseOrderItem: item._id,
            inventory: item.inventory,
            name: item.name,
            quantityOrdered: item.quantity,
            quantityReceived: item.receivedQuantity,
            previouslyReceived: item.received || 0,
            notes: item.notes
          }))
      };
      
      let response;
      if (initialData && initialData.id) {
        // Update existing receiving
        response = await api.purchaseReceiving.update(initialData.id, receivingData);
      } else {
        // Create new receiving
        response = await api.purchaseReceiving.create(receivingData);
      }
      
      if (response && response.success) {
        // Call the save handler with the response data
        onSave(response.data);
      } else {
        throw new Error('Failed to save purchase receiving');
      }
    } catch (err) {
      console.error('Error saving purchase receiving:', err);
      setError('Failed to save purchase receiving');
    } finally {
      setLoading(false);
    }
  };

  // Common input classes for consistency
  const inputClasses = "block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-2 px-3 sm:text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const errorClasses = "mt-2 text-sm text-red-600";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card title="Receiving Information">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Purchase Order Search */}
          <div id="poSearchContainer" className="relative">
            <label htmlFor="poSearch" className={labelClasses}>
              Purchase Order <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                id="poSearch"
                placeholder="Search for purchase order..."
                value={poSearch}
                onChange={(e) => setPoSearch(e.target.value)}
                onFocus={() => setShowPOResults(true)}
                onClick={() => setShowPOResults(true)}
                className={`${inputClasses} ${errors.purchaseOrderId ? 'border-red-300' : ''} pl-10`}
                disabled={!!initialData} // Disable if editing an existing receiving
              />
              {formData.purchaseOrderId && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                    {formData.purchaseOrderId}
                  </span>
                </div>
              )}
            </div>
            
            {/* Search Results */}
            {showPOResults && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                {filteredPOs.length > 0 ? (
                  <ul className="py-1">
                    {filteredPOs.map(po => (
                      <li 
                        key={po.id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handlePOSelect(po)}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">{po.id}</span>
                          <span className="text-gray-500">
                            {typeof po.supplier === 'string' 
                              ? po.supplier 
                              : (po.supplier?.name || 'Unknown Supplier')}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Expected: {po.expectedDeliveryDate} | Status: {po.status}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    {poSearch ? 'No purchase orders found.' : 'Type to search purchase orders'}
                  </div>
                )}
              </div>
            )}
            
            {errors.purchaseOrderId && (
              <p className={errorClasses}>{errors.purchaseOrderId}</p>
            )}
          </div>

          {/* Supplier (read-only) */}
          <div>
            <label htmlFor="supplier" className={labelClasses}>
              Supplier
            </label>
            <input
              type="text"
              id="supplier"
              name="supplier"
              value={formData.supplier}
              className={`${inputClasses} bg-gray-50`}
              disabled
            />
          </div>

          {/* Receiving Date */}
          <div>
            <label htmlFor="receivingDate" className={labelClasses}>
              Receiving Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="receivingDate"
              name="receivingDate"
              value={formData.receivingDate}
              onChange={handleChange}
              className={`${inputClasses} ${errors.receivingDate ? 'border-red-300' : ''}`}
              required
            />
            {errors.receivingDate && (
              <p className={errorClasses}>{errors.receivingDate}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Items */}
      <Card title="Receive Items">
        {selectedPO ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ordered
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Previously Received
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Receive Now
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.items.map((item) => {
                    const remaining = item.quantity - item.received;
                    return (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.received}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            max={remaining}
                            value={item.receivedQuantity || 0}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            className="w-20 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-1 px-2 sm:text-sm"
                          />
                          <span className="ml-2 text-xs text-gray-500">
                            (Max: {remaining})
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={item.notes || ''}
                            onChange={(e) => handleItemNotesChange(item.id, e.target.value)}
                            placeholder="Optional notes"
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-1 px-2 sm:text-sm"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {errors.items && (
              <p className="p-4 text-sm text-red-600">{errors.items}</p>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 p-6 text-center rounded-lg border border-gray-200">
            <svg className="h-12 w-12 text-gray-300 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-500">Select a purchase order to receive items</p>
          </div>
        )}
      </Card>

      {/* Notes */}
      <Card title="Additional Information">
        <div>
          <label htmlFor="notes" className={labelClasses}>
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows="4"
            value={formData.notes}
            onChange={handleChange}
            className={inputClasses}
            placeholder="Add any additional notes about this receiving"
          ></textarea>
        </div>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 mt-8">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          size="lg"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={!selectedPO || totalReceivedItems === 0}
        >
          <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Confirm Receipt
        </Button>
      </div>
    </form>
  );
};

export default PurchaseReceivingForm;
