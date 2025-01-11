# Arbitrage-Scanner

#### Output Pics
Output pictures are available in the `Arbitrage-Scanner\outputpics` directory.

---

## I. Project Overview: Arbitrage Trading and Price Prediction Platform

This project combines real-time cryptocurrency arbitrage trading opportunities with price prediction capabilities, empowering users to make informed trading decisions. The platform is designed to fetch live trading pairs and prices, calculate arbitrage opportunities, and predict future price movements using machine learning models.

### Key Features:
1. **Arbitrage Trading**:
   - Identify price discrepancies between Binance and Jupiter for USDC trading pairs.
   - Calculate profit potential and display opportunities in real time with confidence levels.
   - Implement WebSocket connections for live price updates and rate limiting for efficient API usage.

2. **Price Prediction**:
   - Use Binance historical data.
   - Predict cryptocurrency prices using a Bidirectional LSTM-based machine learning model.
   - Display predictions alongside actual prices in an interactive chart.
   - Provide evaluation metrics like RMSE and MAE for model performance.

3. **Robust Backend**:
   - Built using Node.js, Express, and Flask.
   - Real-time data fetching from Binance API and Jupiter API.
   - Retry mechanisms and exponential backoff to ensure reliable data fetching.

4. **Interactive Frontend**:
   - Developed using React.js with dynamic token selection and visualization.
   - Charts powered by Chart.js for intuitive data representation.
   - Seamless navigation between pages using React Router.

5. **Machine Learning Integration**:
   - Utilizes Hybrid model with Bidirectional LSTM and XGBoost Regressor for sequential price prediction.
   - Data preprocessing with MinMaxScaler for accurate training and also back testing the code .
   - Provides evaluation metrics for predictive model accuracy.

6. **API Endpoints**:
   - `/api/arbitrage-opportunities`: Fetches arbitrage opportunities.
   - `/get-prediction`: Predicts future prices for a selected token.

**Note**: It may take a few seconds to load the data due to the processing of live updates and predictions.

---

## II. Installation Instructions

### 1. Prerequisites
Ensure the following tools and dependencies are installed on your system:

