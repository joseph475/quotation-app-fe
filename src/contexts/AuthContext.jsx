import { h, createContext } from 'preact';
import { useContext, useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import api from '../services/api';
import { getAuthUser, saveAuthUser, clearAuthUserAndCache, isAuthenticated } from '../utils/authHelpers';

// Create the auth context
const AuthContext = createContext();

/**
 * Auth Provider Component - Simplified version using localStorage
 */
export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing authentication on app load
  useEffect(() => {
    // Simple check - just verify if we have valid data in localStorage
    const checkAuth = () => {
      try {
        const user = getAuthUser();
        console.log('AuthContext: Checking authentication...', user ? 'User found' : 'No user');
        setIsLoading(false);
      } catch (error) {
        console.error('AuthContext: Error checking authentication:', error);
        clearAuthUserAndCache(); // Clear any corrupted data
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  /**
   * Login user
   */
  const login = async (credentials) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('LOGIN: Starting login process');
      
      // Clear any existing auth data and cache
      clearAuthUserAndCache();
      
      // Make API call to login endpoint
      const response = await api.auth.login(credentials);
      
      console.log('LOGIN: API response:', {
        success: response?.success,
        hasUser: !!response?.user,
        userEmail: response?.user?.email,
        userRole: response?.user?.role
      });
      
      if (response && response.success) {
        // Save user data and token to localStorage
        saveAuthUser(response.user, response.token);
        
        console.log('LOGIN: User data saved to localStorage');
        
        setIsLoading(false);
        
        // Redirect to home page
        route('/', true);
        
        return response.user;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (err) {
      console.error('LOGIN: Error:', err);
      setError(err.message || 'Login failed. Please try again.');
      setIsLoading(false);
      throw err;
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    console.log('LOGOUT: Starting logout process');
    
    try {
      // Call logout API first (while we still have the token)
      await api.auth.logout();
      console.log('LOGOUT: API call successful');
    } catch (err) {
      // Don't throw error for logout API failures - just log them
      console.error('Logout API error (continuing with local logout):', err);
    }
    
    // Clear localStorage and cache regardless of API call result
    clearAuthUserAndCache();
    
    // Reset state
    setIsLoading(false);
    setError(null);
    
    console.log('LOGOUT: Auth data cleared');
    
    // Redirect to login
    route('/login', true);
  };

  // Get current user from localStorage (no state needed)
  const getCurrentUser = () => getAuthUser();
  const checkIsAuthenticated = () => isAuthenticated();

  const value = {
    // Instead of storing user in state, provide functions to get current data
    get user() {
      return getCurrentUser();
    },
    get isAuthenticated() {
      return checkIsAuthenticated();
    },
    isLoading,
    error,
    login,
    logout,
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
