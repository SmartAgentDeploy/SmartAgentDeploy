/**
 * Ethereum Blockchain Interface
 * Provides functions to interact with Ethereum smart contracts
 */

const Web3 = require('web3');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load contract ABI (would be generated after compilation)
const SMART_AGENT_ABI = []; // This would be populated with the actual ABI after contract compilation

class EthereumBlockchain {
  constructor(rpcUrl = process.env.ETHEREUM_RPC_URL) {
    this.web3 = new Web3(rpcUrl);
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.contractAddress = process.env.SMART_AGENT_CONTRACT_ADDRESS;
    this.contract = new this.web3.eth.Contract(SMART_AGENT_ABI, this.contractAddress);
  }

  /**
   * Initialize wallet from private key
   * @param {string} privateKey - Private key for the wallet
   * @returns {Object} - Wallet instance
   */
  initWallet(privateKey = process.env.WALLET_PRIVATE_KEY) {
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.signer = this.wallet.connect(this.provider);
    return this.wallet;
  }

  /**
   * Create a new AI agent on the blockchain
   * @param {string} metadataURI - URI pointing to agent metadata
   * @param {number} performanceFee - Fee percentage for agent performance
   * @returns {Promise<Object>} - Transaction receipt
   */
  async createAgent(metadataURI, performanceFee) {
    try {
      const tx = await this.contract.methods.createAgent(metadataURI, performanceFee).send({
        from: this.wallet.address,
        gas: 500000
      });
      
      return {
        success: true,
        transactionHash: tx.transactionHash,
        agentId: tx.events.AgentCreated.returnValues.agentId
      };
    } catch (error) {
      console.error('Error creating agent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update agent status
   * @param {number} agentId - ID of the agent to update
   * @param {number} status - New status (0: Inactive, 1: Active, 2: Paused)
   * @returns {Promise<Object>} - Transaction receipt
   */
  async updateAgentStatus(agentId, status) {
    try {
      const tx = await this.contract.methods.updateAgentStatus(agentId, status).send({
        from: this.wallet.address,
        gas: 200000
      });
      
      return {
        success: true,
        transactionHash: tx.transactionHash
      };
    } catch (error) {
      console.error('Error updating agent status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a new trade
   * @param {number} agentId - ID of the agent creating the trade
   * @param {string} tokenAddress - Address of the token to trade
   * @param {string} amount - Amount of tokens to trade (as string to handle large numbers)
   * @param {boolean} isBuy - True if buying, false if selling
   * @param {string} price - Price at which to execute the trade
   * @returns {Promise<Object>} - Transaction receipt
   */
  async createTrade(agentId, tokenAddress, amount, isBuy, price) {
    try {
      const tx = await this.contract.methods.createTrade(
        agentId, 
        tokenAddress, 
        amount, 
        isBuy, 
        price
      ).send({
        from: this.wallet.address,
        gas: 300000
      });
      
      return {
        success: true,
        transactionHash: tx.transactionHash,
        tradeId: tx.events.TradeCreated.returnValues.tradeId
      };
    } catch (error) {
      console.error('Error creating trade:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute a trade
   * @param {number} tradeId - ID of the trade to execute
   * @returns {Promise<Object>} - Transaction receipt
   */
  async executeTrade(tradeId) {
    try {
      const tx = await this.contract.methods.executeTrade(tradeId).send({
        from: this.wallet.address,
        gas: 400000
      });
      
      return {
        success: true,
        transactionHash: tx.transactionHash
      };
    } catch (error) {
      console.error('Error executing trade:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get agent details
   * @param {number} agentId - ID of the agent
   * @returns {Promise<Object>} - Agent details
   */
  async getAgent(agentId) {
    try {
      const agent = await this.contract.methods.getAgent(agentId).call();
      
      return {
        id: agent.id,
        owner: agent.owner,
        metadataURI: agent.metadataURI,
        status: parseInt(agent.status),
        createdAt: new Date(agent.createdAt * 1000),
        updatedAt: new Date(agent.updatedAt * 1000),
        balance: agent.balance,
        performanceFee: agent.performanceFee
      };
    } catch (error) {
      console.error('Error getting agent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get trade details
   * @param {number} tradeId - ID of the trade
   * @returns {Promise<Object>} - Trade details
   */
  async getTrade(tradeId) {
    try {
      const trade = await this.contract.methods.getTrade(tradeId).call();
      
      return {
        id: trade.id,
        agentId: trade.agentId,
        tokenAddress: trade.tokenAddress,
        amount: trade.amount,
        isBuy: trade.isBuy,
        price: trade.price,
        timestamp: new Date(trade.timestamp * 1000),
        executed: trade.executed
      };
    } catch (error) {
      console.error('Error getting trade:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = EthereumBlockchain; 