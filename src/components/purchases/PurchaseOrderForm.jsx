import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Card from '../common/Card';
import Button from '../common/Button';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';

/**
 * PurchaseOrderForm component for creating and editing purchase orders
 */
const PurchaseOrderForm = ({ initialData, onCancel, onSave }) => {
  // Get current user from auth context
  const { user } = useAuth();
  
  // Check if user has permission to manage purchase orders
  // Ensure 'user' role is included in the permission check
  const hasManagePermission = user && (user.role === 'admin' || user.role === 'manager' || user.role === 'user');
  const [permissionError, setPermissionError] = useState(null);
  
  // State for suppliers and inventory items
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState({ suppliers: false, products: false });
  const [error, setError] = useState({ suppliers: null, products: null });
  
  // State for branches
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    supplier: '',
    branch: '',
    branchName: '',
    date: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    status: initialData?.status || 'Draft', // Use initialData status if available
    items: [],
    notes: '',
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
  
  const [supplierSearch, setSupplierSearch] = useState('');
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [showSupplierResults, setShowSupplierResults] = useState(false);

  // Fetch suppliers, branches, and inventory items
  useEffect(() => {
    const fetchSuppliers = async () => {
      setLoading(prev => ({ ...prev, suppliers: true }));
      try {
        const response = await api.suppliers.getAll();
        setSuppliers(response.data || []);
      } catch (err) {
        console.error('Error fetching suppliers:', err);
      } finally {
        setLoading(prev => ({ ...prev, suppliers: false }));
      }
    };

    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const response = await api.branches.getAll();
        const branchesData = response.data || [];
        setBranches(branchesData);
        
        // We'll handle setting the default branch in a separate useEffect
        // that depends on both branches and user data
        
      } catch (err) {
        console.error('Error fetching branches:', err);
      } finally {
        setLoadingBranches(false);
      }
    };
    const fetchInventory = async () => {
      setLoading(prev => ({ ...prev, products: true }));
      try {
        let response;
        if (user && user.role === 'admin') {
          response = await api.inventory.getAll();
        } else if (user && user.branch && user.branch) {
          response = await api.inventory.getByBranch(user.branch);
        } else {
          response = await api.inventory.getAll();
        }
        
        const mappedProducts = (response.data || []).map(item => ({
          id: item._id,
          name: item.name,
          price: item.costPrice,
          itemCode: item.itemCode
        }));
        setProducts(mappedProducts);
      } catch (err) {
        console.error('Error fetching inventory:', err);
      } finally {
        setLoading(prev => ({ ...prev, products: false }));
      }
    };
    
    fetchSuppliers();
    fetchBranches();
    fetchInventory();
  }, []);

  // Set default expected delivery date (14 days from today) if not already set
  useEffect(() => {
    // Only set default expected delivery date if it's not already set
    // This prevents overwriting the date when editing an existing purchase order
    if (!formData.expectedDeliveryDate) {
      const today = new Date();
      const expectedDelivery = new Date();
      expectedDelivery.setDate(today.getDate() + 14);
      
      setFormData(prev => ({
        ...prev,
        expectedDeliveryDate: expectedDelivery.toISOString().split('T')[0],
      }));
    }
  }, [formData.expectedDeliveryDate]);

  // Initialize form with data if editing
  useEffect(() => {
    if (initialData) {
      // Map items to ensure price is properly set from unitPrice if available
      const mappedItems = initialData.items ? initialData.items.map(item => {
        const mappedItem = { ...item };
        
        // If unitPrice exists but price doesn't, use unitPrice for price
        if (mappedItem.unitPrice !== undefined && (mappedItem.price === undefined || mappedItem.price === 0)) {
          mappedItem.price = parseFloat(mappedItem.unitPrice);
        }
        // If price exists but unitPrice doesn't, use price for unitPrice
        else if (mappedItem.price !== undefined && (mappedItem.unitPrice === undefined || mappedItem.unitPrice === 0)) {
          mappedItem.unitPrice = parseFloat(mappedItem.price);
        }
        
        // Ensure both price and unitPrice are numbers and not NaN
        mappedItem.price = parseFloat(mappedItem.price) || 0;
        mappedItem.unitPrice = parseFloat(mappedItem.unitPrice) || 0;
        
        // Recalculate total based on quantity and price
        mappedItem.total = (parseFloat(mappedItem.quantity) || 0) * mappedItem.price;
        
        // Add tempId for frontend tracking if not present
        if (!mappedItem.tempId) {
          mappedItem.tempId = Date.now() + Math.random();
        }
        
        return mappedItem;
      }) : [];
      
      // Handle supplier field which could be an object (from MongoDB populate) or a string
      let supplierName = '';
      if (initialData.supplier) {
        // If supplier is an object with a name property (from MongoDB populate)
        if (typeof initialData.supplier === 'object' && initialData.supplier.name) {
          supplierName = initialData.supplier.name;
        } 
        // If supplier is already a string
        else if (typeof initialData.supplier === 'string') {
          supplierName = initialData.supplier;
        }
      }
      
      // Handle expectedDeliveryDate - ensure it's properly formatted
      let expectedDeliveryDate = '';
      if (initialData.expectedDeliveryDate) {
        // Convert to YYYY-MM-DD format for input[type="date"]
        const date = new Date(initialData.expectedDeliveryDate);
        if (!isNaN(date.getTime())) {
          expectedDeliveryDate = date.toISOString().split('T')[0];
        }
      }
      
      console.log('Initial data expectedDeliveryDate:', initialData.expectedDeliveryDate);
      console.log('Formatted expectedDeliveryDate:', expectedDeliveryDate);
      
      setFormData({
        ...initialData,
        date: initialData.date || new Date().toISOString().split('T')[0],
        expectedDeliveryDate: expectedDeliveryDate || initialData.expectedDeliveryDate,
        items: mappedItems,
        supplier: supplierName // Set supplier to the extracted name
      });
    }
  }, [initialData]);
  
  // Set default branch to user's branch when user data becomes available
  useEffect(() => {
    if (user && user.branch && branches.length > 0) {
      const branchId = typeof user.branch === 'object' ? user.branch._id : user.branch;
      let branchName = '';
      
      // Try to get branch name from user object first
      if (user.branchName) {
        branchName = user.branchName;
      } 
      // If not available, try to get it from the branch object
      else if (typeof user.branch === 'object' && user.branch.name) {
        branchName = user.branch.name;
      } 
      // If still not available, try to find it in the fetched branches
      else {
        const foundBranch = branches.find(b => b._id === branchId);
        if (foundBranch) {
          branchName = foundBranch.name;
        }
      }
      
      // Set the branch in form data
      setFormData(prev => ({
        ...prev,
        branch: branchId,
        branchName: branchName
      }));
    }
  }, [user, branches]);

  // Handle product search
  const handleProductSearch = (e) => {
    const value = e.target.value;
    setProductSearch(value);
    setShowProductResults(true);
  };
  
  // Filter products based on search term
  useEffect(() => {
    const uniqueProductsMap = new Map();
    
    products.forEach(product => {
      const lowerCaseName = product.name?.toLowerCase();
      if (lowerCaseName && !uniqueProductsMap.has(lowerCaseName)) {
        uniqueProductsMap.set(lowerCaseName, product);
      }
    });
    
    const uniqueProducts = Array.from(uniqueProductsMap.values());
    
    if (!productSearch) {
      setFilteredProducts(uniqueProducts);
    } else {
      const filtered = uniqueProducts.filter(product => 
        product.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.itemCode?.toLowerCase().includes(productSearch.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [productSearch, products]);
  
  // Handle supplier search
  const handleSupplierSearch = (e) => {
    const value = e.target.value;
    setSupplierSearch(value);
    setShowSupplierResults(true);
  };
  
  // Filter suppliers based on search term
  useEffect(() => {
    if (!supplierSearch) {
      setFilteredSuppliers(suppliers);
    } else {
      const filtered = suppliers.filter(supplier => 
        supplier.name?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        supplier.phone?.toLowerCase().includes(supplierSearch.toLowerCase())
      );
      setFilteredSuppliers(filtered);
    }
  }, [supplierSearch, suppliers]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSupplierResults && !event.target.closest('#supplierSearchContainer')) {
        setShowSupplierResults(false);
      }
      
      if (showProductResults && !event.target.closest('#productSearchContainer')) {
        setShowProductResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSupplierResults, showProductResults]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
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
    
    if (name === 'quantity' || name === 'price') {
      const quantity = name === 'quantity' ? parseFloat(value) || 0 : parseFloat(currentItem.quantity) || 0;
      const price = name === 'price' ? parseFloat(value) || 0 : parseFloat(currentItem.price) || 0;
      updatedItem.total = quantity * price;
    }
    
    setCurrentItem(updatedItem);
    
    if (itemErrors[name]) {
      setItemErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Handle product selection from search results
  const handleProductSelect = async (product) => {
    // Check if we have a supplier selected
    const selectedSupplier = formData.supplier;
    let price = parseFloat(product.price) || 0;
    const quantity = parseFloat(currentItem.quantity) || 1;
    
    // If we have a supplier selected, check for supplier-specific price
    if (selectedSupplier) {
      try {
        // Try to get supplier-specific price
        const response = await api.supplierPrices.getByItem(product.id);
        if (response && response.data && response.data.length > 0) {
          // Find price for the selected supplier
          const supplierPrice = response.data.find(p => {
            // Check if supplier is a string ID or an object with name
            if (typeof p.supplier === 'string') {
              // If we have supplier IDs to compare
              if (typeof selectedSupplier === 'string' && selectedSupplier.match(/^[0-9a-fA-F]{24}$/)) {
                return p.supplier === selectedSupplier;
              }
              // Otherwise, we can't match by ID, so no match
              return false;
            } else if (p.supplier && p.supplier.name) {
              // If supplier is an object with name, match by name
              return p.supplier.name === selectedSupplier;
            }
            return false;
          });
          
          if (supplierPrice && supplierPrice.price > 0) {
            // Use supplier-specific price if available
            price = parseFloat(supplierPrice.price);
            console.log(`Using supplier-specific price: ${price} for ${product.name}`);
          }
        }
      } catch (err) {
        console.log('No supplier-specific prices found or API not available');
      }
    }
    
    setCurrentItem({
      ...currentItem,
      product: product.id,
      name: product.name,
      price: price,
      total: price * quantity
    });
    setProductSearch('');
    setShowProductResults(false);
  };
  
  // Handle supplier selection from search results
  const handleSupplierSelect = (supplier) => {
    setFormData(prev => ({
      ...prev,
      supplier: supplier.name
    }));
    setSupplierSearch('');
    setShowSupplierResults(false);
    
    if (errors.supplier) {
      setErrors(prev => ({
        ...prev,
        supplier: ''
      }));
    }
  };

  // Add item to purchase order
  const addItem = () => {
    const newItemErrors = {};
    if (!currentItem.name) newItemErrors.name = 'Product name is required';
    if (!currentItem.quantity || currentItem.quantity <= 0) newItemErrors.quantity = 'Quantity must be greater than 0';
    if (!currentItem.price || currentItem.price <= 0) newItemErrors.price = 'Price must be greater than 0';
    
    const duplicateItem = formData.items.find(item => 
      item.name.toLowerCase() === currentItem.name.toLowerCase()
    );
    
    if (duplicateItem) {
      newItemErrors.name = 'An item with this name already exists in the order';
    }
    
    if (Object.keys(newItemErrors).length > 0) {
      setItemErrors(newItemErrors);
      return;
    }
    
    // Use a temporary ID for frontend tracking only, don't use Date.now() as _id
    const newItem = {
      ...currentItem,
      tempId: Date.now(), // Use tempId instead of id to avoid MongoDB _id conflicts
    };
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    
    setCurrentItem({
      product: '',
      name: '',
      quantity: 1,
      price: 0,
      total: 0,
    });
    
    setItemErrors({});
  };

  // Remove item from purchase order
  const removeItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.tempId !== itemId),
    }));
  };

  // Calculate total amount
  const totalAmount = formData.items.reduce((sum, item) => sum + item.total, 0);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newErrors = {};
    if (!formData.supplier) newErrors.supplier = 'Supplier is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.expectedDeliveryDate) newErrors.expectedDeliveryDate = 'Expected delivery date is required';
    if (formData.items.length === 0) newErrors.items = 'At least one item is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Prepare data for submission - remove any fields that could cause MongoDB _id conflicts
    const purchaseOrderData = {
      ...formData,
      // Don't set an ID - let MongoDB generate it
      // If editing an existing PO, the _id will already be in formData
      subtotal: totalAmount,
      totalAmount: totalAmount, // Set both subtotal and totalAmount
      // Map date field to orderDate for MongoDB
      orderDate: formData.date,
      // Clean up items to avoid _id conflicts
      items: formData.items.map(item => {
        // Create a clean copy of the item without tempId
        const cleanItem = { ...item };
        delete cleanItem.tempId;
        delete cleanItem.id; // Remove any id field that might exist
        
        // Ensure item has the correct field names for the backend and all values are numbers
        if (cleanItem.price !== undefined) {
          // Convert price to a number and ensure it's not NaN
          const numericPrice = parseFloat(cleanItem.price);
          cleanItem.unitPrice = isNaN(numericPrice) ? 0 : numericPrice;
          cleanItem.price = cleanItem.unitPrice; // Keep price for backward compatibility
        } else if (cleanItem.unitPrice !== undefined) {
          // If unitPrice is already set, ensure it's a number
          const numericUnitPrice = parseFloat(cleanItem.unitPrice);
          cleanItem.unitPrice = isNaN(numericUnitPrice) ? 0 : numericUnitPrice;
        } else {
          // Default to 0 if neither price nor unitPrice is set
          cleanItem.unitPrice = 0;
          cleanItem.price = 0;
        }
        
        // Ensure quantity is a number
        if (cleanItem.quantity !== undefined) {
          const numericQuantity = parseFloat(cleanItem.quantity);
          cleanItem.quantity = isNaN(numericQuantity) ? 1 : numericQuantity;
        } else {
          cleanItem.quantity = 1;
        }
        
        // Recalculate total to ensure it's correct
        cleanItem.total = cleanItem.quantity * cleanItem.unitPrice;
        
        // Map product to inventory field for MongoDB
        if (cleanItem.product !== undefined && !cleanItem.inventory) {
          cleanItem.inventory = cleanItem.product;
        }
        
        return cleanItem;
      })
    };
    
    // Remove any empty ID fields that could cause MongoDB casting errors
    if (purchaseOrderData._id === '') {
      delete purchaseOrderData._id;
    }
    
    // Also remove any 'id' field if it exists
    if (purchaseOrderData.id === '') {
      delete purchaseOrderData.id;
    }
    
    // If this is a new PO, we can set orderNumber but not _id
    if (!formData._id) {
      purchaseOrderData.orderNumber = `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    }
    
    onSave(purchaseOrderData);
  };

  // Common input classes for consistency
  const inputClasses = "block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-2 px-3 sm:text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const errorClasses = "mt-2 text-sm text-red-600";

  // Check for permission before submitting
  const handleSubmitWithPermissionCheck = (e) => {
    e.preventDefault();
    
    if (!hasManagePermission) {
      setPermissionError('You do not have permission to create or update purchase orders.');
      return;
    }
    
    handleSubmit(e);
  };

  return (
    <form onSubmit={handleSubmitWithPermissionCheck} className="space-y-6">
      {/* Permission Error Message */}
      {permissionError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{permissionError}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  type="button"
                  onClick={() => setPermissionError(null)}
                  className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Basic Information */}
      <Card title="Purchase Order Information">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Supplier Search */}
          <div id="supplierSearchContainer" className="relative">
            <label htmlFor="supplierSearch" className={labelClasses}>
              Supplier <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                id="supplierSearch"
                placeholder="Search for supplier..."
                value={supplierSearch}
                onChange={handleSupplierSearch}
                onFocus={() => {
                  // Show results if there's any search term
                  if (supplierSearch) {
                    setShowSupplierResults(true);
                  } else {
                    // If no search term, show all results
                    setShowSupplierResults(true);
                  }
                }}
                onClick={() => {
                  // Show results if there's any search term
                  if (supplierSearch) {
                    setShowSupplierResults(true);
                  } else {
                    // If no search term, show all results
                    setShowSupplierResults(true);
                  }
                }}
                className={`${inputClasses} ${errors.supplier ? 'border-red-300' : ''} pl-10`}
              />
              {formData.supplier && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                    {formData.supplier}
                  </span>
                </div>
              )}
            </div>
            
            {/* Search Results */}
            {showSupplierResults && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                {loading.suppliers ? (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    Loading suppliers...
                  </div>
                ) : filteredSuppliers.length > 0 ? (
                  <ul className="py-1">
                    {filteredSuppliers.map(supplier => (
                      <li 
                        key={supplier.id}
                        className="px-3 py-1 hover:bg-gray-100 cursor-pointer flex justify-between items-center text-xs"
                        onClick={() => handleSupplierSelect(supplier)}
                      >
                        <span>
                          {supplier.name}
                          {supplier.email && (
                            <span className="ml-1 text-xs text-gray-500">
                              - {supplier.email}
                            </span>
                          )}
                        </span>
                        {supplier.phone && (
                          <span className="text-gray-600">{supplier.phone}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    {supplierSearch ? 'No suppliers found.' : 'Type to search suppliers'}
                  </div>
                )}
              </div>
            )}
            
            {errors.supplier && (
              <p className={errorClasses}>{errors.supplier}</p>
            )}
          </div>

          {/* Branch Selection */}
          <div>
            <label htmlFor="branch" className={labelClasses}>
              Branch <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              {loadingBranches ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                  <span className="text-sm text-gray-500">Loading branches...</span>
                </div>
              ) : branches.length > 0 ? (
                <div className="relative">
                  <select
                    id="branch"
                    name="branch"
                    value={formData.branch}
                    onChange={(e) => {
                      const selectedBranch = branches.find(b => b._id === e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        branch: e.target.value,
                        branchName: selectedBranch ? selectedBranch.name : ''
                      }));
                    }}
                    className={`${inputClasses} appearance-none pr-10 ${errors.branch ? 'border-red-300' : ''}`}
                    disabled={user && user.role !== 'admin' && user.role !== 'user'}
                  >
                    <option value="">Select a branch</option>
                    {branches.map(branch => (
                      <option key={branch._id} value={branch._id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  id="branchDisplay"
                  value={formData.branchName || 'No branches available'}
                  className={`${inputClasses} ${errors.branch ? 'border-red-300' : ''}`}
                  disabled={true}
                  readOnly
                />
              )}
            </div>
            {errors.branch && (
              <p className={errorClasses}>{errors.branch}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className={labelClasses}>Status</label>
            <div className="relative">
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={`${inputClasses} appearance-none pr-10`}
              >
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Completed">Completed</option>
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
              Order Date <span className="text-red-500">*</span>
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

          {/* Expected Delivery Date */}
          <div>
            <label htmlFor="expectedDeliveryDate" className={labelClasses}>
              Expected Delivery Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="expectedDeliveryDate"
              name="expectedDeliveryDate"
              value={formData.expectedDeliveryDate}
              onChange={handleChange}
              className={`${inputClasses} ${errors.expectedDeliveryDate ? 'border-red-300' : ''}`}
              required
            />
            {errors.expectedDeliveryDate && (
              <p className={errorClasses}>{errors.expectedDeliveryDate}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Items */}
      <Card title="Order Items">
        {/* Add Item Form */}
        <div className="mb-6 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h4 className="text-lg font-medium text-gray-800 mb-4">Add Item to Purchase Order</h4>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-12">
            {/* Product Search */}
            <div id="productSearchContainer" className="sm:col-span-5 relative">
              <label htmlFor="productSearch" className={labelClasses}>Search Product</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="productSearch"
                  placeholder="Search for products..."
                  value={productSearch}
                  onChange={handleProductSearch}
                  onFocus={() => {
                    // Show results if there's any search term
                    if (productSearch) {
                      setShowProductResults(true);
                    } else {
                      // If no search term, show all results
                      setShowProductResults(true);
                    }
                  }}
                  onClick={() => {
                    // Show results if there's any search term
                    if (productSearch) {
                      setShowProductResults(true);
                    } else {
                      // If no search term, show all results
                      setShowProductResults(true);
                    }
                  }}
                  className={`${inputClasses} ${itemErrors.inventory ? 'border-red-300' : ''} pl-10`}
                />
                {currentItem.name && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <span className="text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                      {currentItem.name}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Search Results */}
              {showProductResults && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                {loading.products ? (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    Loading inventory...
                  </div>
                ) : filteredProducts.length > 0 ? (
                  <ul className="py-1">
                    {filteredProducts.map(product => (
                      <li 
                        key={product.id}
                        className="px-3 py-1 hover:bg-gray-100 cursor-pointer flex justify-between items-center text-xs"
                        onClick={() => handleProductSelect(product)}
                      >
                        <span>
                          {product.name} {product.itemCode && `(${product.itemCode})`}
                        </span>
                        <span className="text-primary-600 font-medium">${product.price.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    {productSearch ? 'No products found.' : 'Type to search products'}
                  </div>
                )}
                </div>
              )}
            </div>

            {/* Custom Product Name */}
            <div className="sm:col-span-3">
              <label htmlFor="name" className={labelClasses}>Product Name</label>
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
              <label htmlFor="quantity" className={labelClasses}>Quantity</label>
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
              <label htmlFor="price" className={labelClasses}>Unit Price</label>
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
            
            {/* Add Item Button */}
            <div className="sm:col-span-12 flex justify-end">
              <Button 
                type="button" 
                variant="primary" 
                onClick={addItem}
                disabled={!currentItem.name || !currentItem.quantity || !currentItem.price}
              >
                Add Item
              </Button>
            </div>
          </div>
        </div>
        
        {/* Items Table */}
        {formData.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.items.map(item => (
                  <tr key={item.tempId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${(parseFloat(item.price) || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${(parseFloat(item.total) || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => removeItem(item.tempId)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-right text-sm font-medium text-gray-900">Total:</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">${totalAmount.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No items added yet. Use the form above to add items to your purchase order.
            {errors.items && <p className="mt-2 text-sm text-red-600">{errors.items}</p>}
          </div>
        )}
      </Card>

      {/* Notes */}
      <Card title="Additional Notes">
        <div>
          <label htmlFor="notes" className={labelClasses}>Notes</label>
          <textarea
            id="notes"
            name="notes"
            rows="3"
            value={formData.notes}
            onChange={handleChange}
            className={inputClasses}
            placeholder="Add any additional notes or instructions for this purchase order"
          ></textarea>
        </div>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {initialData ? 'Update Purchase Order' : 'Create Purchase Order'}
        </Button>
      </div>
    </form>
  );
};

export default PurchaseOrderForm;
