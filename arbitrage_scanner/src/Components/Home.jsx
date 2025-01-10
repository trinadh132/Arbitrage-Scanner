import React, { useEffect, useState } from "react";

function Home() {
  const [binancePairs, setBinancePairs] = useState([]);
  const [solanaPairs, setSolanaPairs] = useState([]);
  const [commonTokens, setCommonTokens] = useState([]);

  useEffect(() => {
    // Fetch Binance USDC Pairs
    fetch('http://localhost:5000/api/binance-usdc-pairs')
      .then(response => response.json())
      .then(data => setBinancePairs(data.binancePairs))
      .catch(error => console.error('Error fetching Binance pairs:', error));

    // Fetch Solana USDC Pairs
    fetch('http://localhost:5000/api/solana-usdc-pairs')
      .then(response => response.json())
      .then(data => setSolanaPairs(data.solanaPairs))
      .catch(error => console.error('Error fetching Solana pairs:', error));

    // Fetch Common Tokens
    fetch('http://localhost:5000/api/common-tokens')
      .then(response => response.json())
      .then(data => setCommonTokens(data.commonTokens))
      .catch(error => console.error('Error fetching common tokens:', error));
  }, []);

  return (
    <div>
      <h1>Welcome</h1>
      <h2>Binance USDC Pairs</h2>
      <ul>
        {binancePairs.map(pair => (
          <li key={pair}>{pair}</li>
        ))}
      </ul>
      <h2>Solana USDC Pairs</h2>
      <ul>
        {solanaPairs.map(pair => (
          <li key={pair}>{pair}</li>
        ))}
      </ul>
      <h2>Common Tokens</h2>
      <ul>
        {commonTokens.map(token => (
          <li key={token}>{token}</li>
        ))}
      </ul>
    </div>
  );
}

export { Home };
