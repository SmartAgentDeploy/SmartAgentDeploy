/**
 * Metrics collection and monitoring utility module
 * Provides functionality for system performance monitoring and statistics
 */

const os = require('os');
const { createModuleLogger } = require('./logger');
const { EventTypes, eventBus } = require('./events');

const logger = createModuleLogger('metrics');

/**
 * Metric types enum
 * Defines the types of metrics that can be collected
 */
const MetricTypes = {
  COUNTER: 'counter',    // Monotonically increasing counter
  GAUGE: 'gauge',        // Value that can go up and down
  HISTOGRAM: 'histogram', // Distribution of values
  TIMER: 'timer'         // Duration measurements
};

/**
 * MetricsRegistry class
 * Central registry for all application metrics
 */
class MetricsRegistry {
  constructor() {
    this.metrics = new Map();
    this.defaultLabels = {};
    this.startTime = Date.now();
    
    // System metrics collection interval in ms
    this.systemMetricsInterval = 60000;
    this.systemMetricsIntervalId = null;
    
    logger.info('Metrics registry initialized');
  }

  /**
   * Initialize the metrics registry
   * @param {Object} options - Configuration options
   */
  initialize(options = {}) {
    this.defaultLabels = options.defaultLabels || {};
    
    // Register default metrics
    this.registerDefaultMetrics();
    
    // Start collecting system metrics
    this.startSystemMetricsCollection();
    
    logger.info('Metrics collection started');
    
    // Register event listeners for application events
    this.registerEventListeners();
  }

  /**
   * Register default application metrics
   */
  registerDefaultMetrics() {
    // Application uptime
    this.registerGauge('app_uptime_seconds', 'Application uptime in seconds');
    
    // HTTP request metrics
    this.registerCounter('http_requests_total', 'Total number of HTTP requests');
    this.registerHistogram('http_request_duration_seconds', 'HTTP request duration in seconds');
    this.registerCounter('http_request_errors_total', 'Total number of HTTP request errors');
    
    // Database metrics
    this.registerCounter('db_queries_total', 'Total number of database queries');
    this.registerHistogram('db_query_duration_seconds', 'Database query duration in seconds');
    this.registerCounter('db_errors_total', 'Total number of database errors');
    
    // AI agent metrics
    this.registerCounter('agent_creations_total', 'Total number of agent creations');
    this.registerCounter('agent_trainings_total', 'Total number of agent trainings');
    this.registerHistogram('agent_training_duration_seconds', 'Agent training duration in seconds');
    this.registerCounter('agent_predictions_total', 'Total number of agent predictions');
    this.registerHistogram('agent_prediction_duration_seconds', 'Agent prediction duration in seconds');
    
    // Blockchain metrics
    this.registerCounter('blockchain_transactions_total', 'Total number of blockchain transactions');
    this.registerHistogram('blockchain_transaction_duration_seconds', 'Blockchain transaction duration in seconds');
    this.registerCounter('blockchain_errors_total', 'Total number of blockchain errors');
    
    // User metrics
    this.registerCounter('user_registrations_total', 'Total number of user registrations');
    this.registerCounter('user_logins_total', 'Total number of user logins');
    
    // System metrics
    this.registerGauge('system_cpu_usage', 'System CPU usage');
    this.registerGauge('system_memory_usage_bytes', 'System memory usage in bytes');
    this.registerGauge('system_memory_total_bytes', 'Total system memory in bytes');
  }

  /**
   * Register event listeners for application events
   */
  registerEventListeners() {
    // HTTP request events
    eventBus.subscribe('http:request:start', ({ data }) => {
      this.incrementCounter('http_requests_total', { method: data.method, path: data.path });
    });
    
    eventBus.subscribe('http:request:end', ({ data }) => {
      this.observeHistogram('http_request_duration_seconds', data.duration, { 
        method: data.method, 
        path: data.path,
        status: data.status
      });
      
      if (data.status >= 400) {
        this.incrementCounter('http_request_errors_total', { 
          method: data.method, 
          path: data.path,
          status: data.status
        });
      }
    });
    
    // Database events
    eventBus.subscribe('db:query:start', ({ data }) => {
      this.incrementCounter('db_queries_total', { operation: data.operation });
    });
    
    eventBus.subscribe('db:query:end', ({ data }) => {
      this.observeHistogram('db_query_duration_seconds', data.duration, { 
        operation: data.operation
      });
    });
    
    eventBus.subscribe('db:error', ({ data }) => {
      this.incrementCounter('db_errors_total', { operation: data.operation });
    });
    
    // Agent events
    eventBus.subscribe(EventTypes.AGENT_CREATED, () => {
      this.incrementCounter('agent_creations_total');
    });
    
    eventBus.subscribe(EventTypes.TRAINING_STARTED, () => {
      this.incrementCounter('agent_trainings_total');
    });
    
    eventBus.subscribe(EventTypes.TRAINING_COMPLETED, ({ data }) => {
      this.observeHistogram('agent_training_duration_seconds', data.duration);
    });
    
    eventBus.subscribe(EventTypes.PREDICTION_REQUESTED, () => {
      this.incrementCounter('agent_predictions_total');
    });
    
    eventBus.subscribe(EventTypes.PREDICTION_COMPLETED, ({ data }) => {
      this.observeHistogram('agent_prediction_duration_seconds', data.duration);
    });
    
    // Blockchain events
    eventBus.subscribe(EventTypes.TRANSACTION_CREATED, () => {
      this.incrementCounter('blockchain_transactions_total');
    });
    
    eventBus.subscribe(EventTypes.TRANSACTION_CONFIRMED, ({ data }) => {
      this.observeHistogram('blockchain_transaction_duration_seconds', data.duration);
    });
    
    eventBus.subscribe(EventTypes.TRANSACTION_FAILED, () => {
      this.incrementCounter('blockchain_errors_total');
    });
    
    // User events
    eventBus.subscribe(EventTypes.USER_REGISTERED, () => {
      this.incrementCounter('user_registrations_total');
    });
    
    eventBus.subscribe(EventTypes.USER_LOGGED_IN, () => {
      this.incrementCounter('user_logins_total');
    });
  }

