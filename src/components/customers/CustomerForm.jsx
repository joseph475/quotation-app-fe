import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Card from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import Textarea from '../common/Textarea';

/**
 * CustomerForm component for creating and editing customers
 * 
 * @param {Object} props - Component props
 * @param {Object} [props.customer] - Customer data for editing (null for new customer)
 * @param {Function} props.onSubmit - Form submission handler
 * @param {boolean} [props.isLoading=false] - Whether submission is in progress
 * @param {string} [props.error=''] - Error message to display
 */
const CustomerForm = ({ customer, onSubmit, isLoading = false, error = '' }) => {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    address: '',
    taxId: '',
    customerType: 'individual',
    notes: '',
    status: 'Active' // Keeping status for frontend display purposes
  });
  
  // Form validation
  const [errors, setErrors] = useState({});

  // Populate form with customer data when editing
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        contactPerson: customer.contactPerson || '',
        phone: customer.phone || '',
        address: customer.address || '',
        taxId: customer.taxId || '',
        customerType: customer.customerType || 'individual',
        notes: customer.notes || '',
        status: customer.status || 'Active'
      });
    }
  }, [customer]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: fieldValue,
    }));
    
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
    if (!formData.contactPerson) newErrors.contactPerson = 'Contact person is required';
    if (!formData.phone) newErrors.phone = 'Phone number is required';
    
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

  // Tax ID icon
  const taxIdIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
    </svg>
  );

  // Customer Type icon
  const customerTypeIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
    </svg>
  );

  // Notes icon
  const notesIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clip-rule="evenodd" />
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
          {/* Company/Customer Name Input */}
          <Input
            id="name"
            name="name"
            type="text"
            label="Company Name"
            placeholder="Enter company name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
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
            required
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

          {/* Address Input */}
          <Input
            id="address"
            name="address"
            type="text"
            label="Address"
            placeholder="Enter complete address"
            value={formData.address}
            onChange={handleChange}
            error={errors.address}
            leftIcon={locationIcon}
          />

          {/* Tax ID Input */}
          <Input
            id="taxId"
            name="taxId"
            type="text"
            label="Tax ID"
            placeholder="Enter tax identification number"
            value={formData.taxId}
            onChange={handleChange}
            error={errors.taxId}
            leftIcon={taxIdIcon}
          />

          {/* Customer Type Selection */}
          <Select
            id="customerType"
            name="customerType"
            label="Customer Type"
            value={formData.customerType}
            onChange={handleChange}
            error={errors.customerType}
            leftIcon={customerTypeIcon}
            options={[
              { value: 'individual', label: 'Individual' },
              { value: 'business', label: 'Business' },
              { value: 'government', label: 'Government' }
            ]}
          />

          {/* Notes Input */}
          <Textarea
            id="notes"
            name="notes"
            label="Notes"
            placeholder="Additional notes about the customer"
            value={formData.notes}
            onChange={handleChange}
            error={errors.notes}
            leftIcon={notesIcon}
            rows={3}
          />

          {/* Status Selection (Frontend only) */}
          <Select
            id="status"
            name="status"
            label="Status"
            value={formData.status}
            onChange={handleChange}
            error={errors.status}
            leftIcon={statusIcon}
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' }
            ]}
          />
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
            {isLoading ? 'Saving...' : customer ? 'Update Customer' : 'Create Customer'}
          </Button>
        </div>
      </Card>
    </form>
  );
};

export default CustomerForm;
