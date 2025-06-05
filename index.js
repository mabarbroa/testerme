require('dotenv').config();
const { LiFi } = require('@lifi/sdk');
const { ethers } = require('ethers');
const config = require('./config');

class JumperBot {
  constructor() {
    this.lifi = new LiFi({ integrator: 'JumperBot' });
    this.wallets = {};
    this.providers = {};
    this.setupWallets();
  }

  setupWallets() {
    // Setup wallet for each chain
    Object.entries(config.chains).forEach(([name, chain]) => {
      try {
        const provider = new ethers.providers.JsonRpcProvider(chain.rpc);
        this.providers[chain.id] = provider;
        this.wallets[chain.id] = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        console.log(`✅ Connected to ${chain.name} (Chain ID: ${chain.id})`);
      } catch (error) {
        console.error(`❌ Failed to connect to ${chain.name}:`, error.message);
      }
    });
  }

  async checkBalance(chainId, tokenAddress) {
    try {
      const wallet = this.wallets[chainId];
      if (!wallet) return '0';

      if (tokenAddress === ethers.constants.AddressZero) {
        // Native token
        const balance = await wallet.getBalance();
        return balance.toString();
      } else {
        // ERC20 token
        const token = new ethers.Contract(
          tokenAddress,
          ['function balanceOf(address) view returns (uint256)'],
          wallet
        );
        const balance = await token.balanceOf(wallet.address);
        return balance.toString();
      }
    } catch (error) {
      console.error('Error checking balance:', error.message);
      return '0';
    }
  }

  async findBestRoute(fromChain, toChain, fromToken, toToken, amount) {
    try {
      console.log(`\n🔍 Finding route: ${config.chains[Object.keys(config.chains).find(k => config.chains[k].id === fromChain)]?.name} → ${config.chains[Object.keys(config.chains).find(k => config.chains[k].id === toChain)]?.name}`);
      
      const routes = await this.lifi.getRoutes({
        fromChainId: fromChain,
        toChainId: toChain,
        fromTokenAddress: fromToken,
        toTokenAddress: toToken,
        fromAmount: amount,
        options: {
          slippage: config.bot.slippage,
          order: 'RECOMMENDED',
          allowSwitchChain: true
        }
      });
      
      if (routes.routes.length === 0) {
        console.log('❌ No routes found');
        return null;
      }
      
      const bestRoute = routes.routes[0];
      console.log(`✅ Found route with ${bestRoute.steps.length} step(s)`);
      return bestRoute;
    } catch (error) {
      console.error('❌ Error finding route:', error.message);
      return null;
    }
  }

  async executeRoute(route) {
    try {
      const wallet = this.wallets[route.fromChainId];
      if (!wallet) throw new Error('Wallet not configured for chain');

      console.log('\n🚀 Executing route...');

      // Get transaction data for first step
      const step = route.steps[0];
      const tx = await this.lifi.getStepTransaction(step);
      
      // Check if approval needed
      if (step.action.fromToken.address !== ethers.constants.AddressZero) {
        await this.approveToken(
          step.action.fromToken.address,
          tx.to,
          step.action.fromAmount,
          wallet
        );
      }

      // Check gas price
      const gasPrice = await wallet.getGasPrice();
      const gasPriceGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
      console.log(`⛽ Gas price: ${parseFloat(gasPriceGwei).toFixed(2)} gwei`);
      
      if (parseFloat(gasPriceGwei) > config.bot.maxGasPrice) {
        console.log(`❌ Gas price too high (max: ${config.bot.maxGasPrice} gwei)`);
        return null;
      }

      // Execute transaction
      const transaction = await wallet.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value || '0',
        gasLimit: tx.gasLimit,
        gasPrice: gasPrice
      });

      console.log(`✅ Transaction sent: ${transaction.hash}`);
      const receipt = await transaction.wait();
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
      
