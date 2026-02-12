const logger = require('./logger');
const config = require('../config/env');

/**
 * Sleep utility
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Rate limiter using token bucket algorithm
 */
class RateLimiter {
  constructor(requestsPerSecond) {
    this.requestsPerSecond = requestsPerSecond;
    this.minInterval = 1000 / requestsPerSecond;
    this.lastRequestTime = 0;
  }

  async throttle() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      await sleep(waitTime);
    }
    
    this.lastRequestTime = Date.now();
  }
}

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = config.retry.maxRetries,
    delayMs = config.retry.delayMs,
    exponential = true,
    onRetry = null
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      const delay = exponential ? delayMs * Math.pow(2, attempt) : delayMs;
      
      if (onRetry) {
        onRetry(attempt + 1, delay, error);
      }

      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
        error: error.message
      });

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Batch process items with concurrency control
 */
async function batchProcess(items, processFn, options = {}) {
  const {
    batchSize = 10,
    delayBetweenBatches = 0
  } = options;

  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    logger.debug(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);
    
    const batchResults = await Promise.all(
      batch.map(item => processFn(item).catch(err => {
        logger.error(`Error processing item:`, { error: err.message });
        return null;
      }))
    );
    
    results.push(...batchResults.filter(r => r !== null));
    
    if (delayBetweenBatches > 0 && i + batchSize < items.length) {
      await sleep(delayBetweenBatches);
    }
  }
  
  return results;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Safe JSON parse
 */
function safeJsonParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (error) {
    logger.warn('JSON parse failed', { error: error.message });
    return defaultValue;
  }
}

module.exports = {
  sleep,
  RateLimiter,
  retryWithBackoff,
  batchProcess,
  safeJsonParse,
  escapeRegex
};