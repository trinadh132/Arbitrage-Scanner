const express = require('express');
const axios = require('axios');
const cors = require('cors');
const WebSocket = require('ws');
const { Connection, PublicKey } = require('@solana/web3.js');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = 8080;

// Fee configurations
const JUPITER_SWAP_FEE = 0.003;    // 0.3% Jupiter swap fee
const BINANCE_TAKER_FEE = 0.001;   // 0.1% Binance taker fee

// Update the Jupiter API endpoints
const JUPITER_API_URL = 'https://quote-api.jup.ag/v6/quote';
const JUPITER_TOKENS_URL = 'https://token.jup.ag/strict';


// Store live prices and token info
let livePrices = {};
let solanaPairs = {};
let tokenList = null;

// Utility for delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios(url, options);
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Retry attempt ${i + 1}/${maxRetries} for ${url}`);
      await delay(1000 * (i + 1)); // Exponential backoff
    }
  }
}


// Fetch token list from Jupiter
async function getJupiterTokens() {
  try {
    if (tokenList) return tokenList;
    
    const response = await fetchWithRetry(JUPITER_TOKENS_URL);
    
    if (!response || !response.data) {
      throw new Error('Invalid response from Jupiter API');
    }

    tokenList = {};
    if (Array.isArray(response.data)) {
      response.data.forEach(token => {
        if (token.symbol) {
          tokenList[token.symbol] = {
            symbol: token.symbol,
            address: token.address || token.mint,
            decimals: token.decimals,
            name: token.name
          };
        }
      });
    }

    const usdcToken = Object.values(tokenList).find(t => 
      t.symbol.toUpperCase() === 'USDC' || 
      t.address === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC mint address
    );

    if (!usdcToken) {
      throw new Error('USDC token not found in Jupiter token list');
    }

    console.log('Successfully loaded Jupiter tokens:', {
      totalTokens: Object.keys(tokenList).length,
      hasUSDC: !!usdcToken
    });

    return tokenList;
  } catch (error) {
    console.error('Error fetching Jupiter tokens:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    return {};
  }
}

const pairStatus = new Map();

// Get price from Jupiter with improved logging
async function getJupiterPrice(inputMint, outputMint, tokenList) {
  try {
    const inputToken = Object.values(tokenList).find(t => t.address === inputMint);
    const outputToken = Object.values(tokenList).find(t => t.address === outputMint);
    
    if (!inputToken || !outputToken) {
      console.log(`Token not found: Input=${inputToken?.symbol}, Output=${outputToken?.symbol}`);
      return { price: null, error: 'TOKEN_NOT_FOUND' };
    }

    const inputAmount = (10 ** inputToken.decimals).toString();

    const response = await fetchWithRetry(JUPITER_API_URL, {
      params: {
        inputMint,
        outputMint,
        amount: inputAmount,
        slippageBps: 50
      }
    });

    if (!response.data || !response.data.outAmount) {
      return { price: null, error: 'NO_ROUTE' };
    }

    const outputAmount = parseInt(response.data.outAmount) / (10 ** outputToken.decimals);
    const price = outputAmount;

    return { price, error: null };
  } catch (error) {
    return { 
      price: null, 
      error: error.response?.data?.error || error.message 
    };
  }
}



// Fetch Binance USDC trading pairs
//https://api.binance.com/api/v3/exchangeInfo
//https://api.binance.us/api/v3/exchangeInfo
async function getBinanceUSDCPairs() {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/exchangeInfo');
    return response.data.symbols
      .filter(pair => pair.quoteAsset === 'USDC' && pair.status === 'TRADING')
      .map(pair => ({
        baseAsset: pair.baseAsset,
        quoteAsset: pair.quoteAsset,
        symbol: pair.symbol
      }));
  } catch (error) {
    console.error('Error fetching Binance pairs:', error);
    return [];
  }
}

// Match tokens between Binance and Jupiter
async function matchTradingPairs() {
  try {
    const jupiterTokens = await getJupiterTokens();
    
    if (Object.keys(jupiterTokens).length === 0) {
      throw new Error('No tokens received from Jupiter');
    }

    const binancePairs = await getBinanceUSDCPairs();
    if (!binancePairs || binancePairs.length === 0) {
      throw new Error('No pairs received from Binance');
    }

    const usdcToken = Object.values(jupiterTokens).find(token => 
      token.symbol.toUpperCase() === 'USDC'
    );

    if (!usdcToken) {
      throw new Error('USDC token not found in Jupiter token list');
    }

    const matchedPairs = [];

    for (const pair of binancePairs) {
      const token = Object.values(jupiterTokens).find(t => 
        t.symbol.toUpperCase() === pair.baseAsset.toUpperCase()
      );

      if (token) {
        matchedPairs.push({
          symbol: pair.symbol,
          baseAsset: pair.baseAsset,
          tokenMint: token.address,
          usdcMint: usdcToken.address,
          tokenSymbol: token.symbol
        });
      }
    }

    console.log(`Found ${matchedPairs.length} matched pairs`);
    if (matchedPairs.length > 0) {
      console.log('sample matched pairs:', matchedPairs[0]);
    }

    return matchedPairs;
  } catch (error) {
    console.error('Error matching trading pairs:', error.message);
    return [];
  }
}

// Calculate arbitrage opportunities
async function calculateArbitrageOpportunities() {
  try {
    const matchedPairs = await matchTradingPairs();
    const opportunities = [];
    const batchSize = 3;
    const minDelay = 2000;
    const minProfitPercent = 0.5; // Reduced to 0.5% to catch more opportunities
    const maxPriceDiffPercent = 30.0; // Increased to 30% to allow more pairs

    console.log('\nStarting arbitrage calculation for', matchedPairs.length, 'pairs');

    for (let i = 0; i < matchedPairs.length; i += batchSize) {
      const batch = matchedPairs.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (pair) => {
        try {
          const { price: jupiterPrice, error: jupiterError } = await getJupiterPrice(
            pair.tokenMint, 
            pair.usdcMint, 
            tokenList
          );
          const binancePrice = livePrices[pair.baseAsset];

          // Update pair status
          pairStatus.set(pair.baseAsset, {
            lastChecked: new Date(),
            jupiterPrice,
            binancePrice,
            jupiterError,
            status: 'checked'
          });

          if (!jupiterPrice && jupiterError) {
            console.log(`${pair.baseAsset}: Jupiter Error - ${jupiterError}`);
            return;
          }

          if (!binancePrice) {
            console.log(`${pair.baseAsset}: No Binance price available`);
            return;
          }

          if (jupiterPrice && binancePrice) {
            const priceDiffPercent = Math.abs(jupiterPrice - binancePrice) / binancePrice * 100;
            
            if (priceDiffPercent > maxPriceDiffPercent) {
              console.log(`${pair.baseAsset}: Price difference ${priceDiffPercent.toFixed(2)}% (Jupiter: ${jupiterPrice.toFixed(4)}, Binance: ${binancePrice.toFixed(4)})`);
              return;
            }

            const jupiterBidNet = jupiterPrice * (1 - JUPITER_SWAP_FEE);
            const jupiterAskNet = jupiterPrice * (1 + JUPITER_SWAP_FEE);
            const binanceBidNet = binancePrice * (1 - BINANCE_TAKER_FEE);
            const binanceAskNet = binancePrice * (1 + BINANCE_TAKER_FEE);

            // Log valid price comparisons
            console.log(`${pair.baseAsset}: Valid prices - Jupiter: ${jupiterPrice.toFixed(4)}, Binance: ${binancePrice.toFixed(4)}`);

            const binanceToJupiterProfit = ((jupiterBidNet - binanceAskNet) / binanceAskNet * 100);
            const jupiterToBinanceProfit = ((binanceBidNet - jupiterAskNet) / jupiterAskNet * 100);

            if (binanceToJupiterProfit > minProfitPercent && jupiterBidNet - binanceAskNet !== 0) {
              const profitValue = parseFloat((jupiterBidNet - binanceAskNet).toFixed(4));
              if (profitValue !== 0) {
                opportunities.push({
                  token: pair.baseAsset,
                  action: 'Buy on Binance, Sell on Jupiter',
                  profit: profitValue,
                  profitPercentage: binanceToJupiterProfit.toFixed(2),
                  binancePrice: binancePrice.toFixed(4),
                  jupiterPrice: jupiterPrice.toFixed(4),
                  confidence: priceDiffPercent < 10 ? 'high' : 'medium'
                });
              }
            }
            
            if (jupiterToBinanceProfit > minProfitPercent && binanceBidNet - jupiterAskNet !== 0) {
              const profitValue = parseFloat((binanceBidNet - jupiterAskNet).toFixed(4));
              if (profitValue !== 0) {
                opportunities.push({
                  token: pair.baseAsset,
                  action: 'Buy on Jupiter, Sell on Binance',
                  profit: profitValue,
                  profitPercentage: jupiterToBinanceProfit.toFixed(2),
                  binancePrice: binancePrice.toFixed(4),
                  jupiterPrice: jupiterPrice.toFixed(4),
                  confidence: priceDiffPercent < 10 ? 'high' : 'medium'
                });
              }
            } 
          }
        } catch (error) {
          console.error(`Error processing ${pair.baseAsset}:`, error.message);
          pairStatus.set(pair.baseAsset, {
            lastChecked: new Date(),
            error: error.message,
            status: 'error'
          });
        }
      }));

      if (i + batchSize < matchedPairs.length) {
        await delay(minDelay);
      }
    }

    // Print summary of pair statuses
    console.log('\nPair Status Summary:');
    let validPairs = 0;
    let errorPairs = 0;
    let skippedPairs = 0;

    pairStatus.forEach((status, token) => {
      if (status.jupiterPrice && status.binancePrice) validPairs++;
      else if (status.error) errorPairs++;
      else skippedPairs++;
    });

    console.log(`Valid Pairs: ${validPairs}`);
    console.log(`Error Pairs: ${errorPairs}`);
    console.log(`Skipped Pairs: ${skippedPairs}`);
    console.log(`Total Opportunities Found: ${opportunities.length}\n`);

    return opportunities.sort((a, b) => parseFloat(b.profitPercentage) - parseFloat(a.profitPercentage));
  } catch (error) {
    console.error('Error calculating arbitrage opportunities:', error);
    return [];
  }
}


// API Endpoints
app.get('/api/trading-pairs', async (req, res) => {
  const pairs = await matchTradingPairs();
  res.json({ pairs });
});

app.get('/api/pair-status', (req, res) => {
  const status = Object.fromEntries(pairStatus);
  res.json({ status });
});


app.get('/api/arbitrage-opportunities', async (req, res) => {
  const opportunities = await calculateArbitrageOpportunities();
  res.json({ opportunities });
});

// Subscribe to Binance WebSocket for matched pairs
//wss://stream.binance.com:9443/ws
//wss://stream.binance.us:9443/ws
async function subscribeToBinanceWebSocket() {
  try {
    const matchedPairs = await matchTradingPairs();
    
    if (!matchedPairs || matchedPairs.length === 0) {
      console.log('No matched pairs found to subscribe. Retrying in 30 seconds...');
      setTimeout(subscribeToBinanceWebSocket, 30000);
      return;
    }

    console.log(`Attempting to subscribe to ${matchedPairs.length} pairs...`);

    const ws = new WebSocket('wss://stream.binance.com:9443/ws');
    const streams = matchedPairs.map(pair => 
      `${pair.symbol.toLowerCase()}@ticker`
    );

    ws.on('open', () => {
      ws.send(JSON.stringify({
        method: 'SUBSCRIBE',
        params: streams,
        id: 1
      }));
      console.log('Successfully subscribed to Binance WebSocket.');
    });

    let messageCount = 0;
    const messageInterval = setInterval(() => {
      console.log(`Received ${messageCount} price updates in the last minute`);
      messageCount = 0;
    }, 60000);

    ws.on('message', (data) => {
      try {
        const parsedData = JSON.parse(data);
        if (parsedData.s && parsedData.c) {
          const token = parsedData.s.replace('USDC', '');
          const price = parseFloat(parsedData.c);
          livePrices[token] = price;
          messageCount++;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('error', (err) => {
      console.error('Binance WebSocket Error:', err);
      clearInterval(messageInterval);
    });

    ws.on('close', () => {
      console.log('Binance WebSocket closed. Attempting to reconnect...');
      clearInterval(messageInterval);
      setTimeout(subscribeToBinanceWebSocket, 5000);
    });
  } catch (error) {
    console.error('Error in Binance WebSocket subscription:', error);
    setTimeout(subscribeToBinanceWebSocket, 5000);
  }
}

app.post('/get-prediction', async (req, res) => {
  const { symbol } = req.body;

  console.log(symbol)

  try {
      const response = await axios.post('http://127.0.0.1:5000/predict', { symbol });
      res.json(response.data); // Send the response once
      console.log(response.data); // Log the data correctly
  } catch (error) {
      console.error('Error fetching prediction:', error.message);
      if (!res.headersSent) { // Ensure no headers are sent before
          res.status(500).json({ error: error.message });
      }
  }
});



// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  subscribeToBinanceWebSocket();
});