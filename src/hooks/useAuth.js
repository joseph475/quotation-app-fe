import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import api from '../services/api';

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
            
            // If user has a branch, fetch branch details
            if (userData.branch && userData.role !== 'admin') {
              try {
                const branchResponse = await api.branches.getById(userData.branch);
                if (branchResponse && branchResponse.success) {
                  userData.branchName = branchResponse.data.name;
                }
              } catch (branchErr) {
                console.error('Error fetching branch details:', branchErr);
                userData.branchName = 'Unknown branch';
              }
            } else if (userData.role === 'admin') {
              userData.branchName = 'All Branches';
            } else {
              userData.branchName = 'No branch';
            }
            
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            // Token is invalid, remove it
            localStorage.removeItem('authToken');
          }
        } catch (error) {
          console.error('Token validation error:', error);
          localStorage.removeItem('authToken');
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
      
      // Make API call to login endpoint
      const response = await api.auth.login(credentials);
      
      if (response && response.success) {
        // Store token in localStorage
        if (response.token) {
          localStorage.setItem('authToken', response.token);
        }
        
        // The user data is in response.user, not response.data
        // Make sure we have the branch information
        const userData = {
          ...response.user,
          branch: response.user.branch || null
        };
        
        // If user has a branch, fetch branch details
        if (userData.branch && userData.role !== 'admin') {
          try {
            const branchResponse = await api.branches.getById(userData.branch);
            if (branchResponse && branchResponse.success) {
              userData.branchName = branchResponse.data.name;
            }
          } catch (branchErr) {
            console.error('Error fetching branch details:', branchErr);
            userData.branchName = 'Unknown branch';
          }
        } else if (userData.role === 'admin') {
          userData.branchName = 'All Branches';
        } else {
          userData.branchName = 'No branch';
        }
        
        setUser(userData);
        setIsAuthenticated(true);
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
  const logout = async () => {
    try {
      // Make API call to logout endpoint
      await api.auth.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Always clear local state regardless of API call success
      localStorage.removeItem('authToken');
      setUser(null);
      setIsAuthenticated(false);
      
      // Redirect to login page
      // Use route instead of window.location.href to prevent hard navigation
      route('/login', true);
    }
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
        
        const userDataWithBranch = { ...response.data };
        
        // If user has a branch, fetch branch details
        if (userDataWithBranch.branch && userDataWithBranch.role !== 'admin') {
          try {
            const branchResponse = await api.branches.getById(userDataWithBranch.branch);
            if (branchResponse && branchResponse.success) {
              userDataWithBranch.branchName = branchResponse.data.name;
            }
          } catch (branchErr) {
            console.error('Error fetching branch details:', branchErr);
            userDataWithBranch.branchName = 'Unknown branch';
          }
        } else if (userDataWithBranch.role === 'admin') {
          userDataWithBranch.branchName = 'All Branches';
        } else {
          userDataWithBranch.branchName = 'No branch';
        }
        
        setUser(userDataWithBranch);
        setIsAuthenticated(true);
        setIsLoading(false);
        
        return userDataWithBranch;
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
        
        // If user has a branch, fetch branch details
        if (updatedUserData.branch && updatedUserData.role !== 'admin') {
          try {
            const branchResponse = await api.branches.getById(updatedUserData.branch);
            if (branchResponse && branchResponse.success) {
              updatedUserData.branchName = branchResponse.data.name;
            }
          } catch (branchErr) {
            console.error('Error fetching branch details:', branchErr);
            updatedUserData.branchName = 'Unknown branch';
          }
        } else if (updatedUserData.role === 'admin') {
          updatedUserData.branchName = 'All Branches';
        } else {
          updatedUserData.branchName = 'No branch';
        }
        
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