- **Node.js** (v14 or later):
  - Enter `node -v` in your terminal.
  - If Node.js is not installed, download it from [Node.js Official Website](https://nodejs.org/en).

- **Python** (v3.8 or later):
  - Enter `python --version` in your terminal.
  - If Python is not installed, download it from [Python Downloads](https://www.python.org/downloads/).
  - Follow the installation instructions for your operating system:
    - **Windows**: Run the downloaded installer and ensure the "Add Python to PATH" option is selected.
    - **MacOS**: Use the downloaded installer or Homebrew (`brew install python`).
    - **Linux**: Use your package manager (e.g., `sudo apt install python3` for Ubuntu or `sudo dnf install python3` for Fedora).

- **npm** (comes with Node.js).

- **Jupyter Notebook**:
  - Check if pip is installed using `pip --version`. If not, use `python -m ensurepip --upgrade`.
  - Install Jupyter Notebook using `pip install notebook`.

- **Binance API Key and Secret** (for fetching trading data from Binance).

---

## III. Usage Guide

### 1. Clone the Repository
```bash
git clone https://github.com/trinadh132/Arbitrage-Scanner.git
```

### 2. Set up the ML Model
   - Navigate to the project folder. For example:
     ```bash
     cd C:\Users\16028\OneDrive\Documents\GitHub\Arbitrage-Scanner
     ```
   - Install required dependencies:
     ```bash
     pip install flask flask-cors pandas numpy python-binance scikit-learn xgboost tensorflow
     ```
   - Start Jupyter Notebook:
     ```bash
     jupyter notebook
     ```
   - Open the file `aiforprediction.ipynb`, add your `api_key` and `secret_key`, and run the code.
   - Wait until you see the following message:
     ```
     WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
     * Running on http://127.0.0.1:5000
     ```

### 3. Set up the Backend
   - Navigate to the backend folder `arbitrage_api` (e.g., `C:\Users\16028\OneDrive\Documents\GitHub\Arbitrage-Scanner\arbitrage_api>`).
   - Run the following commands:
     ```bash
     npm install
     node index.js
     ```

### 4. Set up the Frontend
   - Navigate to the frontend folder `arbitrage_scanner` (e.g., `C:\Users\16028\OneDrive\Documents\GitHub\Arbitrage-Scanner\arbitrage_scanner>`).
   - Run the following commands:
     ```bash
     npm install
     npm start
     ```

---

## IV. Application Flow

1. View arbitrage opportunities:
   - A table with columns such as Token, Action, Profit, Profit Percentage, Binance Price, Jupiter Price, and Confidence is displayed based on live data.
   - The table updates every 45 seconds automatically.

2. Prediction Feature:
   - When the user clicks the "Prediction" button, they are navigated to another page.

3. Prediction Page:
   - Contains a dropdown with common tokens from the Binance API (CEX) and Solana blockchain (DEX).
   - When a token is selected, a prediction graph is displayed with future predictions.

---

## V. Technical Implementation Details

### 1. Frontend (React.js)
- **Framework**: React.js
- **State Management**: React's `useState` and `useEffect` hooks.
- **Routing**: React Router for seamless navigation between pages.
- **Chart Rendering**: Chart.js is used to visualize actual and predicted prices.

#### Key Features:
1. **Arbitrage Opportunities**:
   - Fetches data from the backend endpoint `/api/arbitrage-opportunities`.
   - Displays a responsive table with tokens, actions, profit, profit percentage, and confidence levels.
   - Refreshes data every 45 seconds without user intervention.

2. **Token Selection for Prediction**:
   - Dropdown dynamically populated with `tokenSymbol` values fetched from `/api/trading-pairs`.
   - Displays the selected token's predictions with actual and predicted prices in a chart.

3. **Visualization**:
   - Interactive line chart for comparing actual and predicted prices.

### 2. Backend (Node.js and Express.js)
- **Framework**: Node.js with Express.js for RESTful API development.
- **WebSocket**: Subscribes to Binance's WebSocket for live trading data.

#### Features:
1. **Data Fetching**:
   - Fetches token information and live prices from:
     - Binance API: Trading pairs and prices.
     - Jupiter API: Token data and prices.

2. **Arbitrage Calculation**:
   - Matches Binance trading pairs with Jupiter token pairs.
   - Calculates arbitrage opportunities by comparing prices and accounting for transaction fees.

3. **API Endpoints**:
   - `/api/trading-pairs`: Returns matched trading pairs.
   - `/api/arbitrage-opportunities`: Calculates and returns arbitrage opportunities.
   - `/get-prediction`: Forwards prediction requests to the ML backend.

### 3. Machine Learning API (Flask)
- **Framework**: Flask (Python)
- **Libraries**: TensorFlow, Scikit-learn, XGBoost

#### Workflow:
1. **Data Preprocessing**:
   - Fetches historical price data from Binance.
   - Normalizes data using MinMaxScaler.
   - Converts data into sequences for time-series prediction.

2. **Model Training**:
   - Uses a Bidirectional LSTM model for price prediction.
   - Incorporates dropout layers to prevent overfitting.
   - Trains on 80% of the data and evaluates on the remaining 20%.

3. **Prediction and Metrics**:
   - Predicts future prices based on recent trends.
   - Evaluates model performance using RMSE and MAE.

4. **API Endpoint**:
   - `/predict`: Accepts a token symbol and returns predicted and actual prices along with performance metrics.

### 4. Communication Between Components
- **Frontend ↔ Backend**:
  - REST API endpoints for fetching arbitrage opportunities, trading pairs, and predictions.
  - WebSocket for real-time updates on price changes.

- **Backend ↔ External APIs**:
  - Binance and Jupiter APIs for live price and token data.

- **Backend ↔ ML API**:
  - HTTP POST requests to the `/predict` endpoint for price prediction.

---

## VI. Deployment Choices

### 1. Backend
- **Choice**: Deployed on a Node.js-compatible platform (e.g., AWS EC2 or Heroku).
- **Rationale**:
  - Node.js's non-blocking architecture is ideal for handling concurrent WebSocket connections.
  - Easily integrates with APIs for data fetching and processing.

### 2. Machine Learning API
- **Choice**: Hosted on Flask with Python runtime.
- **Rationale**:
  - Lightweight and efficient for running trained models.
  - Python's ML ecosystem simplifies model development and deployment.

### 3. Frontend
- **Choice**: Deployed on a CDN-powered platform (e.g., Netlify or Vercel).
- **Rationale**:
  - CDN ensures fast delivery and high availability.
  - Simplifies continuous deployment workflows for frontend updates.

---

