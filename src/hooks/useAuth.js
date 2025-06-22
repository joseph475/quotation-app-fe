import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import api from '../services/api';
import { storeAuthUser, clearAuthUser, initializeAppData } from '../utils/localStorageHelpers';

/**
 * Custom hook for authentication
 * 
 * Provides authentication state and methods for login, logout, etc.
 */
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          setIsLoading(false);
          return;
        }
        
        // Validate token with the server
        try {
          // This would be a call to a /me or /profile endpoint
          // For now, we'll use the auth endpoint with a GET request
          const response = await api.auth.getProfile();
          
          if (response && response.success) {
            // The user data is in response.data for the getProfile endpoint
            const userData = response.data;
            
            // No branch functionality needed
            
            // Store user data in local storage
            storeAuthUser(userData);
            
            setUser(userData);
            setIsAuthenticated(true);
            
        // Remove blocking data initialization - let pages load data on-demand
        // This improves initial load performance significantly
          } else if (response && response.status === 401) {
            // Only remove token if it's specifically a 401 auth error
            console.log('Token validation failed with 401, removing token');
            localStorage.removeItem('authToken');
          } else {
            // For other errors, keep the token but log the issue
            console.log('Token validation failed but keeping token:', response);
          }
        } catch (error) {
          console.error('Token validation error:', error);
          // Only remove token if it's an auth-related error
          if (error.message && error.message.includes('Authentication failed')) {
            console.log('Auth-related error, removing token');
            localStorage.removeItem('authToken');
          } else {
            console.log('Non-auth error, keeping token:', error.message);
          }
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Authentication error:', err);
        setError(err.message);
        localStorage.removeItem('authToken'); // Ensure token is removed on error
        setIsAuthenticated(false); // Ensure authentication state is false
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  /**
   * Login user
   * 
   * @param {Object} credentials - User credentials (email, password)
   * @returns {Promise<Object>} - User data
   */
  const login = async (credentials) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('useAuth.login received credentials:', {
        email: credentials.email,
        hasPassword: !!credentials.password,
        hasDeviceFingerprint: !!credentials.deviceFingerprint,
        deviceFingerprintKeys: credentials.deviceFingerprint ? Object.keys(credentials.deviceFingerprint) : [],
        credentialsKeys: Object.keys(credentials)
      });
      
      // Make API call to login endpoint
      const response = await api.auth.login(credentials);
      
      if (response && response.success) {
        // Store token in localStorage
        if (response.token) {
          localStorage.setItem('authToken', response.token);
        }
        
        // The user data is in response.user, not response.data
        const userData = {
          ...response.user
        };
        
        // Store user data in local storage
        storeAuthUser(userData);
        
        setUser(userData);
        setIsAuthenticated(true);
        
        // Handle security analysis if present
        if (response.security) {
          const { warnings, isNewDevice, riskScore, sessionLimitExceeded } = response.security;
          
          // Store current device ID for future reference
          if (response.security.deviceId) {
            localStorage.setItem('currentDeviceId', response.security.deviceId);
          }
          
          // Show security warnings if any
          if (warnings && warnings.length > 0) {
            console.warn('Security warnings:', warnings);
            
            // You can implement a notification system here
            // For now, we'll just log the warnings
            warnings.forEach(warning => {
              console.warn(`Security Alert: ${warning}`);
            });
          }
          
          // Handle session limit exceeded
          if (sessionLimitExceeded) {
            console.warn('Maximum concurrent sessions exceeded');
            // You might want to show a modal or notification here
          }
          
          // Log new device detection
          if (isNewDevice) {
            console.info('Login from new device detected');
          }
        }
        
        // Note: Removed blocking data initialization for better performance
        // Data will be loaded on-demand by individual pages using useDataLoader
        console.log('Login successful - data will be loaded on-demand for better performance');
        
        setIsLoading(false);
        
        // After successful login, redirect to dashboard
        // Use route instead of window.location.href to prevent hard navigation
        route('/', true);
        
        return userData;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      setIsLoading(false);
      throw err;
    }
  };

  /**
   * Logout user
   */
  const logout = () => {
    // Clear auth token from localStorage
    localStorage.removeItem('authToken');
    
    // Clear auth user from localStorage
    clearAuthUser();
    
    // Reset user state
    setUser(null);
    setIsAuthenticated(false);
    
    // Make API call to logout endpoint - but don't wait for it
    // This ensures we logout even if the API call fails
    api.auth.logout().catch(err => {
      console.error('Logout API error:', err);
      // We don't need to handle this error as we've already cleared local state
    });
    
    // Redirect to login page
    route('/login', true);
  };

  /**
   * Register new user
   * 
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} - User data
   */
  const register = async (userData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Make API call to register endpoint
      const response = await api.auth.register(userData);
      
      if (response && response.success) {
        // Store token in localStorage
        if (response.token) {
          localStorage.setItem('authToken', response.token);
        }
        
        const userData = { ...response.data };
        
        // Store user data in local storage
        storeAuthUser(userData);
        
        setUser(userData);
        setIsAuthenticated(true);
        
        // Fetch and store app data upon successful registration
        try {
          await initializeAppData(true); // Force refresh to get the latest data
        } catch (dataError) {
          console.error('Error fetching app data after registration:', dataError);
          // Continue even if data fetch fails
        }
        
        setIsLoading(false);
        
        return userData;
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      setIsLoading(false);
      throw err;
    }
  };

  /**
   * Update user profile
   * 
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object>} - Updated user data
   */
  const updateProfile = async (userData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Make API call to update profile endpoint
      const response = await api.auth.updateProfile(userData);
      
      if (response && response.success) {
        const updatedUserData = { ...response.data };
        
        // Update user data in local storage
        storeAuthUser(updatedUserData);
        
        setUser(updatedUserData);
        setIsLoading(false);
        
        return updatedUserData;
      } else {
        throw new Error(response.message || 'Profile update failed');
      }
    } catch (err) {
      setError(err.message || 'Profile update failed. Please try again.');
      setIsLoading(false);
      throw err;
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register,
    updateProfile,
  };
};

export default useAuth;