  /**
   * Start collecting system metrics at regular intervals
   */
  startSystemMetricsCollection() {
    // Collect system metrics immediately
    this.collectSystemMetrics();
    
    // Set up interval for regular collection
    this.systemMetricsIntervalId = setInterval(() => {
      this.collectSystemMetrics();
    }, this.systemMetricsInterval);
  }

  /**
   * Stop collecting system metrics
   */
  stopSystemMetricsCollection() {
    if (this.systemMetricsIntervalId) {
      clearInterval(this.systemMetricsIntervalId);
      this.systemMetricsIntervalId = null;
      logger.info('System metrics collection stopped');
    }
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    // Update application uptime
    const uptime = (Date.now() - this.startTime) / 1000;
    this.setGauge('app_uptime_seconds', uptime);
    
    // CPU usage
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idlePercent = totalIdle / totalTick;
    const usagePercent = 1 - idlePercent;
    
    this.setGauge('system_cpu_usage', usagePercent);
    
    // Memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    this.setGauge('system_memory_usage_bytes', usedMemory);
    this.setGauge('system_memory_total_bytes', totalMemory);
  }

  /**
   * Register a counter metric
   * @param {string} name - Metric name
   * @param {string} help - Help text describing the metric
   * @param {Object} [options] - Additional options
   * @returns {Object} The registered metric
   */
  registerCounter(name, help, options = {}) {
    const metric = {
      name,
      help,
      type: MetricTypes.COUNTER,
      values: new Map(),
      ...options
    };
    
    this.metrics.set(name, metric);
    logger.debug(`Registered counter metric: ${name}`);
    return metric;
  }

  /**
   * Register a gauge metric
   * @param {string} name - Metric name
   * @param {string} help - Help text describing the metric
   * @param {Object} [options] - Additional options
   * @returns {Object} The registered metric
   */
  registerGauge(name, help, options = {}) {
    const metric = {
      name,
      help,
      type: MetricTypes.GAUGE,
      values: new Map(),
      ...options
    };
    
    this.metrics.set(name, metric);
    logger.debug(`Registered gauge metric: ${name}`);
    return metric;
  }

  /**
   * Register a histogram metric
   * @param {string} name - Metric name
   * @param {string} help - Help text describing the metric
   * @param {Object} [options] - Additional options
   * @param {Array<number>} [options.buckets] - Histogram buckets
   * @returns {Object} The registered metric
   */
  registerHistogram(name, help, options = {}) {
    const defaultBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
    
    const metric = {
      name,
      help,
      type: MetricTypes.HISTOGRAM,
      buckets: options.buckets || defaultBuckets,
      values: new Map(),
      ...options
    };
    
    this.metrics.set(name, metric);
    logger.debug(`Registered histogram metric: ${name}`);
    return metric;
  }

  /**
   * Register a timer metric
   * @param {string} name - Metric name
   * @param {string} help - Help text describing the metric
   * @param {Object} [options] - Additional options
   * @returns {Object} The registered metric
   */
  registerTimer(name, help, options = {}) {
    const metric = {
      name,
      help,
      type: MetricTypes.TIMER,
      values: new Map(),
      ...options
    };
    
    this.metrics.set(name, metric);
    logger.debug(`Registered timer metric: ${name}`);
    return metric;
  }

  /**
   * Get a metric by name
   * @param {string} name - Metric name
   * @returns {Object|undefined} The metric or undefined if not found
   */
  getMetric(name) {
    return this.metrics.get(name);
  }

  /**
   * Increment a counter metric
   * @param {string} name - Metric name
   * @param {Object} [labels] - Metric labels
   * @param {number} [value=1] - Value to increment by
   */
  incrementCounter(name, labels = {}, value = 1) {
    const metric = this.getMetric(name);
    
    if (!metric) {
      logger.warn(`Attempted to increment non-existent counter: ${name}`);
      return;
    }
    
    if (metric.type !== MetricTypes.COUNTER) {
      logger.warn(`Metric ${name} is not a counter`);
      return;
    }
    
    const labelKey = this.getLabelKey({ ...this.defaultLabels, ...labels });
    const currentValue = metric.values.get(labelKey) || 0;
    metric.values.set(labelKey, currentValue + value);
  }

