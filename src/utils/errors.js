/**
 * Custom error classes for the application
 * Provides standardized error handling across the application
 */

/**
 * Base application error
 */
class AppError extends Error {
  /**
   * Create a new application error
   * @param {string} message - Error message
   * @param {string} code - Error code
   */
  constructor(message, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error
 */
class ValidationError extends AppError {
  /**
   * Create a new validation error
   * @param {string} message - Error message
   * @param {Object} details - Validation error details
   */
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR');
    this.details = details;
  }
}

/**
 * Authentication error
 */
class AuthenticationError extends AppError {
  /**
   * Create a new authentication error
   * @param {string} message - Error message
   */
  constructor(message = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization error
 */
class AuthorizationError extends AppError {
  /**
   * Create a new authorization error
   * @param {string} message - Error message
   */
  constructor(message = 'Not authorized') {
    super(message, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Not found error
 */
class NotFoundError extends AppError {
  /**
   * Create a new not found error
   * @param {string} entity - Entity that was not found
   * @param {string} id - ID of the entity
   */
  constructor(entity, id) {
    super(`${entity} with ID ${id} not found`, 'NOT_FOUND_ERROR');
    this.entity = entity;
    this.entityId = id;
  }
}

/**
 * Database error
 */
class DatabaseError extends AppError {
  /**
   * Create a new database error
   * @param {string} message - Error message
   * @param {Error} originalError - Original database error
   */
  constructor(message, originalError = null) {
    super(message, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

/**
 * API error
 */
class APIError extends AppError {
  /**
   * Create a new API error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, statusCode = 500) {
    super(message, 'API_ERROR');
    this.statusCode = statusCode;
  }
}

/**
 * Blockchain error
 */
class BlockchainError extends AppError {
  /**
   * Create a new blockchain error
   * @param {string} message - Error message
   * @param {Object} txInfo - Transaction information
   */
  constructor(message, txInfo = {}) {
    super(message, 'BLOCKCHAIN_ERROR');
    this.txInfo = txInfo;
  }
}

/**
 * AI model error
 */
class AIModelError extends AppError {
  /**
   * Create a new AI model error
   * @param {string} message - Error message
   * @param {string} modelType - Type of model
   */
  constructor(message, modelType = '') {
    super(message, 'AI_MODEL_ERROR');
    this.modelType = modelType;
  }
}

/**
 * Rate limit error
 */
class RateLimitError extends AppError {
  /**
   * Create a new rate limit error
   * @param {string} message - Error message
   * @param {number} retryAfter - Seconds to wait before retrying
   */
  constructor(message = 'Rate limit exceeded', retryAfter = 60) {
    super(message, 'RATE_LIMIT_ERROR');
    this.retryAfter = retryAfter;
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  APIError,
  BlockchainError,
  AIModelError,
  RateLimitError
}; 