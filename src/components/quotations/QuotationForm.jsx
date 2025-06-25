import { h, Fragment } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import Card from '../common/Card';
import Button from '../common/Button';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { getFromStorage } from '../../utils/localStorageHelpers';
import { getInventoryItems, searchInventoryItems } from '../../utils/inventoryCache';
import { getDeliveryUsers } from '../../utils/deliveryUsersCache';

/**
 * QuotationForm component for creating and editing quotations
 * Completely isolated to prevent external re-renders from affecting form state
 */
const QuotationForm = ({ initialData, onCancel, onSave, isLoading = false }) => {
  // Initialize form data immediately without useEffect
  const getInitialFormData = () => {
    if (initialData) {
      // Ensure all items have editing properties
      const itemsWithEditingProps = (initialData.items || []).map((item, index) => ({
        ...item,
        id: item.id || Date.now() + index, // Ensure each item has a unique ID
        isEditing: false,
        editingQuantity: item.quantity,
        editingNotes: item.notes || ''
      }));
      
      return {
        ...initialData,
        date: initialData.date || new Date().toISOString().split('T')[0],
        items: itemsWithEditingProps
      };
    }
    return {
      quotationNumber: `Q-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      customer: '',
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      items: [],
      notes: '',
      customerName: '',
    };
  };

  // Form state - initialized immediately, no useEffect
  const [formData, setFormData] = useState(getInitialFormData);
  const [errors, setErrors] = useState({});
  const [itemErrors, setItemErrors] = useState({});
  
  // Store original quantities for admin change detection
  const [originalQuantities, setOriginalQuantities] = useState({});
  
  // Item being edited
  const [currentItem, setCurrentItem] = useState({
    inventory: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    total: 0,
  });

  // Data for dropdowns - initialize immediately
  const [customers, setCustomers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [deliveryUsers, setDeliveryUsers] = useState([]);
  const [loading, setLoading] = useState({
    customers: false,
    inventory: false,
    form: false,
    delivery: false
  });
  
  // Search state
  const [inventorySearch, setInventorySearch] = useState('');
  const [showInventoryResults, setShowInventoryResults] = useState(false);
  
  // Prevent any external interference
  const formRef = useRef(null);
  const { user } = useAuth();

  // Load data once on mount and set up original quantities for admin change detection
  useEffect(() => {
    const loadData = async () => {
      setLoading(prev => ({ ...prev, customers: true, inventory: true }));
      
      try {
        // Get customers from local storage
        const storedCustomers = getFromStorage('customers');
        if (storedCustomers && Array.isArray(storedCustomers)) {
          setCustomers(storedCustomers);
        }
        
        // Use cached inventory items for fast loading
        try {
          const cachedInventory = await getInventoryItems();
          if (cachedInventory && Array.isArray(cachedInventory)) {
            setInventoryItems(cachedInventory);
          } else {
            setInventoryItems([]);
          }
        } catch (cacheError) {
          console.error('Error fetching inventory from cache:', cacheError);
          // Fallback to local storage if cache fails
          const storedInventory = getFromStorage('inventory');
          if (storedInventory && Array.isArray(storedInventory)) {
            setInventoryItems(storedInventory);
          } else {
            setInventoryItems([]);
          }
        }
        
        // Store original quantities for admin change detection
        if (initialData && initialData.items) {
          const originalQtys = {};
          initialData.items.forEach((item, index) => {
            originalQtys[item.inventory || index] = item.quantity;
          });
          setOriginalQuantities(originalQtys);
        }

        // Load delivery users for admin when editing existing quotations
        if (user && user.role === 'admin' && initialData) {
          setLoading(prev => ({ ...prev, delivery: true }));
          try {
            const cachedDeliveryUsers = await getDeliveryUsers();
            if (cachedDeliveryUsers && Array.isArray(cachedDeliveryUsers)) {
              setDeliveryUsers(cachedDeliveryUsers);
            } else {
              setDeliveryUsers([]);
            }
          } catch (error) {
            console.error('Error loading delivery users from cache:', error);
            setDeliveryUsers([]);
          } finally {
            setLoading(prev => ({ ...prev, delivery: false }));
          }
        }
      } catch (error) {
        console.error('Error getting data:', error);
        setInventoryItems([]);
      } finally {
        setLoading(prev => ({ ...prev, customers: false, inventory: false }));
      }
    };
    
    loadData();
  }, []); // Only run once on mount

  // Filter inventory items based on search term - computed on render
  const filteredInventory = inventoryItems.filter(item => {
    if (!inventorySearch) return true;
    
    const nameMatch = item.name?.toLowerCase().includes(inventorySearch.toLowerCase());
    const itemcodeMatch = item.itemcode?.toString().includes(inventorySearch.toLowerCase());
    const barcodeMatch = item.barcode?.toLowerCase().includes(inventorySearch.toLowerCase());
    
    return nameMatch || itemcodeMatch || barcodeMatch;
  });
  
  // Handle inventory search
  const handleInventorySearch = (e) => {
    const value = e.target.value;
    setInventorySearch(value);
    setShowInventoryResults(!!value);
  };
  
  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showInventoryResults && !event.target.closest('#inventorySearchContainer')) {
        setShowInventoryResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInventoryResults]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle item field changes
  const handleItemChange = (e) => {
    const { name, value } = e.target;
    
    let updatedItem = {
      ...currentItem,
      [name]: value,
    };
    
    // Calculate total (simplified - just quantity * unitPrice)
    if (name === 'quantity' || name === 'unitPrice') {
      const quantity = name === 'quantity' ? parseFloat(value) || 0 : parseFloat(currentItem.quantity) || 0;
      const unitPrice = name === 'unitPrice' ? parseFloat(value) || 0 : parseFloat(currentItem.unitPrice) || 0;
      
      updatedItem.total = quantity * unitPrice;
    }
    
    setCurrentItem(updatedItem);
    
    // Clear error when field is changed
    if (itemErrors[name]) {
      setItemErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Handle inventory selection
  const handleInventorySelect = (item) => {
    const quantity = parseFloat(currentItem.quantity) || 1;
    const unitPrice = item.price || 0;
    const total = quantity * unitPrice;
    
    setCurrentItem({
      ...currentItem,
      inventory: item._id,
      description: item.name,
      unitPrice: unitPrice,
      total: total
    });
    
    // Clear search term and hide results after selection
    setInventorySearch('');
    setShowInventoryResults(false);
  };

  // Add item to quotation
  const addItem = () => {
    // Validate item
    const newItemErrors = {};
    if (!currentItem.inventory) newItemErrors.inventory = 'Inventory item is required';
    if (!currentItem.quantity || currentItem.quantity <= 0) newItemErrors.quantity = 'Quantity must be greater than 0';
    if (!currentItem.unitPrice || currentItem.unitPrice <= 0) newItemErrors.unitPrice = 'Unit price must be greater than 0';
    
    if (Object.keys(newItemErrors).length > 0) {
      setItemErrors(newItemErrors);
      return;
    }
    
    // Ensure quantity is properly parsed as a number
    const itemQuantity = parseFloat(currentItem.quantity) || 1;
    const itemUnitPrice = parseFloat(currentItem.unitPrice) || 0;
    const itemTotal = itemQuantity * itemUnitPrice;
    
    // Check if item already exists in the quotation
    const existingItemIndex = formData.items.findIndex(item => item.inventory === currentItem.inventory);
    
    if (existingItemIndex !== -1) {
      // Item already exists, add to the quantity
      setFormData(prev => ({
        ...prev,
        items: prev.items.map((item, index) => {
          if (index === existingItemIndex) {
            const existingQuantity = parseFloat(item.quantity) || 0;
            const newQuantity = existingQuantity + itemQuantity;
            const newTotal = newQuantity * parseFloat(item.unitPrice);
            return {
              ...item,
              quantity: newQuantity,
              total: newTotal,
              editingQuantity: newQuantity
            };
          }
          return item;
        })
      }));
    } else {
      // Add new item with a unique ID and editing state
      const newItem = {
        ...currentItem,
        quantity: itemQuantity, // Ensure quantity is a number
        unitPrice: itemUnitPrice, // Ensure unit price is a number
        total: itemTotal, // Ensure total is calculated correctly
        id: Date.now(), // Use timestamp as a simple unique ID
        isEditing: false,
        editingQuantity: itemQuantity,
        editingNotes: ''
      };
      
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, newItem],
      }));
    }
    
    // Reset current item
    setCurrentItem({
      inventory: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
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

  // Start editing an item
  const startEditingItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          console.log('Starting edit for item:', item.id, 'Current quantity:', item.quantity, 'Type:', typeof item.quantity);
          return {
            ...item,
            isEditing: true,
            editingQuantity: String(item.quantity), // Ensure it's a string for the input
            editingNotes: item.notes || ''
          };
        }
        return item;
      })
    }));
  };

  // Cancel editing an item
  const cancelEditingItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            isEditing: false,
            editingQuantity: item.quantity,
            editingNotes: item.notes || ''
          };
        }
        return item;
      })
    }));
  };

  // Save edited item
  const saveEditedItem = (itemId) => {
    setFormData(prev => {
      const item = prev.items.find(i => i.id === itemId);
      if (!item) {
        return prev;
      }
      
      const originalQty = originalQuantities[item.inventory] || item.quantity;
      const newQuantity = parseFloat(item.editingQuantity);
      
      // Validate quantity is a valid number
      if (isNaN(newQuantity) || newQuantity < 0) {
        alert('Please enter a valid quantity (0 or greater)');
        return prev;
      }
      
      // For admin users: allow quantity 0 but require notes for any change
      if (user && user.role === 'admin') {
        if (newQuantity !== originalQty && !item.editingNotes?.trim()) {
          alert('Notes are required when changing quantities');
          return prev;
        }
      } else {
        // For non-admin users: quantity must be greater than 0
        if (newQuantity <= 0) {
          alert('Please enter a valid quantity greater than 0');
          return prev;
        }
      }
      
      const updatedItems = prev.items.map(currentItem => {
        if (currentItem.id === itemId) {
          const unitPrice = parseFloat(currentItem.unitPrice) || 0;
          const newTotal = newQuantity * unitPrice;
          return {
            ...currentItem,
            quantity: newQuantity,
            total: newTotal,
            notes: currentItem.editingNotes || '',
            isEditing: false,
            editingQuantity: newQuantity,
            editingNotes: currentItem.editingNotes || ''
          };
        }
        return currentItem;
      });
      
      return {
        ...prev,
        items: updatedItems
      };
    });
  };

  // Handle editing item data changes
  const handleEditingItemChange = (itemId, field, value) => {
    console.log('handleEditingItemChange called:', { itemId, field, value, type: typeof value });
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          // For quantity field, store the raw value and let validation happen on save
          const updatedItem = {
            ...item,
            [`editing${field.charAt(0).toUpperCase() + field.slice(1)}`]: value
          };
          console.log('Updated item:', updatedItem);
          return updatedItem;
        }
        return item;
      })
    }));
  };

  // Calculate totals (simplified) - account for items being edited
  const totalAmount = formData.items.reduce((sum, item) => {
    if (item.isEditing) {
      const editingQty = parseFloat(item.editingQuantity) || item.quantity;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      return sum + (editingQty * unitPrice);
    }
    return sum + item.total;
  }, 0);

  // Check if admin has changed quantities
  const hasQuantityChanges = () => {
    if (!initialData || !user || user.role !== 'admin') return false;
    
    return formData.items.some(item => {
      const originalQty = originalQuantities[item.inventory];
      return originalQty !== undefined && originalQty !== item.quantity;
    });
  };

  // Handle form submission
  const handleSubmit = (e, shouldApprove = false) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    if (formData.items.length === 0) newErrors.items = 'At least one item is required';
    
    // For admin editing existing quotations, require delivery assignment
    if (user && user.role === 'admin' && initialData && !formData.assignedDelivery) {
      newErrors.assignedDelivery = 'Delivery personnel assignment is required';
    }
    
    // Get user ID for authentication check
    const userId = user?._id || user?.id || user?.data?._id || user?.data?.id;
    
    if (!userId) {
      newErrors.user = 'User not properly authenticated';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Prepare quotation data for submission
    const mappedItems = formData.items.map(item => ({
      inventory: item.inventory,
      description: item.description,
      quantity: item.isEditing ? parseFloat(item.editingQuantity) || item.quantity : item.quantity,
      unitPrice: item.unitPrice,
      total: item.isEditing ? (parseFloat(item.editingQuantity) || item.quantity) * item.unitPrice : item.total,
      notes: item.isEditing ? item.editingNotes || item.notes : item.notes // Include notes in the mapped items
    }));
    
    const quotationData = {
      quotationNumber: formData.quotationNumber,
      // For admin editing existing quotations, preserve the original customer
      // For new quotations or non-admin users, use the current user
      customer: (user && user.role === 'admin' && initialData) ? formData.customer : userId,
      date: formData.date,
      // For admin editing existing quotations, set status to approved
      status: (user && user.role === 'admin' && initialData) ? 'approved' : formData.status,
      items: mappedItems,
      notes: formData.notes,
      total: totalAmount,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      // Include delivery assignment if selected
      ...(formData.assignedDelivery && { assignedDelivery: formData.assignedDelivery })
    };
    
    // Call the save handler
    onSave(quotationData);
  };

  // Common input classes for consistency - mobile optimized
  const inputClasses = "block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-1.5 px-2 sm:py-2 sm:px-3 text-xs sm:text-sm";
  const labelClasses = "block text-xs sm:text-sm font-medium text-gray-700 mb-1";
  const errorClasses = "mt-1 text-xs sm:text-sm text-red-600";

  return (
    <div ref={formRef}>
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Items - Desktop with Card, Mobile simplified */}
        <div className="hidden sm:block">
          <Card title="Order List">
            {/* Add Item Form - Hide for admin when editing existing quotations */}
            {!(user && user.role === 'admin' && initialData) && (
              <div className="mb-6 p-4 sm:p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-base sm:text-lg font-medium text-gray-800 mb-4">Add Item to Orders</h4>
            <div className="space-y-2">
              {/* Label */}
              <label htmlFor="inventorySearch" className={labelClasses}>
                Search Inventory
              </label>
              
              {/* Search field and Add button in same row - Force side by side */}
              <div className="flex gap-1 items-center">
                {/* Inventory Search */}
                <div id="inventorySearchContainer" className="relative" style="flex: 1; min-width: 0;">
                  <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        id="inventorySearch"
                        placeholder={currentItem.description ? "" : "Search..."}
                        value={inventorySearch}
                        onInput={handleInventorySearch}
                        className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-1.5 px-2 sm:py-2 sm:px-3 text-xs sm:text-sm pl-8 sm:pl-10 ${itemErrors.inventory ? 'border-red-300' : ''}`}
                        style="min-width: 0; width: 100%;"
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
                        <div className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center">
                          <span className="text-xs sm:text-sm text-black font-medium">
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
                                  {item.name} {item.barcode && `(${item.barcode})`}
                                </span>
                                <span className="text-primary-600 font-medium">{process.env.REACT_APP_CURRENCY_SYMBOL || '₱'}{(item.price || 0).toFixed(2)}</span>
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
                  </div>

                {/* Add Button */}
                <div style="flex-shrink: 0;">
                  <button
                    type="button"
                    onClick={addItem}
                    disabled={!currentItem.inventory || !currentItem.unitPrice}
                    className="inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg transform hover:scale-105 focus:ring-primary-500 border border-transparent py-2 px-4 text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-md"
                    style="white-space: nowrap; min-width: 60px;"
                  >
                    <svg className="h-5 w-5 sm:h-6 sm:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="hidden sm:inline ml-2">Add</span>
                    <span className="sm:hidden ml-1">Add</span>
                  </button>
                </div>
              </div>
              
              {/* Error message */}
              {itemErrors.inventory && (
                <p className={errorClasses}>{itemErrors.inventory}</p>
              )}
            </div>

          </div>
          )}

          {/* Items Table - Desktop */}
          <div className="hidden lg:block bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
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
                      Total
                    </th>
                    {user && user.role === 'admin' && (
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                    )}
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.items.length === 0 ? (
                    <tr>
                      <td colSpan={user && user.role === 'admin' ? "6" : "5"} className="px-6 py-8 text-center text-sm text-gray-500">
                        <div className="flex flex-col items-center">
                          <svg className="h-12 w-12 text-gray-300 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p>No items added yet</p>
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
                          {item.isEditing ? (
                            user && user.role === 'admin' ? (
                              // Admin: Only input field, no +/- buttons
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={item.editingQuantity}
                                onChange={(e) => handleEditingItemChange(item.id, 'quantity', e.target.value)}
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                                autoFocus
                              />
                            ) : (
                              // Non-admin: Input field with +/- buttons
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newQty = Math.max(1, parseFloat(item.editingQuantity) - 1);
                                    handleEditingItemChange(item.id, 'quantity', newQty.toString());
                                  }}
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                  </svg>
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={item.editingQuantity}
                                  onChange={(e) => handleEditingItemChange(item.id, 'quantity', e.target.value)}
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newQty = parseFloat(item.editingQuantity) + 1;
                                    handleEditingItemChange(item.id, 'quantity', newQty.toString());
                                  }}
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                </button>
                              </div>
                            )
                          ) : (
                            user && user.role === 'admin' ? (
                              // Admin: Only show quantity, no +/- buttons
                              <span className="text-sm font-medium text-gray-900">{item.quantity}</span>
                            ) : (
                              // Non-admin: Show +/- buttons
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentQty = parseFloat(item.quantity) || 1;
                                    const newQty = Math.max(1, currentQty - 1);
                                    const unitPrice = parseFloat(item.unitPrice) || 0;
                                    const newTotal = newQty * unitPrice;
                                    
                                    setFormData(prev => ({
                                      ...prev,
                                      items: prev.items.map(currentItem => {
                                        if (currentItem.id === item.id) {
                                          return {
                                            ...currentItem,
                                            quantity: newQty,
                                            total: newTotal,
                                            editingQuantity: newQty
                                          };
                                        }
                                        return currentItem;
                                      })
                                    }));
                                  }}
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => startEditingItem(item.id)}
                                  className="w-8 text-center font-medium bg-white border border-gray-300 rounded px-1 py-0.5 hover:border-primary-500 hover:bg-gray-50 transition-colors cursor-pointer text-sm"
                                >
                                  {item.quantity}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentQty = parseFloat(item.quantity) || 1;
                                    const newQty = currentQty + 1;
                                    const unitPrice = parseFloat(item.unitPrice) || 0;
                                    const newTotal = newQty * unitPrice;
                                    
                                    setFormData(prev => ({
                                      ...prev,
                                      items: prev.items.map(currentItem => {
                                        if (currentItem.id === item.id) {
                                          return {
                                            ...currentItem,
                                            quantity: newQty,
                                            total: newTotal,
                                            editingQuantity: newQty
                                          };
                                        }
                                        return currentItem;
                                      })
                                    }));
                                  }}
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                </button>
                              </div>
                            )
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {process.env.REACT_APP_CURRENCY_SYMBOL || '₱'}{parseFloat(item.unitPrice).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {process.env.REACT_APP_CURRENCY_SYMBOL || '₱'}{item.isEditing 
                            ? (parseFloat(item.editingQuantity || item.quantity) * parseFloat(item.unitPrice)).toFixed(2)
                            : parseFloat(item.total).toFixed(2)
                          }
                        </td>
                        {user && user.role === 'admin' && (
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {item.isEditing ? (
                              <textarea
                                rows="2"
                                value={item.editingNotes || ''}
                                onChange={(e) => handleEditingItemChange(item.id, 'notes', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none"
                                placeholder="Add notes for this change..."
                              />
                            ) : (
                              <div className="max-w-xs">
                                {item.notes ? (
                                  <span className="text-xs bg-yellow-50 text-yellow-800 px-2 py-1 rounded">
                                    {item.notes}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">No notes</span>
                                )}
                              </div>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            {user && user.role === 'admin' && (
                              <>
                                {item.isEditing ? (
                                  <>
                                    <Button 
                                      variant="primary"
                                      size="sm"
                                      onClick={() => saveEditedItem(item.id)}
                                    >
                                      Save
                                    </Button>
                                    <Button 
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => cancelEditingItem(item.id)}
                                    >
                                      Cancel
                                    </Button>
                                  </>
                                ) : (
                                  <Button 
                                    variant="outline"
                                    size="sm"
                                    onClick={() => startEditingItem(item.id)}
                                  >
                                    Edit
                                  </Button>
                                )}
                              </>
                            )}
                            {/* Hide remove button for admin users */}
                            {(!user || user.role !== 'admin') && (
                              <Button 
                                variant="danger"
                                size="sm"
                                onClick={() => removeItem(item.id)}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {formData.items.length > 0 && (
                  <tfoot className="bg-gray-50">
                    <tr className="border-t border-gray-200">
                      <td colSpan="3" className="px-6 py-2 text-right text-sm font-medium text-gray-900">
                        Total:
                      </td>
                      <td className="px-6 py-2 text-sm font-bold text-gray-900">
                        {process.env.REACT_APP_CURRENCY_SYMBOL || '₱'}{totalAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-2 text-sm text-gray-500"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Mobile Card Layout */}
          <div className="lg:hidden space-y-4">
            {formData.items.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-gray-500 text-sm">No items added to this order yet</p>
                <p className="text-gray-400 text-xs mt-1">Search for inventory items above</p>
              </div>
            ) : (
              <>
                {formData.items.map((item) => (
                  <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {item.description}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {process.env.REACT_APP_CURRENCY_SYMBOL || '₱'}{parseFloat(item.unitPrice).toFixed(2)} per unit
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {process.env.REACT_APP_CURRENCY_SYMBOL || '₱'}{item.isEditing 
                            ? (parseFloat(item.editingQuantity || item.quantity) * parseFloat(item.unitPrice)).toFixed(2)
                            : parseFloat(item.total).toFixed(2)
                          }
                        </p>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-3">
                      {/* Quantity */}
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Quantity</span>
                        <div className="flex items-center">
                          {item.isEditing ? (
                            <input
                              type="number"
                              min={user && user.role === 'admin' ? "0" : "1"}
                              step="1"
                              value={item.editingQuantity}
                              onChange={(e) => handleEditingItemChange(item.id, 'quantity', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-900">{item.quantity}</span>
                          )}
                        </div>
                      </div>

                      {/* Notes for admin */}
                      {user && user.role === 'admin' && (
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs text-gray-500">Notes</span>
                          </div>
                          {item.isEditing ? (
                            <textarea
                              rows="2"
                              value={item.editingNotes || ''}
                              onChange={(e) => handleEditingItemChange(item.id, 'notes', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none"
                              placeholder="Add notes for this change..."
                            />
                          ) : (
                            <div>
                              {item.notes ? (
                                <span className="text-xs bg-yellow-50 text-yellow-800 px-2 py-1 rounded">
                                  {item.notes}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">No notes</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {user && user.role === 'admin' && (
                        <>
                          {item.isEditing ? (
                            <>
                              <Button 
                                variant="primary"
                                size="sm"
                                onClick={() => saveEditedItem(item.id)}
                                className="flex-1"
                              >
                                Save
                              </Button>
                              <Button 
                                variant="secondary"
                                size="sm"
                                onClick={() => cancelEditingItem(item.id)}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => startEditingItem(item.id)}
                              className="flex-1"
                            >
                              Edit
                            </Button>
                          )}
                        </>
                      )}
                      {/* Hide remove button for admin users */}
                      {(!user || user.role !== 'admin') && (
                        <Button 
                          variant="danger"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="flex-1"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Total for mobile */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-medium text-gray-900">Total Amount:</span>
                    <span className="text-lg font-bold text-gray-900">{process.env.REACT_APP_CURRENCY_SYMBOL || '₱'}{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Error message for items */}
          {errors.items && (
            <p className={errorClasses}>{errors.items}</p>
          )}
        </Card>
        </div>

        {/* Delivery Assignment - Only show for admin when editing existing quotations */}
        {user && user.role === 'admin' && initialData && (
          <div className="hidden sm:block">
            <Card title="Delivery Assignment">
              <div className="p-4 sm:p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-base sm:text-lg font-medium text-gray-800 mb-4">Assign Delivery Personnel</h4>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="assignedDelivery" className={labelClasses}>
                      Delivery Personnel (Required)
                    </label>
                    {loading.delivery ? (
                      <div className="flex items-center justify-center py-3 px-4 border border-gray-300 rounded-md bg-gray-50">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm text-gray-500">Loading delivery personnel...</span>
                      </div>
                    ) : (
                      <select
                        id="assignedDelivery"
                        name="assignedDelivery"
                        value={formData.assignedDelivery || ''}
                        onChange={handleChange}
                        className={inputClasses}
                      >
                        <option value="">No delivery assignment</option>
                        {deliveryUsers.map(user => (
                          <option key={user._id} value={user._id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {!loading.delivery && deliveryUsers.length === 0 && (
                      <p className="mt-2 text-sm text-gray-500">
                        No delivery personnel available.
                      </p>
                    )}
                    {errors.assignedDelivery && (
                      <p className={errorClasses}>{errors.assignedDelivery}</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Mobile simplified layout */}
        <div className="sm:hidden space-y-4">
          {/* Add Item Form - Mobile */}
          {!(user && user.role === 'admin' && initialData) && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Add Item</h3>
              
              {/* Search field and Add button in same row - Mobile */}
              <div className="flex gap-1 items-center">
                {/* Inventory Search - Mobile */}
                <div id="inventorySearchContainer" className="relative" style="flex: 1; min-width: 0;">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="inventorySearchMobile"
                      placeholder={currentItem.description ? "" : "Search..."}
                      value={inventorySearch}
                      onInput={handleInventorySearch}
                      className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-1.5 px-2 text-xs pl-8 ${itemErrors.inventory ? 'border-red-300' : ''}`}
                      style="min-width: 0; width: 100%;"
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
                      <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                        <span className="text-xs text-black font-medium">
                          {currentItem.description}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Search Results - Mobile */}
                  {showInventoryResults && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-48 overflow-y-auto">
                      {loading.inventory ? (
                        <div className="px-3 py-2 text-xs text-gray-500">
                          Loading...
                        </div>
                      ) : filteredInventory.length > 0 ? (
                        <ul className="py-1">
                          {filteredInventory.map(item => (
                            <li 
                              key={item._id}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-xs"
                              onClick={() => handleInventorySelect(item)}
                            >
                              <div className="flex justify-between items-center">
                                <span className="truncate">{item.name}</span>
                                <span className="text-primary-600 font-medium ml-2">{process.env.REACT_APP_CURRENCY_SYMBOL || '₱'}{(item.price || 0).toFixed(2)}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="px-3 py-2 text-xs text-gray-500">
                          {inventorySearch ? 'No items found.' : 'Type to search'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Add Button - Mobile */}
                <div style="flex-shrink: 0;">
                  <button
                    type="button"
                    onClick={addItem}
                    disabled={!currentItem.inventory || !currentItem.unitPrice}
                    className="inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg transform hover:scale-105 focus:ring-primary-500 border border-transparent py-1.5 px-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-md"
                    style="white-space: nowrap; min-width: 60px; height: 38px;"
                  >
                    <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-xs">Add</span>
                  </button>
                </div>
              </div>
              
              {/* Error message - Mobile */}
              {itemErrors.inventory && (
                <p className={errorClasses}>{itemErrors.inventory}</p>
              )}

            </div>
          )}

          {/* Items List - Mobile */}
          <div className="space-y-3">
            {formData.items.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <svg className="mx-auto h-8 w-8 text-gray-300 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-gray-500 text-xs">No items added yet</p>
              </div>
            ) : (
              <>
                {formData.items.map((item) => (
                  <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-medium text-gray-900 truncate">
                          {item.description}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {process.env.REACT_APP_CURRENCY_SYMBOL || '₱'}{parseFloat(item.unitPrice).toFixed(2)} each
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-gray-900">
                          {process.env.REACT_APP_CURRENCY_SYMBOL || '₱'}{item.isEditing 
                            ? (parseFloat(item.editingQuantity || item.quantity) * parseFloat(item.unitPrice)).toFixed(2)
                            : parseFloat(item.total).toFixed(2)
                          }
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Qty:</span>
                        {item.isEditing ? (
                          user && user.role === 'admin' ? (
                            // Admin: Only input field, no +/- buttons
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.editingQuantity}
                              onChange={(e) => handleEditingItemChange(item.id, 'quantity', e.target.value)}
                              className="w-12 px-1 py-0.5 border border-gray-300 rounded text-xs text-center"
                              autoFocus
                            />
                          ) : (
                            // Non-admin: Input field with +/- buttons
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const newQty = Math.max(1, parseFloat(item.editingQuantity) - 1);
                                  handleEditingItemChange(item.id, 'quantity', newQty.toString());
                                }}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                </svg>
                              </button>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={item.editingQuantity}
                                onChange={(e) => handleEditingItemChange(item.id, 'quantity', e.target.value)}
                                className="w-12 px-1 py-0.5 border border-gray-300 rounded text-xs text-center"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newQty = parseFloat(item.editingQuantity) + 1;
                                  handleEditingItemChange(item.id, 'quantity', newQty.toString());
                                }}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              </button>
                            </div>
                          )
                        ) : (
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => {
                                const currentQty = parseFloat(item.quantity) || 1;
                                const newQty = Math.max(1, currentQty - 1);
                                const unitPrice = parseFloat(item.unitPrice) || 0;
                                const newTotal = newQty * unitPrice;
                                
                                setFormData(prev => ({
                                  ...prev,
                                  items: prev.items.map(currentItem => {
                                    if (currentItem.id === item.id) {
                                      return {
                                        ...currentItem,
                                        quantity: newQty,
                                        total: newTotal,
                                        editingQuantity: newQty
                                      };
                                    }
                                    return currentItem;
                                  })
                                }));
                              }}
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
                            >
                              <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => startEditingItem(item.id)}
                              className="w-6 text-center text-xs font-medium text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 hover:border-primary-500 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              {item.quantity}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const currentQty = parseFloat(item.quantity) || 1;
                                const newQty = currentQty + 1;
                                const unitPrice = parseFloat(item.unitPrice) || 0;
                                const newTotal = newQty * unitPrice;
                                
                                setFormData(prev => ({
                                  ...prev,
                                  items: prev.items.map(currentItem => {
                                    if (currentItem.id === item.id) {
                                      return {
                                        ...currentItem,
                                        quantity: newQty,
                                        total: newTotal,
                                        editingQuantity: newQty
                                      };
                                    }
                                    return currentItem;
                                  })
                                }));
                              }}
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-1">
                        {user && user.role === 'admin' && (
                          <>
                            {item.isEditing ? (
                              <>
                                <button 
                                  onClick={() => saveEditedItem(item.id)}
                                  className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-primary-600 hover:bg-primary-700"
                                >
                                  Save
                                </button>
                                <button 
                                  onClick={() => cancelEditingItem(item.id)}
                                  className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button 
                                onClick={() => startEditingItem(item.id)}
                                className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                              >
                                Edit
                              </button>
                            )}
                          </>
                        )}
                        {(!user || user.role !== 'admin') && (
                          <button 
                            onClick={() => removeItem(item.id)}
                            className="inline-flex items-center px-2 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Notes for admin - Mobile */}
                    {user && user.role === 'admin' && item.isEditing && (
                      <div className="mt-2">
                        <textarea
                          rows="2"
                          value={item.editingNotes || ''}
                          onChange={(e) => handleEditingItemChange(item.id, 'notes', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs resize-none"
                          placeholder="Add notes..."
                        />
                      </div>
                    )}
                    
                    {user && user.role === 'admin' && !item.isEditing && item.notes && (
                      <div className="mt-2">
                        <span className="text-xs bg-yellow-50 text-yellow-800 px-2 py-1 rounded">
                          {item.notes}
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Total - Mobile */}
                <div className="bg-primary-50 rounded-lg p-3 border border-primary-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-primary-900">Total:</span>
                    <span className="text-lg font-bold text-primary-900">{process.env.REACT_APP_CURRENCY_SYMBOL || '₱'}{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Error message for items - Mobile */}
          {errors.items && (
            <p className={errorClasses}>{errors.items}</p>
          )}

          {/* Delivery Assignment - Mobile - Only show for admin when editing existing quotations */}
          {user && user.role === 'admin' && initialData && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Delivery Assignment</h3>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="space-y-3">
                  <label htmlFor="assignedDeliveryMobile" className="block text-xs font-medium text-gray-700">
                    Delivery Personnel (Required)
                  </label>
                  {loading.delivery ? (
                    <div className="flex items-center justify-center py-3 px-4 border border-gray-300 rounded-md bg-gray-50">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-xs text-gray-500">Loading...</span>
                    </div>
                  ) : (
                    <select
                      id="assignedDeliveryMobile"
                      name="assignedDelivery"
                      value={formData.assignedDelivery || ''}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-1.5 px-2 text-xs"
                    >
                      <option value="">No delivery assignment</option>
                      {deliveryUsers.map(user => (
                        <option key={user._id} value={user._id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {!loading.delivery && deliveryUsers.length === 0 && (
                    <p className="text-xs text-gray-500">
                      No delivery personnel available. You can still approve the quotation.
                    </p>
                  )}
                  {errors.assignedDelivery && (
                    <p className="mt-1 text-xs text-red-600">{errors.assignedDelivery}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Form Actions - Desktop */}
        <div className="hidden lg:flex lg:justify-end lg:space-x-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500 px-4 py-2 text-sm"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isLoading}
            className={`inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 border border-transparent px-4 py-2 text-sm ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isLoading ? 'Saving...' : (user && user.role === 'admin' && initialData) ? 'Update and Approve' : initialData ? 'Update Order' : 'Create Order'}
          </button>
        </div>

        {/* Fixed Footer Actions - Mobile */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500 px-3 py-2 text-sm"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`flex-1 inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 border border-transparent px-3 py-2 text-sm ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isLoading ? 'Saving...' : (user && user.role === 'admin' && initialData) ? 'Update and Approve' : initialData ? 'Update Order' : 'Create Order'}
            </button>
          </div>
        </div>
      </form>

    </div>
  );
};

export default QuotationForm;