  /**
   * Set a gauge metric value
   * @param {string} name - Metric name
   * @param {number} value - Value to set
   * @param {Object} [labels] - Metric labels
   */
  setGauge(name, value, labels = {}) {
    const metric = this.getMetric(name);
    
    if (!metric) {
      logger.warn(`Attempted to set non-existent gauge: ${name}`);
      return;
    }
    
    if (metric.type !== MetricTypes.GAUGE) {
      logger.warn(`Metric ${name} is not a gauge`);
      return;
    }
    
    const labelKey = this.getLabelKey({ ...this.defaultLabels, ...labels });
    metric.values.set(labelKey, value);
  }

  /**
   * Increment a gauge metric
   * @param {string} name - Metric name
   * @param {number} value - Value to increment by
   * @param {Object} [labels] - Metric labels
   */
  incrementGauge(name, value, labels = {}) {
    const metric = this.getMetric(name);
    
    if (!metric) {
      logger.warn(`Attempted to increment non-existent gauge: ${name}`);
      return;
    }
    
    if (metric.type !== MetricTypes.GAUGE) {
      logger.warn(`Metric ${name} is not a gauge`);
      return;
    }
    
    const labelKey = this.getLabelKey({ ...this.defaultLabels, ...labels });
    const currentValue = metric.values.get(labelKey) || 0;
    metric.values.set(labelKey, currentValue + value);
  }

  /**
   * Decrement a gauge metric
   * @param {string} name - Metric name
   * @param {number} value - Value to decrement by
   * @param {Object} [labels] - Metric labels
   */
  decrementGauge(name, value, labels = {}) {
    const metric = this.getMetric(name);
    
    if (!metric) {
      logger.warn(`Attempted to decrement non-existent gauge: ${name}`);
      return;
    }
    
    if (metric.type !== MetricTypes.GAUGE) {
      logger.warn(`Metric ${name} is not a gauge`);
      return;
    }
    
    const labelKey = this.getLabelKey({ ...this.defaultLabels, ...labels });
    const currentValue = metric.values.get(labelKey) || 0;
    metric.values.set(labelKey, currentValue - value);
  }

  /**
   * Observe a value for a histogram metric
   * @param {string} name - Metric name
   * @param {number} value - Value to observe
   * @param {Object} [labels] - Metric labels
   */
  observeHistogram(name, value, labels = {}) {
    const metric = this.getMetric(name);
    
    if (!metric) {
      logger.warn(`Attempted to observe non-existent histogram: ${name}`);
      return;
    }
    
    if (metric.type !== MetricTypes.HISTOGRAM) {
      logger.warn(`Metric ${name} is not a histogram`);
      return;
    }
    
    const labelKey = this.getLabelKey({ ...this.defaultLabels, ...labels });
    let histogram = metric.values.get(labelKey);
    
    if (!histogram) {
      histogram = {
        count: 0,
        sum: 0,
        buckets: metric.buckets.reduce((acc, bound) => {
          acc[bound] = 0;
          return acc;
        }, {})
      };
      metric.values.set(labelKey, histogram);
    }
    
    // Update histogram
    histogram.count += 1;
    histogram.sum += value;
    
    // Update buckets
    for (const bound of metric.buckets) {
      if (value <= bound) {
        histogram.buckets[bound] += 1;
      }
    }
  }

  /**
   * Start a timer
   * @param {string} name - Metric name
   * @param {Object} [labels] - Metric labels
   * @returns {Function} Function to stop the timer and record the duration
   */
  startTimer(name, labels = {}) {
    const startTime = process.hrtime();
    
    return () => {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds + nanoseconds / 1e9;
      
      this.observeHistogram(name, duration, labels);
      return duration;
    };
  }

  /**
   * Get a label key for a set of labels
   * @param {Object} labels - Label key-value pairs
   * @returns {string} Label key
   */
  getLabelKey(labels) {
    if (Object.keys(labels).length === 0) {
      return '';
    }
    
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
  }

  /**
   * Get all metrics in a format suitable for export
   * @returns {Object} Metrics data
   */
  getMetrics() {
    const result = {};
    
    for (const [name, metric] of this.metrics.entries()) {
      result[name] = {
        help: metric.help,
        type: metric.type,
        values: {}
      };
      
      for (const [labelKey, value] of metric.values.entries()) {
        result[name].values[labelKey] = value;
      }
    }
    
    return result;
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    for (const metric of this.metrics.values()) {
      metric.values.clear();
    }
    
    logger.info('All metrics reset');
  }
}

// Create singleton instance
const metricsRegistry = new MetricsRegistry();

module.exports = {
  MetricTypes,
  metricsRegistry
}; 