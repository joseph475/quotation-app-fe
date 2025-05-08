import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Card from '../common/Card';
import Button from '../common/Button';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';

/**
 * QuotationForm component for creating and editing quotations
 * 
 * @param {Object} props - Component props
 * @param {Object} [props.initialData] - Initial quotation data for editing
 * @param {Function} props.onCancel - Cancel handler
 * @param {Function} props.onSave - Save handler
 */
const QuotationForm = ({ initialData, onCancel, onSave }) => {
  // Get current user from auth context
  const { user } = useAuth();
  
  // State for customers and inventory items
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState({
    customers: false,
    products: false
  });
  const [error, setError] = useState({
    customers: null,
    products: null
  });
  
  // Fetch customers and inventory items
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(prev => ({ ...prev, customers: true }));
      try {
        const response = await api.customers.getAll();
        setCustomers(response.data || []);
        setError(prev => ({ ...prev, customers: null }));
      } catch (err) {
        console.error('Error fetching customers:', err);
        setError(prev => ({ ...prev, customers: 'Failed to load customers' }));
      } finally {
        setLoading(prev => ({ ...prev, customers: false }));
      }
    };
    
    const fetchInventory = async () => {
      setLoading(prev => ({ ...prev, products: true }));
      try {
        // If user is not admin, filter inventory by branch
        let response;
        if (user && user.role === 'admin') {
          response = await api.inventory.getAll();
        } else if (user && user.branch && user.branch._id) {
          // For regular users, only show items from their branch
          response = await api.inventory.getByBranch(user.branch._id);
        } else {
          // Fallback to get all inventory if branch is not available
          response = await api.inventory.getAll();
        }
        
        // Map inventory items to product format
        const mappedProducts = (response.data || []).map(item => ({
          id: item._id,
          name: item.name,
          price: item.sellingPrice || 0,
          itemCode: item.itemCode
        }));
        setProducts(mappedProducts);
        setError(prev => ({ ...prev, products: null }));
      } catch (err) {
        console.error('Error fetching inventory:', err);
        setError(prev => ({ ...prev, products: 'Failed to load inventory items' }));
      } finally {
        setLoading(prev => ({ ...prev, products: false }));
      }
    };
    
    fetchCustomers();
    fetchInventory();
  }, [user]);

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    customer: '',
    date: new Date().toISOString().split('T')[0], // Today's date
    validUntil: '', // Will be set to 14 days from today by default
    status: 'Pending',
    items: [],
  });

  // Item being edited
  const [currentItem, setCurrentItem] = useState({
    product: '',
    name: '',
    quantity: 1,
    price: 0,
    total: 0,
  });

  // Form validation
  const [errors, setErrors] = useState({});
  const [itemErrors, setItemErrors] = useState({});

  // Search state
  const [productSearch, setProductSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showProductResults, setShowProductResults] = useState(false);
  
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerResults, setShowCustomerResults] = useState(false);

  // Set default valid until date (14 days from today)
  useEffect(() => {
    const today = new Date();
    const validUntil = new Date();
    validUntil.setDate(today.getDate() + 14);
    
    setFormData(prev => ({
      ...prev,
      validUntil: validUntil.toISOString().split('T')[0],
    }));
  }, []);

  // Initialize form with data if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        date: initialData.date || new Date().toISOString().split('T')[0],
      });
    }
  }, [initialData]);

  // Filter products based on search term
  useEffect(() => {
    if (productSearch) {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.itemCode?.toLowerCase().includes(productSearch.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
      setShowProductResults(false);
    }
  }, [productSearch]);
  
  // Handle product search enter key
  const handleProductSearchEnter = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      
      const searchTerm = e.target.value;
      if (!searchTerm) return;
      
      setLoading(prev => ({ ...prev, products: true }));
      
      try {
        // Use the backend search endpoint that respects branch filtering
        const response = await api.inventory.search(searchTerm);
        
        if (response && response.success) {
          // Map inventory items to product format
          const mappedProducts = (response.data || []).map(item => ({
            id: item._id,
            name: item.name,
            price: item.sellingPrice || 0,
            itemCode: item.itemCode
          }));
          setFilteredProducts(mappedProducts);
        } else {
          setFilteredProducts([]);
        }
        
        // Always show results when Enter is pressed
        setShowProductResults(true);
        
        // Only auto-select the first result if there's only one match
        if (response && response.success && response.data && response.data.length === 1) {
          const mappedProduct = {
            id: response.data[0]._id,
            name: response.data[0].name,
            price: response.data[0].sellingPrice || 0,
            itemCode: response.data[0].itemCode
          };
          handleProductSelect(mappedProduct);
        }
      } catch (error) {
        console.error('Error searching inventory:', error);
        setFilteredProducts([]);
      } finally {
        setLoading(prev => ({ ...prev, products: false }));
      }
    }
  };
  
  // Filter customers based on search term
  useEffect(() => {
    if (customerSearch) {
      const filtered = customers.filter(customer => 
        customer.name.toLowerCase().includes(customerSearch.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers([]);
      setShowCustomerResults(false);
    }
  }, [customerSearch]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close customer search results if clicked outside
      if (showCustomerResults && !event.target.closest('#customerSearchContainer')) {
        setShowCustomerResults(false);
      }
      
      // Close product search results if clicked outside
      if (showProductResults && !event.target.closest('#productSearchContainer')) {
        setShowProductResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomerResults, showProductResults]);

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

  // Handle item field changes
  const handleItemChange = (e) => {
    const { name, value } = e.target;
    
    let updatedItem = {
      ...currentItem,
      [name]: value,
    };
    
    // Calculate total
    if (name === 'quantity' || name === 'price') {
      const quantity = name === 'quantity' ? parseFloat(value) || 0 : parseFloat(currentItem.quantity) || 0;
      const price = name === 'price' ? parseFloat(value) || 0 : parseFloat(currentItem.price) || 0;
      updatedItem.total = quantity * price;
    }
    
    setCurrentItem(updatedItem);
    
    // Clear error when field is changed
    if (itemErrors[name]) {
      setItemErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Handle product selection from search results
  const handleProductSelect = (product) => {
    setCurrentItem({
      ...currentItem,
      product: product.id,
      name: product.name,
      price: product.price,
      total: product.price * (parseFloat(currentItem.quantity) || 1)
    });
    setProductSearch('');
    setShowProductResults(false);
  };
  
  // Handle customer selection from search results
  const handleCustomerSelect = (customer) => {
    setFormData(prev => ({
      ...prev,
      customer: customer.name
    }));
    setCustomerSearch('');
    setShowCustomerResults(false);
    
    // Clear customer error if it exists
    if (errors.customer) {
      setErrors(prev => ({
        ...prev,
        customer: ''
      }));
    }
  };

  // Add item to quotation
  const addItem = () => {
    // Validate item
    const newItemErrors = {};
    if (!currentItem.name) newItemErrors.name = 'Product name is required';
    if (!currentItem.quantity || currentItem.quantity <= 0) newItemErrors.quantity = 'Quantity must be greater than 0';
    if (!currentItem.price || currentItem.price <= 0) newItemErrors.price = 'Price must be greater than 0';
    
    if (Object.keys(newItemErrors).length > 0) {
      setItemErrors(newItemErrors);
      return;
    }
    
    // Add item with a unique ID
    const newItem = {
      ...currentItem,
      id: Date.now(), // Use timestamp as a simple unique ID
    };
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    
    // Reset current item
    setCurrentItem({
      product: '',
      name: '',
      quantity: 1,
      price: 0,
      total: 0,
    });
    
    setItemErrors({});
  };

  // Remove item from quotation
  const removeItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId),
    }));
  };

  // Calculate total amount
  const totalAmount = formData.items.reduce((sum, item) => sum + item.total, 0);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    if (!formData.customer) newErrors.customer = 'Customer is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.validUntil) newErrors.validUntil = 'Valid until date is required';
    if (formData.items.length === 0) newErrors.items = 'At least one item is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Generate a quotation ID if it's a new quotation
    const quotationData = {
      ...formData,
      id: formData.id || `Q-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      amount: totalAmount,
    };
    
    // Call the save handler
    onSave(quotationData);
  };

  // Common input classes for consistency
  const inputClasses = "block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-2 px-3 sm:text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const errorClasses = "mt-2 text-sm text-red-600";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card title="Quotation Information">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Customer Search */}
          <div id="customerSearchContainer" className="relative">
            <label htmlFor="customerSearch" className={labelClasses}>
              Customer <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                id="customerSearch"
                placeholder="Search for customer..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                onFocus={() => setShowCustomerResults(true)}
                onClick={() => setShowCustomerResults(true)}
                className={`${inputClasses} ${errors.customer ? 'border-red-300' : ''} pl-10`}
              />
              {formData.customer && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                    {formData.customer}
                  </span>
                </div>
              )}
            </div>
            
            {/* Search Results */}
            {showCustomerResults && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                {filteredCustomers.length > 0 ? (
                  <ul className="py-1">
                    {filteredCustomers.map(customer => (
                      <li 
                        key={customer._id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleCustomerSelect(customer)}
                      >
                        {customer.name} {customer.email && `(${customer.email})`}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    {customerSearch ? 'No customers found.' : 'Type to search customers'}
                  </div>
                )}
              </div>
            )}
            
            {errors.customer && (
              <p className={errorClasses}>{errors.customer}</p>
            )}
          </div>

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
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className={labelClasses}>
              Quotation Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className={`${inputClasses} ${errors.date ? 'border-red-300' : ''}`}
              required
            />
            {errors.date && (
              <p className={errorClasses}>{errors.date}</p>
            )}
          </div>

          {/* Valid Until */}
          <div>
            <label htmlFor="validUntil" className={labelClasses}>
              Valid Until <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="validUntil"
              name="validUntil"
              value={formData.validUntil}
              onChange={handleChange}
              className={`${inputClasses} ${errors.validUntil ? 'border-red-300' : ''}`}
              required
            />
            {errors.validUntil && (
              <p className={errorClasses}>{errors.validUntil}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Items */}
      <Card title="Quotation Items">
        {/* Add Item Form */}
        <div className="mb-6 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h4 className="text-lg font-medium text-gray-800 mb-4">Add Item to Quotation</h4>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-12">
            {/* Product Search */}
            <div id="productSearchContainer" className="sm:col-span-5 relative">
              <label htmlFor="productSearch" className={labelClasses}>
                Search Product
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="productSearch"
                  placeholder="Search for products... (Press Enter)"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  onFocus={() => {
                    // Only show results if there's a search term
                    if (productSearch) {
                      setShowProductResults(true);
                    }
                  }}
                  onClick={() => {
                    // Only show results if there's a search term
                    if (productSearch) {
                      setShowProductResults(true);
                    }
                  }}
                  onKeyDown={handleProductSearchEnter}
                  className={`${inputClasses} pl-10`}
                />
              </div>
              
              {/* Search Results */}
              {showProductResults && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                  {filteredProducts.length > 0 ? (
                    <ul className="py-1">
                      {filteredProducts.map(product => (
                        <li 
                          key={product.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                          onClick={() => handleProductSelect(product)}
                        >
                          <span>{product.name}</span>
                          <span className="text-primary-600 font-medium">${product.price.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      {productSearch ? 'No products found. You can enter a custom name.' : 'Type to search products'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Custom Product Name */}
            <div className="sm:col-span-3">
              <label htmlFor="name" className={labelClasses}>
                Product Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Product name"
                value={currentItem.name}
                onChange={handleItemChange}
                className={`${inputClasses} ${itemErrors.name ? 'border-red-300' : ''}`}
              />
              {itemErrors.name && (
                <p className={errorClasses}>{itemErrors.name}</p>
              )}
            </div>

            {/* Quantity */}
            <div className="sm:col-span-2">
              <label htmlFor="quantity" className={labelClasses}>
                Quantity
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                min="1"
                step="1"
                value={currentItem.quantity}
                onChange={handleItemChange}
                className={`${inputClasses} ${itemErrors.quantity ? 'border-red-300' : ''}`}
              />
              {itemErrors.quantity && (
                <p className={errorClasses}>{itemErrors.quantity}</p>
              )}
            </div>

            {/* Price */}
            <div className="sm:col-span-2">
              <label htmlFor="price" className={labelClasses}>
                Unit Price
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
                  value={currentItem.price}
                  onChange={handleItemChange}
                  className={`${inputClasses} ${itemErrors.price ? 'border-red-300' : ''} pl-7`}
                />
              </div>
              {itemErrors.price && (
                <p className={errorClasses}>{itemErrors.price}</p>
              )}
            </div>
          </div>

          {/* Add Button */}
          <div className="mt-6 flex items-center justify-between">
            <div>
              {currentItem.name && currentItem.price > 0 && (
                <p className="text-sm text-gray-600">
                  Total: <span className="font-medium">${(currentItem.price * currentItem.quantity).toFixed(2)}</span>
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={addItem}
            >
              <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Item
            </Button>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.items.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500">
                      <div className="flex flex-col items-center">
                        <svg className="h-12 w-12 text-gray-300 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p>No items added to this quotation yet</p>
                        <p className="text-xs mt-1">Search for products or add custom items above</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  formData.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${parseFloat(item.price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${parseFloat(item.total).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button 
                          variant="danger"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {formData.items.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      Total Amount:
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      ${totalAmount.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {errors.items && (
            <p className={errorClasses}>{errors.items}</p>
          )}
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
        >
          <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Save Quotation
        </Button>
      </div>
    </form>
  );
};

export default QuotationForm;
