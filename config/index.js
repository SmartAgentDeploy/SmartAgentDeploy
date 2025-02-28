/**
 * Configuration module entry point
 * Exports all configuration objects for the SmartAgentDeploy platform
 */

const appConfig = require('./app.config');
const blockchainConfig = require('./blockchain.config');
const aiConfig = require('./ai.config');
const databaseConfig = require('./database.config');

// Determine current environment
const env = process.env.NODE_ENV || 'development';

module.exports = {
  // Export all configuration objects
  app: appConfig[env],
  blockchain: blockchainConfig,
  ai: aiConfig,
  database: databaseConfig[env],
  
  // Export environment information
  env,
  isDevelopment: env === 'development',
  isTest: env === 'test',
  isProduction: env === 'production',
  
  // Export utility function to get configuration for a specific environment
  getEnvConfig: (configName, environment = env) => {
    const configs = {
      app: appConfig,
      database: databaseConfig
    };
    
    if (!configs[configName]) {
      throw new Error(`Configuration '${configName}' not found`);
    }
    
    if (!configs[configName][environment]) {
      throw new Error(`Environment '${environment}' not found in '${configName}' configuration`);
    }
    
    return configs[configName][environment];
  }
}; 