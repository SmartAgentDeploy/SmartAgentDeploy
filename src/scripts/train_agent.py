#!/usr/bin/env python
"""
Train AI Agent Script
Trains an existing AI trading agent with market data
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

def load_training_data(data_source):
    """
    Load training data from the specified source
    
    Args:
        data_source (str): Source of training data (file path or API endpoint)
        
    Returns:
        DataFrame: Training data
    """
    try:
        # Check if data source is a file path
        if os.path.exists(data_source):
            # Determine file type from extension
            if data_source.endswith('.csv'):
                df = pd.read_csv(data_source)
            elif data_source.endswith('.json'):
                df = pd.read_json(data_source)
            else:
                raise ValueError(f"Unsupported file format: {data_source}")
        else:
            # Assume data source is a JSON string
            try:
                data = json.loads(data_source)
                df = pd.DataFrame(data)
            except json.JSONDecodeError:
                # Try to fetch data from API
                import requests
                response = requests.get(data_source)
                response.raise_for_status()
                data = response.json()
                df = pd.DataFrame(data)
        
        # Ensure required columns exist
        required_columns = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
        for col in required_columns:
            if col not in df.columns:
                raise ValueError(f"Required column '{col}' not found in training data")
        
        # Convert timestamp to datetime if it's not already
        if not pd.api.types.is_datetime64_any_dtype(df['timestamp']):
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Sort by timestamp
        df = df.sort_values('timestamp')
        
        logger.info(f"Loaded {len(df)} data points for training")
        
        return df
    
    except Exception as e:
        logger.error(f"Error loading training data: {e}")
        raise

def train_agent(agent_id, data_source, parameters=None):
    """
    Train an AI trading agent
    
    Args:
        agent_id (str): ID of the agent to train
        data_source (str): Source of training data
        parameters (dict): Training parameters
        
    Returns:
        dict: Training results
    """
    try:
        # Load agent
        agent = AgentFactory.load_agent(agent_id)
        if agent is None:
            return {
                'success': False,
                'error': f"Agent with ID {agent_id} not found"
            }
        
        # Load training data
        training_data = load_training_data(data_source)
        
        # Set default parameters if not provided
        if parameters is None:
            parameters = {}
        
        epochs = parameters.get('epochs', 50)
        batch_size = parameters.get('batch_size', 32)
        validation_split = parameters.get('validation_split', 0.2)
        
        # Train agent
        history = agent.train(
            training_data=training_data,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split
        )
        
        # Evaluate agent on validation data
        # Use the last 20% of data for evaluation
        split_idx = int(len(training_data) * 0.8)
        validation_data = training_data.iloc[split_idx:]
        
        performance_metrics = agent.evaluate(validation_data)
        
        return {
            'success': True,
            'agent_id': agent.agent_id,
            'name': agent.name,
            'training_history': {
                'accuracy': history['accuracy'][-1],
                'val_accuracy': history['val_accuracy'][-1],
                'loss': history['loss'][-1],
                'val_loss': history['val_loss'][-1]
            },
            'performance_metrics': performance_metrics,
            'trained_at': datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error training agent: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def main():
    """
    Main function to run the script
    """
    parser = argparse.ArgumentParser(description='Train an AI trading agent')
    parser.add_argument('--agent-id', required=True, help='ID of the agent to train')
    parser.add_argument('--data-source', required=True, help='Source of training data')
    parser.add_argument('--parameters', help='Training parameters as JSON string')
    
    args = parser.parse_args()
    
    # Parse parameters
    parameters = None
    if args.parameters:
        try:
            parameters = json.loads(args.parameters)
        except json.JSONDecodeError:
            logger.warning(f"Invalid parameters JSON: {args.parameters}")
    
    # Train agent
    result = train_agent(args.agent_id, args.data_source, parameters)
    
    # Print result as JSON
    print(json.dumps(result))

if __name__ == '__main__':
    main() 