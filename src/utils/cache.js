/**
 * Cache utility module
 * Provides in-memory and Redis caching functionality
 */

const { createModuleLogger } = require('./logger');
const config = require('./config');

const logger = createModuleLogger('cache');

/**
 * In-memory cache implementation
 */
class MemoryCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultTTL = options.defaultTTL || 60 * 5; // 5 minutes in seconds
    this.checkPeriod = options.checkPeriod || 60; // 1 minute in seconds
    this.maxItems = options.maxItems || 1000;
    
    // Start cleanup interval
    if (this.checkPeriod > 0) {
      this.interval = setInterval(() => this.cleanup(), this.checkPeriod * 1000);
      // Prevent the interval from keeping the process alive
      this.interval.unref();
    }
  }
  
  /**
   * Set a value in the cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      // If we've reached max items and this is a new key, remove oldest
      if (this.cache.size >= this.maxItems && !this.cache.has(key)) {
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }
      
      this.cache.set(key, {
        value,
        expires: ttl > 0 ? Date.now() + (ttl * 1000) : 0
      });
      
      return true;
    } catch (error) {
      logger.error('Error setting cache value', { key, error: error.message });
      return false;
    }
  }
  
  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {Promise<*>} Cached value or null
   */
  async get(key) {
    try {
      const data = this.cache.get(key);
      
      // If no data or expired, return null
      if (!data || (data.expires > 0 && data.expires < Date.now())) {
        if (data) this.cache.delete(key);
        return null;
      }
      
      return data.value;
    } catch (error) {
      logger.error('Error getting cache value', { key, error: error.message });
      return null;
    }
  }
  
  /**
   * Delete a value from the cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    try {
      return this.cache.delete(key);
    } catch (error) {
      logger.error('Error deleting cache value', { key, error: error.message });
      return false;
    }
  }
  
  /**
   * Check if a key exists in the cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Whether key exists
   */
  async exists(key) {
    try {
      const data = this.cache.get(key);
      
      // If no data or expired, return false
      if (!data || (data.expires > 0 && data.expires < Date.now())) {
        if (data) this.cache.delete(key);
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Error checking cache key', { key, error: error.message });
      return false;
    }
  }
  
  /**
   * Clear the entire cache
   * @returns {Promise<boolean>} Success status
   */
  async clear() {
    try {
      this.cache.clear();
      return true;
    } catch (error) {
      logger.error('Error clearing cache', { error: error.message });
      return false;
    }
  }
  
  /**
   * Clean up expired items
   * @private
   */
  cleanup() {
    const now = Date.now();
    
    for (const [key, data] of this.cache.entries()) {
      if (data.expires > 0 && data.expires < now) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Close the cache (cleanup)
   */
  close() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}

/**
 * Redis cache implementation
 * Requires redis package to be installed
 */
class RedisCache {
  constructor(options = {}) {
    this.defaultTTL = options.defaultTTL || 60 * 5; // 5 minutes in seconds
    this.prefix = options.prefix || 'cache:';
    this.client = null;
    
    // Lazy load Redis to avoid dependency if not used
    try {
      const redis = require('redis');
      
      const redisOptions = {
        url: options.url || process.env.REDIS_URL || 'redis://localhost:6379',
        password: options.password || process.env.REDIS_PASSWORD,
        database: options.database || parseInt(process.env.REDIS_DB || '0', 10)
      };
      
      this.client = redis.createClient(redisOptions);
      
      this.client.on('error', (error) => {
        logger.error('Redis cache error', { error: error.message });
      });
      
      this.client.on('connect', () => {
        logger.info('Connected to Redis cache');
      });
      
      // Connect to Redis
      this.client.connect().catch(error => {
        logger.error('Failed to connect to Redis', { error: error.message });
      });
    } catch (error) {
      logger.error('Failed to initialize Redis cache', { error: error.message });
    }
  }
  
  /**
   * Get full key with prefix
   * @param {string} key - Cache key
   * @returns {string} Full key with prefix
   * @private
   */
  getFullKey(key) {
    return `${this.prefix}${key}`;
  }
  
  /**
   * Set a value in the cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.client) {
      logger.error('Redis client not initialized');
      return false;
    }
    
    try {
      const fullKey = this.getFullKey(key);
      const serializedValue = JSON.stringify(value);
      
      if (ttl > 0) {
        await this.client.setEx(fullKey, ttl, serializedValue);
      } else {
        await this.client.set(fullKey, serializedValue);
      }
      
      return true;
    } catch (error) {
      logger.error('Error setting Redis cache value', { key, error: error.message });
      return false;
    }
  }
  
  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {Promise<*>} Cached value or null
   */
  async get(key) {
    if (!this.client) {
      logger.error('Redis client not initialized');
      return null;
    }
    
    try {
      const fullKey = this.getFullKey(key);
      const value = await this.client.get(fullKey);
      
      if (!value) return null;
      
      return JSON.parse(value);
    } catch (error) {
      logger.error('Error getting Redis cache value', { key, error: error.message });
      return null;
    }
  }
  
  /**
   * Delete a value from the cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    if (!this.client) {
      logger.error('Redis client not initialized');
      return false;
    }
    
    try {
      const fullKey = this.getFullKey(key);
      await this.client.del(fullKey);
      return true;
    } catch (error) {
      logger.error('Error deleting Redis cache value', { key, error: error.message });
      return false;
    }
  }
  
  /**
   * Check if a key exists in the cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Whether key exists
   */
  async exists(key) {
    if (!this.client) {
      logger.error('Redis client not initialized');
      return false;
    }
    
    try {
      const fullKey = this.getFullKey(key);
      const exists = await this.client.exists(fullKey);
      return exists === 1;
    } catch (error) {
      logger.error('Error checking Redis cache key', { key, error: error.message });
      return false;
    }
  }
  
  /**
   * Clear the entire cache (only keys with prefix)
   * @returns {Promise<boolean>} Success status
   */
  async clear() {
    if (!this.client) {
      logger.error('Redis client not initialized');
      return false;
    }
    
    try {
      const keys = await this.client.keys(`${this.prefix}*`);
      
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      
      return true;
    } catch (error) {
      logger.error('Error clearing Redis cache', { error: error.message });
      return false;
    }
  }
  
  /**
   * Close the Redis connection
   */
  async close() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (error) {
        logger.error('Error closing Redis connection', { error: error.message });
      }
    }
  }
}

/**
 * Cache factory to create appropriate cache instance
 * @param {string} type - Cache type ('memory' or 'redis')
 * @param {Object} options - Cache options
 * @returns {MemoryCache|RedisCache} Cache instance
 */
function createCache(type = 'memory', options = {}) {
  switch (type.toLowerCase()) {
    case 'redis':
      return new RedisCache(options);
    case 'memory':
    default:
      return new MemoryCache(options);
  }
}

// Create default cache instance
const cacheType = process.env.CACHE_TYPE || 'memory';
const cacheOptions = {
  defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '300', 10),
  prefix: process.env.CACHE_PREFIX || 'smartagent:'
};

const cache = createCache(cacheType, cacheOptions);

module.exports = {
  cache,
  createCache,
  MemoryCache,
  RedisCache
}; 