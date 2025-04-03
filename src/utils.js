
// Utility functions for frame order automation

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {number} options.initialDelay - Initial delay in ms
 * @param {number} options.maxDelay - Maximum delay in ms
 * @returns {Promise} - Promise resolving to function result
 */
async function withRetry(fn, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const initialDelay = options.initialDelay || 1000;
  const maxDelay = options.maxDelay || 10000;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Format error for logging and user display
 * @param {Error} error - The error object
 * @returns {Object} - Formatted error object
 */
function formatError(error) {
  return {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  withRetry,
  formatError
};
