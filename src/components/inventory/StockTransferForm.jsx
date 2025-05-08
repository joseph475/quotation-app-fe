import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Card from '../common/Card';
import Button from '../common/Button';
import api from '../../services/api';

/**
 * StockTransferForm component for transferring stock between branches
 * 
 * @param {Object} props - Component props
 * @param {Array} props.inventoryItems - Available inventory items
 * @param {Function} props.onCancel - Cancel handler
 * @param {Function} props.onTransfer - Transfer handler
 */
const StockTransferForm = ({ inventoryItems, onCancel, onTransfer }) => {
  // State for branches
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    itemId: '',
    fromBranch: '',
    fromBranchId: '',
    toBranch: '',
    toBranchId: '',
    quantity: 1,
    notes: '',
  });

  // Form validation
  const [errors, setErrors] = useState({});
  
  // Filtered items based on selected branch
  const [availableItems, setAvailableItems] = useState([]);
  
  // Selected item details
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Fetch branches from API
  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const response = await api.branches.getAll();
        if (response && response.data && response.data.length > 0) {
          setBranches(response.data);
          
          // Set default values for fromBranch and toBranch
          if (response.data.length >= 2) {
            setFormData(prev => ({
              ...prev,
              fromBranch: response.data[0].name,
              fromBranchId: response.data[0]._id,
              toBranch: response.data[1].name,
              toBranchId: response.data[1]._id
            }));
          } else if (response.data.length === 1) {
            setFormData(prev => ({
              ...prev,
              fromBranch: response.data[0].name,
              fromBranchId: response.data[0]._id
            }));
          }
        }
      } catch (err) {
        console.error('Error fetching branches:', err);
      } finally {
        setLoadingBranches(false);
      }
    };
    
    fetchBranches();
  }, []);
  
  // Update available items when fromBranchId changes
  useEffect(() => {
    if (formData.fromBranchId) {
      console.log('fromBranchId changed to:', formData.fromBranchId);
      console.log('Filtering inventory items for branch:', formData.fromBranchId);
      console.log('Total inventory items:', inventoryItems.length);
      
    const items = inventoryItems.filter(item => {
      console.log('Checking item:', item._id, 'branch:', item.branch, 'quantity:', item.quantity);
      
      // Check if branch is an object (populated) or just an ID
      const branchId = item.branch && typeof item.branch === 'object' ? item.branch._id : item.branch;
      
      // Convert both to strings for comparison
      const matches = branchId && branchId.toString() === formData.fromBranchId.toString() && item.quantity > 0;
      
      console.log('Branch ID from item:', branchId);
      console.log('fromBranchId:', formData.fromBranchId);
      console.log('Item matches branch?', matches);
      
      return matches;
    });
      
      console.log('Available items for selected branch:', items.length);
      console.log('Available items:', items);
      
      setAvailableItems(items);
      
      // Reset selected item if it's not available in the new branch
      if (formData.itemId && !items.some(item => item._id.toString() === formData.itemId)) {
        console.log('Selected item not available in new branch, resetting selection');
        setFormData(prev => ({
          ...prev,
          itemId: '',
        }));
        setSelectedItem(null);
      }
    }
  }, [formData.fromBranchId, inventoryItems]);
  
  // Update selected item when itemId changes
  useEffect(() => {
    if (formData.itemId) {
      const item = inventoryItems.find(item => item._id.toString() === formData.itemId);
      setSelectedItem(item);
      
      // Reset quantity if it's more than available quantity
      if (item && formData.quantity > item.quantity) {
        setFormData(prev => ({
          ...prev,
          quantity: item.quantity,
        }));
      }
    } else {
      setSelectedItem(null);
    }
  }, [formData.itemId, inventoryItems]);
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for quantity
    if (name === 'quantity') {
      const quantityValue = parseInt(value, 10) || 0;
      const maxQuantity = selectedItem ? selectedItem.quantity : 0;
      
      setFormData(prev => ({
        ...prev,
        [name]: Math.min(Math.max(0, quantityValue), maxQuantity),
      }));
    } else if (name === 'fromBranch') {
      // Ensure toBranch is different from fromBranch
      const newFromBranch = value;
      const selectedBranch = branches.find(branch => branch.name === newFromBranch);
      const newFromBranchId = selectedBranch ? selectedBranch._id : '';
      
      let newToBranch = formData.toBranch;
      let newToBranchId = formData.toBranchId;
      
      if (formData.toBranch === newFromBranch) {
        // Find a different branch
        const otherBranch = branches.find(branch => branch.name !== newFromBranch);
        newToBranch = otherBranch ? otherBranch.name : '';
        newToBranchId = otherBranch ? otherBranch._id : '';
      }
      
      setFormData(prev => ({
        ...prev,
        fromBranch: newFromBranch,
        fromBranchId: newFromBranchId,
        toBranch: newToBranch,
        toBranchId: newToBranchId,
      }));
    } else if (name === 'toBranch') {
      // Ensure fromBranch is different from toBranch
      const newToBranch = value;
      const selectedBranch = branches.find(branch => branch.name === newToBranch);
      const newToBranchId = selectedBranch ? selectedBranch._id : '';
      
      let newFromBranch = formData.fromBranch;
      let newFromBranchId = formData.fromBranchId;
      
      if (formData.fromBranch === newToBranch) {
        // Find a different branch
        const otherBranch = branches.find(branch => branch.name !== newToBranch);
        newFromBranch = otherBranch ? otherBranch.name : '';
        newFromBranchId = otherBranch ? otherBranch._id : '';
      }
      
      setFormData(prev => ({
        ...prev,
        fromBranch: newFromBranch,
        fromBranchId: newFromBranchId,
        toBranch: newToBranch,
        toBranchId: newToBranchId,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    if (!formData.itemId) newErrors.itemId = 'Item is required';
    if (!formData.fromBranch) newErrors.fromBranch = 'Source branch is required';
    if (!formData.toBranch) newErrors.toBranch = 'Destination branch is required';
    if (formData.fromBranch === formData.toBranch) {
      newErrors.fromBranch = 'Source and destination branches must be different';
      newErrors.toBranch = 'Source and destination branches must be different';
    }
    if (formData.quantity <= 0) newErrors.quantity = 'Quantity must be greater than 0';
    if (selectedItem && formData.quantity > selectedItem.quantity) {
      newErrors.quantity = `Quantity cannot exceed available stock (${selectedItem.quantity})`;
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Generate transfer data
    const transferData = {
      itemId: formData.itemId,
      itemName: selectedItem ? selectedItem.name : '',
      itemSku: selectedItem ? selectedItem.itemCode : '',
      fromBranch: formData.fromBranch,
      fromBranchId: formData.fromBranchId,
      toBranch: formData.toBranch,
      toBranchId: formData.toBranchId,
      quantity: parseInt(formData.quantity),
      notes: formData.notes,
      transferDate: new Date().toISOString(),
    };
    
    // Log the transfer data for debugging
    console.log('Transfer data being sent:', transferData);
    console.log('Selected item details:', selectedItem);
    
    // Call the transfer handler
    onTransfer(transferData);
  };

  // Common input classes for consistency
  const inputClasses = "block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-2 px-3 sm:text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const errorClasses = "mt-2 text-sm text-red-600";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Transfer Details */}
      <Card title="Transfer Details">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* From Branch */}
          <div>
            <label htmlFor="fromBranch" className={labelClasses}>
              From Branch <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="fromBranch"
                name="fromBranch"
                value={formData.fromBranch}
                onChange={handleChange}
                className={`${inputClasses} appearance-none pr-10 ${errors.fromBranch ? 'border-red-300' : ''}`}
                required
                disabled={loadingBranches}
              >
                <option value="">Select source branch</option>
                {branches.map((branch) => (
                  <option key={branch._id} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                {loadingBranches ? (
                  <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
            {errors.fromBranch && (
              <p className={errorClasses}>{errors.fromBranch}</p>
            )}
          </div>

          {/* To Branch */}
          <div>
            <label htmlFor="toBranch" className={labelClasses}>
              To Branch <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="toBranch"
                name="toBranch"
                value={formData.toBranch}
                onChange={handleChange}
                className={`${inputClasses} appearance-none pr-10 ${errors.toBranch ? 'border-red-300' : ''}`}
                required
                disabled={loadingBranches}
              >
                <option value="">Select destination branch</option>
                {branches.map((branch) => (
                  <option key={branch._id} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                {loadingBranches ? (
                  <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
            {errors.toBranch && (
              <p className={errorClasses}>{errors.toBranch}</p>
            )}
          </div>

          {/* Item */}
          <div>
            <label htmlFor="itemId" className={labelClasses}>
              Item <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="itemId"
                name="itemId"
                value={formData.itemId}
                onChange={handleChange}
                className={`${inputClasses} appearance-none pr-10 ${errors.itemId ? 'border-red-300' : ''}`}
                required
              >
                <option value="">Select an item</option>
                {availableItems.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name} ({item.itemCode}) - Stock: {item.quantity}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            {errors.itemId && (
              <p className={errorClasses}>{errors.itemId}</p>
            )}
            {availableItems.length === 0 && (
              <p className="mt-2 text-sm text-yellow-600">
                No items with stock available in this branch
              </p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label htmlFor="quantity" className={labelClasses}>
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              min="1"
              max={selectedItem ? selectedItem.quantity : 1}
              step="1"
              value={formData.quantity}
              onChange={handleChange}
              className={`${inputClasses} ${errors.quantity ? 'border-red-300' : ''}`}
              required
              disabled={!selectedItem}
            />
            {errors.quantity && (
              <p className={errorClasses}>{errors.quantity}</p>
            )}
            {selectedItem && (
              <p className="mt-2 text-xs text-gray-500">
                Available: {selectedItem.quantity}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Additional Information */}
      <Card title="Additional Information">
        <div>
          <label htmlFor="notes" className={labelClasses}>
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows="3"
            value={formData.notes}
            onChange={handleChange}
            className={inputClasses}
            placeholder="Add any additional notes about this transfer"
          />
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
          disabled={!selectedItem || formData.quantity <= 0}
        >
          <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Transfer Stock
        </Button>
      </div>
    </form>
  );
};

export default StockTransferForm;
