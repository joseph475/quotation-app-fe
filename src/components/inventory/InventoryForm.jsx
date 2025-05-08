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
  
  // Available categories
  const categories = ['Widgets', 'Components', 'Parts', 'Tools'];
  
  // Available status options
  const statusOptions = ['In Stock', 'Low Stock', 'Out of Stock'];
  
  // State for branches
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    itemCode: '',
    brand: '',
    model: '',
    category: 'Widgets', // Default category
    color: '',
    description: '',
    quantity: 0,
    unit: 'pcs', // Default unit
    costPrice: 0, // Purchase/cost price
    sellingPrice: 0, // Selling price
    discount: 0, // Discount percentage
    status: 'In Stock', // Default status
    branch: '', // Will be automatically populated from user's branch
    reorderLevel: 10, // Default reorder level
  });

  // Form validation
  const [errors, setErrors] = useState({});

  // Initialize form with data if editing and fetch branches
  useEffect(() => {
    if (initialData) {
      // Make sure we preserve the MongoDB _id field when editing
      setFormData({
        ...initialData,
      });
    } else {
      // Generate a new item code for new items
      generateItemCode();
      
      // If user has a branch and role is 'user', pre-select their branch
      if (user && user.role === 'user' && user.branch) {
        setFormData(prev => ({
          ...prev,
          branch: user.branch
        }));
      }
    }
    
  // Fetch branches from API
  const fetchBranches = async () => {
    setLoadingBranches(true);
    try {
      const response = await api.branches.getAll();
      if (response && response.data) {
        setBranches(response.data);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    } finally {
      setLoadingBranches(false);
    }
  };
    
    fetchBranches();
  }, [initialData, user]);

  // Generate an item code based on the category and a random number
  const generateItemCode = () => {
    const category = formData.category || 'Widgets';
    const prefix = category.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit number
    
    setFormData(prev => ({
      ...prev,
      itemCode: `${prefix}-${randomNum}`,
    }));
  };

  // Update item code when category changes
  useEffect(() => {
    if (!initialData) {
      generateItemCode();
    }
  }, [formData.category]);

  // Update status based on quantity
  useEffect(() => {
    const quantity = parseInt(formData.quantity, 10) || 0;
    let newStatus;
    
    if (quantity <= 0) {
      newStatus = 'Out of Stock';
    } else if (quantity <= 5) {
      newStatus = 'Low Stock';
    } else {
      newStatus = 'In Stock';
    }
    
    setFormData(prev => ({
      ...prev,
      status: newStatus,
    }));
  }, [formData.quantity]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Convert numeric values
    if (name === 'quantity') {
      const quantityValue = parseInt(value, 10) || 0;
      setFormData(prev => ({
        ...prev,
        [name]: quantityValue,
      }));
    } else if (name === 'costPrice' || name === 'sellingPrice') {
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
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.itemCode) newErrors.itemCode = 'Item Code is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.unit) newErrors.unit = 'Unit is required';
    if (formData.quantity < 0) newErrors.quantity = 'Quantity cannot be negative';
    if (formData.costPrice < 0) newErrors.costPrice = 'Cost price cannot be negative';
    if (formData.sellingPrice < 0) newErrors.sellingPrice = 'Selling price cannot be negative';
    if (formData.discount < 0 || formData.discount > 100) newErrors.discount = 'Discount must be between 0 and 100';
    if (!formData.branch) newErrors.branch = 'Branch is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
  // Handle ID fields properly
  // For new items: remove any id/ID fields to let MongoDB generate them
  // For existing items: preserve the MongoDB _id field
  const { id, ID, ...dataWithoutClientIds } = formData;
  
  // Ensure branch is properly formatted (as a string ID, not an object)
  const branch = typeof formData.branch === 'object' && formData.branch?._id 
    ? formData.branch._id 
    : formData.branch;
  
  const inventoryData = initialData 
    ? { ...dataWithoutClientIds, _id: initialData._id, branch } 
    : { ...dataWithoutClientIds, branch };
    
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

              {/* Item Code */}
              <div>
                <label htmlFor="itemCode" className={labelClasses}>
                  Item Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="itemCode"
                  name="itemCode"
                  value={formData.itemCode}
                  onChange={handleChange}
                  className={`${inputClasses} ${errors.itemCode ? 'border-red-300' : ''}`}
                  placeholder="Enter Item Code"
                  required
                />
                {errors.itemCode && (
                  <p className={errorClasses}>{errors.itemCode}</p>
                )}
              </div>

              {/* Brand */}
              <div>
                <label htmlFor="brand" className={labelClasses}>
                  Brand
                </label>
                <input
                  type="text"
                  id="brand"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className={inputClasses}
                  placeholder="Enter brand name"
                />
              </div>

              {/* Model */}
              <div>
                <label htmlFor="model" className={labelClasses}>
                  Model
                </label>
                <input
                  type="text"
                  id="model"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  className={inputClasses}
                  placeholder="Enter model number/name"
                />
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className={labelClasses}>
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className={`${inputClasses} appearance-none pr-10 ${errors.category ? 'border-red-300' : ''}`}
                    required
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                {errors.category && (
                  <p className={errorClasses}>{errors.category}</p>
                )}
              </div>

              {/* Color */}
              <div>
                <label htmlFor="color" className={labelClasses}>
                  Color
                </label>
                <input
                  type="text"
                  id="color"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  className={inputClasses}
                  placeholder="Enter color (if applicable)"
                />
              </div>
            </div>
          </Card>

          {/* Item Description */}
          <Card title="Item Description" className="mt-6">
            <div>
              <label htmlFor="description" className={labelClasses}>
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="5"
                className={inputClasses}
                placeholder="Enter item description"
              />
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div>
          {/* Inventory Details */}
          <Card title="Inventory Details">
            <div className="grid grid-cols-1 gap-4">
              {/* Status */}
              <div>
                <label htmlFor="status" className={labelClasses}>
                  Status
                </label>
                <div className="relative">
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className={`${inputClasses} appearance-none pr-10`}
                    disabled={true} // Status is determined by stock level
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">Status is automatically determined by stock level</p>
              </div>

              {/* Quantity */}
              <div>
                <label htmlFor="quantity" className={labelClasses}>
                  Stock Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  min="0"
                  step="1"
                  value={formData.quantity}
                  onChange={handleChange}
                  className={`${inputClasses} ${errors.quantity ? 'border-red-300' : ''}`}
                  required
                />
                {errors.quantity && (
                  <p className={errorClasses}>{errors.quantity}</p>
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

              {/* Branch */}
              <div>
                <label htmlFor="branch" className={labelClasses}>
                  Branch <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="branch"
                    name="branch"
                    value={
                      // Handle different branch formats
                      typeof formData.branch === 'object' && formData.branch?._id 
                        ? formData.branch._id 
                        : formData.branch
                    }
                    onChange={handleChange}
                    className={`${inputClasses} appearance-none pr-10 ${errors.branch ? 'border-red-300' : ''}`}
                    disabled={loadingBranches || (user && user.role === 'user')}
                    required
                  >
                    <option value="">Select a branch</option>
                    {branches.map((branch) => (
                      <option key={branch._id} value={branch._id}>
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
                {errors.branch && (
                  <p className={errorClasses}>{errors.branch}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Select the branch or warehouse where this item is located
                </p>
              </div>

              {/* Reorder Level */}
              <div>
                <label htmlFor="reorderLevel" className={labelClasses}>
                  Reorder Level
                </label>
                <input
                  type="number"
                  id="reorderLevel"
                  name="reorderLevel"
                  min="0"
                  step="1"
                  value={formData.reorderLevel}
                  onChange={handleChange}
                  className={inputClasses}
                  placeholder="Minimum stock level before reordering"
                />
                <p className="mt-1 text-xs text-gray-500">
                  System will alert when stock falls below this level
                </p>
              </div>

              {/* Cost Price */}
              <div>
                <label htmlFor="costPrice" className={labelClasses}>
                  Cost Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="number"
                    id="costPrice"
                    name="costPrice"
                    min="0"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={handleChange}
                    className={`${inputClasses} ${errors.costPrice ? 'border-red-300' : ''} pl-7`}
                    required
                  />
                </div>
                {errors.costPrice && (
                  <p className={errorClasses}>{errors.costPrice}</p>
                )}
              </div>

              {/* Selling Price */}
              <div>
                <label htmlFor="sellingPrice" className={labelClasses}>
                  Selling Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="number"
                    id="sellingPrice"
                    name="sellingPrice"
                    min="0"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={handleChange}
                    className={`${inputClasses} ${errors.sellingPrice ? 'border-red-300' : ''} pl-7`}
                    required
                  />
                </div>
                {errors.sellingPrice && (
                  <p className={errorClasses}>{errors.sellingPrice}</p>
                )}
              </div>

              {/* Discount */}
              <div>
                <label htmlFor="discount" className={labelClasses}>
                  Discount (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="discount"
                    name="discount"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.discount}
                    onChange={handleChange}
                    className={`${inputClasses} ${errors.discount ? 'border-red-300' : ''}`}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">%</span>
                  </div>
                </div>
                {errors.discount && (
                  <p className={errorClasses}>{errors.discount}</p>
                )}
                {formData.discount > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    Final price: ${((formData.sellingPrice * (100 - formData.discount)) / 100).toFixed(2)}
                  </p>
                )}
              </div>
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
