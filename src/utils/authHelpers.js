/**
 * Simple Authentication Helper Functions
 * 
 * These functions provide a simple way to manage authentication
 * using only localStorage without complex state management.
 */

import { clearAllAppCache } from './cacheHelpers';

/**
 * Get the authenticated user from localStorage
 * 
 * @returns {Object|null} - User data or null if not authenticated
 */
export const getAuthUser = () => {
  try {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('authUser');
    
    if (!token || !userStr) {
      return null;
    }
    
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error getting auth user:', error);
    return null;
  }
};

/**
 * Save the authenticated user to localStorage
 * 
 * @param {Object} userData - User data to save
 * @param {string} token - Authentication token
 */
export const saveAuthUser = (userData, token) => {
  try {
    localStorage.setItem('authToken', token);
    localStorage.setItem('authUser', JSON.stringify(userData));
  } catch (error) {
    console.error('Error saving auth user:', error);
  }
};

/**
 * Clear the authenticated user from localStorage
 */
export const clearAuthUser = () => {
  try {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  } catch (error) {
    console.error('Error clearing auth user:', error);
  }
};

/**
 * Clear the authenticated user and all cached application data
 * This should be used during logout to prevent data leakage between users
 */
export const clearAuthUserAndCache = () => {
  try {
    console.log('Clearing authentication data and all cached application data...');
    
    // Clear authentication data
    clearAuthUser();
    
    // Clear all application cache data
    clearAllAppCache();
    
    console.log('Successfully cleared authentication and cache data');
  } catch (error) {
    console.error('Error clearing auth user and cache:', error);
  }
};

/**
 * Check if user is authenticated
 * 
 * @returns {boolean} - True if user is authenticated
 */
export const isAuthenticated = () => {
  return getAuthUser() !== null;
};

/**
 * Get the authentication token
 * 
 * @returns {string|null} - Authentication token or null
 */
export const getAuthToken = () => {
  try {
    return localStorage.getItem('authToken');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};
