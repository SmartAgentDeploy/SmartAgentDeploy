const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('./config');
const { createModuleLogger } = require('./logger');

const logger = createModuleLogger('auth');

/**
 * Generate password hash
 * @param {string} password - User password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(config.security.bcryptSaltRounds);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    logger.error('Error hashing password', { error: error.message });
    throw new Error('Password hashing failed');
  }
}

/**
 * Verify password
 * @param {string} password - User input password
 * @param {string} hash - Stored password hash
 * @returns {Promise<boolean>} Whether password matches
 */
async function verifyPassword(password, hash) {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    logger.error('Error verifying password', { error: error.message });
    throw new Error('Password verification failed');
  }
}

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @returns {string} JWT token
 */
function generateToken(payload) {
  try {
    return jwt.sign(payload, config.security.jwtSecret, {
      expiresIn: config.security.jwtExpiresIn
    });
  } catch (error) {
    logger.error('Error generating token', { error: error.message });
    throw new Error('Token generation failed');
  }
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.security.jwtSecret);
  } catch (error) {
    logger.error('Error verifying token', { error: error.message });
    throw new Error('Invalid or expired token');
  }
}

/**
 * Extract token from request header
 * @param {Object} req - Express request object
 * @returns {string|null} Extracted token or null
 */
function extractTokenFromHeader(req) {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
}

/**
 * Authentication middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function authMiddleware(req, res, next) {
  try {
    const token = extractTokenFromHeader(req);
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Authentication failed', { error: error.message });
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Role authorization middleware
 * @param {string[]} roles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
function roleMiddleware(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      logger.warn('Unauthorized access attempt', { 
        userId: req.user.id, 
        userRole: req.user.role, 
        requiredRoles: roles 
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  authMiddleware,
  roleMiddleware
}; 