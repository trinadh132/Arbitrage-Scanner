import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

function Home() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // Hook to navigate between routes

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8080/api/arbitrage-opportunities");
      const result = await response.json();
      setData(result.opportunities || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="home-container">
      <h1>Opportunities</h1>
      {loading ? (
        <div className="loader">
          <img
            src="https://cdn.dribbble.com/users/1186261/screenshots/3718681/_______.gif"
            alt="Loading..."
          />
        </div>
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
            <button className="refresh-button" onClick={fetchData}>
              Refresh
            </button>
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
