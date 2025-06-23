/**
 * Development configuration utilities
 */

/**
 * Check if we're in development mode
 */
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Check if we're in production mode
 */
export const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Development mode settings
 */
export const devConfig = {
  // Disable React StrictMode in development to prevent double API calls
  enableStrictMode: false,
  
  // Enable detailed logging in development
  enableDetailedLogging: true,
  
  // API request timeout for development
  apiTimeout: 10000,
  
  // Cache timeout for development (shorter for faster testing)
  cacheTimeout: 2 * 60 * 1000, // 2 minutes
};

/**
 * Production mode settings
 */
export const prodConfig = {
  // Enable StrictMode in production for better error detection
  enableStrictMode: true,
  
  // Minimal logging in production
  enableDetailedLogging: false,
  
  // API request timeout for production
  apiTimeout: 30000,
  
  // Cache timeout for production
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
};

/**
 * Get current configuration based on environment
 */
export const getConfig = () => {
  return isDevelopment() ? devConfig : prodConfig;
};

/**
 * Log function that respects development settings
 */
export const devLog = (...args) => {
  if (isDevelopment() && getConfig().enableDetailedLogging) {
    console.log('[DEV]', ...args);
  }
};

/**
 * Warning log for development issues
 */
export const devWarn = (...args) => {
  if (isDevelopment()) {
    console.warn('[DEV WARNING]', ...args);
  }
};
