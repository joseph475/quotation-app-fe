import { h, createContext } from 'preact';
import { useContext, useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import api from '../services/api';

// Create the auth context
const AuthContext = createContext();

/**
 * Auth Provider Component
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing authentication on app load
  useEffect(() => {
    const checkAuth = () => {
      try {
        console.log('AuthContext: Checking for existing authentication...');
        
        // Check for stored token and user data
        const token = localStorage.getItem('authToken');
        const storedUserData = localStorage.getItem('authUser');
        
        if (token && storedUserData) {
          try {
            const userData = JSON.parse(storedUserData);
            console.log('AuthContext: Found stored auth data:', {
              hasToken: !!token,
              userEmail: userData.email || userData.data?.email,
              userRole: userData.role || userData.data?.role,
              fullUserData: userData
            });
            
            // Set user data from localStorage - force new object reference
            setUser({...userData});
            setIsAuthenticated(true);
            console.log('AuthContext: User authenticated from stored data');
          } catch (parseError) {
            console.error('AuthContext: Error parsing stored user data:', parseError);
            // Clear corrupted data
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
          }
        } else {
          console.log('AuthContext: No valid stored auth data found');
        }
      } catch (error) {
        console.error('AuthContext: Error checking authentication:', error);
        // Clear any corrupted data
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
      } finally {
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
      console.log('LOGIN: Credentials email:', credentials.email);
      
      // FORCE COMPLETE CLEAR - Clear ALL localStorage and state
      localStorage.clear();
      setUser(null);
      setIsAuthenticated(false);
      
      console.log('LOGIN: FORCE CLEARED ALL DATA');
      
      // Small delay to ensure state is cleared
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Make API call to login endpoint
      const response = await api.auth.login(credentials);
      
      console.log('LOGIN: API response:', {
        success: response?.success,
        hasUser: !!response?.user,
        userEmail: response?.user?.email,
        userRole: response?.user?.role,
        fullResponse: response
      });
      
      if (response && response.success) {
        // Store token
        if (response.token) {
          localStorage.setItem('authToken', response.token);
          console.log('LOGIN: Token stored');
        }
        
        // Store user data with timestamp for debugging
        const userData = { 
          ...response.user,
          loginTimestamp: Date.now()
        };
        localStorage.setItem('authUser', JSON.stringify(userData));
        
        console.log('LOGIN: Setting NEW user data:', {
          email: userData.email,
          role: userData.role,
          id: userData._id || userData.id,
          timestamp: userData.loginTimestamp
        });
        
        // Force state update
        setUser(userData);
        setIsAuthenticated(true);
        
        console.log('LOGIN: User state set successfully - NEW LOGIN');
        
        setIsLoading(false);
        
        // Force page reload to ensure clean state
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
        
        return userData;
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
  const logout = () => {
    console.log('LOGOUT: Starting logout process');
    
    // Clear all localStorage data
    localStorage.clear();
    
    // Reset state
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
    setError(null);
    
    console.log('LOGOUT: State cleared');
    
    // Call logout API (don't wait for it)
    api.auth.logout().catch(err => {
      console.error('Logout API error:', err);
    });
    
    // Redirect to login
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  };

  const value = {
    user,
    isAuthenticated,
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
