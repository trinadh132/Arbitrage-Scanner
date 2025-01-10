import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

function Home() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true); // Show loading only on initial fetch
  const navigate = useNavigate(); // Hook to navigate between routes

  const fetchData = async (showLoading = false) => {
    if (showLoading) setLoading(true); // Show loading only during initial fetch
    try {
      const response = await fetch("http://localhost:8080/api/arbitrage-opportunities");
      const result = await response.json();
      setData(result.opportunities || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      if (showLoading) setLoading(false); // Hide loading after initial fetch
    }
  };

  useEffect(() => {
    fetchData(true); // Fetch data initially with loading indicator

    // Set up an interval to fetch data every 45 seconds without loading indicator
    const interval = setInterval(() => {
      fetchData(false);
    }, 45000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="home-container">
      <h1>Opportunities</h1>
      {loading ? (
        <p>Loading...</p> // Show loading only during initial fetch
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Action</th>
                <th>Profit</th>
                <th>Profit Percentage</th>
                <th>Binance Price</th>
                <th>Jupiter Price</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={index}>
                  <td>{item.token}</td>
                  <td>{item.action}</td>
                  <td>{item.profit}</td>
                  <td>{item.profitPercentage}%</td>
                  <td>{item.binancePrice}</td>
                  <td>{item.jupiterPrice}</td>
                  <td>{item.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="button-container">
            <button
              className="prediction-button"
              onClick={() => navigate("/prediction")}
            >
              Prediction
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export { Home };
