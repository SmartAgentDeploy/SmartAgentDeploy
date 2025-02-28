/**
 * Database configuration
 * Contains connection parameters for MongoDB in different environments
 */

module.exports = {
  // Development environment database settings
  development: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/smartagent_dev',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10
    },
    debug: true
  },
  
  // Test environment database settings
  test: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/smartagent_test',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10
    },
    debug: false
  },
  
  // Production environment database settings
  production: {
    uri: process.env.MONGO_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      maxPoolSize: 50,
      socketTimeoutMS: 45000,
      keepAlive: true,
      keepAliveInitialDelay: 300000
    },
    debug: false
  },
  
  // Collection names
  collections: {
    users: 'users',
    agents: 'agents',
    transactions: 'transactions',
    marketData: 'market_data',
    predictions: 'predictions',
    strategies: 'strategies',
    logs: 'logs'
  }
}; 