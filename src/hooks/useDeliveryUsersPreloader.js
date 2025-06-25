/**
 * Hook to preload delivery users cache on app initialization
 * This ensures delivery users data is available immediately when admins need it
 */

import { useEffect, useState } from 'preact/hooks';
import { preloadDeliveryUsersCache, getDeliveryUsersCacheStats } from '../utils/deliveryUsersCache';
import { useAuth } from '../contexts/AuthContext';

export const useDeliveryUsersPreloader = () => {
  const { user } = useAuth();
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadError, setPreloadError] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [hasPreloaded, setHasPreloaded] = useState(false);

  // Get stable user ID and role to prevent infinite loops
  const userId = user?._id || user?.id;
  const userRole = user?.role || user?.data?.role;
  const isAuthenticated = !!userId;
  const isAdminUser = userRole === 'admin';

  useEffect(() => {
    // Only preload if user is authenticated, is admin, and we haven't preloaded yet
    if (!isAuthenticated || !isAdminUser || hasPreloaded) return;

    const loadDeliveryUsersCache = async () => {
      setIsPreloading(true);
      setPreloadError(null);

      try {
        console.log('Preloading delivery users cache...');
        const success = await preloadDeliveryUsersCache();
        
        if (success) {
          console.log('Delivery users cache preloaded successfully');
          // Get cache stats for debugging
          const stats = getDeliveryUsersCacheStats();
          setCacheStats(stats);
          setHasPreloaded(true);
        } else {
          throw new Error('Failed to preload delivery users cache');
        }
      } catch (error) {
        console.error('Error preloading delivery users cache:', error);
        setPreloadError(error.message);
      } finally {
        setIsPreloading(false);
      }
    };

    // Start preloading
    loadDeliveryUsersCache();
  }, [isAuthenticated, isAdminUser, hasPreloaded]);

  // Reset preload state when user changes or logs out
  useEffect(() => {
    if (!isAuthenticated || !isAdminUser) {
      setHasPreloaded(false);
      setCacheStats(null);
      setPreloadError(null);
    }
  }, [isAuthenticated, isAdminUser]);

  return {
    isPreloading,
    preloadError,
    cacheStats
  };
};

export default useDeliveryUsersPreloader;
