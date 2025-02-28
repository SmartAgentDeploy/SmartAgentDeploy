const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

// Default configuration
const defaultConfig = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    frontendPort: process.env.FRONTEND_PORT || 8080,
    frontendHost: process.env.FRONTEND_HOST || 'localhost',
  },
  
  // Database configuration
  database: {
    uri: process.env.DATABASE_URI || 'mongodb://localhost:27017/smartagent',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  
  // Blockchain configuration
  blockchain: {
    provider: process.env.BLOCKCHAIN_PROVIDER || 'http://localhost:8545',
    networkId: process.env.NETWORK_ID || '1337',
    gasLimit: process.env.GAS_LIMIT || '6721975',
    gasPrice: process.env.GAS_PRICE || '20000000000',
    contractAddress: process.env.CONTRACT_ADDRESS,
    privateKey: process.env.PRIVATE_KEY,
  },
  
  // AI model configuration
  ai: {
    modelSavePath: process.env.MODEL_SAVE_PATH || path.join(process.cwd(), 'models'),
    dataPath: process.env.DATA_PATH || path.join(process.cwd(), 'data'),
    defaultEpochs: process.env.DEFAULT_EPOCHS || 50,
    defaultBatchSize: process.env.DEFAULT_BATCH_SIZE || 32,
  },
  
  // Security configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  },
  
  // API configuration
  api: {
    marketDataApiKey: process.env.MARKET_DATA_API_KEY,
    marketDataApiUrl: process.env.MARKET_DATA_API_URL || 'https://api.example.com',
    rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '100', 10),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10), // minutes
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    directory: process.env.LOG_DIRECTORY || path.join(process.cwd(), 'logs'),
  }
};

// Environment-specific configuration
const envConfig = {
  development: {
    server: {
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
      }
    }
  },
  production: {
    server: {
      cors: {
        origin: process.env.CORS_ORIGIN || 'https://yourdomain.com',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
      }
    }
  },
  test: {
    database: {
      uri: process.env.TEST_DATABASE_URI || 'mongodb://localhost:27017/smartagent_test',
    }
  }
};

// Get current environment
const env = process.env.NODE_ENV || 'development';

// Merge configurations
const config = {
  ...defaultConfig,
  ...(envConfig[env] || {}),
  env
};

// Ensure required directories exist
const ensureDirectories = () => {
  const dirs = [
    config.ai.modelSavePath,
    config.ai.dataPath,
    config.logging.directory
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureDirectories();

module.exports = config; 