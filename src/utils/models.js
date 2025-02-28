/**
 * Database models utility module
 * Defines MongoDB models for the application
 */

const mongoose = require('mongoose');
const { createModuleLogger } = require('./logger');

const logger = createModuleLogger('models');

// User schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  walletAddress: {
    type: String,
    trim: true,
    sparse: true
  },
  profilePicture: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// AI Agent schema
const agentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  strategyType: {
    type: String,
    enum: ['lstm', 'dnn', 'cnn', 'rnn'],
    required: true
  },
  riskLevel: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  status: {
    type: String,
    enum: ['created', 'training', 'trained', 'deployed', 'error'],
    default: 'created'
  },
  modelPath: {
    type: String
  },
  deploymentAddress: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  performance: {
    accuracy: Number,
    profitLoss: Number,
    winRate: Number,
    sharpeRatio: Number,
    maxDrawdown: Number
  }
}, {
  timestamps: true
});

// Training session schema
const trainingSessionSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  dataSource: {
    type: String,
    required: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  epochs: {
    type: Number,
    default: 50
  },
  batchSize: {
    type: Number,
    default: 32
  },
  validationSplit: {
    type: Number,
    default: 0.2
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  metrics: {
    loss: [Number],
    accuracy: [Number],
    valLoss: [Number],
    valAccuracy: [Number]
  },
  error: {
    message: String,
    stack: String
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Prediction schema
const predictionSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  dataSource: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  prediction: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  actualValue: {
    type: mongoose.Schema.Types.Mixed
  },
  isCorrect: {
    type: Boolean
  }
}, {
  timestamps: true
});

// Transaction schema
const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent'
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'trade', 'fee'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  asset: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  txHash: {
    type: String
  },
  blockNumber: {
    type: Number
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Market data schema
const marketDataSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true
  },
  interval: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    required: true
  },
  open: {
    type: Number,
    required: true
  },
  high: {
    type: Number,
    required: true
  },
  low: {
    type: Number,
    required: true
  },
  close: {
    type: Number,
    required: true
  },
  volume: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Create compound index for market data
marketDataSchema.index({ symbol: 1, interval: 1, timestamp: 1 }, { unique: true });

// Notification schema
const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Create models
const User = mongoose.model('User', userSchema);
const Agent = mongoose.model('Agent', agentSchema);
const TrainingSession = mongoose.model('TrainingSession', trainingSessionSchema);
const Prediction = mongoose.model('Prediction', predictionSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const MarketData = mongoose.model('MarketData', marketDataSchema);
const Notification = mongoose.model('Notification', notificationSchema);

// Log model initialization
logger.info('Database models initialized');

module.exports = {
  User,
  Agent,
  TrainingSession,
  Prediction,
  Transaction,
  MarketData,
  Notification
}; 