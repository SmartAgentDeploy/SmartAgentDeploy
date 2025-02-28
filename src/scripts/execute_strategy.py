#!/usr/bin/env python
"""
Execute Strategy Script
Executes a trading strategy using a trained AI agent
"""

import os
import sys
import json
import argparse
import logging
import pandas as pd
from datetime import datetime

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ai.agent import AIAgent, AgentFactory

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def parse_market_data(market_data_str):
    """
    Parse market data from JSON string
    
    Args:
        market_data_str (str): Market data as JSON string
        
    Returns:
        DataFrame: Market data as DataFrame
    """
    try:
        # Parse JSON
        data = json.loads(market_data_str)
        
        # Convert to DataFrame
        if isinstance(data, list):
            df = pd.DataFrame(data)
        else:
            # If data is a dict with a 'data' key, use that
            if 'data' in data:
                df = pd.DataFrame(data['data'])
            else:
                raise ValueError("Invalid market data format")
        
        # Ensure required columns exist
        required_columns = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
        for col in required_columns:
            if col not in df.columns:
                raise ValueError(f"Required column '{col}' not found in market data")
        
        # Convert timestamp to datetime if it's not already
        if not pd.api.types.is_datetime64_any_dtype(df['timestamp']):
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Sort by timestamp
        df = df.sort_values('timestamp')
        
        logger.info(f"Parsed {len(df)} market data points")
        
        return df
    
    except Exception as e:
        logger.error(f"Error parsing market data: {e}")
        raise

def execute_strategy(agent_id, market_data, balance=1000.0, position=None):
    """
    Execute a trading strategy using a trained AI agent
    
    Args:
        agent_id (str): ID of the agent to use
        market_data (DataFrame): Market data for strategy execution
        balance (float): Current balance
        position (dict): Current position information
        
    Returns:
        dict: Strategy execution results
    """
    try:
        # Load agent
        agent = AgentFactory.load_agent(agent_id)
        if agent is None:
            return {
                'success': False,
                'error': f"Agent with ID {agent_id} not found"
            }
        
        # Check if agent is trained
        if not agent.trained:
            return {
                'success': False,
                'error': f"Agent with ID {agent_id} is not trained"
            }
        
        # Execute strategy
        execution = agent.execute_strategy(market_data, balance, position)
        
        return {
            'success': True,
            'agent_id': agent.agent_id,
            'name': agent.name,
            'execution': execution,
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error executing strategy: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def main():
    """
    Main function to run the script
    """
    parser = argparse.ArgumentParser(description='Execute a trading strategy using a trained AI agent')
    parser.add_argument('--agent-id', required=True, help='ID of the agent to use')
    parser.add_argument('--market-data', required=True, help='Market data as JSON string')
    parser.add_argument('--balance', type=float, default=1000.0, help='Current balance')
    parser.add_argument('--position', help='Current position as JSON string')
    
    args = parser.parse_args()
    
    try:
        # Parse market data
        market_data = parse_market_data(args.market_data)
        
        # Parse position
        position = None
        if args.position:
            try:
                position = json.loads(args.position)
            except json.JSONDecodeError:
                logger.warning(f"Invalid position JSON: {args.position}")
        
        # Execute strategy
        result = execute_strategy(args.agent_id, market_data, args.balance, position)
        
        # Print result as JSON
        print(json.dumps(result))
    
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))

if __name__ == '__main__':
    main() 