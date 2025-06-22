import { h, createContext } from 'preact';
import { useContext, useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import api from '../services/api';
import { storeAuthUser, clearAuthUser, initializeAppData } from '../utils/localStorageHelpers';

// Create the auth context
const AuthContext = createContext();

/**
 * Auth Provider Component
 * 
 * Provides authentication state and methods to all child components
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated on mount - ONLY ONCE
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
          console.log('Checking authentication...');
          const response = await api.auth.getProfile();
          
          if (response && response.success) {
            // The user data is in response.data for the getProfile endpoint
            const userData = response.data;
            
            // Store user data in local storage
            storeAuthUser(userData);
            
            setUser(userData);
            setIsAuthenticated(true);
            
            console.log('Authentication successful');
          } else if (response && response.status === 401) {
            // Only remove token if it's specifically a 401 auth error
            console.log('Token validation failed with 401, removing token');
            localStorage.removeItem('authToken');
            setUser(null);
            setIsAuthenticated(false);
          } else {
            // For other errors, keep the token but log the issue
            console.log('Token validation failed but keeping token:', response);
            setUser(null);
            setIsAuthenticated(false);
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
          setUser(null);
          setIsAuthenticated(false);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Authentication error:', err);
        setError(err.message);
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []); // Empty dependency array ensures this only runs once

  /**
   * Login user
   */
  const login = async (credentials) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('AuthContext.login received credentials:', {
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
            
            warnings.forEach(warning => {
              console.warn(`Security Alert: ${warning}`);
            });
          }
          
          // Handle session limit exceeded
          if (sessionLimitExceeded) {
            console.warn('Maximum concurrent sessions exceeded');
          }
          
          // Log new device detection
          if (isNewDevice) {
            console.info('Login from new device detected');
          }
        }
        
        console.log('Login successful - data will be loaded on-demand for better performance');
        
        setIsLoading(false);
        
        // After successful login, redirect to dashboard
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
    api.auth.logout().catch(err => {
      console.error('Logout API error:', err);
    });
    
    // Redirect to login page
    route('/login', true);
  };

  /**
   * Register new user
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
          await initializeAppData(true);
        } catch (dataError) {
          console.error('Error fetching app data after registration:', dataError);
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

  const value = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use the auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default useAuth;
