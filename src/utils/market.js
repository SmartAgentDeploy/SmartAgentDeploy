const axios = require('axios');
const config = require('./config');
const { createModuleLogger } = require('./logger');

const logger = createModuleLogger('market');

/**
 * Market Data Service class
 */
class MarketDataService {
  constructor() {
    this.apiKey = config.api.marketDataApiKey;
    this.apiUrl = config.api.marketDataApiUrl;
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get kline data
   * @param {string} symbol - Trading pair symbol
   * @param {string} interval - Time interval
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time
   * @param {number} limit - Limit count
   * @returns {Promise<Array>} Kline data
   */
  async getKlines(symbol, interval, startTime = null, endTime = null, limit = 500) {
    try {
      const params = {
        symbol,
        interval,
        limit
      };

      if (startTime) {
        params.startTime = startTime instanceof Date ? startTime.getTime() : startTime;
      }

      if (endTime) {
        params.endTime = endTime instanceof Date ? endTime.getTime() : endTime;
      }

      const response = await this.client.get('/klines', { params });
      
      logger.info('Fetched kline data', { 
        symbol, 
        interval, 
        count: response.data.length 
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error fetching kline data', { 
        symbol, 
        interval, 
        error: error.message 
      });
      throw new Error(`Failed to fetch kline data: ${error.message}`);
    }
  }

  /**
   * Get order book data
   * @param {string} symbol - Trading pair symbol
   * @param {number} limit - Limit count
   * @returns {Promise<Object>} Order book data
   */
  async getOrderBook(symbol, limit = 100) {
    try {
      const response = await this.client.get('/depth', {
        params: {
          symbol,
          limit
        }
      });
      
      logger.info('Fetched order book data', { symbol });
      
      return response.data;
    } catch (error) {
      logger.error('Error fetching order book data', { 
        symbol, 
        error: error.message 
      });
      throw new Error(`Failed to fetch order book data: ${error.message}`);
    }
  }

  /**
   * Get latest price
   * @param {string} symbol - Trading pair symbol
   * @returns {Promise<Object>} Price data
   */
  async getPrice(symbol) {
    try {
      const response = await this.client.get('/ticker/price', {
        params: { symbol }
      });
      
      logger.info('Fetched price data', { symbol, price: response.data.price });
      
      return response.data;
    } catch (error) {
      logger.error('Error fetching price data', { 
        symbol, 
        error: error.message 
      });
      throw new Error(`Failed to fetch price data: ${error.message}`);
    }
  }

  /**
   * Get 24-hour statistics
   * @param {string} symbol - Trading pair symbol
   * @returns {Promise<Object>} 24-hour statistics
   */
  async get24hStats(symbol) {
    try {
      const response = await this.client.get('/ticker/24hr', {
        params: { symbol }
      });
      
      logger.info('Fetched 24h stats', { symbol });
      
      return response.data;
    } catch (error) {
      logger.error('Error fetching 24h stats', { 
        symbol, 
        error: error.message 
      });
      throw new Error(`Failed to fetch 24h stats: ${error.message}`);
    }
  }

  /**
   * Get symbols list
   * @returns {Promise<Array>} Symbols list
   */
  async getSymbols() {
    try {
      const response = await this.client.get('/exchangeInfo');
      const symbols = response.data.symbols.map(item => item.symbol);
      
      logger.info('Fetched symbols list', { count: symbols.length });
      
      return symbols;
    } catch (error) {
      logger.error('Error fetching symbols list', { error: error.message });
      throw new Error(`Failed to fetch symbols list: ${error.message}`);
    }
  }

  /**
   * Format kline data to OHLCV format
   * @param {Array} klines - Kline data
   * @returns {Object} OHLCV data
   */
  static formatOHLCV(klines) {
    const timestamps = [];
    const opens = [];
    const highs = [];
    const lows = [];
    const closes = [];
    const volumes = [];

    klines.forEach(kline => {
      timestamps.push(kline[0]);
      opens.push(parseFloat(kline[1]));
      highs.push(parseFloat(kline[2]));
      lows.push(parseFloat(kline[3]));
      closes.push(parseFloat(kline[4]));
      volumes.push(parseFloat(kline[5]));
    });

    return {
      timestamps,
      opens,
      highs,
      lows,
      closes,
      volumes
    };
  }
}

module.exports = {
  MarketDataService
}; 