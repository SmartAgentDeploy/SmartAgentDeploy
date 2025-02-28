/**
 * SmartAgentDeploy API Server
 * Provides REST API endpoints for interacting with AI agents and blockchain
 */

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const winston = require('winston');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const utils = require('../utils');
const { config, logger, api } = utils;
const { requestLogger, errorHandler } = api;

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: process.env.LOG_FILE_PATH || './logs/api.log' 
    })
  ]
});

// Create logs directory if it doesn't exist
const logDir = path.dirname(process.env.LOG_FILE_PATH || './logs/api.log');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Import blockchain module
const EthereumBlockchain = require('../blockchain/ethereum');
const blockchain = new EthereumBlockchain();

// Initialize blockchain wallet
if (process.env.WALLET_PRIVATE_KEY) {
  try {
    blockchain.initWallet();
    logger.info('Blockchain wallet initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize blockchain wallet:', error);
  }
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartagentdeploy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  logger.info('Connected to MongoDB');
})
.catch((error) => {
  logger.error('MongoDB connection error:', error);
});

// Define MongoDB schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  walletAddress: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

const agentSchema = new mongoose.Schema({
  agentId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  description: { type: String },
  strategyType: { type: String, required: true },
  riskLevel: { type: Number, required: true },
  status: { type: String, default: 'inactive' },
  blockchainAgentId: { type: String },
  performanceMetrics: { type: Object },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Agent = mongoose.model('Agent', agentSchema);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(config.server.cors));
app.use(requestLogger);

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_here', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.user = user;
    next();
  });
};

