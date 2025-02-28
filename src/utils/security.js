/**
 * Security utility module
 * Provides encryption, decryption, and hashing functions
 */

const crypto = require('crypto');
const { createModuleLogger } = require('./logger');
const config = require('./config');

const logger = createModuleLogger('security');

// Default encryption settings
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || config.security.jwtSecret;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;
const ITERATIONS = 10000;
const DIGEST = 'sha256';

/**
 * Generate a secure random string
 * @param {number} length - Length of the string
 * @returns {string} Random string
 */
function generateRandomString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure random buffer
 * @param {number} length - Length of the buffer
 * @returns {Buffer} Random buffer
 */
function generateRandomBuffer(length = 32) {
  return crypto.randomBytes(length);
}

/**
 * Derive encryption key from password
 * @param {string} password - Password to derive key from
 * @param {Buffer} salt - Salt for key derivation
 * @returns {Buffer} Derived key
 */
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(
    password,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    DIGEST
  );
}

/**
 * Encrypt data
 * @param {string|Object} data - Data to encrypt
 * @param {string} key - Encryption key (optional)
 * @returns {string} Encrypted data
 */
function encrypt(data, key = ENCRYPTION_KEY) {
  try {
    // Convert object to string if needed
    const dataString = typeof data === 'object' ? JSON.stringify(data) : data;
    
    // Generate random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Generate random salt
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // Derive key from password
    const derivedKey = deriveKey(key, salt);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, derivedKey, iv, {
      authTagLength: AUTH_TAG_LENGTH
    });
    
    // Encrypt data
    let encrypted = cipher.update(dataString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine all parts: salt + iv + authTag + encrypted
    const result = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]).toString('base64');
    
    return result;
  } catch (error) {
    logger.error('Encryption error', { error: error.message });
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data
 * @param {string} encryptedData - Data to decrypt
 * @param {string} key - Decryption key (optional)
 * @returns {string|Object} Decrypted data
 */
function decrypt(encryptedData, key = ENCRYPTION_KEY) {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(encryptedData, 'base64');
    
    // Extract parts
    const salt = buffer.slice(0, SALT_LENGTH);
    const iv = buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = buffer.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buffer.slice(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH).toString('hex');
    
    // Derive key from password
    const derivedKey = deriveKey(key, salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, derivedKey, iv, {
      authTagLength: AUTH_TAG_LENGTH
    });
    
    // Set authentication tag
    decipher.setAuthTag(authTag);
    
    // Decrypt data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Try to parse as JSON if possible
    try {
      return JSON.parse(decrypted);
    } catch (e) {
      return decrypted;
    }
  } catch (error) {
    logger.error('Decryption error', { error: error.message });
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash data using SHA-256
 * @param {string} data - Data to hash
 * @returns {string} Hashed data
 */
function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hash data with salt
 * @param {string} data - Data to hash
 * @param {string} salt - Salt for hashing (optional)
 * @returns {Object} Hashed data and salt
 */
function hashWithSalt(data, salt = null) {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hashed = crypto.createHmac('sha256', useSalt).update(data).digest('hex');
  
  return {
    hash: hashed,
    salt: useSalt
  };
}

/**
 * Verify hashed data
 * @param {string} data - Data to verify
 * @param {string} hashedData - Previously hashed data
 * @param {string} salt - Salt used for hashing
 * @returns {boolean} Whether data matches hash
 */
function verifyHash(data, hashedData, salt) {
  const { hash: newHash } = hashWithSalt(data, salt);
  return newHash === hashedData;
}

/**
 * Generate a secure token
 * @param {number} length - Token length
 * @returns {string} Secure token
 */
function generateToken(length = 32) {
  return generateRandomString(length);
}

/**
 * Generate a secure password
 * @param {number} length - Password length
 * @param {boolean} includeSpecial - Include special characters
 * @returns {string} Secure password
 */
function generatePassword(length = 12, includeSpecial = true) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const specialChars = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
  
  const fullCharset = includeSpecial ? charset + specialChars : charset;
  let password = '';
  
  // Ensure at least one character from each required set
  password += charset.toLowerCase().charAt(Math.floor(Math.random() * 26));
  password += charset.toUpperCase().charAt(Math.floor(Math.random() * 26));
  password += '0123456789'.charAt(Math.floor(Math.random() * 10));
  
  if (includeSpecial) {
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  }
  
  // Fill the rest of the password
  while (password.length < length) {
    password += fullCharset.charAt(Math.floor(Math.random() * fullCharset.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

module.exports = {
  encrypt,
  decrypt,
  hash,
  hashWithSalt,
  verifyHash,
  generateRandomString,
  generateRandomBuffer,
  generateToken,
  generatePassword
}; 