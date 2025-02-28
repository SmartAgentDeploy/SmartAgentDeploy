#!/usr/bin/env python3
"""
Market Data Fetcher Script
Fetches market data from various sources and saves it for AI agent training
"""

import os
import sys
import json
import time
import logging
import argparse
import pandas as pd
import requests
from datetime import datetime, timedelta

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('market_data_fetcher')

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    logger.warning("python-dotenv not installed, skipping .env file loading")

# Configuration
API_KEY = os.getenv('MARKET_DATA_API_KEY')
API_URL = os.getenv('MARKET_DATA_API_URL', 'https://api.example.com')
DATA_DIR = os.getenv('DATA_PATH', os.path.join(os.getcwd(), 'data'))

# Ensure data directory exists
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

class MarketDataFetcher:
    """
    Class for fetching market data from various sources
    """
    
    def __init__(self):
        """
        Initialize the market data fetcher
        """
        self.binance_api_key = os.getenv('BINANCE_API_KEY', '')
        self.binance_api_secret = os.getenv('BINANCE_API_SECRET', '')
        self.coinmarketcap_api_key = os.getenv('COINMARKETCAP_API_KEY', '')
    
    def fetch_binance_data(self, symbol, interval, limit=100):
        """
        Fetch market data from Binance
        
        Args:
            symbol (str): Trading pair symbol (e.g., 'BTCUSDT')
            interval (str): Kline interval (e.g., '1h', '1d')
            limit (int): Number of data points to fetch
            
        Returns:
            DataFrame: Market data with OHLCV columns
        """
        try:
            # Binance API endpoint for klines (candlestick) data
            url = 'https://api.binance.com/api/v3/klines'
            
            # Parameters for the API request
            params = {
                'symbol': symbol,
                'interval': interval,
                'limit': limit
            }
            
            # Add API key if available
            headers = {}
            if self.binance_api_key:
                headers['X-MBX-APIKEY'] = self.binance_api_key
            
            # Make the API request
            response = requests.get(url, params=params, headers=headers)
            response.raise_for_status()  # Raise exception for HTTP errors
            
            # Parse the response
            data = response.json()
            
            # Convert to DataFrame
            df = pd.DataFrame(data, columns=[
                'timestamp', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_asset_volume', 'number_of_trades',
                'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
            ])
            
            # Convert types
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            for col in ['open', 'high', 'low', 'close', 'volume']:
                df[col] = df[col].astype(float)
            
            # Select only the columns we need
            df = df[['timestamp', 'open', 'high', 'low', 'close', 'volume']]
            
            logger.info(f"Fetched {len(df)} data points from Binance for {symbol}")
            
            return df
            
        except Exception as e:
            logger.error(f"Error fetching data from Binance: {e}")
            return pd.DataFrame()
    
    def fetch_coinmarketcap_data(self, symbol, days=30):
        """
        Fetch market data from CoinMarketCap
        
        Args:
            symbol (str): Cryptocurrency symbol (e.g., 'BTC')
            days (int): Number of days of historical data to fetch
            
        Returns:
            DataFrame: Market data with OHLCV columns
        """
        try:
            # CoinMarketCap API requires an API key
            if not self.coinmarketcap_api_key:
                logger.error("CoinMarketCap API key not found")
                return pd.DataFrame()
            
            # Get cryptocurrency ID from symbol
            url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/map'
            headers = {
                'X-CMC_PRO_API_KEY': self.coinmarketcap_api_key
            }
            
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            crypto_id = None
            
            for crypto in data['data']:
                if crypto['symbol'] == symbol:
                    crypto_id = crypto['id']
                    break
            
            if not crypto_id:
                logger.error(f"Cryptocurrency with symbol {symbol} not found")
                return pd.DataFrame()
            
            # Fetch historical data
            url = f'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/historical'
            params = {
                'id': crypto_id,
                'time_start': (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%dT%H:%M:%S'),
                'time_end': datetime.now().strftime('%Y-%m-%dT%H:%M:%S'),
                'interval': '1d'  # Daily data
            }
            
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            # Parse the response
            quotes = data['data']['quotes']
            
            # Convert to DataFrame
            records = []
            for quote in quotes:
                records.append({
                    'timestamp': quote['timestamp'],
                    'open': quote['quote']['USD']['open'],
                    'high': quote['quote']['USD']['high'],
                    'low': quote['quote']['USD']['low'],
                    'close': quote['quote']['USD']['close'],
                    'volume': quote['quote']['USD']['volume']
                })
            
            df = pd.DataFrame(records)
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            
            logger.info(f"Fetched {len(df)} data points from CoinMarketCap for {symbol}")
            
            return df
            
        except Exception as e:
            logger.error(f"Error fetching data from CoinMarketCap: {e}")
            return pd.DataFrame()
    
    def fetch_mock_data(self, symbol, interval, limit=100):
        """
        Generate mock market data for testing
        
        Args:
            symbol (str): Trading pair symbol
            interval (str): Time interval
            limit (int): Number of data points
            
        Returns:
            DataFrame: Mock market data with OHLCV columns
        """
        # Generate timestamps
        end_time = datetime.now()
        
        # Determine time delta based on interval
        if interval == '1m':
            delta = timedelta(minutes=1)
        elif interval == '5m':
            delta = timedelta(minutes=5)
        elif interval == '15m':
            delta = timedelta(minutes=15)
        elif interval == '30m':
            delta = timedelta(minutes=30)
        elif interval == '1h':
            delta = timedelta(hours=1)
        elif interval == '4h':
            delta = timedelta(hours=4)
        elif interval == '1d':
            delta = timedelta(days=1)
        else:
            delta = timedelta(hours=1)
        
        # Generate timestamps
        timestamps = [end_time - delta * i for i in range(limit)]
        timestamps.reverse()
        
        # Generate mock price data
        import numpy as np
        
        # Start with a base price
        if symbol.startswith('BTC'):
            base_price = 50000
        elif symbol.startswith('ETH'):
            base_price = 3000
        else:
            base_price = 100
        
        # Generate random price movements
        np.random.seed(42)  # For reproducibility
        price_changes = np.random.normal(0, 0.01, limit)
        prices = [base_price]
        
        for i in range(1, limit):
            new_price = prices[-1] * (1 + price_changes[i])
            prices.append(new_price)
        
        # Generate OHLCV data
        data = []
        for i in range(limit):
            price = prices[i]
            high = price * (1 + abs(np.random.normal(0, 0.005)))
            low = price * (1 - abs(np.random.normal(0, 0.005)))
            open_price = low + (high - low) * np.random.random()
            close_price = low + (high - low) * np.random.random()
            volume = np.random.normal(1000, 200)
            
            data.append({
                'timestamp': timestamps[i],
                'open': open_price,
                'high': high,
                'low': low,
                'close': close_price,
                'volume': volume
            })
        
        df = pd.DataFrame(data)
        
        logger.info(f"Generated {len(df)} mock data points for {symbol}")
        
        return df
    
    def fetch_data(self, source, symbol, interval, limit=100):
        """
        Fetch market data from the specified source
        
        Args:
            source (str): Data source ('binance', 'coinmarketcap', 'mock')
            symbol (str): Trading pair symbol
            interval (str): Time interval
            limit (int): Number of data points
            
        Returns:
            DataFrame: Market data with OHLCV columns
        """
        if source.lower() == 'binance':
            return self.fetch_binance_data(symbol, interval, limit)
        elif source.lower() == 'coinmarketcap':
            return self.fetch_coinmarketcap_data(symbol, days=int(limit))
        elif source.lower() == 'mock':
            return self.fetch_mock_data(symbol, interval, limit)
        else:
            logger.error(f"Unknown data source: {source}")
            return pd.DataFrame()


def main():
    """
    Main function to run the script
    """
    parser = argparse.ArgumentParser(description='Fetch cryptocurrency market data')
    parser.add_argument('--symbol', required=True, help='Trading pair symbol (e.g., BTCUSDT)')
    parser.add_argument('--interval', required=True, help='Time interval (e.g., 1h, 1d)')
    parser.add_argument('--limit', type=int, default=100, help='Number of data points')
    parser.add_argument('--source', default='binance', help='Data source (binance, coinmarketcap, mock)')
    
    args = parser.parse_args()
    
    fetcher = MarketDataFetcher()
    df = fetcher.fetch_data(args.source, args.symbol, args.interval, args.limit)
    
    if df.empty:
        result = {
            'success': False,
            'error': f"Failed to fetch data for {args.symbol} from {args.source}"
        }
    else:
        # Convert DataFrame to list of dictionaries for JSON serialization
        data = []
        for _, row in df.iterrows():
            data.append({
                'timestamp': row['timestamp'].isoformat(),
                'open': float(row['open']),
                'high': float(row['high']),
                'low': float(row['low']),
                'close': float(row['close']),
                'volume': float(row['volume'])
            })
        
        result = {
            'success': True,
            'data': data,
            'symbol': args.symbol,
            'interval': args.interval,
            'source': args.source
        }
    
    # Print result as JSON
    print(json.dumps(result))


if __name__ == '__main__':
    main() 