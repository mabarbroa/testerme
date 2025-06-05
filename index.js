// l2-bridge-bot-enhanced.js
const { LiFi, ChainId, getTokens } = require('@lifi/sdk');
const { ethers } = require('ethers');
require('dotenv').config();

class EnhancedETHL2BridgeBot {
  constructor() {
    this.lifi = new LiFi({
      integrator: 'eth-l2-bridge-bot-enhanced',
    });
    
    // ETH L2 chains with native ETH support
    this.l2Chains = {
      ARBITRUM: ChainId.ARB,
      OPTIMISM: ChainId.OPT, 
      POLYGON: ChainId.POL,
      BASE: ChainId.BAS,
      AVALANCHE: ChainId.AVA,
      FANTOM: ChainId.FTM
    };
    
    // Token configurations for L2 bridging
    this.supportedTokens = {
      ETH: {
        symbol: 'ETH',
        decimals: 18,
        // Native ETH addresses on each L2
        addresses: {
          [ChainId.ARB]: '0x0000000000000000000000000000000000000000', // Native ETH on Arbitrum
          [ChainId.OPT]: '0x0000000000000000000000000000000000000000', // Native ETH on Optimism  
          [ChainId.BAS]: '0x0000000000000000000000000000000000000000', // Native ETH on Base
          [ChainId.POL]: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // WETH on Polygon
        }
      },
      USDC: {
        symbol: 'USDC',
        decimals: 6,
        addresses: {
          [ChainId.ARB]: '0xA0b86a33E6441e4e6c7c6c0c8c7c0c8c7c0c8c7c', // USDC on Arbitrum
          [ChainId.OPT]: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // USDC on Optimism
          [ChainId.BAS]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
          [ChainId.POL]: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC on Polygon
        }
      },
      USDT: {
        symbol: 'USDT', 
        decimals: 6,
        addresses: {
          [ChainId.ARB]: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
          [ChainId.OPT]: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
          [ChainId.POL]: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        }
      }
    };
    
    this.isRunning = false;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Enhanced ETH L2 Bridge Bot...');
      
      await this.lifi.initialize();
      console.log('✅ LIFI SDK configured for ETH and token bridging'); // [[0]](#__0)
      
      this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
      console.log('✅ Wallet configured:', this.wallet.address);
      
      await this.displayAvailableTokensAndChains();
      
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      throw error;
    }
  }

  async displayAvailableTokensAndChains() {
    console.log('🌉 Available L2 Chains and Tokens:');
    
    for (const [chainName, chainId] of Object.entries(this.l2Chains)) {
      console.log(`\n📍 ${chainName} (${chainId}):`);
      
      // Display supported tokens on each chain
      for (const [tokenSymbol, tokenConfig] of Object.entries(this.supportedTokens)) {
        if (tokenConfig.addresses[chainId]) {
          console.log(`  • ${tokenSymbol} - ${tokenConfig.addresses[chainId]}`);
        }
      }
    }
  }

  async executeETHBridge(fromChain, toChain, ethAmount) {
    try {
      console.log(`🌉 Bridging ${ethAmount} ETH: ${fromChain} → ${toChain}`); // [[1]](#__1)
      
      const fromChainId = this.l2Chains[fromChain];
      const toChainId = this.l2Chains[toChain];
      
      // ETH bridging configuration
      const routeRequest = {
        fromChainId: fromChainId,
        toChainId: toChainId,
        fromTokenAddress: this.supportedTokens.ETH.addresses[fromChainId] || '0x0000000000000000000000000000000000000000',
        toTokenAddress: this.supportedTokens.ETH.addresses[toChainId] || '0x0000000000000000000000000000000000000000',
        fromAmount: ethers.parseEther(ethAmount),
        fromAddress: this.wallet.address,
        toAddress: this.wallet.address,
        options: {
          slippage: 0.005, // 0.5% for ETH bridging
          allowSwitchChain: true,
          order: 'RECOMMENDED', // Get best route for ETH
        }
      };

      const routes = await this.lifi.getRoutes(routeRequest);
      
      if (!routes.routes || routes.routes.length === 0) {
        console.log('⚠️ No ETH bridge route available');
        return null;
      }

      const bestRoute = routes.routes[0];
      
      // Display ETH bridge information
      console.log(`💰 ETH Amount: ${ethers.formatEther(bestRoute.fromAmount)} → ${ethers.formatEther(bestRoute.toAmountMin)}`);
      console.log(`🌉 Bridge Protocol: ${bestRoute.steps.map(s => s.tool).join(' → ')}`);
      console.log(`⏱️ Estimated time: ${bestRoute.steps[0].estimate.executionDuration}s`);
      console.log(`💸 Gas cost: ~$${bestRoute.steps[0].estimate.gasCosts?.[0]?.amountUSD || 'N/A'}`);

      // Execute ETH bridge
      const execution = await this.lifi.executeRoute(this.wallet, bestRoute);
      
      console.log('✅ ETH Bridge completed successfully');
      console.log('🔗 Transaction:', execution.transactionHash);
      
      return execution;

    } catch (error) {
      console.error('❌ ETH Bridge failed:', error.message);
      return null;
    }
  }

  async executeTokenBridge(fromChain, toChain, tokenSymbol, amount) {
    try {
      console.log(`🌉 Bridging ${amount} ${tokenSymbol}: ${fromChain} → ${toChain}`); // [[2]](#__2)
      
      const fromChainId = this.l2Chains[fromChain];
      const toChainId = this.l2Chains[toChain];
      const tokenConfig = this.supportedTokens[tokenSymbol];
      
      if (!tokenConfig) {
        console.log(`❌ Token ${tokenSymbol} not supported`);
        return null;
      }

      const routeRequest = {
        fromChainId: fromChainId,
        toChainId: toChainId,
        fromTokenAddress: tokenConfig.addresses[fromChainId],
        toTokenAddress: tokenConfig.addresses[toChainId],
        fromAmount: ethers.parseUnits(amount, tokenConfig.decimals),
        fromAddress: this.wallet.address,
        toAddress: this.wallet.address,
        options: {
          slippage: 0.005,
          allowSwitchChain: true,
        }
      };

      const routes = await this.lifi.getRoutes(routeRequest);
      
      if (!routes.routes || routes.routes.length === 0) {
        console.log(`⚠️ No ${tokenSymbol} bridge route available`);
        return null;
      }

      const bestRoute = routes.routes[0];
      
      console.log(`💰 ${tokenSymbol}: ${ethers.formatUnits(bestRoute.fromAmount, tokenConfig.decimals)} → ${ethers.formatUnits(bestRoute.toAmountMin, tokenConfig.decimals)}`);
      console.log(`🌉 Bridge: ${bestRoute.steps.map(s => s.tool).join(' → ')}`);

      const execution = await this.lifi.executeRoute(this.wallet, bestRoute);
      
      console.log(`✅ ${tokenSymbol} Bridge completed`);
      console.log('🔗 Transaction:', execution.transactionHash);
      
      return execution;

    } catch (error) {
      console.error(`❌ ${tokenSymbol} Bridge failed:`, error.message);
      return null;
    }
  }

  async runMixedBridgeStrategy() {
    const mixedStrategies = [
      // ETH bridging strategies
      { type: 'ETH', from: 'ARBITRUM', to: 'OPTIMISM', amount: '0.1' },
      { type: 'ETH', from: 'OPTIMISM', to: 'BASE', amount: '0.05' },
      { type: 'ETH', from: 'BASE', to: 'POLYGON', amount: '0.08' },
      
      // Token bridging strategies  
      { type: 'USDC', from: 'ARBITRUM', to: 'OPTIMISM', amount: '50' },
      { type: 'USDC', from: 'OPTIMISM', to: 'BASE', amount: '25' },
      { type: 'USDT', from: 'POLYGON', to: 'ARBITRUM', amount: '30' },
      
      // Mixed back-and-forth
      { type: 'ETH', from: 'POLYGON', to: 'ARBITRUM', amount: '0.03' },
      { type: 'USDC', from: 'BASE', to: 'POLYGON', amount: '40' },
    ];

    console.log('🔄 Starting Mixed ETH + Token L2 Bridge Strategy...'); // [[3]](#__3)

    for (const strategy of mixedStrategies) {
      console.log(`\n📍 Strategy: ${strategy.amount} ${strategy.type} from ${strategy.from} to ${strategy.to}`);
      
      let result;
      if (strategy.type === 'ETH') {
        result = await this.executeETHBridge(strategy.from, strategy.to, strategy.amount);
      } else {
        result = await this.executeTokenBridge(strategy.from, strategy.to, strategy.type, strategy.amount);
      }

      if (result) {
        console.log(`✅ Success: ${strategy.type} bridge completed`);
        await this.waitForConfirmation(result.transactionHash, this.l2Chains[strategy.from]);
      } else {
        console.log(`❌ Failed: Skipping to next strategy`);
      }
      
      // Delay between bridges
      console.log('⏳ Waiting 90 seconds before next bridge...');
      await this.delay(90000);
    }
  }

  async getETHAndTokenBalances() {
    console.log('\n💰 ETH and Token Balances Across L2s:');
    
    for (const [chainName, chainId] of Object.entries(this.l2Chains)) {
      console.log(`\n📍 ${chainName}:`);
      
      try {
        // Get ETH balance
        const provider = new ethers.JsonRpcProvider(this.getRPCUrl(chainId));
        const ethBalance = await provider.getBalance(this.wallet.address);
        console.log(`  • ETH: ${ethers.formatEther(ethBalance)}`);
        
        // Get token balances using LIFI SDK
        const tokens = await this.lifi.getTokenBalances(this.wallet.address, {
          chains: [chainId]
        });
        
        tokens.forEach(token => {
          if (parseFloat(token.amount) > 0) {
            console.log(`  • ${token.symbol}: ${token.amount}`);
          }
        });
        
      } catch (error) {
        console.log(`  • ${chainName}: Unable to fetch balances`);
      }
    }
  }

  getRPCUrl(chainId) {
    const rpcUrls = {
      [ChainId.ARB]: process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc',
      [ChainId.OPT]: process.env.OPTIMISM_RPC || 'https://mainnet.optimism.io',
      [ChainId.BAS]: process.env.BASE_RPC || 'https://mainnet.base.org',
      [ChainId.POL]: process.env.POLYGON_RPC || 'https://polygon-rpc.com',
    };
    return rpcUrls[chainId];
  }

  async waitForConfirmation(txHash, chainId) {
    try {
      console.log('⏳ Waiting for transaction confirmation...');
      
      const status = await this.lifi.getStatus({
        bridge: 'lifi',
        fromChain: chainId,
        toChain: chainId,
        txHash: txHash
      });
      
      console.log(`📋 Status: ${status.status}`);
      return status;
    } catch (error) {
      console.log('⚠️ Could not verify transaction status');
    }
  }

  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔄 Starting automated ETH + Token L2 bridging...');

    while (this.isRunning) {
      try {
        // Check all balances
        await this.getETHAndTokenBalances();
        
        // Execute mixed bridge strategy
        await this.runMixedBridgeStrategy();
        
        // Wait 15 minutes before next cycle
        console.log('\n⏳ Waiting 15 minutes before next bridge cycle...');
        await this.delay(900000);
        
      } catch (error) {
        console.error('❌ Strategy error:', error.message);
        await this.delay(120000); // Wait 2 minutes on error
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    this.isRunning = false;
    console.log('🛑 Enhanced L2 Bridge Bot stopped');
  }
}

