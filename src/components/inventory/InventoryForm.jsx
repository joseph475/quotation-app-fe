import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Card from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';

/**
 * InventoryForm component for creating and editing inventory items
 * 
 * @param {Object} props - Component props
 * @param {Object} [props.initialData] - Initial inventory data for editing
 * @param {Function} props.onCancel - Cancel handler
 * @param {Function} props.onSave - Save handler
 */
const InventoryForm = ({ initialData, onCancel, onSave }) => {
  // Get user data from auth context
  const { user } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    unit: 'pcs', // Default unit
    cost: 0,
    price: 0,
  });

  // Form validation
  const [errors, setErrors] = useState({});

  // Initialize form with data if editing
  useEffect(() => {
    if (initialData) {
      // Make sure we preserve the MongoDB _id field when editing
      setFormData({
        barcode: initialData.barcode || '',
        name: initialData.name || '',
        unit: initialData.unit || 'pcs',
        cost: initialData.cost || 0,
        price: initialData.price || 0,
      });
    }
  }, [initialData]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Convert numeric values
    if (name === 'cost' || name === 'price') {
      const numericValue = parseFloat(value) || 0;
      setFormData(prev => ({
        ...prev,
        [name]: numericValue,
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
    if (!formData.barcode) newErrors.barcode = 'Barcode is required';
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.unit) newErrors.unit = 'Unit is required';
    if (formData.cost < 0) newErrors.cost = 'Cost cannot be negative';
    if (formData.price < 0) newErrors.price = 'Price cannot be negative';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Handle ID fields properly
    // For new items: remove any id/ID fields to let MongoDB generate them
    // For existing items: preserve the MongoDB _id field
    const { id, ID, ...dataWithoutClientIds } = formData;
    
    const inventoryData = initialData
      ? { ...dataWithoutClientIds, _id: initialData._id }
      : { ...dataWithoutClientIds };
    
    // Call the save handler
    onSave(inventoryData);
  };

  // Common input classes for consistency
  const inputClasses = "block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-2 px-3 sm:text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const errorClasses = "mt-2 text-sm text-red-600";

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div>
          {/* Basic Information */}
          <Card title="Item Information">
            <div className="grid grid-cols-1 gap-4">
              {/* Item Code - Display only (auto-increment) */}
              {initialData && (
                <div>
                  <label className={labelClasses}>
                    Item Code
                  </label>
                  <div className="bg-gray-50 border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-700">
                    {initialData.itemcode}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Auto-generated item code
                  </p>
                </div>
              )}

              {/* Barcode */}
              <div>
                <label htmlFor="barcode" className={labelClasses}>
                  Barcode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="barcode"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleChange}
                  className={`${inputClasses} ${errors.barcode ? 'border-red-300' : ''}`}
                  placeholder="Enter barcode"
                  required
                />
                {errors.barcode && (
                  <p className={errorClasses}>{errors.barcode}</p>
                )}
              </div>

              {/* Name */}
              <div>
                <label htmlFor="name" className={labelClasses}>
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`${inputClasses} ${errors.name ? 'border-red-300' : ''}`}
                  placeholder="Enter item name"
                  required
                />
                {errors.name && (
                  <p className={errorClasses}>{errors.name}</p>
                )}
              </div>

              {/* Unit */}
              <div>
                <label htmlFor="unit" className={labelClasses}>
                  Unit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="unit"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  className={`${inputClasses} ${errors.unit ? 'border-red-300' : ''}`}
                  placeholder="e.g., pcs, kg, liter"
                  required
                />
                {errors.unit && (
                  <p className={errorClasses}>{errors.unit}</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div>
          {/* Pricing Information */}
          <Card title="Pricing Information">
            <div className="grid grid-cols-1 gap-4">
              {/* Cost */}
              <div>
                <label htmlFor="cost" className={labelClasses}>
                  Cost <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="number"
                    id="cost"
                    name="cost"
                    min="0"
                    step="0.01"
                    value={formData.cost}
                    onChange={handleChange}
                    className={`${inputClasses} ${errors.cost ? 'border-red-300' : ''} pl-7`}
                    required
                  />
                </div>
                {errors.cost && (
                  <p className={errorClasses}>{errors.cost}</p>
                )}
              </div>

              {/* Price */}
              <div>
                <label htmlFor="price" className={labelClasses}>
                  Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleChange}
                    className={`${inputClasses} ${errors.price ? 'border-red-300' : ''} pl-7`}
                    required
                  />
                </div>
                {errors.price && (
                  <p className={errorClasses}>{errors.price}</p>
                )}
              </div>

              {/* Profit Margin Display */}
              {formData.cost > 0 && formData.price > 0 && (
                <div>
                  <label className={labelClasses}>
                    Profit Margin
                  </label>
                  <div className="bg-gray-50 border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-700">
                    ${(formData.price - formData.cost).toFixed(2)} ({(((formData.price - formData.cost) / formData.cost) * 100).toFixed(1)}%)
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

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
        >
          <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Save Item
        </Button>
      </div>
    </form>
  );
};

export default InventoryForm;
