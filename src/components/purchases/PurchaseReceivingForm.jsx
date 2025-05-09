import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import Card from '../common/Card';
import Button from '../common/Button';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';

/**
 * PurchaseReceivingForm component for receiving items from purchase orders
 * 
 * @param {Object} props - Component props
 * @param {Object} [props.initialData] - Initial purchase order data for receiving
 * @param {Function} props.onCancel - Cancel handler
 * @param {Function} props.onSave - Save handler
 */
const PurchaseReceivingForm = ({ initialData, onCancel, onSave }) => {
  const { user } = useAuth();
  // Force isAdmin to false unless explicitly set to 'admin'
  const isAdmin = user && user.role === 'admin';
  
  console.log('Form - User object:', user);
  console.log('Form - Is admin:', isAdmin);
  console.log('Form - User role:', user?.role);
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
  const [showAvailablePOs, setShowAvailablePOs] = useState(true);

  // Initialize form with data if editing
  useEffect(() => {
    if (initialData) {
      console.log("Initial data received:", initialData);
      
      // Format the receiving date if it exists
      const formattedDate = initialData.receivingDate 
        ? new Date(initialData.receivingDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      // Handle supplier which might be an object or string
      const supplierName = typeof initialData.supplier === 'string' 
        ? initialData.supplier 
        : (initialData.supplier?.name || 'Unknown Supplier');
      
      setFormData({
        ...initialData,
        purchaseOrderId: initialData.purchaseOrder?._id || initialData.purchaseOrder,
        receivingDate: formattedDate,
        supplier: supplierName,
      });
      
      // Set the selected PO directly from initialData if it contains the full PO object
      if (initialData.purchaseOrder && typeof initialData.purchaseOrder === 'object') {
        setSelectedPO(initialData.purchaseOrder);
        setShowAvailablePOs(false);
      } else if (initialData.purchaseOrder) {
        // If we only have the PO ID, fetch the full PO data
        const fetchPODetails = async () => {
          try {
            setLoading(true);
            const response = await api.purchaseOrders.getById(initialData.purchaseOrder);
            if (response && response.data) {
              setSelectedPO(response.data);
              setShowAvailablePOs(false);
            }
          } catch (err) {
            console.error('Error fetching purchase order details:', err);
            setError('Failed to load purchase order details');
          } finally {
            setLoading(false);
          }
        };
        
        fetchPODetails();
      }
      
      // If we have items in the initialData, make sure to map them correctly
      if (initialData.items && Array.isArray(initialData.items)) {
        // Map the items to include the correct receivedQuantity field
        const mappedItems = initialData.items.map(item => ({
          ...item,
          // Use quantityReceived from the item as the receivedQuantity in our form
          receivedQuantity: item.quantityReceived || 0,
          // Make sure we have the _id field for each item
          _id: item.purchaseOrderItem || item._id
        }));
        
        setFormData(prev => ({
          ...prev,
          items: mappedItems
        }));
      }
    }
  }, [initialData]);

  // Set filtered POs when purchase orders are loaded or search term changes
  useEffect(() => {
    if (purchaseOrders.length > 0) {
      if (poSearch) {
        const filtered = purchaseOrders.filter(po => {
          // Handle supplier which might be an object or string
          const supplierName = typeof po.supplier === 'string' 
            ? po.supplier 
            : (po.supplier?.name || '');
            
          return (po.id?.toLowerCase() || '').includes(poSearch.toLowerCase()) ||
                 (po.orderNumber?.toLowerCase() || '').includes(poSearch.toLowerCase()) ||
                 supplierName.toLowerCase().includes(poSearch.toLowerCase());
        });
        setFilteredPOs(filtered);
      } else {
        // Show all approved POs by default
        setFilteredPOs(purchaseOrders);
      }
    }
  }, [purchaseOrders, poSearch]);

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

  // Handle purchase order selection
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
      
      // Hide the available POs section after selection
      setShowAvailablePOs(false);
      
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
  
  // Clear selected purchase order
  const clearSelectedPO = () => {
    setSelectedPO(null);
    setFormData(prev => ({
      ...prev,
      purchaseOrderId: '',
      supplier: '',
      items: []
    }));
    setShowAvailablePOs(true);
  };

  // Handle received quantity change
  const handleQuantityChange = (itemId, value) => {
    const quantity = parseInt(value, 10) || 0;
    
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item._id === itemId 
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
        item._id === itemId 
          ? { ...item, notes: value } 
          : item
      )
    }));
  };

  // Calculate total received items
  const totalReceivedItems = formData.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);

  // Track submission state to prevent double submissions
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Use a ref to track if the form has been submitted
  const hasSubmittedRef = useRef(false);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Form submission attempt - Loading:', loading, 'IsSubmitting:', isSubmitting, 'HasSubmitted:', hasSubmittedRef.current);
    
    // Prevent double submission using multiple checks
    if (loading || isSubmitting || hasSubmittedRef.current) {
      console.log('Preventing duplicate submission');
      return;
    }
    
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
      // Set flags to prevent double submission
      setLoading(true);
      setIsSubmitting(true);
      hasSubmittedRef.current = true;
      setError(null);
      
      console.log('Form submission proceeding - preparing data');
      
      // Prepare data for parent component
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

      // If we're editing an existing record, include the _id to ensure we update rather than create
      if (initialData && initialData._id) {
        receivingData._id = initialData._id;
      }
      
      console.log('Form validation passed, calling parent onSave with data');
      
      // Pass the data to the parent component to handle the API call
      // This prevents duplicate API calls
      onSave(receivingData);
    } catch (err) {
      console.error('Error saving purchase receiving:', err);
      setError('Failed to save purchase receiving: ' + (err.message || 'Unknown error'));
      // Reset submission flags on error to allow retry
      setIsSubmitting(false);
      hasSubmittedRef.current = false;
    } finally {
      setLoading(false);
      // Note: We don't reset isSubmitting here to prevent further submissions
      // It will be reset when the component unmounts or when a new form is opened
    }
  };

  // Common input classes for consistency
  const inputClasses = "block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-2 px-3 sm:text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const errorClasses = "mt-2 text-sm text-red-600";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      {/* Purchase Order Selection */}
      <Card title="Select Purchase Order">
        {selectedPO ? (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Selected Purchase Order</h3>
                <p className="text-sm text-gray-500">Review the details below</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={clearSelectedPO}
                size="sm"
              >
                Change Selection
              </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-gray-500">PO Number</p>
                <p className="mt-1 text-sm text-gray-900">{selectedPO.orderNumber || selectedPO._id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Supplier</p>
                <p className="mt-1 text-sm text-gray-900">
                  {typeof selectedPO.supplier === 'string' 
                    ? selectedPO.supplier 
                    : (selectedPO.supplier?.name || 'Unknown Supplier')}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Expected Delivery</p>
                <p className="mt-1 text-sm text-gray-900">{selectedPO.expectedDeliveryDate}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="mt-1 text-sm text-gray-900">{selectedPO.status}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Items</p>
                <p className="mt-1 text-sm text-gray-900">{selectedPO.items?.length || 0} items</p>
              </div>
            </div>
          </div>
        ) : showAvailablePOs ? (
          <div>
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by PO number or supplier..."
                  value={poSearch}
                  onChange={(e) => setPoSearch(e.target.value)}
                  className={`${inputClasses} pl-10`}
                  disabled={!!initialData} // Disable if editing an existing receiving
                />
              </div>
            </div>
            
            {/* Available Purchase Orders Table */}
            {loading ? (
              <div className="text-center py-4">
                <p className="text-gray-500">Loading purchase orders...</p>
              </div>
            ) : filteredPOs.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PO Number
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expected Delivery
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Items
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPOs.map(po => (
                        <tr key={po._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                            {po.orderNumber || po._id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {typeof po.supplier === 'string' 
                              ? po.supplier 
                              : (po.supplier?.name || 'Unknown Supplier')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {po.expectedDeliveryDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${po.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                                po.status === 'Partial' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-gray-100 text-gray-800'}`}>
                              {po.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {po.items?.length || 0} items
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              type="button"
                              onClick={() => handlePOSelect(po)}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-6 text-center rounded-lg border border-gray-200">
                <svg className="h-12 w-12 text-gray-300 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500">No approved purchase orders found</p>
                <p className="text-sm text-gray-400 mt-1">Purchase orders must be approved before they can be received</p>
              </div>
            )}
            
            {errors.purchaseOrderId && (
              <p className={errorClasses + " mt-2"}>{errors.purchaseOrderId}</p>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 p-6 text-center rounded-lg border border-gray-200">
            <p className="text-gray-500">Please select a purchase order to continue</p>
            <button
              type="button"
              onClick={() => setShowAvailablePOs(true)}
              className="mt-2 text-primary-600 hover:text-primary-900 text-sm font-medium"
            >
              Show available purchase orders
            </button>
          </div>
        )}
      </Card>

      {/* Receiving Information */}
      {selectedPO && (
        <Card title="Receiving Information">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

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
      )}

      {/* Items */}
      {selectedPO && (
        <Card title="Receive Items">
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
                    // Calculate remaining quantity, ensuring we have valid numbers
                    const received = typeof item.receivedQuantity === 'number' ? item.receivedQuantity : 0;
                    const previouslyReceived = typeof item.received === 'number' ? item.received : 0;
                    const ordered = typeof item.quantity === 'number' ? item.quantity : 0;
                    const remaining = ordered - previouslyReceived;
                    return (
                      <tr key={item._id}>
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
                            value={item.receivedQuantity || 0}
                            onChange={(e) => handleQuantityChange(item._id, e.target.value)}
                            className="w-20 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-1 px-2 sm:text-sm"
                          />
                          <span className="ml-2 text-xs text-gray-500">
                            (Remaining: {remaining})
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={item.notes || ''}
                            onChange={(e) => handleItemNotesChange(item._id, e.target.value)}
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
        </Card>
      )}
      
      {!selectedPO && (
        <Card title="Receive Items">
          <div className="bg-gray-50 p-6 text-center rounded-lg border border-gray-200">
            <svg className="h-12 w-12 text-gray-300 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-500">Select a purchase order to receive items</p>
          </div>
        </Card>
      )}

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
          disabled={!selectedPO || totalReceivedItems === 0 || isSubmitting}
        >
          <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {initialData ? "Save Changes" : "Confirm Receipt"}
        </Button>
      </div>
    </form>
  );
};

export default PurchaseReceivingForm;
