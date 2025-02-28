const mongoose = require('mongoose');
const config = require('./config');
const { createModuleLogger } = require('./logger');

const logger = createModuleLogger('database');

// Connection options
const options = config.database.options;

// Connect to database
async function connect() {
  try {
    await mongoose.connect(config.database.uri, options);
    logger.info('Successfully connected to MongoDB');
    return mongoose.connection;
  } catch (error) {
    logger.error('Error connecting to MongoDB', { error: error.message });
    throw error;
  }
}

// Disconnect from database
async function disconnect() {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB', { error: error.message });
    throw error;
  }
}

// Listen for connection events
mongoose.connection.on('connected', () => {
  logger.info('MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error', { error: err.message });
});

mongoose.connection.on('disconnected', () => {
  logger.info('MongoDB connection disconnected');
});

// Handle process termination
process.on('SIGINT', async () => {
  await disconnect();
  process.exit(0);
});

module.exports = {
  connect,
  disconnect,
  connection: mongoose.connection,
  mongoose
}; 