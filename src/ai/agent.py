"""
AI Trading Agent Module
Provides classes and functions for training and deploying AI trading agents
"""

import os
import json
import time
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Dense, LSTM, Dropout
from tensorflow.keras.optimizers import Adam
from sklearn.preprocessing import MinMaxScaler
import matplotlib.pyplot as plt
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AIAgent:
    """
    AI Trading Agent class that handles training, prediction, and strategy execution
    """
    
    def __init__(self, agent_id=None, name="Default Agent", strategy_type="lstm", 
                 risk_level=0.5, metadata=None):
        """
        Initialize the AI Agent
        
        Args:
            agent_id (str): Unique identifier for the agent
            name (str): Human-readable name for the agent
            strategy_type (str): Type of strategy to use (lstm, dnn, etc.)
            risk_level (float): Risk tolerance level (0.0 to 1.0)
            metadata (dict): Additional metadata for the agent
        """
        self.agent_id = agent_id or str(int(time.time()))
        self.name = name
        self.strategy_type = strategy_type
        self.risk_level = risk_level
        self.metadata = metadata or {}
        self.model = None
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        self.trained = False
        self.performance_metrics = {
            'accuracy': 0,
            'profit_loss': 0,
            'win_rate': 0,
            'sharpe_ratio': 0
        }
        
        # Create model directory if it doesn't exist
        self.model_dir = os.path.join(
            os.getenv('MODEL_SAVE_PATH', './models'), 
            self.agent_id
        )
        os.makedirs(self.model_dir, exist_ok=True)
        
        logger.info(f"Initialized AI Agent: {self.name} (ID: {self.agent_id})")
    
    def preprocess_data(self, data, sequence_length=60):
        """
        Preprocess market data for training or prediction
        
        Args:
            data (DataFrame): Market data with OHLCV columns
            sequence_length (int): Number of time steps to use for sequences
            
        Returns:
            tuple: Processed X and y data for training or prediction
        """
        # Ensure data is sorted by date
        data = data.sort_values('timestamp')
        
        # Select features (OHLCV)
        features = data[['open', 'high', 'low', 'close', 'volume']].values
        
        # Scale features
        scaled_features = self.scaler.fit_transform(features)
        
        X, y = [], []
        for i in range(len(scaled_features) - sequence_length):
            X.append(scaled_features[i:i + sequence_length])
            # Predict price movement (1 if price goes up, 0 if down)
            price_change = 1 if features[i + sequence_length, 3] > features[i + sequence_length - 1, 3] else 0
            y.append(price_change)
        
        return np.array(X), np.array(y)
    
    def build_model(self, input_shape):
        """
        Build the AI model based on the strategy type
        
        Args:
            input_shape (tuple): Shape of input data
            
        Returns:
            Model: TensorFlow/Keras model
        """
        if self.strategy_type == 'lstm':
            model = Sequential([
                LSTM(units=50, return_sequences=True, input_shape=input_shape),
                Dropout(0.2),
                LSTM(units=50, return_sequences=False),
                Dropout(0.2),
                Dense(units=25),
                Dense(units=1, activation='sigmoid')
            ])
        else:  # Default to DNN
            model = Sequential([
                Dense(64, activation='relu', input_shape=(input_shape[0] * input_shape[1],)),
                Dropout(0.2),
                Dense(32, activation='relu'),
                Dropout(0.2),
                Dense(16, activation='relu'),
                Dense(1, activation='sigmoid')
            ])
        
        model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    def train(self, training_data, epochs=50, batch_size=32, validation_split=0.2):
        """
        Train the AI model on historical market data
        
        Args:
            training_data (DataFrame): Historical market data
            epochs (int): Number of training epochs
            batch_size (int): Batch size for training
            validation_split (float): Fraction of data to use for validation
            
        Returns:
            dict: Training history
        """
        logger.info(f"Training agent {self.name} with {len(training_data)} data points")
        
        # Preprocess data
        X, y = self.preprocess_data(training_data)
        
        if len(X) == 0:
            raise ValueError("Not enough data for training after preprocessing")
        
        # Build model if not already built
        if self.model is None:
            self.model = self.build_model(X.shape[1:])
        
        # Reshape input for DNN if needed
        if self.strategy_type != 'lstm':
            X = X.reshape(X.shape[0], X.shape[1] * X.shape[2])
        
        # Train model
        history = self.model.fit(
            X, y,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            verbose=1
        )
        
        # Save model
        self.save_model()
        
        # Update performance metrics
        self.performance_metrics['accuracy'] = history.history['val_accuracy'][-1]
        self.trained = True
        
        logger.info(f"Training completed with validation accuracy: {self.performance_metrics['accuracy']:.4f}")
        
        return history.history
    
    def predict(self, market_data):
        """
        Make predictions using the trained model
        
        Args:
            market_data (DataFrame): Recent market data
            
        Returns:
            dict: Prediction results including signal and confidence
        """
        if not self.trained or self.model is None:
            raise ValueError("Model not trained. Please train the model first.")
        
        # Preprocess data
        X, _ = self.preprocess_data(market_data)
        
        if len(X) == 0:
            raise ValueError("Not enough data for prediction after preprocessing")
        
        # Reshape input for DNN if needed
        if self.strategy_type != 'lstm':
            X = X.reshape(X.shape[0], X.shape[1] * X.shape[2])
        
        # Make prediction
        prediction = self.model.predict(X)
        
        # Get the latest prediction
        latest_pred = prediction[-1][0]
        
        # Determine trading signal
        signal = 'buy' if latest_pred > 0.5 + (0.1 * self.risk_level) else \
                 'sell' if latest_pred < 0.5 - (0.1 * self.risk_level) else 'hold'
        
        # Calculate confidence
        confidence = abs(latest_pred - 0.5) * 2  # Scale to 0-1
        
        result = {
            'timestamp': datetime.now().isoformat(),
            'signal': signal,
            'confidence': float(confidence),
            'raw_prediction': float(latest_pred),
            'risk_adjusted': self.risk_level
        }
        
        logger.info(f"Agent {self.name} prediction: {signal} with {confidence:.2f} confidence")
        
        return result
    
    def execute_strategy(self, market_data, balance=1000.0, position=None):
        """
        Execute trading strategy based on predictions
        
        Args:
            market_data (DataFrame): Recent market data
            balance (float): Current balance
            position (dict): Current position information
            
        Returns:
            dict: Strategy execution results
        """
        prediction = self.predict(market_data)
        signal = prediction['signal']
        confidence = prediction['confidence']
        
        # Current price from the latest data point
        current_price = market_data['close'].iloc[-1]
        
        # Initialize position if None
        if position is None:
            position = {
                'in_position': False,
                'buy_price': 0,
                'quantity': 0
            }
        
        # Execute strategy based on signal
        if signal == 'buy' and not position['in_position']:
            # Calculate position size based on confidence and risk level
            position_size = balance * confidence * self.risk_level
            quantity = position_size / current_price
            
            # Update position
            position['in_position'] = True
            position['buy_price'] = current_price
            position['quantity'] = quantity
            
            # Update balance
            new_balance = balance - position_size
            
            action = 'buy'
            
        elif signal == 'sell' and position['in_position']:
            # Calculate profit/loss
            position_value = position['quantity'] * current_price
            profit_loss = position_value - (position['quantity'] * position['buy_price'])
            
            # Update balance
            new_balance = balance + position_value
            
            # Reset position
            position['in_position'] = False
            position['buy_price'] = 0
            position['quantity'] = 0
            
            action = 'sell'
            
        else:
            # Hold position
            action = 'hold'
            new_balance = balance
            profit_loss = 0
            if position['in_position']:
                profit_loss = (current_price - position['buy_price']) * position['quantity']
        
        result = {
            'timestamp': datetime.now().isoformat(),
            'action': action,
            'price': current_price,
            'balance': new_balance,
            'position': position,
            'prediction': prediction,
            'profit_loss': profit_loss if 'profit_loss' in locals() else 0
        }
        
        logger.info(f"Strategy execution: {action} at {current_price} with balance {new_balance:.2f}")
        
        return result
    
    def save_model(self):
        """
        Save the trained model and metadata
        
        Returns:
            bool: True if successful
        """
        if self.model is None:
            logger.warning("No model to save")
            return False
        
        # Save model
        model_path = os.path.join(self.model_dir, 'model.h5')
        self.model.save(model_path)
        
        # Save scaler
        scaler_path = os.path.join(self.model_dir, 'scaler.pkl')
        import pickle
        with open(scaler_path, 'wb') as f:
            pickle.dump(self.scaler, f)
        
        # Save metadata
        metadata = {
            'agent_id': self.agent_id,
            'name': self.name,
            'strategy_type': self.strategy_type,
            'risk_level': self.risk_level,
            'trained': self.trained,
            'performance_metrics': self.performance_metrics,
            'created_at': datetime.now().isoformat(),
            'metadata': self.metadata
        }
        
        metadata_path = os.path.join(self.model_dir, 'metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Model saved to {model_path}")
        
        return True
    
    def load_model(self, agent_id=None):
        """
        Load a trained model and metadata
        
        Args:
            agent_id (str): ID of the agent to load (uses current ID if None)
            
        Returns:
            bool: True if successful
        """
        if agent_id:
            self.agent_id = agent_id
            self.model_dir = os.path.join(
                os.getenv('MODEL_SAVE_PATH', './models'), 
                self.agent_id
            )
        
        # Load model
        model_path = os.path.join(self.model_dir, 'model.h5')
        if not os.path.exists(model_path):
            logger.error(f"Model file not found: {model_path}")
            return False
        
        self.model = load_model(model_path)
        
        # Load scaler
        scaler_path = os.path.join(self.model_dir, 'scaler.pkl')
        if os.path.exists(scaler_path):
            import pickle
            with open(scaler_path, 'rb') as f:
                self.scaler = pickle.load(f)
        
        # Load metadata
        metadata_path = os.path.join(self.model_dir, 'metadata.json')
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
                
            self.name = metadata.get('name', self.name)
            self.strategy_type = metadata.get('strategy_type', self.strategy_type)
            self.risk_level = metadata.get('risk_level', self.risk_level)
            self.trained = metadata.get('trained', False)
            self.performance_metrics = metadata.get('performance_metrics', self.performance_metrics)
            self.metadata = metadata.get('metadata', {})
        
        logger.info(f"Model loaded from {model_path}")
        
        return True
    
    def evaluate(self, test_data):
        """
        Evaluate the model on test data
        
        Args:
            test_data (DataFrame): Test market data
            
        Returns:
            dict: Evaluation metrics
        """
        if not self.trained or self.model is None:
            raise ValueError("Model not trained. Please train the model first.")
        
        # Preprocess data
        X, y_true = self.preprocess_data(test_data)
        
        if len(X) == 0:
            raise ValueError("Not enough data for evaluation after preprocessing")
        
        # Reshape input for DNN if needed
        if self.strategy_type != 'lstm':
            X = X.reshape(X.shape[0], X.shape[1] * X.shape[2])
        
        # Make predictions
        y_pred_prob = self.model.predict(X)
        y_pred = (y_pred_prob > 0.5).astype(int)
        
        # Calculate metrics
        from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
        
        accuracy = accuracy_score(y_true, y_pred)
        precision = precision_score(y_true, y_pred, zero_division=0)
        recall = recall_score(y_true, y_pred, zero_division=0)
        f1 = f1_score(y_true, y_pred, zero_division=0)
        
        # Simulate trading
        balance = 10000.0
        position = None
        trades = []
        
        for i in range(len(y_pred)):
            signal = 'buy' if y_pred[i] > 0.5 else 'sell'
            price = test_data['close'].iloc[i + 60]  # 60 is the sequence length
            
            if signal == 'buy' and (position is None or not position['in_position']):
                # Buy
                position = {
                    'in_position': True,
                    'buy_price': price,
                    'quantity': balance / price
                }
                balance = 0
                trades.append({
                    'action': 'buy',
                    'price': price,
                    'timestamp': test_data['timestamp'].iloc[i + 60]
                })
            elif signal == 'sell' and position is not None and position['in_position']:
                # Sell
                balance = position['quantity'] * price
                trades.append({
                    'action': 'sell',
                    'price': price,
                    'timestamp': test_data['timestamp'].iloc[i + 60],
                    'profit_loss': (price - position['buy_price']) * position['quantity']
                })
                position['in_position'] = False
        
        # Calculate final balance and profit/loss
        if position is not None and position['in_position']:
            final_price = test_data['close'].iloc[-1]
            balance = position['quantity'] * final_price
        
        profit_loss = balance - 10000.0
        profit_loss_pct = (profit_loss / 10000.0) * 100
        
        # Calculate win rate
        winning_trades = [t for t in trades if t.get('action') == 'sell' and t.get('profit_loss', 0) > 0]
        win_rate = len(winning_trades) / len([t for t in trades if t.get('action') == 'sell']) if len([t for t in trades if t.get('action') == 'sell']) > 0 else 0
        
        # Update performance metrics
        self.performance_metrics = {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1_score': f1,
            'profit_loss': profit_loss,
            'profit_loss_pct': profit_loss_pct,
            'win_rate': win_rate,
            'num_trades': len([t for t in trades if t.get('action') == 'sell']),
            'final_balance': balance
        }
        
        logger.info(f"Evaluation results: Accuracy={accuracy:.4f}, Profit/Loss={profit_loss_pct:.2f}%, Win Rate={win_rate:.2f}")
        
        return self.performance_metrics
    
    def to_dict(self):
        """
        Convert agent to dictionary representation
        
        Returns:
            dict: Agent data
        """
        return {
            'agent_id': self.agent_id,
            'name': self.name,
            'strategy_type': self.strategy_type,
            'risk_level': self.risk_level,
            'trained': self.trained,
            'performance_metrics': self.performance_metrics,
            'metadata': self.metadata
        }
    
    @classmethod
    def from_dict(cls, data):
        """
        Create agent from dictionary representation
        
        Args:
            data (dict): Agent data
            
        Returns:
            AIAgent: New agent instance
        """
        agent = cls(
            agent_id=data.get('agent_id'),
            name=data.get('name', 'Default Agent'),
            strategy_type=data.get('strategy_type', 'lstm'),
            risk_level=data.get('risk_level', 0.5),
            metadata=data.get('metadata', {})
        )
        
        agent.trained = data.get('trained', False)
        agent.performance_metrics = data.get('performance_metrics', {})
        
        # Load model if trained
        if agent.trained:
            agent.load_model()
        
        return agent


class AgentFactory:
    """
    Factory class for creating and managing AI Agents
    """
    
    @staticmethod
    def create_agent(name, strategy_type='lstm', risk_level=0.5, metadata=None):
        """
        Create a new AI Agent
        
        Args:
            name (str): Name for the agent
            strategy_type (str): Type of strategy to use
            risk_level (float): Risk tolerance level
            metadata (dict): Additional metadata
            
        Returns:
            AIAgent: New agent instance
        """
        return AIAgent(
            name=name,
            strategy_type=strategy_type,
            risk_level=risk_level,
            metadata=metadata
        )
    
    @staticmethod
    def load_agent(agent_id):
        """
        Load an existing AI Agent
        
        Args:
            agent_id (str): ID of the agent to load
            
        Returns:
            AIAgent: Loaded agent instance
        """
        agent = AIAgent(agent_id=agent_id)
        success = agent.load_model()
        
        if not success:
            logger.error(f"Failed to load agent with ID: {agent_id}")
            return None
        
        return agent
    
    @staticmethod
    def list_agents():
        """
        List all available agents
        
        Returns:
            list: List of agent metadata
        """
        model_dir = os.getenv('MODEL_SAVE_PATH', './models')
        agents = []
        
        if not os.path.exists(model_dir):
            return agents
        
        for agent_id in os.listdir(model_dir):
            metadata_path = os.path.join(model_dir, agent_id, 'metadata.json')
            if os.path.exists(metadata_path):
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                agents.append(metadata)
        
        return agents 