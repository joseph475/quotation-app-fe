/**
 * Request deduplication utility to prevent multiple identical API calls
 */

const pendingRequests = new Map();

/**
 * Deduplicate API requests by caching pending promises
 * @param {string} key - Unique key for the request
 * @param {Function} requestFn - Function that returns a promise
 * @returns {Promise} - The deduplicated promise
 */
export const deduplicateRequest = (key, requestFn) => {
  // If there's already a pending request for this key, return it
  if (pendingRequests.has(key)) {
    console.log(`Deduplicating request for: ${key}`);
    return pendingRequests.get(key);
  }

  // Create new request
  const promise = requestFn()
    .finally(() => {
      // Remove from pending requests when done
      pendingRequests.delete(key);
    });

  // Store the pending request
  pendingRequests.set(key, promise);
  
  return promise;
};

/**
 * Clear all pending requests (useful for cleanup)
 */
export const clearPendingRequests = () => {
  pendingRequests.clear();
};
