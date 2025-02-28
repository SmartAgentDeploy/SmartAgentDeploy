const Joi = require('joi');

// User validation schemas
const userSchema = {
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{8,30}$')).required(),
    confirmPassword: Joi.ref('password')
  }).with('password', 'confirmPassword'),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  update: Joi.object({
    username: Joi.string().alphanum().min(3).max(30),
    email: Joi.string().email(),
    currentPassword: Joi.string().when('newPassword', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    newPassword: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{8,30}$')),
    confirmNewPassword: Joi.ref('newPassword')
  }).with('newPassword', 'confirmNewPassword')
};

// AI agent validation schemas
const agentSchema = {
  create: Joi.object({
    name: Joi.string().min(3).max(50).required(),
    strategy_type: Joi.string().valid('lstm', 'dnn', 'cnn', 'rnn').required(),
    risk_level: Joi.number().min(0).max(1).required(),
    metadata: Joi.object().optional()
  }),

  train: Joi.object({
    agent_id: Joi.string().required(),
    data_source: Joi.string().required(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    epochs: Joi.number().integer().min(1).optional(),
    batch_size: Joi.number().integer().min(1).optional(),
    validation_split: Joi.number().min(0).max(0.5).optional()
  }),

  predict: Joi.object({
    agent_id: Joi.string().required(),
    data_source: Joi.string().required(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional()
  }),

  execute: Joi.object({
    agent_id: Joi.string().required(),
    amount: Joi.number().positive().required(),
    asset: Joi.string().required(),
    strategy_params: Joi.object().optional()
  })
};

// Market data validation schemas
const marketDataSchema = {
  fetch: Joi.object({
    symbol: Joi.string().required(),
    interval: Joi.string().valid('1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M').required(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    limit: Joi.number().integer().min(1).max(1000).optional()
  })
};

// Blockchain transaction validation schemas
const blockchainSchema = {
  transaction: Joi.object({
    to: Joi.string().required(),
    value: Joi.number().min(0).required(),
    data: Joi.string().optional(),
    gas: Joi.number().integer().optional(),
    gasPrice: Joi.number().integer().optional()
  }),

  deployAgent: Joi.object({
    agent_id: Joi.string().required(),
    name: Joi.string().required(),
    strategy_type: Joi.string().required(),
    risk_level: Joi.number().min(0).max(1).required(),
    metadata: Joi.string().optional()
  })
};

// Validation function
function validate(schema, data) {
  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return { error: errorMessage, value: null };
  }
  
  return { error: null, value };
}

module.exports = {
  validate,
  userSchema,
  agentSchema,
  marketDataSchema,
  blockchainSchema
}; 