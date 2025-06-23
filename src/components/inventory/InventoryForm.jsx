import { h } from 'preact';
import { useState, useRef } from 'preact/hooks';
import Card from '../common/Card';
import Button from '../common/Button';

/**
 * InventoryForm component for creating and editing inventory items
 * Completely isolated to prevent external re-renders from affecting form state
 */
const InventoryForm = ({ initialData, onCancel, onSave, isLoading = false }) => {
  // Initialize form data immediately without useEffect
  const getInitialFormData = () => {
    if (initialData) {
      return {
        barcode: initialData.barcode || '',
        name: initialData.name || '',
        unit: initialData.unit || 'pcs',
        cost: initialData.cost || 0,
        price: initialData.price || 0,
      };
    }
    return {
      barcode: '',
      name: '',
      unit: 'pcs',
      cost: 0,
      price: 0,
    };
  };

  // Form state - initialized immediately, no useEffect
  const [formData, setFormData] = useState(getInitialFormData);
  const [errors, setErrors] = useState({});
  
  // Prevent any external interference
  const formRef = useRef(null);

  // Handle form field changes - direct DOM manipulation to ensure stability
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev };
      
      // Convert numeric values
      if (name === 'cost' || name === 'price') {
        newData[name] = parseFloat(value) || 0;
      } else {
        newData[name] = value;
      }
      
      return newData;
    });
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
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
    
    // Prepare data for save
    const { id, ID, itemcode, ...dataWithoutClientIds } = formData;
    
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
    <div ref={formRef}>
      <form onSubmit={handleSubmit}>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div>
            {/* Basic Information */}
            <Card title="Item Information">
              <div class="grid grid-cols-1 gap-4">
                {/* Item Code - Display only (auto-increment) */}
                {initialData && (
                  <div>
                    <label class={labelClasses}>
                      Item Code
                    </label>
                    <div class="bg-gray-50 border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-700">
                      {initialData.itemcode}
                    </div>
                    <p class="mt-1 text-xs text-gray-500">
                      Auto-generated item code
                    </p>
                  </div>
                )}

                {/* Barcode */}
                <div>
                  <label for="barcode" class={labelClasses}>
                    Barcode <span class="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="barcode"
                    name="barcode"
                    value={formData.barcode}
                    onInput={handleChange}
                    class={`${inputClasses} ${errors.barcode ? 'border-red-300' : ''}`}
                    placeholder="Enter barcode"
                    required
                  />
                  {errors.barcode && (
                    <p class={errorClasses}>{errors.barcode}</p>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label for="name" class={labelClasses}>
                    Item Name <span class="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onInput={handleChange}
                    class={`${inputClasses} ${errors.name ? 'border-red-300' : ''}`}
                    placeholder="Enter item name"
                    required
                  />
                  {errors.name && (
                    <p class={errorClasses}>{errors.name}</p>
                  )}
                </div>

                {/* Unit */}
                <div>
                  <label for="unit" class={labelClasses}>
                    Unit <span class="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="unit"
                    name="unit"
                    value={formData.unit}
                    onInput={handleChange}
                    class={`${inputClasses} ${errors.unit ? 'border-red-300' : ''}`}
                    placeholder="e.g., pcs, kg, liter"
                    required
                  />
                  {errors.unit && (
                    <p class={errorClasses}>{errors.unit}</p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column */}
          <div>
            {/* Pricing Information */}
            <Card title="Pricing Information">
              <div class="grid grid-cols-1 gap-4">
                {/* Cost */}
                <div>
                  <label for="cost" class={labelClasses}>
                    Cost <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span class="text-gray-500">$</span>
                    </div>
                    <input
                      type="number"
                      id="cost"
                      name="cost"
                      min="0"
                      step="0.01"
                      value={formData.cost}
                      onInput={handleChange}
                      class={`${inputClasses} ${errors.cost ? 'border-red-300' : ''} pl-7`}
                      required
                    />
                  </div>
                  {errors.cost && (
                    <p class={errorClasses}>{errors.cost}</p>
                  )}
                </div>

                {/* Price */}
                <div>
                  <label for="price" class={labelClasses}>
                    Price <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span class="text-gray-500">$</span>
                    </div>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onInput={handleChange}
                      class={`${inputClasses} ${errors.price ? 'border-red-300' : ''} pl-7`}
                      required
                    />
                  </div>
                  {errors.price && (
                    <p class={errorClasses}>{errors.price}</p>
                  )}
                </div>

                {/* Profit Margin Display */}
                {formData.cost > 0 && formData.price > 0 && (
                  <div>
                    <label class={labelClasses}>
                      Profit Margin
                    </label>
                    <div class="bg-gray-50 border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-700">
                      ${(formData.price - formData.cost).toFixed(2)} ({(((formData.price - formData.cost) / formData.cost) * 100).toFixed(1)}%)
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Form Actions */}
        <div class="flex justify-end space-x-4 mt-8">
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
            isLoading={isLoading}
            disabled={isLoading}
            leftIcon={!isLoading && (
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            )}
          >
            {isLoading ? 'Saving...' : 'Save Item'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default InventoryForm;
