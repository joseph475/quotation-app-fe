import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Card from '../common/Card';
import Button from '../common/Button';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import { getFromStorage } from '../../utils/localStorageHelpers';

/**
 * QuotationForm component for creating and editing quotations
 * 
 * @param {Object} props - Component props
 * @param {Object} [props.initialData] - Initial quotation data for editing
 * @param {Function} props.onCancel - Cancel handler
 * @param {Function} props.onSave - Save handler
 */
const QuotationForm = ({ initialData, onCancel, onSave }) => {
  // Form state
  const [formData, setFormData] = useState({
    quotationNumber: '',
    customer: '',
    branch: '',
    date: new Date().toISOString().split('T')[0], // Today's date
    validUntil: '', // Will be set to 14 days from today by default
    status: 'active', // Default status is 'active'
    items: [],
    notes: '',
    terms: '', // Terms and conditions for the quotation
    customerName: '', // Store customer name for display
  });

  // Item being edited
  const [currentItem, setCurrentItem] = useState({
    inventory: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    tax: 0,
    total: 0,
  });

  // Data for dropdowns
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState({
    customers: false,
    branches: false,
    inventory: false,
    form: false
  });
  
  // Search state
  const [inventorySearch, setInventorySearch] = useState('');
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [showInventoryResults, setShowInventoryResults] = useState(false);
  
  // Customer search state
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  
  // Handle inventory search
  const handleInventorySearch = (e) => {
    const value = e.target.value;
    setInventorySearch(value);
  };
  
  // Handle customer search
  const handleCustomerSearch = (e) => {
    const value = e.target.value;
    setCustomerSearch(value);
  };
  
  // Filter inventory items based on search term and user's branch
  useEffect(() => {
    // First filter by branch if user is not admin
    let branchFilteredItems = inventoryItems;
    
    // Then filter by search term
    if (!inventorySearch) {
      setFilteredInventory(branchFilteredItems);
    } else {
      const filtered = branchFilteredItems.filter(item => 
        item.name?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
        item.itemCode?.toLowerCase().includes(inventorySearch.toLowerCase())
      );
      setFilteredInventory(filtered);
    }
    
    // Always show results when typing
    if (inventorySearch) {
      setShowInventoryResults(true);
    }
  }, [inventorySearch, inventoryItems]);
  
  // Filter customers based on search term
  useEffect(() => {
    if (!customerSearch) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer => 
        customer.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(customerSearch.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
    
    // Always show results when typing
    if (customerSearch) {
      setShowCustomerResults(true);
    }
  }, [customerSearch, customers]);
  
  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close inventory search results if clicked outside
      if (showInventoryResults && !event.target.closest('#inventorySearchContainer')) {
        setShowInventoryResults(false);
      }
      
      // Close customer search results if clicked outside
      if (showCustomerResults && !event.target.closest('#customerSearchContainer')) {
        setShowCustomerResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInventoryResults, showCustomerResults]);

  // Form validation
  const [errors, setErrors] = useState({});
  const [itemErrors, setItemErrors] = useState({});

  // Get current user from auth context
  const { user } = useAuth();
  
  // Get data from local storage
  useEffect(() => {
    setLoading(prev => ({ ...prev, customers: true, branches: true, inventory: true }));
    
    try {
      // Get customers from local storage
      const storedCustomers = getFromStorage('customers');
      if (storedCustomers && Array.isArray(storedCustomers)) {
        setCustomers(storedCustomers);
      }
      
      // Get branches from local storage
      const storedBranches = getFromStorage('branches');
      if (storedBranches && Array.isArray(storedBranches)) {
        setBranches(storedBranches);
      }
      
      // Get inventory items from local storage and filter by branch if needed
      const storedInventory = getFromStorage('inventory');
      if (storedInventory && Array.isArray(storedInventory)) {
        // If user is not admin, filter inventory by branch
        if (user && user.role !== 'admin' && user.branch) {
          const filteredInventory = storedInventory.filter(item => 
            item.branch === user.branch || 
            (item.branch && item.branch._id === user.branch)
          );
          setInventoryItems(filteredInventory);
        } else {
          setInventoryItems(storedInventory);
        }
      }
    } catch (error) {
      console.error('Error getting data from local storage:', error);
    } finally {
      setLoading(prev => ({ ...prev, customers: false, branches: false, inventory: false }));
    }
  }, [user]);
  
  // Set default branch based on user's branch
  useEffect(() => {
    if (user && user.branch && !formData.branch) {
      // Check if branch is an object with _id or a string ID directly
      const branchId = typeof user.branch === 'object' ? user.branch._id : user.branch;
      const branchName = user.branchName || (typeof user.branch === 'object' ? user.branch.name : '');
      
      if (branchId) {
        setFormData(prev => ({
          ...prev,
          branch: branchId,
          branchName: branchName // Store branch name for display
        }));
      }
    }
  }, [user, branches]);

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
      // Handle branch which might be an object or string ID
      const branchId = typeof initialData.branch === 'object' && initialData.branch?._id 
        ? initialData.branch._id 
        : initialData.branch;
      
      const branchName = typeof initialData.branch === 'object' && initialData.branch?.name
        ? initialData.branch.name
        : '';
      
      setFormData({
        ...initialData,
        branch: branchId, // Ensure branch is set as ID string
        branchName: branchName, // Store branch name for display
        date: initialData.date || new Date().toISOString().split('T')[0],
      });
      
      console.log('Initializing form with branch:', branchId, 'Branch name:', branchName);
    } else {
      // Generate a new quotation number for new quotations
      setFormData(prev => ({
        ...prev,
        quotationNumber: `Q-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      }));
    }
  }, [initialData]);

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
    if (name === 'quantity' || name === 'unitPrice' || name === 'discount' || name === 'tax') {
      const quantity = name === 'quantity' ? parseFloat(value) || 0 : parseFloat(currentItem.quantity) || 0;
      const unitPrice = name === 'unitPrice' ? parseFloat(value) || 0 : parseFloat(currentItem.unitPrice) || 0;
      const discount = name === 'discount' ? parseFloat(value) || 0 : parseFloat(currentItem.discount) || 0;
      const tax = name === 'tax' ? parseFloat(value) || 0 : parseFloat(currentItem.tax) || 0;
      
      const subtotal = quantity * unitPrice;
      const discountAmount = subtotal * (discount / 100);
      const taxAmount = (subtotal - discountAmount) * (tax / 100);
      
      updatedItem.total = subtotal - discountAmount + taxAmount;
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

  // Handle customer selection
  const handleCustomerSelect = (customer) => {
    setFormData(prev => ({
      ...prev,
      customer: customer._id,
      customerName: customer.name
    }));
    
    // Clear search term and hide results after selection
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
  
  // Handle inventory selection
  const handleInventorySelect = (item) => {
    // Get the discount from the inventory item
    const discount = item.discount !== undefined ? item.discount : 0;
    const quantity = parseFloat(currentItem.quantity) || 1;
    const unitPrice = item.sellingPrice || 0;
    
    // Calculate total with discount
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * (discount / 100);
    const taxAmount = (subtotal - discountAmount) * (parseFloat(currentItem.tax) || 0 / 100);
    const total = subtotal - discountAmount + taxAmount;
    
    setCurrentItem({
      ...currentItem,
      inventory: item._id,
      description: item.name,
      unitPrice: unitPrice,
      discount: discount,
      total: total
    });
    
    // Clear search term and hide results after selection
    setInventorySearch('');
    setShowInventoryResults(false);
  };

  // Add item to sale
  const addItem = () => {
    // Validate item
    const newItemErrors = {};
    if (!currentItem.inventory) newItemErrors.inventory = 'Inventory item is required';
    if (!currentItem.description) newItemErrors.description = 'Description is required';
    if (!currentItem.quantity || currentItem.quantity <= 0) newItemErrors.quantity = 'Quantity must be greater than 0';
    if (!currentItem.unitPrice || currentItem.unitPrice <= 0) newItemErrors.unitPrice = 'Unit price must be greater than 0';
    
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
      inventory: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      tax: 0,
      total: 0,
    });
    
    setItemErrors({});
  };

  // Remove item from sale
  const removeItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId),
    }));
  };

  // Calculate totals
  const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const discountAmount = formData.items.reduce((sum, item) => {
    const itemSubtotal = item.quantity * item.unitPrice;
    return sum + (itemSubtotal * (item.discount / 100));
  }, 0);
  const taxAmount = formData.items.reduce((sum, item) => {
    const itemSubtotal = item.quantity * item.unitPrice;
    const itemDiscountAmount = itemSubtotal * (item.discount / 100);
    return sum + ((itemSubtotal - itemDiscountAmount) * (item.tax / 100));
  }, 0);
  const totalAmount = formData.items.reduce((sum, item) => sum + item.total, 0);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    if (!formData.customer) newErrors.customer = 'Customer is required';
    if (!formData.branch) newErrors.branch = 'Branch is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (formData.items.length === 0) newErrors.items = 'At least one item is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Prepare quotation data for submission
    // Map items to remove the frontend-only 'id' field and ensure proper structure
    const mappedItems = formData.items.map(item => ({
      inventory: item.inventory, // This is the MongoDB ObjectId reference
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      tax: item.tax,
      total: item.total
      // Explicitly omit the 'id' field which is only used for frontend tracking
    }));
    
    // Validate validUntil date
    if (!formData.validUntil) {
      newErrors.validUntil = 'Valid until date is required';
      setErrors(newErrors);
      return;
    }
    
    const quotationData = {
      quotationNumber: formData.quotationNumber,
      customer: formData.customer,
      branch: formData.branch,
      date: formData.date,
      validUntil: formData.validUntil,
      status: formData.status,
      items: mappedItems,
      notes: formData.notes,
      terms: formData.terms,
      subtotal,
      discountAmount,
      taxAmount,
      total: totalAmount
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
          {/* Quotation Number */}
          <div>
            <label htmlFor="quotationNumber" className={labelClasses}>
              Quotation Number
            </label>
            <input
              type="text"
              id="quotationNumber"
              name="quotationNumber"
              value={formData.quotationNumber}
              onChange={handleChange}
              className={inputClasses}
              disabled
            />
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
                placeholder="Search for customers..."
                value={customerSearch}
                onChange={handleCustomerSearch}
                className={`${inputClasses} ${errors.customer ? 'border-red-300' : ''} pl-10`}
                onFocus={() => {
                  // Show results if there's any search term
                  if (customerSearch) {
                    setShowCustomerResults(true);
                  }
                }}
                onClick={() => {
                  // Show results if there's any search term
                  if (customerSearch) {
                    setShowCustomerResults(true);
                  } else {
                    // If no search term, show all results
                    setShowCustomerResults(true);
                  }
                }}
              />
              {formData.customerName && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                    {formData.customerName}
                  </span>
                </div>
              )}
            </div>
            
            {/* Search Results */}
            {showCustomerResults && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                {loading.customers ? (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    Loading customers...
                  </div>
                ) : filteredCustomers.length > 0 ? (
                  <ul className="py-1">
                    {filteredCustomers.map(customer => (
                      <li 
                        key={customer._id}
                        className="px-3 py-1 hover:bg-gray-100 cursor-pointer flex justify-between items-center text-xs"
                        onClick={() => handleCustomerSelect(customer)}
                      >
                        <span>
                          {customer.name}
                          {customer.email && (
                            <span className="ml-1 text-xs text-gray-500">
                              - {customer.email}
                            </span>
                          )}
                        </span>
                        {customer.phone && (
                          <span className="text-gray-600">{customer.phone}</span>
                        )}
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

          {/* Branch Selection */}
          <div>
            <label htmlFor="branch" className={labelClasses}>
              Branch <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="branch"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                className={`${inputClasses} appearance-none pr-10 ${errors.branch ? 'border-red-300' : ''}`}
                disabled={user && user.role !== 'admin'} // Only admin can change branch
              >
                <option value="">Select Branch</option>
                {branches.length === 0 ? (
                  <option value="" disabled>No branches available</option>
                ) : (
                  branches.map(branch => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))
                )}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            {errors.branch && (
              <p className={errorClasses}>{errors.branch}</p>
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

          {/* Status - Only show when editing an existing quotation */}
          {initialData && (
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
                  <option value="active">Active</option>
                  <option value="rejected">Rejected</option>
                  <option value="completed">Completed</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="sm:col-span-2">
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
              placeholder="Add any notes or special instructions here"
            ></textarea>
          </div>

          {/* Terms & Conditions */}
          <div className="sm:col-span-2">
            <label htmlFor="terms" className={labelClasses}>
              Terms & Conditions
            </label>
            <textarea
              id="terms"
              name="terms"
              rows="3"
              value={formData.terms}
              onChange={handleChange}
              className={inputClasses}
              placeholder="Terms and conditions for this quotation"
            ></textarea>
          </div>
        </div>
      </Card>

      {/* Items */}
      <Card title="Quotation Items">
        {/* Add Item Form */}
        <div className="mb-6 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h4 className="text-lg font-medium text-gray-800 mb-4">Add Item to Quotation</h4>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-12">
            {/* Inventory Search */}
            <div id="inventorySearchContainer" className="sm:col-span-5 relative">
              <label htmlFor="inventorySearch" className={labelClasses}>
                Search Inventory
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="inventorySearch"
                  placeholder="Search for inventory items..."
                  value={inventorySearch}
                  onChange={handleInventorySearch}
                  className={`${inputClasses} ${itemErrors.inventory ? 'border-red-300' : ''} pl-10`}
                  onFocus={() => {
                    // Show results if there's any search term
                    if (inventorySearch) {
                      setShowInventoryResults(true);
                    }
                  }}
                  onClick={() => {
                    // Show results if there's any search term
                    if (inventorySearch) {
                      setShowInventoryResults(true);
                    } else {
                      // If no search term, show all results
                      setShowInventoryResults(true);
                    }
                  }}
                />
                {currentItem.description && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <span className="text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                      {currentItem.description}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Search Results */}
              {showInventoryResults && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                  {loading.inventory ? (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      Loading inventory...
                    </div>
                  ) : filteredInventory.length > 0 ? (
                    <ul className="py-1">
                      {filteredInventory.map(item => (
                        <li 
                          key={item._id}
                          className="px-3 py-1 hover:bg-gray-100 cursor-pointer flex justify-between items-center text-xs"
                          onClick={() => handleInventorySelect(item)}
                        >
                          <span>
                            {item.name} {item.itemCode && `(${item.itemCode})`}
                            {user && user.role === 'admin' && item.branch && (
                              <span className="ml-1 text-xs text-gray-500">
                                - {item.branch.name}
                              </span>
                            )}
                          </span>
                          <span className="text-primary-600 font-medium">${(item.sellingPrice || 0).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      {inventorySearch ? 'No inventory items found.' : 'Type to search inventory'}
                    </div>
                  )}
                </div>
              )}
              
              {itemErrors.inventory && (
                <p className={errorClasses}>{itemErrors.inventory}</p>
              )}
            </div>

            {/* Description */}
            <div className="sm:col-span-3">
              <label htmlFor="description" className={labelClasses}>
                Description
              </label>
              <input
                type="text"
                id="description"
                name="description"
                placeholder="Item description"
                value={currentItem.description}
                onChange={handleItemChange}
                className={`${inputClasses} ${itemErrors.description ? 'border-red-300' : ''}`}
              />
              {itemErrors.description && (
                <p className={errorClasses}>{itemErrors.description}</p>
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

            {/* Unit Price */}
            <div className="sm:col-span-2">
              <label htmlFor="unitPrice" className={labelClasses}>
                Unit Price
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">$</span>
                </div>
                <input
                  type="number"
                  id="unitPrice"
                  name="unitPrice"
                  min="0"
                  step="0.01"
                  value={currentItem.unitPrice}
                  onChange={handleItemChange}
                  className={`${inputClasses} ${itemErrors.unitPrice ? 'border-red-300' : ''} pl-7`}
                />
              </div>
              {itemErrors.unitPrice && (
                <p className={errorClasses}>{itemErrors.unitPrice}</p>
              )}
            </div>

            {/* Discount */}
            <div className="sm:col-span-2">
              <label htmlFor="discount" className={labelClasses}>
                Discount %
              </label>
              <input
                type="number"
                id="discount"
                name="discount"
                min="0"
                max="100"
                step="0.01"
                value={currentItem.discount}
                onChange={handleItemChange}
                className={inputClasses}
              />
            </div>

            {/* Tax */}
            <div className="sm:col-span-2">
              <label htmlFor="tax" className={labelClasses}>
                Tax %
              </label>
              <input
                type="number"
                id="tax"
                name="tax"
                min="0"
                max="100"
                step="0.01"
                value={currentItem.tax}
                onChange={handleItemChange}
                className={inputClasses}
              />
            </div>
          </div>

          {/* Add Button */}
          <div className="mt-6 flex items-center justify-between">
            <div>
              {currentItem.description && currentItem.unitPrice > 0 && (
                <p className="text-sm text-gray-600">
                  Total: <span className="font-medium">${currentItem.total.toFixed(2)}</span>
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
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tax
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
                    <td colSpan="7" className="px-6 py-8 text-center text-sm text-gray-500">
                      <div className="flex flex-col items-center">
                        <svg className="h-12 w-12 text-gray-300 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p>No items added to this quotation yet</p>
                        <p className="text-xs mt-1">Search for inventory items above</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  formData.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${parseFloat(item.unitPrice).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.discount}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.tax}%
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
                    <td colSpan="3" className="px-6 py-2 text-right text-sm font-medium text-gray-900">
                      Subtotal:
                    </td>
                    <td colSpan="2" className="px-6 py-2 text-sm text-gray-500">
                      ${subtotal.toFixed(2)}
                    </td>
                    <td colSpan="2" className="px-6 py-2 text-sm text-gray-500"></td>
                  </tr>
                  <tr>
                    <td colSpan="3" className="px-6 py-2 text-right text-sm font-medium text-gray-900">
                      Discount:
                    </td>
                    <td colSpan="2" className="px-6 py-2 text-sm text-gray-500">
                      ${discountAmount.toFixed(2)}
                    </td>
                    <td colSpan="2" className="px-6 py-2 text-sm text-gray-500"></td>
                  </tr>
                  <tr>
                    <td colSpan="3" className="px-6 py-2 text-right text-sm font-medium text-gray-900">
                      Tax:
                    </td>
                    <td colSpan="2" className="px-6 py-2 text-sm text-gray-500">
                      ${taxAmount.toFixed(2)}
                    </td>
                    <td colSpan="2" className="px-6 py-2 text-sm text-gray-500"></td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td colSpan="3" className="px-6 py-2 text-right text-sm font-medium text-gray-900">
                      Total:
                    </td>
                    <td colSpan="2" className="px-6 py-2 text-sm font-bold text-gray-900">
                      ${totalAmount.toFixed(2)}
                    </td>
                    <td colSpan="2" className="px-6 py-2 text-sm text-gray-500"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
        
        {/* Error message for items */}
        {errors.items && (
          <p className={errorClasses}>{errors.items}</p>
        )}
      </Card>
      
      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={loading.form}
        >
          {loading.form ? 'Saving...' : initialData ? 'Update Quotation' : 'Create Quotation'}
        </Button>
      </div>
    </form>
  );
};

export default QuotationForm;
