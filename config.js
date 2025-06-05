module.exports = {
  // Chain configurations with public RPC from chainlist.org
  chains: {
    ethereum: { 
      id: 1, 
      rpc: 'https://eth.llamarpc.com',
      name: 'Ethereum'
    },
    polygon: { 
      id: 137, 
      rpc: 'https://polygon-rpc.com',
      name: 'Polygon'
    },
    arbitrum: { 
      id: 42161, 
      rpc: 'https://arb1.arbitrum.io/rpc',
      name: 'Arbitrum'
    },
    optimism: { 
      id: 10, 
      rpc: 'https://mainnet.optimism.io',
      name: 'Optimism'
    },
    bsc: { 
      id: 56, 
      rpc: 'https://bsc-dataseed.binance.org',
      name: 'BSC'
    },
    avalanche: { 
      id: 43114, 
      rpc: 'https://api.avax.network/ext/bc/C/rpc',
      name: 'Avalanche'
    },
    base: { 
      id: 8453, 
      rpc: 'https://mainnet.base.org',
      name: 'Base'
    },
    unichain: { 
      id: 1301,
      rpc: 'https://unichain.api.onfinality.io/public',
      name: 'Unichain'
    },
    ink: { 
      id: 57073, // INK Mainnet
      rpc: 'https://rpc-gel.inkonchain.com',
      name: 'INK'
    }
  },
  
  // Bot settings
  bot: {
    checkInterval: 60000, // 1 minute
    minProfit: 5, // Minimum $5 profit
    maxGasPrice: 100, // Max 100 gwei
    slippage: 0.03 // 3% slippage
  },
  
  // Token addresses for each chain
  tokens: {
    USDC: {
      ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      arbitrum: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      optimism: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      bsc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      avalanche: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      unichain: '0x0000000000000000000000000000000000000000', // Update when available
      ink: '0x0000000000000000000000000000000000000000' // Update when available
    },
    USDT: {
      ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      optimism: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      bsc: '0x55d398326f99059fF775485246999027B3197955',
      avalanche: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
      base: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
      unichain: '0x0000000000000000000000000000000000000000',
      ink: '0x0000000000000000000000000000000000000000'
    }
  }
};