// Advanced ETH + Token Strategies
class AdvancedMixedL2Strategies extends EnhancedETHL2BridgeBot {
  
  async ethArbitrageStrategy() {
    console.log('🔍 Scanning for ETH arbitrage across L2s...');
    
    const ethPairs = [
      ['ARBITRUM', 'OPTIMISM'],
      ['OPTIMISM', 'BASE'],
      ['BASE', 'POLYGON'],
      ['POLYGON', 'ARBITRUM']
    ];

    for (const [fromL2, toL2] of ethPairs) {
      try {
        const route = await this.lifi.getRoutes({
          fromChainId: this.l2Chains[fromL2],
          toChainId: this.l2Chains[toL2],
          fromTokenAddress: '0x0000000000000000000000000000000000000000', // Native ETH
          toTokenAddress: '0x0000000000000000000000000000000000000000',
          fromAmount: ethers.parseEther('0.1'),
          fromAddress: this.wallet.address,
          toAddress: this.wallet.address
        });

        if (route.routes.length > 0) {
          const bestRoute = route.routes[0];
          const inputETH = parseFloat(ethers.formatEther(bestRoute.fromAmount));
          const outputETH = parseFloat(ethers.formatEther(bestRoute.toAmountMin));
          const profit = outputETH - inputETH;
          
          if (profit > 0.001) { // 0.001 ETH profit threshold
            console.log(`💡 ETH Arbitrage: ${fromL2} → ${toL2}`);
            console.log(`   Profit: ${profit.toFixed(6)} ETH`);
            
            await this.executeETHBridge(fromL2, toL2, '0.1');
          }
        }
      } catch (error) {
        console.log(`⚠️ Could not check ETH arbitrage ${fromL2} → ${toL2}`);
      }
    }
  }