      return receipt;
    } catch (error) {
      console.error('❌ Execution error:', error.message);
      return null;
    }
  }

  async approveToken(tokenAddress, spender, amount, wallet) {
    const token = new ethers.Contract(
      tokenAddress,
      [
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)'
      ],
      wallet
    );
    
    // Check current allowance
    const allowance = await token.allowance(wallet.address, spender);
    if (allowance.gte(amount)) {
      console.log('✅ Token already approved');
      return;
    }
    
    console.log('🔄 Approving token...');
    const tx = await token.approve(spender, amount);
    await tx.wait();
    console.log('✅ Token approved');
  }

  calculateProfit(route) {
    const fromUSD = parseFloat(route.fromAmountUSD);
    const toUSD = parseFloat(route.toAmountUSD);
    const gasUSD = parseFloat(route.gasCostUSD || 0);
    const profit = toUSD - fromUSD - gasUSD;
    
    console.log(`💰 From: $${fromUSD.toFixed(2)} → To: $${toUSD.toFixed(2)}`);
    console.log(`⛽ Gas cost: $${gasUSD.toFixed(2)}`);
    console.log(`📊 Net profit: $${profit.toFixed(2)}`);
    
    return profit;
  }

  async scanOpportunities() {
    console.log('\n' + '='.repeat(50));
    console.log(`🔄 Scanning opportunities at ${new Date().toLocaleTimeString()}`);
    console.log('='.repeat(50));
    
    const amount = ethers.utils.parseUnits('1000', 6); // 1000 USDC
    
    // Get active chains (with working wallets)
    const activeChains = Object.entries(config.chains)
      .filter(([_, chain]) => this.wallets[chain.id])
      .map(([name, chain]) => ({ name, ...chain }));
    
    console.log(`\n📡 Active chains: ${activeChains.map(c => c.name).join(', ')}`);
    
    // Scan all chain pairs
    for (const fromChain of activeChains) {
      for (const toChain of activeChains) {
        if (fromChain.id === toChain.id) continue;
        
        // Get token addresses
        const fromToken = config.tokens.USDC[fromChain.name.toLowerCase()];
        const toToken = config.tokens.USDC[toChain.name.toLowerCase()];
        
        if (!fromToken || fromToken === '0x0000000000000000000000000000000000000000') {
          console.log(`⚠️  USDC not configured for ${fromChain.name}`);
          continue;
        }
        
        // Check balance
        const balance = await this.checkBalance(fromChain.id, fromToken);
        if (balance === '0' || ethers.BigNumber.from(balance).lt(amount)) {
          console.log(`⚠️  Insufficient USDC balance on ${fromChain.name}`);
          continue;
        }
        
        const route = await this.findBestRoute(
          fromChain.id,
          toChain.id,
          fromToken,
          toToken,
          amount.toString()
        );
        
        if (route) {
          const profit = this.calculateProfit(route);
          
          if (profit >= config.bot.minProfit) {
            console.log(`\n🎯 PROFITABLE ROUTE FOUND!`);
            console.log(`💵 Expected profit: $${profit.toFixed(2)}`);
            
            const confirm = await this.confirmExecution(route, profit);
            if (confirm) {
              await this.executeRoute(route);
            }
          }
        }
      }
    }
    
    console.log('\n✅ Scan completed');
  }

  async confirmExecution(route, profit) {
    // In production, you might want to add additional checks here
    // For now, auto-execute if profitable
    return true;
  }

  async start() {
    console.log('🚀 Jumper Bot Started');
    console.log(`⚙️  Min profit threshold: $${config.bot.minProfit}`);
    console.log(`⚙️  Check interval: ${config.bot.checkInterval/1000} seconds`);
    console.log(`⚙️  Max gas price: ${config.bot.maxGasPrice} gwei`);
    console.log(`👛 Wallet address: ${this.wallets[1]?.address || 'Not configured'}`);
    
    // Initial scan
    await this.scanOpportunities();
    
    // Set interval
    setInterval(() => {
      this.scanOpportunities();
    }, config.bot.checkInterval);
  }
}

// Start bot
const bot = new JumperBot();
bot.start().catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Bot stopped');
  process.exit(0);
});
