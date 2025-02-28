/**
 * AI configuration
 * Contains settings for AI models, training parameters, and strategy configurations
 */

module.exports = {
  // Model save paths
  paths: {
    modelSavePath: process.env.MODEL_SAVE_PATH || './models',
    dataPath: process.env.DATA_PATH || './data'
  },
  
  // Default model parameters
  defaultModelParams: {
    // LSTM model parameters
    lstm: {
      units: 50,
      dropout: 0.2,
      recurrentDropout: 0.2,
      optimizer: 'adam',
      loss: 'binary_crossentropy',
      metrics: ['accuracy'],
      batchSize: 32,
      epochs: 50,
      validationSplit: 0.2,
      sequenceLength: 60,
      patience: 10
    },
    
    // DNN model parameters
    dnn: {
      hiddenLayers: [64, 32, 16],
      dropout: 0.2,
      activation: 'relu',
      outputActivation: 'sigmoid',
      optimizer: 'adam',
      loss: 'binary_crossentropy',
      metrics: ['accuracy'],
      batchSize: 32,
      epochs: 50,
      validationSplit: 0.2,
      patience: 10
    },
    
    // Random Forest model parameters
    randomForest: {
      nEstimators: 100,
      maxDepth: 10,
      minSamplesSplit: 2,
      minSamplesLeaf: 1,
      bootstrap: true,
      nJobs: -1,
      randomState: 42
    }
  },
  
  // Risk level configurations
  riskLevels: {
    low: {
      stopLoss: 0.02,
      takeProfit: 0.05,
      maxPositionSize: 0.1,
      maxOpenPositions: 3
    },
    medium: {
      stopLoss: 0.05,
      takeProfit: 0.1,
      maxPositionSize: 0.2,
      maxOpenPositions: 5
    },
    high: {
      stopLoss: 0.1,
      takeProfit: 0.2,
      maxPositionSize: 0.3,
      maxOpenPositions: 10
    }
  },
  
  // Feature engineering settings
  features: {
    technicalIndicators: [
      'sma', 'ema', 'rsi', 'macd', 'bollinger_bands', 
      'stochastic_oscillator', 'obv', 'atr', 'adx'
    ],
    priceFeatures: [
      'open', 'high', 'low', 'close', 'volume',
      'price_change', 'price_change_pct', 'range'
    ],
    timeFeatures: [
      'hour', 'day_of_week', 'day_of_month', 'month', 'is_weekend'
    ]
  }
}; 