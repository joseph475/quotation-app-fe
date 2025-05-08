import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Card from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';

/**
 * ProfileForm component for user profile management
 * 
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user data
 * @param {Function} props.onUpdate - Update profile handler function
 * @param {boolean} [props.isLoading=false] - Whether update is in progress
 * @param {string} [props.error=''] - Error message to display
 */
const ProfileForm = ({ user, onUpdate, isLoading = false, error = '' }) => {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Form validation
  const [errors, setErrors] = useState({});

  // Populate form with user data when available
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  }, [user]);

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

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    
    // Password validation
    if (formData.newPassword) {
      if (!formData.currentPassword) newErrors.currentPassword = 'Current password is required';
      if (formData.newPassword.length < 6) newErrors.newPassword = 'Password must be at least 6 characters';
      if (formData.newPassword !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Call the update handler
    onUpdate(formData);
  };

  // User icon for input
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

  // Building icon for department input
  const buildingIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a1 1 0 00-1-1H7a1 1 0 00-1 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clip-rule="evenodd" />
    </svg>
  );

  // Briefcase icon for position input
  const briefcaseIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd" />
      <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
    </svg>
  );
  
  // Lock icon for password input
  const lockIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
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
          {/* Name Input */}
          <Input
            id="name"
            name="name"
            type="text"
            label="Full Name"
            placeholder="Enter your full name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            required
            leftIcon={userIcon}
          />

          {/* Email Input */}
          <Input
            id="email"
            name="email"
            type="email"
            label="Email Address"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            required
            leftIcon={emailIcon}
          />

          {/* Phone Input */}
          <Input
            id="phone"
            name="phone"
            type="tel"
            label="Phone Number"
            placeholder="Enter your phone number"
            value={formData.phone}
            onChange={handleChange}
            error={errors.phone}
            leftIcon={phoneIcon}
          />

          <div class="pt-4 border-t border-gray-200 mt-4">
            <h3 class="text-lg font-medium text-gray-900">Change Password</h3>
            <p class="mt-1 text-sm text-gray-500">
              Leave blank if you don't want to change your password
            </p>
          </div>

          {/* Current Password Input */}
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            label="Current Password"
            placeholder="Enter your current password"
            value={formData.currentPassword}
            onChange={handleChange}
            error={errors.currentPassword}
            leftIcon={lockIcon}
          />

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* New Password Input */}
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              label="New Password"
              placeholder="Enter new password"
              value={formData.newPassword}
              onChange={handleChange}
              error={errors.newPassword}
              leftIcon={lockIcon}
            />

            {/* Confirm Password Input */}
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              label="Confirm New Password"
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              leftIcon={lockIcon}
            />
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
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Card>
    </form>
  );
};

export default ProfileForm;
