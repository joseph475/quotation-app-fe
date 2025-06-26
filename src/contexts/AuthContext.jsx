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
  const [user, setUser] = useState(null);

  // Check for existing authentication on app load
  useEffect(() => {
    // Simple check - just verify if we have valid data in localStorage
    const checkAuth = () => {
      try {
        const userData = getAuthUser();
        console.log('AuthContext: Checking authentication...', userData ? 'User found' : 'No user');
        setUser(userData);
        setIsLoading(false);
      } catch (error) {
        console.error('AuthContext: Error checking authentication:', error);
        clearAuthUserAndCache(); // Clear any corrupted data
        setUser(null);
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
        
        // Update user state
        setUser(response.user);
        
        console.log('LOGIN: User data saved to localStorage and state');
        
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
    setUser(null);
    setIsLoading(false);
    setError(null);
    
    console.log('LOGOUT: Auth data cleared');
    
    // Redirect to login
    route('/login', true);
  };

  /**
   * Update user profile
   */
  const updateProfile = async (userData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('UPDATE PROFILE: Starting update process');
      
      // Make API call to update profile
      const response = await api.auth.updateProfile(userData);
      
      console.log('UPDATE PROFILE: API response:', {
        success: response?.success,
        hasUser: !!response?.user
      });
      
      if (response && response.success) {
        // Get current auth data
        const currentUser = getCurrentUser();
        const currentToken = localStorage.getItem('authToken');
        
        // Update user data in localStorage with new profile data
        const updatedUser = { ...currentUser, ...response.data };
        saveAuthUser(updatedUser, currentToken);
        
        // Update the user state to trigger re-render
        setUser(updatedUser);
        
        console.log('UPDATE PROFILE: User data updated in localStorage and state');
        
        setIsLoading(false);
        
        return updatedUser;
      } else {
        throw new Error(response.message || 'Profile update failed');
      }
    } catch (err) {
      console.error('UPDATE PROFILE: Error:', err);
      setError(err.message || 'Profile update failed. Please try again.');
      setIsLoading(false);
      throw err;
    }
  };

  // Get current user from localStorage (no state needed)
  const getCurrentUser = () => getAuthUser();
  const checkIsAuthenticated = () => isAuthenticated();

  const value = {
    user,
    get isAuthenticated() {
      return checkIsAuthenticated();
    },
    isLoading,
    error,
    login,
    logout,
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
