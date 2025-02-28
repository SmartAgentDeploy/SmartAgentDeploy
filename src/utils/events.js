/**
 * Event emitter utility module
 * Provides a publish-subscribe mechanism for system-wide events
 */

const EventEmitter = require('events');
const { createModuleLogger } = require('./logger');

const logger = createModuleLogger('events');

/**
 * Event types enum
 * Defines all available event types in the system
 */
const EventTypes = {
  // User events
  USER_REGISTERED: 'user:registered',
  USER_LOGGED_IN: 'user:logged_in',
  USER_LOGGED_OUT: 'user:logged_out',
  USER_UPDATED: 'user:updated',
  USER_DELETED: 'user:deleted',
  
  // Agent events
  AGENT_CREATED: 'agent:created',
  AGENT_UPDATED: 'agent:updated',
  AGENT_DELETED: 'agent:deleted',
  AGENT_DEPLOYED: 'agent:deployed',
  
  // Training events
  TRAINING_STARTED: 'training:started',
  TRAINING_PROGRESS: 'training:progress',
  TRAINING_COMPLETED: 'training:completed',
  TRAINING_FAILED: 'training:failed',
  
  // Prediction events
  PREDICTION_REQUESTED: 'prediction:requested',
  PREDICTION_COMPLETED: 'prediction:completed',
  PREDICTION_FAILED: 'prediction:failed',
  
  // Strategy events
  STRATEGY_EXECUTION_STARTED: 'strategy:execution:started',
  STRATEGY_EXECUTION_COMPLETED: 'strategy:execution:completed',
  STRATEGY_EXECUTION_FAILED: 'strategy:execution:failed',
  
  // Transaction events
  TRANSACTION_CREATED: 'transaction:created',
  TRANSACTION_UPDATED: 'transaction:updated',
  TRANSACTION_CONFIRMED: 'transaction:confirmed',
  TRANSACTION_FAILED: 'transaction:failed',
  
  // Market events
  MARKET_DATA_UPDATED: 'market:data:updated',
  MARKET_ALERT: 'market:alert',
  
  // System events
  SYSTEM_ERROR: 'system:error',
  SYSTEM_WARNING: 'system:warning',
  SYSTEM_INFO: 'system:info'
};

/**
 * EventBus class
 * Central event bus for the application
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Set higher limit for listeners
    logger.info('Event bus initialized');
  }

  /**
   * Publish an event
   * @param {string} eventType - Type of event from EventTypes
   * @param {Object} data - Event data payload
   * @param {Object} [options] - Additional options
   */
  publish(eventType, data, options = {}) {
    if (!Object.values(EventTypes).includes(eventType)) {
      logger.warn(`Publishing unknown event type: ${eventType}`);
    }
    
    const eventData = {
      type: eventType,
      timestamp: new Date(),
      data,
      ...options
    };
    
    logger.debug(`Publishing event: ${eventType}`, { data: eventData });
    this.emit(eventType, eventData);
    
    // Also emit to wildcard listeners
    const category = eventType.split(':')[0];
    if (category) {
      this.emit(`${category}:*`, eventData);
    }
    
    // Emit to global listeners
    this.emit('*', eventData);
  }

  /**
   * Subscribe to an event
   * @param {string} eventType - Type of event from EventTypes
   * @param {Function} listener - Event handler function
   * @param {Object} [options] - Additional options
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, listener, options = {}) {
    if (!Object.values(EventTypes).includes(eventType) && 
        !eventType.endsWith(':*') && 
        eventType !== '*') {
      logger.warn(`Subscribing to unknown event type: ${eventType}`);
    }
    
    const wrappedListener = (eventData) => {
      try {
        listener(eventData);
      } catch (error) {
        logger.error(`Error in event listener for ${eventType}`, { error });
      }
    };
    
    this.on(eventType, wrappedListener);
    logger.debug(`Subscribed to event: ${eventType}`);
    
    // Return unsubscribe function
    return () => {
      this.off(eventType, wrappedListener);
      logger.debug(`Unsubscribed from event: ${eventType}`);
    };
  }

  /**
   * Subscribe to an event once
   * @param {string} eventType - Type of event from EventTypes
   * @param {Function} listener - Event handler function
   * @param {Object} [options] - Additional options
   */
  subscribeOnce(eventType, listener, options = {}) {
    if (!Object.values(EventTypes).includes(eventType) && 
        !eventType.endsWith(':*') && 
        eventType !== '*') {
      logger.warn(`Subscribing once to unknown event type: ${eventType}`);
    }
    
    const wrappedListener = (eventData) => {
      try {
        listener(eventData);
      } catch (error) {
        logger.error(`Error in one-time event listener for ${eventType}`, { error });
      }
    };
    
    this.once(eventType, wrappedListener);
    logger.debug(`Subscribed once to event: ${eventType}`);
  }

  /**
   * Wait for an event to occur
   * @param {string} eventType - Type of event from EventTypes
   * @param {Object} [options] - Additional options
   * @param {number} [options.timeout] - Timeout in milliseconds
   * @returns {Promise<Object>} Event data
   */
  waitForEvent(eventType, options = {}) {
    const { timeout } = options;
    
    return new Promise((resolve, reject) => {
      let timeoutId;
      
      const listener = (eventData) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve(eventData);
      };
      
      this.once(eventType, listener);
      
      if (timeout) {
        timeoutId = setTimeout(() => {
          this.off(eventType, listener);
          reject(new Error(`Timeout waiting for event: ${eventType}`));
        }, timeout);
      }
    });
  }
}

// Create singleton instance
const eventBus = new EventBus();

module.exports = {
  EventTypes,
  eventBus
}; 