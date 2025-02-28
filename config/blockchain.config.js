/**
 * Blockchain configuration
 * Contains settings for different blockchain networks and contract addresses
 */

module.exports = {
  // Ethereum network configurations
  ethereum: {
    // Local development network (Ganache)
    development: {
      networkId: '5777',
      httpProvider: 'http://127.0.0.1:7545',
      wsProvider: 'ws://127.0.0.1:7545',
      gasLimit: 6721975,
      gasPrice: 20000000000, // 20 Gwei
      confirmationBlocks: 1,
      contracts: {
        SmartAgent: {
          address: null, // Will be populated after deployment
          gasToUse: 3000000
        }
      }
    },
    
    // Ethereum test networks
    goerli: {
      networkId: '5',
      httpProvider: 'https://goerli.infura.io/v3/${INFURA_API_KEY}',
      wsProvider: 'wss://goerli.infura.io/ws/v3/${INFURA_API_KEY}',
      gasLimit: 8000000,
      gasPrice: 50000000000, // 50 Gwei
      confirmationBlocks: 2,
      contracts: {
        SmartAgent: {
          address: '0x0000000000000000000000000000000000000000', // Replace with actual address after deployment
          gasToUse: 3000000
        }
      }
    },
    
    // Ethereum main network
    mainnet: {
      networkId: '1',
      httpProvider: 'https://mainnet.infura.io/v3/${INFURA_API_KEY}',
      wsProvider: 'wss://mainnet.infura.io/ws/v3/${INFURA_API_KEY}',
      gasLimit: 8000000,
      gasPrice: 70000000000, // 70 Gwei
      confirmationBlocks: 5,
      contracts: {
        SmartAgent: {
          address: '0x0000000000000000000000000000000000000000', // Replace with actual address after deployment
          gasToUse: 3000000
        }
      }
    }
  },
  
  // IPFS configuration for decentralized storage
  ipfs: {
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    gateway: 'https://ipfs.io/ipfs/'
  }
}; 