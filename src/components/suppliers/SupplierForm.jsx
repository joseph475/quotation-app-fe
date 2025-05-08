import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Card from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';

/**
 * SupplierForm component for creating and editing suppliers
 * 
 * @param {Object} props - Component props
 * @param {Object} [props.supplier] - Supplier data for editing (null for new supplier)
 * @param {Function} props.onSubmit - Form submission handler
 * @param {boolean} [props.isLoading=false] - Whether submission is in progress
 * @param {string} [props.error=''] - Error message to display
 */
const SupplierForm = ({ supplier, onSubmit, isLoading = false, error = '' }) => {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: ''
    },
    taxId: '',
    paymentTerms: '',
    notes: '',
    isActive: true
  });
  
  // Form validation
  const [errors, setErrors] = useState({});

  // Populate form with supplier data when editing
  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        contactPerson: supplier.contactPerson || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: {
          street: supplier.address?.street || '',
          city: supplier.address?.city || '',
          state: supplier.address?.state || '',
          postalCode: supplier.address?.postalCode || '',
          country: supplier.address?.country || ''
        },
        taxId: supplier.taxId || '',
        paymentTerms: supplier.paymentTerms || '',
        notes: supplier.notes || '',
        isActive: supplier.isActive !== undefined ? supplier.isActive : true
      });
    }
  }, [supplier]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    // Handle nested address fields
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: fieldValue
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: fieldValue,
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
    if (!formData.name) newErrors.name = 'Supplier name is required';
    if (!formData.phone) newErrors.phone = 'Phone number is required';
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Call the submit handler
    onSubmit(formData);
  };

  // Building icon for company input
  const buildingIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a1 1 0 00-1-1H7a1 1 0 00-1 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clip-rule="evenodd" />
    </svg>
  );

  // User icon for contact person input
  const userIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
    </svg>
  );

  // Email icon for input
  const emailIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
    </svg>
  );

  // Phone icon for input
  const phoneIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
    </svg>
  );

  // Location icon for address input
  const locationIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
    </svg>
  );

  // Document icon for tax ID input
  const documentIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
    </svg>
  );

  // Clock icon for payment terms input
  const clockIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
    </svg>
  );

  // Notes icon for notes input
  const notesIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
      <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" />
    </svg>
  );

  // Status icon for status input
  const statusIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
    </svg>
  );

  return (
    <form onSubmit={handleSubmit} class="space-y-6">
      <Card>
        {/* Display error message if any */}
        {error && (
          <div class="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        <div class="space-y-4">
          {/* Company Name Input */}
          <Input
            id="name"
            name="name"
            type="text"
            label="Supplier Name"
            placeholder="Enter supplier name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            required
            leftIcon={buildingIcon}
          />

          {/* Contact Person Input */}
          <Input
            id="contactPerson"
            name="contactPerson"
            type="text"
            label="Contact Person"
            placeholder="Enter contact person name"
            value={formData.contactPerson}
            onChange={handleChange}
            error={errors.contactPerson}
            leftIcon={userIcon}
          />

          {/* Email Input */}
          <Input
            id="email"
            name="email"
            type="email"
            label="Email"
            placeholder="Enter email address"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            leftIcon={emailIcon}
          />

          {/* Phone Input */}
          <Input
            id="phone"
            name="phone"
            type="tel"
            label="Phone Number"
            placeholder="Enter phone number"
            value={formData.phone}
            onChange={handleChange}
            error={errors.phone}
            required
            leftIcon={phoneIcon}
          />

          {/* Address Section */}
          <div class="border border-gray-200 rounded-md p-4">
            <h3 class="text-lg font-medium text-gray-900 mb-3">Address</h3>
            
            {/* Street Address */}
            <Input
              id="address.street"
              name="address.street"
              type="text"
              label="Street Address"
              placeholder="Enter street address"
              value={formData.address.street}
              onChange={handleChange}
              error={errors['address.street']}
              leftIcon={locationIcon}
            />
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* City */}
              <Input
                id="address.city"
                name="address.city"
                type="text"
                label="City"
                placeholder="Enter city"
                value={formData.address.city}
                onChange={handleChange}
                error={errors['address.city']}
              />
              
              {/* State/Province */}
              <Input
                id="address.state"
                name="address.state"
                type="text"
                label="State/Province"
                placeholder="Enter state or province"
                value={formData.address.state}
                onChange={handleChange}
                error={errors['address.state']}
              />
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Postal Code */}
              <Input
                id="address.postalCode"
                name="address.postalCode"
                type="text"
                label="Postal Code"
                placeholder="Enter postal code"
                value={formData.address.postalCode}
                onChange={handleChange}
                error={errors['address.postalCode']}
              />
              
              {/* Country */}
              <Input
                id="address.country"
                name="address.country"
                type="text"
                label="Country"
                placeholder="Enter country"
                value={formData.address.country}
                onChange={handleChange}
                error={errors['address.country']}
              />
            </div>
          </div>

          {/* Tax ID Input */}
          <Input
            id="taxId"
            name="taxId"
            type="text"
            label="Tax ID"
            placeholder="Enter tax ID"
            value={formData.taxId}
            onChange={handleChange}
            error={errors.taxId}
            leftIcon={documentIcon}
          />

          {/* Payment Terms Input */}
          <Input
            id="paymentTerms"
            name="paymentTerms"
            type="text"
            label="Payment Terms"
            placeholder="e.g., Net 30, COD"
            value={formData.paymentTerms}
            onChange={handleChange}
            error={errors.paymentTerms}
            leftIcon={clockIcon}
          />

          {/* Notes Input */}
          <div>
            <label for="notes" class="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <div class="mt-1 relative rounded-md shadow-sm">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {notesIcon}
              </div>
              <textarea
                id="notes"
                name="notes"
                rows="3"
                class="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="Additional notes about this supplier"
                value={formData.notes}
                onChange={handleChange}
              />
            </div>
            {errors.notes && (
              <p class="mt-1 text-sm text-red-600">{errors.notes}</p>
            )}
          </div>

          {/* Status Selection */}
          <div>
            <label class="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span class="ml-2 text-sm text-gray-700">Active Supplier</span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div class="mt-6">
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={isLoading}
            leftIcon={
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            }
          >
            {isLoading ? 'Saving...' : supplier ? 'Update Supplier' : 'Create Supplier'}
          </Button>
        </div>
      </Card>
    </form>
  );
};

export default SupplierForm;
