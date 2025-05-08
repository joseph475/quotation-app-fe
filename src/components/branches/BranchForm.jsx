import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Modal from '../common/Modal';

const BranchForm = ({ branch, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contactNumber: '',
    manager: '',
    email: '',
    isActive: true
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (branch) {
      setFormData({
        name: branch.name || '',
        address: branch.address || '',
        contactNumber: branch.contactNumber || '',
        manager: branch.manager || '',
        email: branch.email || '',
        isActive: branch.isActive !== undefined ? branch.isActive : true
      });
    }
  }, [branch]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Branch name is required';
    }
    
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    
    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact number is required';
    }
    
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await onSubmit(formData);
      if (result && result.error) {
        setErrors({ form: result.error });
        setIsSubmitting(false);
      } else if (result && result.success) {
        // Form submission was successful
        // The modal will be closed by the parent component
      } else {
        // No specific result, assume success
        setIsSubmitting(false);
      }
    } catch (err) {
      setErrors({ form: 'An unexpected error occurred. Please try again.' });
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      title={branch ? 'Edit Branch' : 'Add New Branch'}
      onClose={onCancel}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
            <p>{errors.form}</p>
          </div>
        )}
        
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Branch Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            } focus:outline-none focus:ring-1 focus:ring-primary-500`}
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>
        
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Address <span className="text-red-500">*</span>
          </label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows="3"
            className={`w-full px-3 py-2 border rounded-md ${
              errors.address ? 'border-red-500' : 'border-gray-300'
            } focus:outline-none focus:ring-1 focus:ring-primary-500`}
          />
          {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
        </div>
        
        <div>
          <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Contact Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="contactNumber"
            name="contactNumber"
            value={formData.contactNumber}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md ${
              errors.contactNumber ? 'border-red-500' : 'border-gray-300'
            } focus:outline-none focus:ring-1 focus:ring-primary-500`}
          />
          {errors.contactNumber && <p className="mt-1 text-sm text-red-500">{errors.contactNumber}</p>}
        </div>
        
        <div>
          <label htmlFor="manager" className="block text-sm font-medium text-gray-700 mb-1">
            Branch Manager
          </label>
          <input
            type="text"
            id="manager"
            name="manager"
            value={formData.manager}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            } focus:outline-none focus:ring-1 focus:ring-primary-500`}
          />
          {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
            Active Branch
          </label>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            {isSubmitting ? 'Saving...' : branch ? 'Update Branch' : 'Create Branch'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BranchForm;
