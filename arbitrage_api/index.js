const express = require('express');
const axios = require('axios');
const cors = require('cors');
const WebSocket = require('ws');
const { Connection, PublicKey } = require('@solana/web3.js');
const { Market } = require('@project-serum/serum');

const app = express();
app.use(cors());
const PORT = 5000;

// Fee configurations
const SOLANA_SWAP_FEE = 0.003;    // 0.3% Solana DEX swap fee
const BINANCE_TAKER_FEE = 0.001;  // 0.1% Binance taker fee
const SOLANA_TX_COST_IN_SOL = 0.00025; // Approx. average transaction cost in SOL
const SOLANA_CLUSTER_URL = 'https://api.mainnet-beta.solana.com'; // Public Solana RPC

// Store live Binance prices here
let livePrices = {};

// Function to normalize token names (e.g., remove "so", "ren" prefixes)
function normalizeTokenName(token) {
  return token.replace(/^so|ren/, '').toUpperCase();
}

// Simple utility for delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry function with exponential backoff
async function withRetries(fn, retries = 5, delayMs = 500) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= retries) throw error;
      console.log(`Retrying... Attempt ${attempt} after ${delayMs * 2 ** (attempt - 1)}ms`);
      await delay(delayMs * 2 ** (attempt - 1)); // exponential backoff
    }
  }
}

// Function to fetch Binance USDC trading pairs
async function getBinanceUSDCPairs() {
  try {
    const response = await axios.get('https://api.binance.us/api/v3/exchangeInfo');
    return response.data.symbols
      .filter(pair => pair.quoteAsset === 'USDC')
      .map(pair => pair.baseAsset);
  } catch (error) {
    console.error('Error fetching Binance pairs:', error);
    return [];
  }
}

// Function to fetch Solana USDC trading pairs (Serum markets)
async function getSolanaUSDCPairs() {
  try {
    const MARKET_REGISTRY_URL = 'https://raw.githubusercontent.com/project-serum/serum-ts/master/packages/serum/src/markets.json';
    const response = await axios.get(MARKET_REGISTRY_URL);
    return response.data
      .filter(market => market.name.endsWith('USDC') && !market.deprecated)
      .map(market => ({
        name: market.name,
        address: market.address,
        programId: market.programId,
      }));
  } catch (error) {
    console.error('Error fetching Solana markets:', error);
    return [];
  }
}

// Function to fetch current Solana price in USD from CoinGecko
async function getSolanaPrice() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    return response.data.solana.usd;
  } catch (error) {
    console.error('Error fetching Solana price:', error);
    return 0;
  }
}

// Function to fetch Serum best bid/ask with retries
async function getSerumPrice(address, programId) {
  return withRetries(async () => {
    const connection = new Connection(SOLANA_CLUSTER_URL, 'confirmed');
    const market = await Market.load(
      connection,
      new PublicKey(address),
      {},
      new PublicKey(programId)
    );

    const bids = await market.loadBids(connection);
    const asks = await market.loadAsks(connection);

    const bestBid = bids.getL2(1)[0]?.[0] || null;
    const bestAsk = asks.getL2(1)[0]?.[0] || null;

    return { bestBid, bestAsk };
  });
}

// =========== ENDPOINTS =========== //

// 1) Fetch Binance USDC trading pairs
app.get('/api/binance-usdc-pairs', async (req, res) => {
  const pairs = await getBinanceUSDCPairs();
  res.json({ binancePairs: pairs });
});

// 2) Fetch Solana USDC trading pairs
app.get('/api/solana-usdc-pairs', async (req, res) => {
  const pairs = await getSolanaUSDCPairs();
  // e.g. each market.name is 'XYZ/USDC'
  res.json({ solanaPairs: pairs.map(pair => pair.name.split('/')[0]) });
});

// 3) Find tokens common to both Binance and Solana USDC pairs
app.get('/api/common-tokens', async (req, res) => {
  try {
    const [binanceTokens, solanaMarkets] = await Promise.all([
      getBinanceUSDCPairs(),
      getSolanaUSDCPairs()
    ]);

    const solanaTokens = solanaMarkets.map(market => normalizeTokenName(market.name.split('/')[0]));
    const binanceTokensNormalized = binanceTokens.map(normalizeTokenName);
    const commonTokens = binanceTokensNormalized.filter(token => solanaTokens.includes(token));

    console.log('Common Tokens:', commonTokens); // Debug log
    res.json({ commonTokens });
  } catch (error) {
    console.error('Error finding common tokens:', error);
    res.status(500).json({ error: 'Failed to fetch common tokens' });
  }
});

