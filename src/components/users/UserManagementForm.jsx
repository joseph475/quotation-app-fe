import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Card from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import api from '../../services/api';

/**
 * UserManagementForm component for creating and editing users
 * 
 * @param {Object} props - Component props
 * @param {Object} [props.user] - User data for editing (null for new user)
 * @param {Function} props.onSubmit - Form submission handler
 * @param {boolean} [props.isLoading=false] - Whether submission is in progress
 * @param {string} [props.error=''] - Error message to display
 */
const UserManagementForm = ({ user, onSubmit, isLoading = false, error = '' }) => {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    department: '',
    branch: '',
    isActive: true,
    password: '',
    confirmPassword: ''
  });
  
  // Form validation
  const [errors, setErrors] = useState({});
  
  // Branches state
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Fetch branches on component mount
  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const response = await api.branches.getAll();
        if (response && response.data) {
          setBranches(response.data);
        }
      } catch (err) {
        console.error('Error fetching branches:', err);
      } finally {
        setLoadingBranches(false);
      }
    };
    
    fetchBranches();
  }, []);

  // Populate form with user data when editing
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'user',
        department: user.department || '',
        branch: user.branch || '',
        isActive: user.isActive !== undefined ? user.isActive : true,
        password: '',
        confirmPassword: ''
      });
    }
  }, [user]);

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
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!user && !formData.password) newErrors.password = 'Password is required for new users';
    if (formData.password && formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Call the submit handler
    onSubmit({
      ...formData,
      // Don't include password if it's empty (for editing)
      ...(formData.password ? {} : { password: undefined, confirmPassword: undefined })
    });
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

  // Lock icon for password input
  const lockIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
    </svg>
  );

  // Role icon for role input
  const roleIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 006 0h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 4a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm-1 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clip-rule="evenodd" />
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
            placeholder="Enter user's full name"
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
            placeholder="Enter user's email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            required
            leftIcon={emailIcon}
          />

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phone Input */}
            <Input
              id="phone"
              name="phone"
              type="tel"
              label="Phone Number"
              placeholder="Enter user's phone number"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
              leftIcon={phoneIcon}
            />

            {/* Department Input */}
            <Input
              id="department"
              name="department"
              type="text"
              label="Department"
              placeholder="Enter user's department"
              value={formData.department}
              onChange={handleChange}
              error={errors.department}
              leftIcon={buildingIcon}
            />
          </div>

          {/* Branch Selection - Only shown if role is not admin */}
          {formData.role !== 'admin' && (
            <div>
              <label for="branch" class="block text-sm font-medium text-gray-700">
                Branch
              </label>
              <div class="mt-1 relative rounded-md shadow-sm">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {buildingIcon}
                </div>
                <Select
                  id="branch"
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  disabled={loadingBranches}
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="">Select a branch</option>
                  {branches.map(branch => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))}
                </Select>
              </div>
              {errors.branch && (
                <p class="mt-1 text-sm text-red-600">{errors.branch}</p>
              )}
              {loadingBranches && (
                <p class="mt-1 text-sm text-gray-500">Loading branches...</p>
              )}
            </div>
          )}
          
          {/* Display info message for admin users */}
          {formData.role === 'admin' && (
            <div class="bg-blue-50 border-l-4 border-blue-400 p-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-blue-700">
                    Admin users have access to all branches. Branch will be set to 'All' automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Role Selection */}
          <div>
            <label for="role" class="block text-sm font-medium text-gray-700">
              Role
            </label>
            <div class="mt-1 relative rounded-md shadow-sm">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {roleIcon}
              </div>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                class="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            {errors.role && (
              <p class="mt-1 text-sm text-red-600">{errors.role}</p>
            )}
          </div>

          {/* Active Status */}
          <div class="flex items-center">
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={handleChange}
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label for="isActive" class="ml-2 block text-sm text-gray-900">
              Active Account
            </label>
          </div>

          <div class="pt-4 border-t border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">
              {user ? 'Change Password' : 'Set Password'}
            </h3>
            <p class="mt-1 text-sm text-gray-500">
              {user ? 'Leave blank to keep the current password' : 'Create a secure password for this user'}
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Password Input */}
            <Input
              id="password"
              name="password"
              type="password"
              label="Password"
              placeholder={user ? "Enter new password" : "Enter password"}
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required={!user}
              leftIcon={lockIcon}
            />

            {/* Confirm Password Input */}
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              label="Confirm Password"
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              required={!user}
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
            {isLoading ? 'Saving...' : user ? 'Update User' : 'Create User'}
          </Button>
        </div>
      </Card>
    </form>
  );
};

export default UserManagementForm;
