import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Card from '../common/Card';
import Button from '../common/Button';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { getFromStorage } from '../../utils/localStorageHelpers';

/**
 * SaleForm component for creating and editing sales
 * 
 * @param {Object} props - Component props
 * @param {Object} [props.initialData] - Initial sale data for editing
 * @param {Function} props.onCancel - Cancel handler
 * @param {Function} props.onSave - Save handler
 */
const SaleForm = ({ initialData, onCancel, onSave, isLoading = false }) => {
  // Form state
  const [formData, setFormData] = useState({
    saleNumber: '',
    customer: '',
    date: new Date().toISOString().split('T')[0], // Today's date
    status: 'paid',
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
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState({
    customers: false,
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
  
  // Filter inventory items based on search term
  useEffect(() => {
    if (!inventorySearch) {
      setFilteredInventory(inventoryItems);
    } else {
      const filtered = inventoryItems.filter(item => 
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
    let isMounted = true;
    
    const loadData = async () => {
      if (!isMounted) return;
      
      setLoading(prev => ({ ...prev, customers: true, inventory: true }));
      
      try {
        // Get users (customers) from local storage only
        const storedUsers = getFromStorage('users');
        if (storedUsers && Array.isArray(storedUsers)) {
          // Filter users to only include those who can be customers (user role)
          const customerUsers = storedUsers.filter(user => user.role === 'user');
          if (isMounted) {
            setCustomers(customerUsers);
          }
        } else {
          // Set empty array if no users in local storage
          if (isMounted) {
            setCustomers([]);
          }
        }
        
        // Always fetch all inventory items from API for sales
        try {
          const inventoryResponse = await api.inventory.getAll({ 
            limit: 10000, // Large limit to get all items
            sort: 'name' // Sort by name for better UX
          });
          if (inventoryResponse && inventoryResponse.success && inventoryResponse.data) {
            if (isMounted) {
              setInventoryItems(inventoryResponse.data);
            }
          } else {
            if (isMounted) {
              setInventoryItems([]);
            }
          }
        } catch (apiError) {
          console.error('Error fetching inventory from API:', apiError);
          // Fallback to local storage if API fails
          const storedInventory = getFromStorage('inventory');
          if (storedInventory && Array.isArray(storedInventory)) {
            if (isMounted) {
              setInventoryItems(storedInventory);
            }
          } else {
            if (isMounted) {
              setInventoryItems([]);
            }
          }
        }
      } catch (error) {
        console.error('Error getting data from local storage:', error);
        if (isMounted) {
          setCustomers([]);
          setInventoryItems([]);
        }
      } finally {
        if (isMounted) {
          setLoading(prev => ({ ...prev, customers: false, inventory: false }));
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, []); // Remove user dependency to prevent re-runs

  // Initialize form with data if editing
  useEffect(() => {
    if (initialData) {
      // Handle customer which might be an object or string ID
      const customerId = typeof initialData.customer === 'object' && initialData.customer?._id
        ? initialData.customer._id
        : initialData.customer;
      
      const customerName = typeof initialData.customer === 'object' && initialData.customer?.name
        ? initialData.customer.name
        : '';
      
      setFormData({
        ...initialData,
        customer: customerId, // Ensure customer is set as ID string
        customerName: customerName, // Store customer name for display
        date: initialData.date || new Date().toISOString().split('T')[0],
      });
    } else {
      // Generate a new sale number for new sales
      setFormData(prev => ({
        ...prev,
        saleNumber: `S-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      }));
    }
  }, [initialData?._id]); // Only depend on the ID to prevent infinite loops

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
            {/* Customer Field - Editable for new sales, Read-only for editing */}
            <div className="relative flex-1">
              <label htmlFor="customer" className={labelClasses}>
                Customer <span className="text-red-500">*</span>
              </label>
              
              {initialData ? (
                /* Read-only customer display for editing existing sales */
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="customer"
                    value={formData.customerName || 'Customer'}
                    className={`${inputClasses} pl-10 bg-gray-50 cursor-not-allowed`}
                    disabled
                    readOnly
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              ) : (
                /* Editable customer search for new sales */
                <div id="customerSearchContainer" className="relative">
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
                </div>
              )}
              
              {errors.customer && (
                <p className={errorClasses}>{errors.customer}</p>
              )}
            </div>

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
            isLoading={isLoading}
            disabled={isLoading}
            className="px-6"
            leftIcon={!isLoading && (
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          >
            {isLoading ? 'Saving...' : initialData ? 'Update Sale' : 'Create Sale'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default SaleForm;
