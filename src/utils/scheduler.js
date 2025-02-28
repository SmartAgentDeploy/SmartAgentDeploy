/**
 * Scheduler utility module
 * Provides job scheduling and queue functionality
 */

const { EventEmitter } = require('events');
const { createModuleLogger } = require('./logger');
const { sleep } = require('./helpers');

const logger = createModuleLogger('scheduler');

/**
 * Job status enum
 * @enum {string}
 */
const JobStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Job class representing a scheduled task
 */
class Job {
  /**
   * Create a new job
   * @param {Object} options - Job options
   * @param {string} options.id - Job ID
   * @param {Function} options.handler - Job handler function
   * @param {Object} options.data - Job data
   * @param {number} options.priority - Job priority (lower is higher priority)
   * @param {number} options.maxRetries - Maximum retry attempts
   * @param {number} options.retryDelay - Delay between retries in milliseconds
   */
  constructor(options) {
    this.id = options.id;
    this.handler = options.handler;
    this.data = options.data || {};
    this.priority = options.priority || 0;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.status = JobStatus.PENDING;
    this.result = null;
    this.error = null;
    this.retries = 0;
    this.createdAt = new Date();
    this.startedAt = null;
    this.completedAt = null;
  }

  /**
   * Execute the job
   * @returns {Promise<*>} Job result
   */
  async execute() {
    try {
      this.status = JobStatus.RUNNING;
      this.startedAt = new Date();
      
      logger.info(`Executing job ${this.id}`, { jobId: this.id });
      
      this.result = await this.handler(this.data);
      this.status = JobStatus.COMPLETED;
      this.completedAt = new Date();
      
      logger.info(`Job ${this.id} completed successfully`, { 
        jobId: this.id,
        duration: this.completedAt - this.startedAt
      });
      
      return this.result;
    } catch (error) {
      this.error = error;
      
      if (this.retries < this.maxRetries) {
        this.retries++;
        this.status = JobStatus.PENDING;
        
        logger.warn(`Job ${this.id} failed, retrying (${this.retries}/${this.maxRetries})`, {
          jobId: this.id,
          error: error.message
        });
        
        await sleep(this.retryDelay * Math.pow(2, this.retries - 1)); // Exponential backoff
        return this.execute();
      }
      
      this.status = JobStatus.FAILED;
      this.completedAt = new Date();
      
      logger.error(`Job ${this.id} failed after ${this.retries} retries`, {
        jobId: this.id,
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }

  /**
   * Cancel the job
   */
  cancel() {
    if (this.status === JobStatus.PENDING) {
      this.status = JobStatus.CANCELLED;
      logger.info(`Job ${this.id} cancelled`, { jobId: this.id });
    }
  }

  /**
   * Get job information
   * @returns {Object} Job info
   */
  toJSON() {
    return {
      id: this.id,
      status: this.status,
      priority: this.priority,
      data: this.data,
      result: this.result,
      error: this.error ? this.error.message : null,
      retries: this.retries,
      maxRetries: this.maxRetries,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt
    };
  }
}

/**
 * Job queue for processing jobs sequentially
 */
class JobQueue extends EventEmitter {
  /**
   * Create a new job queue
   * @param {Object} options - Queue options
   * @param {number} options.concurrency - Maximum concurrent jobs
   * @param {boolean} options.autoStart - Whether to start processing automatically
   */
  constructor(options = {}) {
    super();
    this.concurrency = options.concurrency || 1;
    this.autoStart = options.autoStart !== false;
    this.queue = [];
    this.running = 0;
    this.paused = false;
    this.processingPromise = null;
    
    // Start processing if autoStart is true
    if (this.autoStart) {
      this.start();
    }
  }

  /**
   * Add a job to the queue
   * @param {Job|Object} job - Job or job options
   * @returns {Job} Added job
   */
  add(job) {
    // Create job instance if options object is provided
    const jobInstance = job instanceof Job ? job : new Job(job);
    
    // Add job to queue
    this.queue.push(jobInstance);
    
    // Sort queue by priority
    this.queue.sort((a, b) => a.priority - b.priority);
    
    logger.info(`Job ${jobInstance.id} added to queue`, { 
      jobId: jobInstance.id,
      queueSize: this.queue.length
    });
    
    this.emit('job:added', jobInstance);
    
    // Start processing if not already started
    if (this.autoStart && !this.processingPromise && !this.paused) {
      this.start();
    }
    
    return jobInstance;
  }

  /**
   * Get a job by ID
   * @param {string} id - Job ID
   * @returns {Job|null} Job or null if not found
   */
  getJob(id) {
    return this.queue.find(job => job.id === id) || null;
  }

  /**
   * Remove a job from the queue
   * @param {string} id - Job ID
   * @returns {boolean} Whether job was removed
   */
  remove(id) {
    const index = this.queue.findIndex(job => job.id === id);
    
    if (index !== -1) {
      const job = this.queue[index];
      
      if (job.status === JobStatus.PENDING) {
        this.queue.splice(index, 1);
        job.cancel();
        
        logger.info(`Job ${id} removed from queue`, { 
          jobId: id,
          queueSize: this.queue.length
        });
        
        this.emit('job:removed', job);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Start processing the queue
   */
  start() {
    if (this.paused) {
      this.paused = false;
      logger.info('Queue processing resumed');
      this.emit('resumed');
    }
    
    if (!this.processingPromise) {
      this.processingPromise = this.process();
    }
  }

  /**
   * Pause queue processing
   */
  pause() {
    this.paused = true;
    logger.info('Queue processing paused');
    this.emit('paused');
  }

  /**
   * Clear all pending jobs
   */
  clear() {
    const pendingJobs = this.queue.filter(job => job.status === JobStatus.PENDING);
    
    pendingJobs.forEach(job => {
      job.cancel();
    });
    
    this.queue = this.queue.filter(job => job.status !== JobStatus.PENDING);
    
    logger.info(`Queue cleared, removed ${pendingJobs.length} pending jobs`);
    this.emit('cleared', pendingJobs);
  }

  /**
   * Process jobs in the queue
   * @private
   */
  async process() {
    try {
      while (!this.paused && this.queue.length > 0) {
        // Check if we can process more jobs
        if (this.running >= this.concurrency) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        
        // Get next pending job
        const job = this.queue.find(job => job.status === JobStatus.PENDING);
        
        if (!job) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        
        // Increment running count
        this.running++;
        
        // Execute job
        this.emit('job:started', job);
        
        job.execute()
          .then(result => {
            this.emit('job:completed', job, result);
          })
          .catch(error => {
            this.emit('job:failed', job, error);
          })
          .finally(() => {
            this.running--;
            
            // Remove completed or failed jobs from queue
            if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
              const index = this.queue.findIndex(j => j.id === job.id);
              if (index !== -1) {
                this.queue.splice(index, 1);
              }
            }
          });
      }
    } catch (error) {
      logger.error('Error processing queue', { error: error.message });
      this.emit('error', error);
    } finally {
      this.processingPromise = null;
      
      // Restart processing if there are still jobs in the queue
      if (!this.paused && this.queue.some(job => job.status === JobStatus.PENDING)) {
        this.start();
      }
    }
  }

  /**
   * Get queue statistics
   * @returns {Object} Queue stats
   */
  getStats() {
    const total = this.queue.length;
    const pending = this.queue.filter(job => job.status === JobStatus.PENDING).length;
    const running = this.queue.filter(job => job.status === JobStatus.RUNNING).length;
    const completed = this.queue.filter(job => job.status === JobStatus.COMPLETED).length;
    const failed = this.queue.filter(job => job.status === JobStatus.FAILED).length;
    const cancelled = this.queue.filter(job => job.status === JobStatus.CANCELLED).length;
    
    return {
      total,
      pending,
      running,
      completed,
      failed,
      cancelled,
      concurrency: this.concurrency,
      paused: this.paused
    };
  }
}

/**
 * Scheduler for managing recurring jobs
 */
class Scheduler extends EventEmitter {
  /**
   * Create a new scheduler
   */
  constructor() {
    super();
    this.jobs = new Map();
    this.timers = new Map();
    this.queue = new JobQueue();
    
    // Forward queue events
    this.queue.on('job:added', job => this.emit('job:added', job));
    this.queue.on('job:started', job => this.emit('job:started', job));
    this.queue.on('job:completed', (job, result) => this.emit('job:completed', job, result));
    this.queue.on('job:failed', (job, error) => this.emit('job:failed', job, error));
    this.queue.on('error', error => this.emit('error', error));
  }

  /**
   * Schedule a job to run at a specific time
   * @param {Object} options - Job options
   * @param {string} options.id - Job ID
   * @param {Function} options.handler - Job handler function
   * @param {Object} options.data - Job data
   * @param {Date|string|number} options.time - Time to run the job
   * @returns {Job} Scheduled job
   */
  scheduleAt(options) {
    const { id, time } = options;
    
    // Convert time to Date if needed
    const jobTime = time instanceof Date ? time : new Date(time);
    
    // Calculate delay
    const now = new Date();
    const delay = Math.max(0, jobTime.getTime() - now.getTime());
    
    logger.info(`Scheduling job ${id} to run at ${jobTime.toISOString()}`, { 
      jobId: id,
      delay: `${delay}ms`
    });
    
    // Create job
    const job = new Job(options);
    
    // Store job
    this.jobs.set(id, job);
    
    // Schedule job
    const timer = setTimeout(() => {
      this.queue.add(job);
      this.timers.delete(id);
      this.jobs.delete(id);
    }, delay);
    
    // Store timer
    this.timers.set(id, timer);
    
    this.emit('scheduled', job, jobTime);
    
    return job;
  }

  /**
   * Schedule a job to run after a delay
   * @param {Object} options - Job options
   * @param {string} options.id - Job ID
   * @param {Function} options.handler - Job handler function
   * @param {Object} options.data - Job data
   * @param {number} options.delay - Delay in milliseconds
   * @returns {Job} Scheduled job
   */
  scheduleAfter(options) {
    const { id, delay } = options;
    const time = new Date(Date.now() + delay);
    
    return this.scheduleAt({ ...options, time });
  }

  /**
   * Schedule a recurring job
   * @param {Object} options - Job options
   * @param {string} options.id - Job ID
   * @param {Function} options.handler - Job handler function
   * @param {Object} options.data - Job data
   * @param {string} options.cron - Cron expression
   * @returns {Job} Scheduled job
   */
  scheduleCron(options) {
    const { id, cron } = options;
    
    try {
      // Lazy load cron parser to avoid dependency if not used
      const cronParser = require('cron-parser');
      
      // Parse cron expression
      const interval = cronParser.parseExpression(cron);
      
      // Get next run time
      const nextRun = interval.next().toDate();
      
      logger.info(`Scheduling recurring job ${id} with cron "${cron}", next run at ${nextRun.toISOString()}`, { 
        jobId: id,
        cron
      });
      
      // Schedule first run
      const job = this.scheduleAt({
        ...options,
        time: nextRun,
        data: { ...options.data, _cron: cron }
      });
      
      // Set up recurring handler
      this.queue.on('job:completed', (completedJob) => {
        if (completedJob.id === id && completedJob.data._cron === cron) {
          // Schedule next run
          const nextRun = interval.next().toDate();
          
          logger.info(`Rescheduling recurring job ${id}, next run at ${nextRun.toISOString()}`, { 
            jobId: id,
            cron
          });
          
          this.scheduleAt({
            ...options,
            time: nextRun,
            data: { ...options.data, _cron: cron }
          });
        }
      });
      
      return job;
    } catch (error) {
      logger.error(`Error scheduling recurring job ${id}`, { 
        jobId: id,
        cron,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Cancel a scheduled job
   * @param {string} id - Job ID
   * @returns {boolean} Whether job was cancelled
   */
  cancel(id) {
    // Check if job is scheduled
    if (this.timers.has(id)) {
      // Clear timer
      clearTimeout(this.timers.get(id));
      this.timers.delete(id);
      
      // Get job
      const job = this.jobs.get(id);
      
      if (job) {
        // Cancel job
        job.cancel();
        this.jobs.delete(id);
        
        logger.info(`Scheduled job ${id} cancelled`, { jobId: id });
        this.emit('cancelled', job);
        
        return true;
      }
    }
    
    // Try to remove from queue
    return this.queue.remove(id);
  }

  /**
   * Get a scheduled job
   * @param {string} id - Job ID
   * @returns {Job|null} Job or null if not found
   */
  getJob(id) {
    return this.jobs.get(id) || this.queue.getJob(id) || null;
  }

  /**
   * Get all scheduled jobs
   * @returns {Job[]} Array of jobs
   */
  getJobs() {
    return [...this.jobs.values()];
  }

  /**
   * Get scheduler statistics
   * @returns {Object} Scheduler stats
   */
  getStats() {
    return {
      scheduledJobs: this.jobs.size,
      queue: this.queue.getStats()
    };
  }
}

// Create singleton instance
const scheduler = new Scheduler();

module.exports = {
  scheduler,
  Scheduler,
  JobQueue,
  Job,
  JobStatus
}; 