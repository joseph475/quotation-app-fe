import { h } from 'preact';
import { useState } from 'preact/hooks';
import Card from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';
import { generateFingerprint } from '../../utils/fingerprinting';

/**
 * LoginForm component for user authentication
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onLogin - Login handler function
 * @param {boolean} [props.isLoading=false] - Whether login is in progress
 * @param {string} [props.error=''] - Error message to display
 */
const LoginForm = ({ onLogin, isLoading = false, error = '' }) => {
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  // Form validation
  const [errors, setErrors] = useState({});
  
  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);

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

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      // Generate device fingerprint
      console.log('Generating device fingerprint...');
      const deviceFingerprint = await generateFingerprint();
      console.log('Device fingerprint generated:', Object.keys(deviceFingerprint));
      console.log('Fingerprint object:', deviceFingerprint);
      console.log('Fingerprint is empty?', Object.keys(deviceFingerprint).length === 0);
      
      const credentialsToSend = {
        ...formData,
        deviceFingerprint
      };
      
      console.log('Credentials being sent to onLogin:', {
        email: credentialsToSend.email,
        hasPassword: !!credentialsToSend.password,
        hasDeviceFingerprint: !!credentialsToSend.deviceFingerprint,
        deviceFingerprintKeys: credentialsToSend.deviceFingerprint ? Object.keys(credentialsToSend.deviceFingerprint) : []
      });
      
      // Call the login handler with fingerprint
      onLogin(credentialsToSend);
    } catch (error) {
      console.error('Error generating fingerprint:', error);
      console.error('Error stack:', error.stack);
      // Continue with login even if fingerprinting fails
      onLogin(formData);
    }
  };

  // Common input classes for consistency
  const inputClasses = "block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-3 px-4 text-sm transition-all duration-200";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1.5";
  const errorClasses = "mt-2 text-sm text-red-600";

  // Email icon for input
  const emailIcon = (
    <svg class="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
    </svg>
  );

  // Lock icon for input
  const lockIcon = (
    <svg class="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
    </svg>
  );

  // Eye icons for password visibility toggle
  const eyeOpenIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
      <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
    </svg>
  );
  
  const eyeClosedIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd" />
      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
    </svg>
  );

  return (
    <form onSubmit={handleSubmit} class="space-y-6">
      {/* Display error message if any */}
      {error && (
        <div class="rounded-lg bg-red-50 border border-red-200 p-4 animate-fade-in">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-red-800">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      <div class="space-y-6">
        {/* Email Input */}
        <div class="transform transition-all duration-200 hover:translate-y-[-2px]">
          <label htmlFor="email" className={labelClasses}>
            Email Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {emailIcon}
            </div>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`${inputClasses} ${errors.email ? 'border-red-300' : ''} pl-10 focus:shadow-md`}
              placeholder="Enter your email"
              required
              autoComplete="email"
            />
          </div>
          {errors.email && (
            <p className={errorClasses}>{errors.email}</p>
          )}
        </div>

        {/* Password Input */}
        <div class="transform transition-all duration-200 hover:translate-y-[-2px]">
          <label htmlFor="password" className={labelClasses}>
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {lockIcon}
            </div>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`${inputClasses} ${errors.password ? 'border-red-300' : ''} pl-10 pr-10 focus:shadow-md`}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                tabIndex="-1"
              >
                {showPassword ? eyeClosedIcon : eyeOpenIcon}
              </button>
            </div>
          </div>
          {errors.password && (
            <p className={errorClasses}>{errors.password}</p>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div class="flex items-center justify-between pt-2">
          <div class="flex items-center">
            <input
              id="rememberMe"
              name="rememberMe"
              type="checkbox"
              checked={formData.rememberMe}
              onChange={handleChange}
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded transition-colors"
            />
            <label for="rememberMe" class="ml-2 block text-sm text-gray-700">
              Remember me
            </label>
          </div>

          <div class="text-sm">
            <a href="#" class="font-medium text-primary-600 hover:text-primary-500 transition-colors hover:underline">
              Forgot your password?
            </a>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div class="pt-4">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isLoading}
          disabled={isLoading}
          className="py-3 text-base font-medium shadow-lg hover:shadow-xl transform transition-all duration-200 hover:translate-y-[-2px]"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>
      </div>
    </form>
  );
};

export default LoginForm;
