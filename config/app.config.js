/**
 * Application configuration
 * Contains environment-specific settings for the SmartAgentDeploy platform
 */

module.exports = {
  // Development environment settings
  development: {
    port: 3000,
    apiUrl: 'http://localhost:3000/api',
    frontendUrl: 'http://localhost:8080',
    logLevel: 'debug',
    enableCors: true,
    jwtSecret: 'dev-jwt-secret-change-in-production',
    jwtExpiresIn: '1d'
  },
  
  // Test environment settings
  test: {
    port: 3001,
    apiUrl: 'http://localhost:3001/api',
    frontendUrl: 'http://localhost:8081',
    logLevel: 'info',
    enableCors: true,
    jwtSecret: 'test-jwt-secret',
    jwtExpiresIn: '1d'
  },
  
  // Production environment settings
  production: {
    port: process.env.PORT || 3000,
    apiUrl: process.env.API_URL || 'https://api.smartagentdeploy.com',
    frontendUrl: process.env.FRONTEND_URL || 'https://smartagentdeploy.com',
    logLevel: 'error',
    enableCors: false,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: '7d'
  }
}; 