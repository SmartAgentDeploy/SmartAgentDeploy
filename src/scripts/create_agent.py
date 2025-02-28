#!/usr/bin/env python
"""
Create AI Agent Script
Creates a new AI trading agent with specified parameters
"""

import os
import sys
import json
import argparse
import logging
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

def create_agent(name, strategy_type, risk_level, metadata=None):
    """
    Create a new AI trading agent
    
    Args:
        name (str): Name for the agent
        strategy_type (str): Type of strategy to use
        risk_level (float): Risk tolerance level
        metadata (dict): Additional metadata
        
    Returns:
        dict: Agent information
    """
    try:
        # Create agent
        agent = AgentFactory.create_agent(
            name=name,
            strategy_type=strategy_type,
            risk_level=float(risk_level),
            metadata=metadata
        )
        
        # Save agent metadata
        agent.save_model()
        
        # Generate a mock IPFS hash for metadata
        import hashlib
        metadata_str = json.dumps(agent.to_dict())
        metadata_hash = hashlib.sha256(metadata_str.encode()).hexdigest()
        
        return {
            'success': True,
            'agent_id': agent.agent_id,
            'name': agent.name,
            'strategy_type': agent.strategy_type,
            'risk_level': agent.risk_level,
            'metadata_hash': metadata_hash,
            'performance_metrics': agent.performance_metrics,
            'created_at': datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error creating agent: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def main():
    """
    Main function to run the script
    """
    parser = argparse.ArgumentParser(description='Create a new AI trading agent')
    parser.add_argument('--name', required=True, help='Name for the agent')
    parser.add_argument('--strategy', required=True, help='Strategy type (lstm, dnn)')
    parser.add_argument('--risk', required=True, type=float, help='Risk level (0.0-1.0)')
    parser.add_argument('--metadata', help='Additional metadata as JSON string')
    
    args = parser.parse_args()
    
    # Parse metadata
    metadata = None
    if args.metadata:
        try:
            metadata = json.loads(args.metadata)
        except json.JSONDecodeError:
            logger.warning(f"Invalid metadata JSON: {args.metadata}")
    
    # Create agent
    result = create_agent(args.name, args.strategy, args.risk, metadata)
    
    # Print result as JSON
    print(json.dumps(result))

if __name__ == '__main__':
    main() 