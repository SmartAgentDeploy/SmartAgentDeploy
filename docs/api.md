# SmartAgentDeploy API Documentation

This document provides detailed information about the SmartAgentDeploy API endpoints, request/response formats, and authentication requirements.

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://api.smartagentdeploy.com`

## Authentication

Most API endpoints require authentication using JSON Web Tokens (JWT).

### Obtaining a Token

```
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Using the Token

Include the token in the Authorization header for all authenticated requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## API Endpoints

### User Management

#### Register a new user

```
POST /users/register
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "securepassword",
  "name": "New User"
}
```

**Response:**
```json
{
  "id": "user456",
  "email": "newuser@example.com",
  "name": "New User",
  "createdAt": "2023-06-15T10:30:00Z"
}
```

#### Get user profile

```
GET /users/profile
```

**Response:**
```json
{
  "id": "user123",
  "email": "user@example.com",
  "name": "John Doe",
  "walletAddress": "0x1234...",
  "createdAt": "2023-01-10T08:15:00Z"
}
```

### AI Agents

#### Create a new agent

```
POST /agents
```

**Request Body:**
```json
{
  "name": "Bitcoin Trend Follower",
  "strategyType": "lstm",
  "riskLevel": 0.5,
  "metadata": {
    "description": "LSTM-based trend following strategy for Bitcoin",
    "tradingPair": "BTC/USD",
    "timeframe": "1h"
  }
}
```

**Response:**
```json
{
  "agentId": "agent789",
  "name": "Bitcoin Trend Follower",
  "strategyType": "lstm",
  "riskLevel": 0.5,
  "trained": false,
  "createdAt": "2023-06-16T14:20:00Z",
  "userId": "user123"
}
```

#### Train an agent

```
POST /agents/:agentId/train
```

**Request Body:**
```json
{
  "dataSource": "binance",
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "startDate": "2022-01-01",
  "endDate": "2023-01-01",
  "parameters": {
    "epochs": 50,
    "batchSize": 32
  }
}
```

**Response:**
```json
{
  "agentId": "agent789",
  "status": "training",
  "message": "Training started successfully",
  "estimatedCompletionTime": "2023-06-16T15:20:00Z"
}
```

#### Get agent details

```
GET /agents/:agentId
```

**Response:**
```json
{
  "agentId": "agent789",
  "name": "Bitcoin Trend Follower",
  "strategyType": "lstm",
  "riskLevel": 0.5,
  "trained": true,
  "performanceMetrics": {
    "accuracy": 0.68,
    "precision": 0.72,
    "recall": 0.65,
    "f1Score": 0.68,
    "profitLoss": 15.2,
    "profitLossPct": 15.2,
    "winRate": 0.65
  },
  "createdAt": "2023-06-16T14:20:00Z",
  "lastTrainedAt": "2023-06-16T15:20:00Z",
  "userId": "user123"
}
```

#### List all agents

```
GET /agents
```

**Response:**
```json
{
  "agents": [
    {
      "agentId": "agent789",
      "name": "Bitcoin Trend Follower",
      "strategyType": "lstm",
      "riskLevel": 0.5,
      "trained": true,
      "createdAt": "2023-06-16T14:20:00Z"
    },
    {
      "agentId": "agent790",
      "name": "Ethereum Swing Trader",
      "strategyType": "dnn",
      "riskLevel": 0.7,
      "trained": false,
      "createdAt": "2023-06-17T09:45:00Z"
    }
  ],
  "total": 2
}
```

### Market Data

#### Get historical market data

```
GET /market-data/:symbol
```

**Query Parameters:**
- `timeframe`: Data timeframe (e.g., '1m', '5m', '1h', '1d')
- `startDate`: Start date in ISO format
- `endDate`: End date in ISO format
- `limit`: Maximum number of data points to return

**Response:**
```json
{
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "data": [
    {
      "timestamp": "2023-06-01T00:00:00Z",
      "open": 27500.12,
      "high": 27650.45,
      "low": 27450.78,
      "close": 27600.34,
      "volume": 1250.45
    },
    {
      "timestamp": "2023-06-01T01:00:00Z",
      "open": 27600.34,
      "high": 27700.56,
      "low": 27580.23,
      "close": 27650.78,
      "volume": 980.23
    }
  ]
}
```

### Blockchain Integration

#### Deploy agent to blockchain

```
POST /blockchain/deploy/:agentId
```

**Request Body:**
```json
{
  "walletAddress": "0x1234...",
  "gasPrice": 50000000000
}
```

**Response:**
```json
{
  "agentId": "agent789",
  "transactionHash": "0xabcd...",
  "contractAddress": "0x5678...",
  "status": "pending",
  "blockNumber": null,
  "timestamp": "2023-06-18T10:15:00Z"
}
```

#### Get agent blockchain status

```
GET /blockchain/agents/:agentId
```

**Response:**
```json
{
  "agentId": "agent789",
  "contractAddress": "0x5678...",
  "deploymentStatus": "deployed",
  "deploymentTransactionHash": "0xabcd...",
  "blockNumber": 12345678,
  "deploymentTimestamp": "2023-06-18T10:20:00Z",
  "lastExecutionTimestamp": "2023-06-19T08:30:00Z",
  "totalTransactions": 5
}
```

## Error Handling

All API endpoints return standard HTTP status codes:

- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

Error responses include a JSON object with error details:

```json
{
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Invalid parameters provided",
    "details": {
      "field": "riskLevel",
      "issue": "Must be a number between 0 and 1"
    }
  }
}
```

## Rate Limiting

API requests are rate limited to:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests per minute
- `X-RateLimit-Remaining`: Remaining requests in the current window
- `X-RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

## Webhooks

SmartAgentDeploy supports webhooks for event notifications. Configure webhooks in your user settings. 