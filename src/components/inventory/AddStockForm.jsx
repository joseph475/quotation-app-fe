import { h } from 'preact';
import { useState } from 'preact/hooks';
import Button from '../common/Button';
import Input from '../common/Input';

/**
 * AddStockForm component for adding stock to existing inventory items
 * 
 * @param {Object} props - Component props
 * @param {Object} props.item - The inventory item to add stock to
 * @param {Function} props.onCancel - Cancel handler
 * @param {Function} props.onSave - Save handler
 */
const AddStockForm = ({ item, onCancel, onSave }) => {
  // Form state
  const [formData, setFormData] = useState({
    quantityToAdd: 0,
    newCostPrice: item.costPrice || 0,
    reason: '',
  });

  // Form validation
  const [errors, setErrors] = useState({});

  // Use latest cost price approach
  const calculateNewCostPrice = () => {
    const newCostPrice = parseFloat(formData.newCostPrice) || 0;
    return newCostPrice; // Simply use the latest cost price
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'quantityToAdd') {
      const quantityValue = parseInt(value, 10) || 0;
      setFormData(prev => ({
        ...prev,
        [name]: quantityValue,
      }));
    } else if (name === 'newCostPrice') {
      const priceValue = parseFloat(value) || 0;
      setFormData(prev => ({
        ...prev,
        [name]: priceValue,
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
    if (!formData.quantityToAdd || formData.quantityToAdd <= 0) {
      newErrors.quantityToAdd = 'Quantity to add must be greater than 0';
    }
    if (formData.newCostPrice < 0) {
      newErrors.newCostPrice = 'Cost price cannot be negative';
    }
    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason for stock adjustment is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Calculate new values
    const newQuantity = (item.quantity || 0) + parseInt(formData.quantityToAdd, 10);
    const newWeightedCostPrice = calculateNewCostPrice();

    // Prepare stock adjustment data
    const stockAdjustment = {
      itemId: item._id,
      quantityAdded: parseInt(formData.quantityToAdd, 10),
      newCostPrice: parseFloat(formData.newCostPrice),
      previousCostPrice: item.costPrice || 0,
      newWeightedCostPrice: newWeightedCostPrice,
      newTotalQuantity: newQuantity,
      reason: formData.reason.trim(),
      adjustmentType: 'stock_addition',
      timestamp: new Date().toISOString(),
    };
    
    // Call the save handler
    onSave(stockAdjustment);
  };

  // Common input classes for consistency
  const inputClasses = "block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-2 px-3 sm:text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const errorClasses = "mt-2 text-sm text-red-600";

  const newWeightedCost = calculateNewCostPrice();
  const newTotalQuantity = (item.quantity || 0) + (parseInt(formData.quantityToAdd, 10) || 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Item Information Display */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Current Item Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Item:</span>
            <span className="ml-2 text-gray-900">{item.name}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Current Stock:</span>
            <span className="ml-2 text-gray-900">{item.quantity || 0} {item.unit}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Current Cost Price:</span>
            <span className="ml-2 text-gray-900">${(item.costPrice || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Stock Addition Form */}
      <div className="space-y-4">
        {/* Quantity to Add */}
        <div>
          <label htmlFor="quantityToAdd" className={labelClasses}>
            Quantity to Add <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              id="quantityToAdd"
              name="quantityToAdd"
              min="1"
              step="1"
              value={formData.quantityToAdd}
              onChange={handleChange}
              className={`${inputClasses} ${errors.quantityToAdd ? 'border-red-300' : ''}`}
              placeholder="Enter quantity to add"
              required
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500 text-sm">{item.unit}</span>
            </div>
          </div>
          {errors.quantityToAdd && (
            <p className={errorClasses}>{errors.quantityToAdd}</p>
          )}
        </div>

        {/* New Cost Price */}
        <div>
          <label htmlFor="newCostPrice" className={labelClasses}>
            Cost Price for New Stock <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500">$</span>
            </div>
            <input
              type="number"
              id="newCostPrice"
              name="newCostPrice"
              min="0"
              step="0.01"
              value={formData.newCostPrice}
              onChange={handleChange}
              className={`${inputClasses} ${errors.newCostPrice ? 'border-red-300' : ''} pl-7`}
              required
            />
          </div>
          {errors.newCostPrice && (
            <p className={errorClasses}>{errors.newCostPrice}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Enter the cost price for the new stock being added
          </p>
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="reason" className={labelClasses}>
            Reason for Stock Addition <span className="text-red-500">*</span>
          </label>
          <textarea
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            rows="3"
            className={`${inputClasses} ${errors.reason ? 'border-red-300' : ''}`}
            placeholder="e.g., New purchase order, stock replenishment, etc."
            required
          />
          {errors.reason && (
            <p className={errorClasses}>{errors.reason}</p>
          )}
        </div>
      </div>

      {/* Calculation Preview */}
      {formData.quantityToAdd > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-md font-medium text-blue-900 mb-2">After Stock Addition:</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-700">New Total Quantity:</span>
              <span className="ml-2 text-blue-900">{newTotalQuantity} {item.unit}</span>
            </div>
            <div>
              <span className="font-medium text-blue-700">New Cost Price:</span>
              <span className="ml-2 text-blue-900">${newWeightedCost.toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-blue-600">
            <strong>Cost Method:</strong> 
            <span>
              Using "Latest Cost" approach - All inventory will be valued at ${formData.newCostPrice.toFixed(2)} per {item.unit}
            </span>
            {item.costPrice !== formData.newCostPrice && (
              <div className="mt-1">
                <span className="text-orange-600">
                  Previous cost: ${(item.costPrice || 0).toFixed(2)} → New cost: ${formData.newCostPrice.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-4">
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
        >
          <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Stock
        </Button>
      </div>
    </form>
  );
};

export default AddStockForm;