// Helper function to run Python scripts
const runPythonScript = (scriptPath, args = []) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [scriptPath, ...args]);
    
    let result = '';
    let error = '';
    
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}: ${error}`));
      } else {
        try {
          resolve(JSON.parse(result));
        } catch (e) {
          resolve(result);
        }
      }
    });
  });
};

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword
    });
    
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'your_jwt_secret_here',
      { expiresIn: process.env.JWT_EXPIRATION || '24h' }
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'your_jwt_secret_here',
      { expiresIn: process.env.JWT_EXPIRATION || '24h' }
    );
    
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// AI Agent routes
app.post('/api/agents', authenticateToken, async (req, res) => {
  try {
    const { name, description, strategyType, riskLevel } = req.body;
    
    // Validate input
    if (!name || !strategyType || riskLevel === undefined) {
      return res.status(400).json({ error: 'Name, strategy type, and risk level are required' });
    }
    
    // Create agent in Python
    const scriptPath = path.join(__dirname, '../scripts/create_agent.py');
    const result = await runPythonScript(scriptPath, [
      '--name', name,
      '--strategy', strategyType,
      '--risk', riskLevel.toString(),
      '--metadata', JSON.stringify({ description })
    ]);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create AI agent');
    }
    
    // Create agent on blockchain
    const metadataURI = `ipfs://${result.metadata_hash}`;  // This would be replaced with actual IPFS upload
    const performanceFee = 5;  // Default performance fee
    
    const blockchainResult = await blockchain.createAgent(metadataURI, performanceFee);
    
    if (!blockchainResult.success) {
      throw new Error(blockchainResult.error || 'Failed to create agent on blockchain');
    }
    
    // Save agent to database
    const agent = new Agent({
      agentId: result.agent_id,
      userId: req.user.id,
      name,
      description: description || '',
      strategyType,
      riskLevel,
      blockchainAgentId: blockchainResult.agentId,
      performanceMetrics: result.performance_metrics
    });
    
    await agent.save();
    
    res.status(201).json({
      message: 'Agent created successfully',
      agent: {
        id: agent._id,
        agentId: agent.agentId,
        name: agent.name,
        strategyType: agent.strategyType,
        riskLevel: agent.riskLevel,
        blockchainAgentId: agent.blockchainAgentId
      }
    });
  } catch (error) {
    logger.error('Agent creation error:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

app.get('/api/agents', authenticateToken, async (req, res) => {
  try {
    const agents = await Agent.find({ userId: req.user.id });
    
    res.status(200).json({
      agents: agents.map(agent => ({
        id: agent._id,
        agentId: agent.agentId,
        name: agent.name,
        description: agent.description,
        strategyType: agent.strategyType,
        riskLevel: agent.riskLevel,
        status: agent.status,
        blockchainAgentId: agent.blockchainAgentId,
        performanceMetrics: agent.performanceMetrics,
        createdAt: agent.createdAt
      }))
    });
  } catch (error) {
    logger.error('Agent listing error:', error);
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

app.get('/api/agents/:agentId', authenticateToken, async (req, res) => {
  try {
    const agent = await Agent.findOne({ 
      agentId: req.params.agentId,
      userId: req.user.id
    });
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Get agent details from blockchain
    let blockchainAgent = {};
    if (agent.blockchainAgentId) {
      const blockchainResult = await blockchain.getAgent(agent.blockchainAgentId);
      if (blockchainResult.success !== false) {
        blockchainAgent = blockchainResult;
      }
    }
    
    res.status(200).json({
      agent: {
        id: agent._id,
        agentId: agent.agentId,
        name: agent.name,
        description: agent.description,
        strategyType: agent.strategyType,
        riskLevel: agent.riskLevel,
        status: agent.status,
        blockchainAgentId: agent.blockchainAgentId,
        performanceMetrics: agent.performanceMetrics,
        createdAt: agent.createdAt,
        blockchain: blockchainAgent
      }
    });
  } catch (error) {
    logger.error('Agent retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve agent' });
  }
});

app.post('/api/agents/:agentId/train', authenticateToken, async (req, res) => {
  try {
    const { dataSource, parameters } = req.body;
    
    // Validate input
    if (!dataSource) {
      return res.status(400).json({ error: 'Data source is required' });
    }
    
    const agent = await Agent.findOne({ 
      agentId: req.params.agentId,
      userId: req.user.id
    });
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Train agent in Python
    const scriptPath = path.join(__dirname, '../scripts/train_agent.py');
    const result = await runPythonScript(scriptPath, [
      '--agent-id', agent.agentId,
      '--data-source', dataSource,
      '--parameters', JSON.stringify(parameters || {})
    ]);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to train AI agent');
    }
    
    // Update agent in database
    agent.status = 'trained';
    agent.performanceMetrics = result.performance_metrics;
    agent.updatedAt = new Date();
    await agent.save();
    
    // Update agent status on blockchain
    if (agent.blockchainAgentId) {
      await blockchain.updateAgentStatus(agent.blockchainAgentId, 1);  // 1 = Active
    }
    
    res.status(200).json({
      message: 'Agent trained successfully',
      agent: {
        id: agent._id,
        agentId: agent.agentId,
        name: agent.name,
        status: agent.status,
        performanceMetrics: agent.performanceMetrics
      }
    });
  } catch (error) {
    logger.error('Agent training error:', error);
    res.status(500).json({ error: 'Failed to train agent' });
  }
});

app.post('/api/agents/:agentId/predict', authenticateToken, async (req, res) => {
  try {
    const { marketData } = req.body;
    
    // Validate input
    if (!marketData) {
      return res.status(400).json({ error: 'Market data is required' });
    }
    
    const agent = await Agent.findOne({ 
      agentId: req.params.agentId,
      userId: req.user.id
    });
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    if (agent.status !== 'trained') {
      return res.status(400).json({ error: 'Agent must be trained before making predictions' });
    }
    
    // Make prediction in Python
    const scriptPath = path.join(__dirname, '../scripts/predict.py');
    const result = await runPythonScript(scriptPath, [
      '--agent-id', agent.agentId,
      '--market-data', JSON.stringify(marketData)
    ]);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to make prediction');
    }
    
    res.status(200).json({
      prediction: result.prediction
    });
  } catch (error) {
    logger.error('Prediction error:', error);
    res.status(500).json({ error: 'Failed to make prediction' });
  }
});

app.post('/api/agents/:agentId/execute', authenticateToken, async (req, res) => {
  try {
    const { marketData, balance } = req.body;
    
    // Validate input
    if (!marketData) {
      return res.status(400).json({ error: 'Market data is required' });
    }
    
    const agent = await Agent.findOne({ 
      agentId: req.params.agentId,
      userId: req.user.id
    });
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    if (agent.status !== 'trained') {
      return res.status(400).json({ error: 'Agent must be trained before executing trades' });
    }
    
    // Execute strategy in Python
    const scriptPath = path.join(__dirname, '../scripts/execute_strategy.py');
    const result = await runPythonScript(scriptPath, [
      '--agent-id', agent.agentId,
      '--market-data', JSON.stringify(marketData),
      '--balance', (balance || 1000).toString()
    ]);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to execute strategy');
    }
    
    // If trade was executed, create it on blockchain
    if (result.execution.action === 'buy' || result.execution.action === 'sell') {
      const isBuy = result.execution.action === 'buy';
      const tokenAddress = '0x0000000000000000000000000000000000000000';  // Example token address
      const amount = result.execution.position.quantity.toString();
      const price = result.execution.price.toString();
      
      const blockchainResult = await blockchain.createTrade(
        agent.blockchainAgentId,
        tokenAddress,
        amount,
        isBuy,
        price
      );
      
      if (blockchainResult.success) {
        // Execute the trade on blockchain
        await blockchain.executeTrade(blockchainResult.tradeId);
      }
    }
    
    res.status(200).json({
      execution: result.execution
    });
  } catch (error) {
    logger.error('Strategy execution error:', error);
    res.status(500).json({ error: 'Failed to execute strategy' });
  }
});

// Market data routes
app.get('/api/market/data', authenticateToken, async (req, res) => {
  try {
    const { symbol, interval, limit } = req.query;
    
    // Validate input
    if (!symbol || !interval) {
      return res.status(400).json({ error: 'Symbol and interval are required' });
    }
    
    // Fetch market data
    const scriptPath = path.join(__dirname, '../scripts/fetch_market_data.py');
    const result = await runPythonScript(scriptPath, [
      '--symbol', symbol,
      '--interval', interval,
      '--limit', limit || '100'
    ]);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch market data');
    }
    
    res.status(200).json({
      marketData: result.data
    });
  } catch (error) {
    logger.error('Market data error:', error);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

// Global error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app; 