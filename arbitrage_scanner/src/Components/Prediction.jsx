import React, { useEffect, useState, useRef } from "react";
import "./Prediction.css";
import Chart from "chart.js/auto";

function Prediction() {
  const [tokens, setTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState("");
  const [predictionData, setPredictionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const chartRef = useRef(null);
  const chartInstance = useRef(null); // Reference for Chart instance

  const fetchTokens = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/trading-pairs");
      const result = await response.json();
      setTokens(result.pairs.map((pair) => pair.tokenSymbol));
    } catch (error) {
      console.error("Error fetching tokens:", error);
    }
  };

  const fetchPrediction = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8080/get-prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: selectedToken.toLocaleUpperCase() }),
      });
      const result = await response.json();
      setPredictionData(result);
    } catch (error) {
      console.error("Error fetching prediction:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderChart = () => {
    if (!chartRef.current) {
      console.error("Canvas element not found");
      return;
    }

    const ctx = chartRef.current.getContext("2d");

    // Destroy the previous chart instance, if any
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: Array.from(
          { length: predictionData.actual.length },
          (_, i) => i
        ),
        datasets: [
          {
            label: "Actual Prices",
            data: predictionData.actual,
            borderColor: "blue",
            fill: false,
          },
          {
            label: "Predicted Prices",
            data: predictionData.predicted,
            borderColor: "orange",
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: "top",
          },
        },
        scales: {
          x: { title: { display: true, text: "Time" } },
          y: { title: { display: true, text: "Price" } },
        },
      },
    });
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  useEffect(() => {
    // Render the chart whenever predictionData changes
    if (predictionData) {
      renderChart();
    }
  }, [predictionData]);

  const handleTokenChange = (event) => {
    setSelectedToken(event.target.value + "USDT");
  };

  return (
    <div className="prediction-container">
      <h1>Select a Token</h1>
      <div className="dropdown-container">
        <select
          className="token-dropdown"
          value={selectedToken.replace("USDT", "")} // To display only token name without 'USDT'
          onChange={handleTokenChange}
        >
          <option value="">Select a Token</option>
          {tokens.map((token, index) => (
            <option key={index} value={token}>
              {token}
            </option>
          ))}
        </select>
      </div>
      {selectedToken && !isLoading && (
        <button onClick={fetchPrediction}>Get Prediction</button>
      )}
      {isLoading && <p>Loading prediction...</p>}
      {predictionData && (
        <div className="prediction-results">
          <h2>
            Token: <span>{selectedToken.replace("USDT", "")}</span>
          </h2>
          <canvas ref={chartRef} id="predictionChart"></canvas>
          <div className="accuracy-metrics">
            <p>
              <strong>Directional Accuracy:</strong>{" "}
              {predictionData.directional_accuracy}%
            </p>
            <p>
              <strong>Percentage Accuracy:</strong>{" "}
              {predictionData.percentage_accuracy}%
            </p>
            <p>
              <strong>Predicted Value:</strong>{" "}
              {predictionData.predicted[predictionData.predicted.length - 1]}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export { Prediction };
