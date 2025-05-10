import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Card from '../common/Card';
import Button from '../common/Button';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';

/**
 * SaleForm component for creating and editing sales
 * 
 * @param {Object} props - Component props
 * @param {Object} [props.initialData] - Initial sale data for editing
 * @param {Function} props.onCancel - Cancel handler
 * @param {Function} props.onSave - Save handler
 */
const SaleForm = ({ initialData, onCancel, onSave }) => {
  // Form state
  const [formData, setFormData] = useState({
    saleNumber: '',
    customer: '',
    branch: '',
    date: new Date().toISOString().split('T')[0], // Today's date
    status: 'paid',
    paymentMethod: 'cash',
    items: [],
    notes: '',
    customerName: '', // Store customer name for display
    amountPaid: 0, // Amount paid for partially paid status
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
  
  // Fetch customers, branches, and inventory data
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(prev => ({ ...prev, customers: true }));
      try {
        const response = await api.customers.getAll();
        if (response && response.success) {
          setCustomers(response.data || []);
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoading(prev => ({ ...prev, customers: false }));
      }
    };
    
  const fetchBranches = async () => {
    setLoading(prev => ({ ...prev, branches: true }));
    try {
      const response = await api.branches.getAll();
      console.log('Branches API response:', response);
      
      // More detailed logging to debug the issue
      if (!response) {
        console.error('Response is undefined or null');
      } else {
        console.log('Response structure:', Object.keys(response));
        if (response.data) {
          console.log('Data exists, length:', response.data.length);
          console.log('First branch (if any):', response.data[0]);
        } else {
          console.error('No data property in response');
        }
      }
      
      if (response && response.success) {
        setBranches(response.data || []);
        console.log('Branches set:', response.data);
      } else {
        console.error('Failed to fetch branches:', response);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(prev => ({ ...prev, branches: false }));
    }
  };

    const fetchInventory = async () => {
      console.log('aaaa', user);
      setLoading(prev => ({ ...prev, inventory: true }));
      try {
        // If user is not admin, filter inventory by branch
        let response;
        if (user && user.role === 'admin') {
          response = await api.inventory.getAll();
        } else if (user && user.branch) {
          // For regular users, only show items from their branch
          response = await api.inventory.getByBranch(user.branch);
        } else {
          // Fallback to get all inventory if branch is not available
          response = await api.inventory.getAll();
        }
        
        if (response && response.success) {
          setInventoryItems(response.data || []);
        }
      } catch (error) {
        console.error('Error fetching inventory:', error);
      } finally {
        setLoading(prev => ({ ...prev, inventory: false }));
      }
    };

    fetchCustomers();
    fetchBranches();
    fetchInventory();
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
      // Generate a new sale number for new sales
      setFormData(prev => ({
        ...prev,
        saleNumber: `S-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      }));
    }
  }, [initialData]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for status field
    if (name === 'status') {
      if (value === 'paid') {
        // If status is set to paid, automatically set amountPaid to totalAmount
        setFormData(prev => ({
          ...prev,
          [name]: value,
          amountPaid: totalAmount
        }));
      } else {
        // For other statuses, just update the status field
        setFormData(prev => ({
          ...prev,
          [name]: value,
          // If changing from paid to another status, reset amountPaid to 0
          // unless it's partially_paid which will keep its value
          amountPaid: value === 'partially_paid' ? prev.amountPaid : 0
        }));
      }
    } else {
      // Normal handling for other fields
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
    const quantity = parseFloat(currentItem.quantity) || 1;
    const unitPrice = item.sellingPrice || 0;
    const discount = parseFloat(item.discount) || 0; // Use the discount from the inventory item
    const tax = parseFloat(currentItem.tax) || 0;
    
    // Calculate total with discount and tax
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * (discount / 100);
    const taxAmount = (subtotal - discountAmount) * (tax / 100);
    const total = subtotal - discountAmount + taxAmount;
    
    setCurrentItem({
      ...currentItem,
      inventory: item._id,
      description: item.name,
      unitPrice: unitPrice,
      discount: discount, // Set the discount from the inventory item
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
    
    // Prepare sale data for submission
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
    
    // Set amountPaid based on status
    let amountPaid = 0;
    if (formData.status === 'paid') {
      amountPaid = totalAmount;
    } else if (formData.status === 'partially_paid') {
      amountPaid = parseFloat(formData.amountPaid) || 0;
    }
    
    const saleData = {
      ...formData,
      items: mappedItems, // Use the properly mapped items
      subtotal,
      discountAmount,
      taxAmount,
      total: totalAmount,
      amountPaid: amountPaid, // Set amount paid based on status
      balance: totalAmount - amountPaid // Calculate balance based on amountPaid
    };
    
    // Call the save handler
    onSave(saleData);
  };

  // Common input classes for consistency
  const inputClasses = "block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-2 px-3 sm:text-sm transition-all duration-200";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const errorClasses = "mt-2 text-sm text-red-600";
  const sectionClasses = "mb-6 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden";
  const cardHeaderClasses = "bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 py-4 px-6";


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card 
        title={
          <div className="flex items-center">
            <svg className="h-5 w-5 text-primary-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
            <span>Sale Information</span>
          </div>
        }
        className="border-l-4 border-l-primary-500 shadow-md"
        headerClassName={cardHeaderClasses}
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Sale Number */}
            <div className="flex-1">
              <label htmlFor="saleNumber" className={labelClasses}>
                Sale Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="saleNumber"
                  name="saleNumber"
                  value={formData.saleNumber}
                  onChange={handleChange}
                  className={`${inputClasses} pl-10 bg-gray-50`}
                  disabled
                />
              </div>
            </div>

            {/* Date */}
            <div className="flex-1">
              <label htmlFor="date" className={labelClasses}>
                Sale Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className={`${inputClasses} ${errors.date ? 'border-red-300 ring-1 ring-red-300' : ''} pl-10`}
                  required
                />
              </div>
              {errors.date && (
                <p className={errorClasses}>{errors.date}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6">
            {/* Customer Search */}
            <div id="customerSearchContainer" className="relative flex-1">
              <label htmlFor="customerSearch" className={labelClasses}>
                Customer <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="customerSearch"
                  placeholder="Search for customers..."
                  value={customerSearch}
                  onChange={handleCustomerSearch}
                  className={`${inputClasses} ${errors.customer ? 'border-red-300 ring-1 ring-red-300' : ''} pl-10 ${formData.customerName ? 'pr-32' : ''}`}
                  onFocus={() => {
                    if (customerSearch) {
                      setShowCustomerResults(true);
                    }
                  }}
                  onClick={() => {
                    setShowCustomerResults(true);
                  }}
                />
                {formData.customerName && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <span className="text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded-full font-medium">
                      {formData.customerName}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Search Results */}
              {showCustomerResults && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                  {loading.customers ? (
                    <div className="px-4 py-3 text-sm text-gray-500 flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading customers...
                    </div>
                  ) : filteredCustomers.length > 0 ? (
                    <ul className="py-1">
                      {filteredCustomers.map(customer => (
                        <li 
                          key={customer._id}
                          className="px-3 py-2 hover:bg-primary-50 cursor-pointer flex justify-between items-center text-sm transition-colors duration-150"
                          onClick={() => handleCustomerSelect(customer)}
                        >
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center mr-2 text-sm font-medium">
                              {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{customer.name}</div>
                              {customer.email && (
                                <div className="text-xs text-gray-500">
                                  {customer.email}
                                </div>
                              )}
                            </div>
                          </div>
                          {customer.phone && (
                            <span className="text-gray-600 text-xs">{customer.phone}</span>
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
            <div className="flex-1">
              <label htmlFor="branch" className={labelClasses}>
                Branch <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
                <select
                  id="branch"
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  className={`${inputClasses} appearance-none pl-10 pr-10 ${errors.branch ? 'border-red-300 ring-1 ring-red-300' : ''} ${user && user.role !== 'admin' ? 'bg-gray-50' : ''}`}
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
          </div>

          <div className="flex flex-col sm:flex-row gap-6">
            {/* Status */}
            <div className="flex-1">
              <label htmlFor="status" className={labelClasses}>
                Status
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={`${inputClasses} appearance-none pl-10 pr-10`}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                
                {/* Status indicator */}
                <div className="absolute inset-y-0 right-10 flex items-center">
                  <span className={`w-3 h-3 rounded-full ${
                    formData.status === 'paid' ? 'bg-green-500' : 
                    formData.status === 'partially_paid' ? 'bg-yellow-500' : 
                    formData.status === 'pending' ? 'bg-blue-500' :
                    formData.status === 'cancelled' ? 'bg-red-500' :
                    formData.status === 'refunded' ? 'bg-purple-500' : 'bg-gray-500'
                  }`}></span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="flex-1">
              <label htmlFor="paymentMethod" className={labelClasses}>
                Payment Method
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className={`${inputClasses} appearance-none pl-10 pr-10`}
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="online_payment">Online Payment</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Amount Paid - Only shown when status is partially_paid */}
          {formData.status === 'partially_paid' && (
            <div className="sm:col-span-2">
              <label htmlFor="amountPaid" className={labelClasses}>
                Amount Paid <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">$</span>
                </div>
                <input
                  type="number"
                  id="amountPaid"
                  name="amountPaid"
                  min="0"
                  max={totalAmount}
                  step="0.01"
                  value={formData.amountPaid}
                  onChange={handleChange}
                  className={`${inputClasses} pl-7`}
                  required={formData.status === 'partially_paid'}
                />
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-gray-500">Total Amount: ${totalAmount.toFixed(2)}</span>
                <span className="text-gray-500">
                  Balance: ${(totalAmount - parseFloat(formData.amountPaid || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="sm:col-span-2 mt-2">
            <label htmlFor="notes" className={labelClasses}>
              Notes
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <textarea
                id="notes"
                name="notes"
                rows="3"
                value={formData.notes}
                onChange={handleChange}
                className={`${inputClasses} pl-10`}
                placeholder="Add any notes or special instructions here"
              ></textarea>
            </div>
          </div>
        </div>
      </Card>

      {/* Items */}
      <Card 
        title={
          <div className="flex items-center">
            <svg className="h-5 w-5 text-primary-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
            <span>Sale Items</span>
          </div>
        }
        headerClassName={cardHeaderClasses}
        className="shadow-md"
      >
        {/* Add Item Form */}
        <div className="mb-6 p-6 bg-white rounded-lg border border-gray-100 shadow-sm mx-6 mt-6">
          <h4 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
            <svg className="h-5 w-5 text-primary-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Item to Sale
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            {/* Inventory Search */}
            <div id="inventorySearchContainer" className="sm:col-span-6 relative">
              <label htmlFor="inventorySearch" className={labelClasses}>
                Search Inventory <span className="text-red-500">*</span>
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
                  className={`${inputClasses} ${itemErrors.inventory ? 'border-red-300 ring-1 ring-red-300' : ''} pl-10 ${currentItem.description ? 'pr-32' : ''}`}
                  onFocus={() => {
                    if (inventorySearch) {
                      setShowInventoryResults(true);
                    }
                  }}
                  onClick={() => {
                    setShowInventoryResults(true);
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
                    <div className="px-4 py-3 text-sm text-gray-500 flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading inventory...
                    </div>
                  ) : filteredInventory.length > 0 ? (
                    <ul className="py-1">
                      {filteredInventory.map(item => (
                        <li 
                          key={item._id}
                          className="px-3 py-2 hover:bg-primary-50 cursor-pointer flex justify-between items-center text-sm transition-colors duration-150"
                          onClick={() => handleInventorySelect(item)}
                        >
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="flex items-center text-xs text-gray-500">
                              {item.itemCode && <span className="mr-2">Code: {item.itemCode}</span>}
                              {user && user.role === 'admin' && item.branch && (
                                <span>Branch: {item.branch.name}</span>
                              )}
                            </div>
                          </div>
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
            <div className="sm:col-span-6">
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

            <div className="sm:col-span-3">
              <label htmlFor="quantity" className={labelClasses}>
                Quantity
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  min="1"
                  step="1"
                  value={currentItem.quantity}
                  onChange={handleItemChange}
                  className={`${inputClasses} ${itemErrors.quantity ? 'border-red-300 ring-1 ring-red-300' : ''} pl-10`}
                />
              </div>
              {itemErrors.quantity && (
                <p className={errorClasses}>{itemErrors.quantity}</p>
              )}
            </div>

            {/* Unit Price */}
            <div className="sm:col-span-3">
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

            <div className="sm:col-span-3">
              <label htmlFor="discount" className={labelClasses}>
                Discount %
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 3.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L8.414 9H10a3 3 0 013 3v1a1 1 0 102 0v-1a5 5 0 00-5-5H8.414l1.293-1.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="number"
                  id="discount"
                  name="discount"
                  min="0"
                  max="100"
                  step="0.01"
                  value={currentItem.discount}
                  onChange={handleItemChange}
                  className={`${inputClasses} pl-10`}
                />
              </div>
            </div>

            {/* Tax */}
            <div className="sm:col-span-3">
              <label htmlFor="tax" className={labelClasses}>
                Tax %
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="number"
                  id="tax"
                  name="tax"
                  min="0"
                  max="100"
                  step="0.01"
                  value={currentItem.tax}
                  onChange={handleItemChange}
                  className={`${inputClasses} pl-10`}
                />
              </div>
            </div>
          </div>

          {/* Add Button */}
          <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
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
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mx-6 mb-6">
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
                    <td colSpan="7" className="px-6 py-12 text-center text-sm text-gray-500">
                      <div className="flex flex-col items-center">
                        <div className="bg-gray-50 rounded-full p-3 mb-4">
                          <svg className="h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                        </div>
                        <p className="font-medium text-gray-900">No items added to this sale yet</p>
                        <p className="text-xs mt-1 text-gray-500">Search for inventory items above to add them to this sale</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  formData.items.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        ${parseFloat(item.unitPrice).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.discount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            {item.discount}%
                          </span>
                        ) : (
                          <span className="text-gray-500">0%</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.tax > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {item.tax}%
                          </span>
                        ) : (
                          <span className="text-gray-500">0%</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${parseFloat(item.total).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          className="text-red-600 hover:text-red-900 focus:outline-none"
                          onClick={() => removeItem(item.id)}
                        >
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {formData.items.length > 0 && (
                <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan="3" className="px-6 py-2 text-right text-sm font-medium text-gray-900">
                    Subtotal:
                  </td>
                  <td colSpan="2" className="px-6 py-2 text-sm text-gray-700">
                    ${subtotal.toFixed(2)}
                  </td>
                  <td colSpan="2" className="px-6 py-2 text-sm text-gray-500"></td>
                </tr>
                <tr className="bg-gray-50">
                  <td colSpan="3" className="px-6 py-2 text-right text-sm font-medium text-gray-900">
                    Discount:
                  </td>
                  <td colSpan="2" className="px-6 py-2 text-sm text-green-600">
                    -${discountAmount.toFixed(2)}
                  </td>
                  <td colSpan="2" className="px-6 py-2 text-sm text-gray-500"></td>
                </tr>
                <tr className="bg-gray-50">
                  <td colSpan="3" className="px-6 py-2 text-right text-sm font-medium text-gray-900">
                    Tax:
                  </td>
                  <td colSpan="2" className="px-6 py-2 text-sm text-blue-600">
                    +${taxAmount.toFixed(2)}
                  </td>
                  <td colSpan="2" className="px-6 py-2 text-sm text-gray-500"></td>
                </tr>
                <tr className="bg-gray-100 border-t-2 border-gray-200">
                  <td colSpan="3" className="px-6 py-3 text-right text-base font-bold text-gray-900">
                    Total:
                  </td>
                  <td colSpan="2" className="px-6 py-3 text-base font-bold text-primary-600">
                    ${totalAmount.toFixed(2)}
                  </td>
                  <td colSpan="2" className="px-6 py-3 text-sm text-gray-500"></td>
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
      <div className="flex justify-between items-center sticky bottom-0 bg-white p-4 border-t border-gray-200 shadow-lg rounded-lg z-10">
        <div className="flex items-center">
          <div className="bg-primary-50 rounded-lg p-3 mr-4">
            <svg className="h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="text-2xl font-bold text-primary-600">${totalAmount.toFixed(2)}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-gray-300 hover:bg-gray-50"
          >
            <svg className="h-5 w-5 mr-2 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading.form}
            className="px-6"
          >
            {loading.form ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {initialData ? 'Update Sale' : 'Create Sale'}
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default SaleForm;
