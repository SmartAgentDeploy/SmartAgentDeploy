// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SmartAgent
 * @dev Smart contract for managing AI trading agents on Ethereum blockchain
 */
contract SmartAgent {
    // Agent status enum
    enum AgentStatus { Inactive, Active, Paused }
    
    // Agent struct to store agent data
    struct Agent {
        uint256 id;
        address owner;
        string metadataURI;
        AgentStatus status;
        uint256 createdAt;
        uint256 updatedAt;
        uint256 balance;
        uint256 performanceFee;
    }
    
    // Trade struct to store trade data
    struct Trade {
        uint256 id;
        uint256 agentId;
        address tokenAddress;
        uint256 amount;
        bool isBuy;
        uint256 price;
        uint256 timestamp;
        bool executed;
    }
    
    // Mapping from agent ID to Agent
    mapping(uint256 => Agent) public agents;
    
    // Mapping from trade ID to Trade
    mapping(uint256 => Trade) public trades;
    
    // Counter for agent IDs
    uint256 private nextAgentId = 1;
    
    // Counter for trade IDs
    uint256 private nextTradeId = 1;
    
    // Events
    event AgentCreated(uint256 indexed agentId, address indexed owner, string metadataURI);
    event AgentUpdated(uint256 indexed agentId, AgentStatus status);
    event TradeCreated(uint256 indexed tradeId, uint256 indexed agentId, bool isBuy, uint256 amount);
    event TradeExecuted(uint256 indexed tradeId, uint256 indexed agentId, bool success);
    
    /**
     * @dev Create a new AI trading agent
     * @param _metadataURI URI pointing to agent metadata (IPFS or other storage)
     * @param _performanceFee Fee percentage charged for agent performance
     * @return agentId ID of the newly created agent
     */
    function createAgent(string memory _metadataURI, uint256 _performanceFee) public returns (uint256) {
        require(_performanceFee <= 100, "Performance fee cannot exceed 100%");
        
        uint256 agentId = nextAgentId++;
        
        agents[agentId] = Agent({
            id: agentId,
            owner: msg.sender,
            metadataURI: _metadataURI,
            status: AgentStatus.Inactive,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            balance: 0,
            performanceFee: _performanceFee
        });
        
        emit AgentCreated(agentId, msg.sender, _metadataURI);
        
        return agentId;
    }
    
    /**
     * @dev Update agent status
     * @param _agentId ID of the agent to update
     * @param _status New status for the agent
     */
    function updateAgentStatus(uint256 _agentId, AgentStatus _status) public {
        require(agents[_agentId].owner == msg.sender, "Only agent owner can update status");
        
        agents[_agentId].status = _status;
        agents[_agentId].updatedAt = block.timestamp;
        
        emit AgentUpdated(_agentId, _status);
    }
    
    /**
     * @dev Create a new trade order
     * @param _agentId ID of the agent creating the trade
     * @param _tokenAddress Address of the token to trade
     * @param _amount Amount of tokens to trade
     * @param _isBuy True if buying, false if selling
     * @param _price Price at which to execute the trade
     * @return tradeId ID of the newly created trade
     */
    function createTrade(
        uint256 _agentId,
        address _tokenAddress,
        uint256 _amount,
        bool _isBuy,
        uint256 _price
    ) public returns (uint256) {
        require(agents[_agentId].owner == msg.sender, "Only agent owner can create trades");
        require(agents[_agentId].status == AgentStatus.Active, "Agent must be active to trade");
        
        uint256 tradeId = nextTradeId++;
        
        trades[tradeId] = Trade({
            id: tradeId,
            agentId: _agentId,
            tokenAddress: _tokenAddress,
            amount: _amount,
            isBuy: _isBuy,
            price: _price,
            timestamp: block.timestamp,
            executed: false
        });
        
        emit TradeCreated(tradeId, _agentId, _isBuy, _amount);
        
        return tradeId;
    }
    
    /**
     * @dev Execute a trade (simplified version - in production would integrate with DEX)
     * @param _tradeId ID of the trade to execute
     */
    function executeTrade(uint256 _tradeId) public {
        Trade storage trade = trades[_tradeId];
        Agent storage agent = agents[trade.agentId];
        
        require(!trade.executed, "Trade already executed");
        require(agent.owner == msg.sender, "Only agent owner can execute trades");
        require(agent.status == AgentStatus.Active, "Agent must be active to execute trades");
        
        // In a real implementation, this would interact with a DEX or other trading platform
        // For now, we just mark the trade as executed
        trade.executed = true;
        
        // Update agent balance (simplified)
        if (trade.isBuy) {
            // Buying tokens would decrease balance
            // This is simplified and doesn't handle actual token transfers
        } else {
            // Selling tokens would increase balance
            // This is simplified and doesn't handle actual token transfers
        }
        
        emit TradeExecuted(_tradeId, trade.agentId, true);
    }
    
    /**
     * @dev Get agent details
     * @param _agentId ID of the agent
     * @return Agent details
     */
    function getAgent(uint256 _agentId) public view returns (
        uint256 id,
        address owner,
        string memory metadataURI,
        AgentStatus status,
        uint256 createdAt,
        uint256 updatedAt,
        uint256 balance,
        uint256 performanceFee
    ) {
        Agent memory agent = agents[_agentId];
        return (
            agent.id,
            agent.owner,
            agent.metadataURI,
            agent.status,
            agent.createdAt,
            agent.updatedAt,
            agent.balance,
            agent.performanceFee
        );
    }
    
    /**
     * @dev Get trade details
     * @param _tradeId ID of the trade
     * @return Trade details
     */
    function getTrade(uint256 _tradeId) public view returns (
        uint256 id,
        uint256 agentId,
        address tokenAddress,
        uint256 amount,
        bool isBuy,
        uint256 price,
        uint256 timestamp,
        bool executed
    ) {
        Trade memory trade = trades[_tradeId];
        return (
            trade.id,
            trade.agentId,
            trade.tokenAddress,
            trade.amount,
            trade.isBuy,
            trade.price,
            trade.timestamp,
            trade.executed
        );
    }
} 