  async liquidityBalancing() {
    console.log('⚖️ Balancing ETH and tokens across L2s...');
    
    // Get current balances
    const balances = {};
    
    for (const [chainName, chainId] of Object.entries(this.l2Chains)) {
      try {
        const provider = new ethers.JsonRpcProvider(this.getRPCUrl(chainId));
        const ethBalance = await provider.getBalance(this.wallet.address);
        
        balances[chainName] = {
          ETH: parseFloat(ethers.formatEther(ethBalance)),
          // Add token balances here
        };
      } catch (error) {
        console.log(`⚠️ Could not get balances for ${chainName}`);
      }
    }
    
    // Implement rebalancing logic
    const totalETH = Object.values(balances).reduce((sum, bal) => sum + bal.ETH, 0);
    const targetETHPerChain = totalETH / Object.keys(balances).length;
    
    console.log(`📊 Total ETH: ${totalETH.toFixed(4)}, Target per chain: ${targetETHPerChain.toFixed(4)}`);
    
    // Move ETH from over-balanced to under-balanced chains
    for (const [chainName, balance] of Object.entries(balances)) {
      if (balance.ETH > targetETHPerChain * 1.2) { // 20% over target
        const excess = balance.ETH - targetETHPerChain;
        console.log(`📤 ${chainName} has excess ${excess.toFixed(4)} ETH`);
        
        // Find chain with lowest balance to send to
        const lowestChain = Object.entries(balances)
          .filter(([name]) => name !== chainName)
          .sort(([,a], [,b]) => a.ETH - b.ETH)[0];
        
        if (lowestChain && lowestChain[1].ETH < targetETHPerChain * 0.8) {
          console.log(`📥 Sending ${(excess * 0.5).toFixed(4)} ETH to ${lowestChain[0]}`);
          await this.executeETHBridge(chainName, lowestChain[0], (excess * 0.5).toString());
        }
      }
    }
  }
}

// Start the Enhanced Bridge Bot
async function main() {
  const bot = new EnhancedETHL2BridgeBot();
  // const advancedBot = new AdvancedMixedL2Strategies(); // For advanced features
  
  try {
    await bot.initialize();
    await bot.start();
  } catch (error) {
    console.error('❌ Bot failed:', error.message);
  }
}

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Enhanced L2 Bridge Bot...');
  process.exit(0);
});

main();