// 4) Calculate arbitrage opportunities
app.get('/api/arbitrage-opportunities', async (req, res) => {
  try {
    // 4a) Grab Serum markets for potential tokens
    const solanaMarkets = await getSolanaUSDCPairs();
    // 4b) Get tokens we currently have live prices for (from Binance WebSocket)
    const commonTokens = Object.keys(livePrices);

    console.log('Common Tokens:', commonTokens); // Debug log
    console.log('Live Prices:', livePrices);     // Debug log

    // 4c) Get the current SOL price in USD (for correct TX cost in USD)
    const solPriceUSD = await getSolanaPrice();
    const opportunities = [];

    // 4d) Loop through each Solana market and compare against Binance
    for (const market of solanaMarkets) {
      const token = normalizeTokenName(market.name.split('/')[0]);

      // Skip if this token is not in your livePrices
      if (commonTokens.includes(token)) {
        console.log(`Processing token: ${token}`); // Debug log

        // Serum best bid/ask
        const { bestBid, bestAsk } = await getSerumPrice(market.address, market.programId);
        console.log(`Serum Data for ${token}:`, { bestBid, bestAsk }); // Debug log

        // If we don't have a bid/ask or Binance price, skip
        if (!bestBid || !bestAsk || !livePrices[token]) {
          console.log(`Skipping token ${token} due to missing data:`, {
            bestBid,
            bestAsk,
            binancePrice: livePrices[token]
          });
          continue;
        }

        // CEX (Binance) live price
        const binancePrice = livePrices[token];

        // Convert Solana TX cost to USD using the current SOL price
        const solanaTxCostUSD = SOLANA_TX_COST_IN_SOL * solPriceUSD;

        // (1) Net proceeds when selling on Solana
        //   = bestBid after subtracting swap fee, minus fixed TX cost
        const solBidNet = bestBid * (1 - SOLANA_SWAP_FEE) - solanaTxCostUSD;

        // (2) Effective cost to buy on Solana
        //   = bestAsk plus swap fee plus TX cost
        const solAskNet = bestAsk * (1 + SOLANA_SWAP_FEE) + solanaTxCostUSD;

        // (3) Net proceeds when selling on Binance
        const binanceBidNet = binancePrice * (1 - BINANCE_TAKER_FEE);

        // (4) Effective cost to buy on Binance
        const binanceAskNet = binancePrice * (1 + BINANCE_TAKER_FEE);

        // =========================
        // BUY on Binance, SELL on Solana
        //   Profit = solBidNet - binanceAskNet
        if (solBidNet > binanceAskNet) {
        const profit = solBidNet - binanceAskNet;
        const profitPer = (profit / binanceAskNet) * 100;
          opportunities.push({
            token,
            action: 'Buy on Binance, Sell on Solana',
            profit: profit.toFixed(2),
            profit_per: profitPer.toFixed(2),
            binancePrice,
            solanaBid: bestBid,  // debug info
            solanaAsk: bestAsk,  // debug info
          });
        }

        // =========================
        // BUY on Solana, SELL on Binance
        //   Profit = binanceBidNet - solAskNet
        if (binanceBidNet > solAskNet) {
            const profit = binanceBidNet - solAskNet;
            const profitPer = (profit / solAskNet) * 100;
          opportunities.push({
            token,
            action: 'Buy on Solana, Sell on Binance',
            profit: profit.toFixed(2),
            profit_per: profitPer.toFixed(2),
            binancePrice,
            solanaBid: bestBid,  // debug info
            solanaAsk: bestAsk,  // debug info
          });
        }
      }
    }

    console.log('Opportunities:', opportunities); // Debug log
    res.json({ opportunities });
  } catch (error) {
    console.error('Error calculating arbitrage opportunities:', error);
    res.status(500).json({ error: 'Failed to calculate arbitrage opportunities' });
  }
});

// =========== WEBSOCKET SUBSCRIPTION =========== //

// Dynamically subscribe to Binance WebSocket for all common tokens
async function subscribeToBinanceWebSocketDynamic() {
  try {
    const response = await axios.get('http://localhost:5000/api/common-tokens');
    const commonTokens = response.data.commonTokens;

    if (!commonTokens || commonTokens.length === 0) {
      console.log('No common tokens found to subscribe.');
      return;
    }

    console.log(`Subscribing to Binance WebSocket for tokens: ${commonTokens}`);

    const ws = new WebSocket('wss://stream.binance.us:9443/ws');
    const streams = commonTokens.map(token => `${token.toLowerCase()}usdc@ticker`);

    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          method: 'SUBSCRIBE',
          params: streams,
          id: 1,
        })
      );
      console.log('Subscribed to Binance WebSocket for common tokens.');
    });

    ws.on('message', (data) => {
      const parsedData = JSON.parse(data);
      // If we get valid ticker data
      if (parsedData.s && parsedData.c) {
        const token = parsedData.s.replace('USDC', '').toUpperCase();
        const price = parseFloat(parsedData.c);
        // Update our livePrices object
        livePrices[token] = price;
        console.log('Updated Live Prices:', livePrices); // debug log
      }
    });

    ws.on('error', (err) => console.error('Binance WebSocket Error:', err));
    ws.on('close', () => console.log('Binance WebSocket closed'));
  } catch (error) {
    console.error('Error subscribing to Binance WebSocket dynamically:', error.message);
  }
}

// =========== START SERVER =========== //
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  // Subscribe to Binance WebSocket for dynamic tokens
  subscribeToBinanceWebSocketDynamic();
});
