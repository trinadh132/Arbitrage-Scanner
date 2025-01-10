# Arbitrage-Scanner

 I PROJECT OVERVIEW:  Arbitrage Trading and Price Prediction Platform


This project combines real-time cryptocurrency arbitrage trading opportunities and price prediction capabilities, empowering users to make informed trading decisions. The platform is designed to fetch live trading pairs and prices, calculate arbitrage opportunities, and predict future price movements using machine learning models.

Key Features:
1.Arbitrage Trading:
  a.Identify price discrepancies between Binance and Jupiter for USDC trading pairs.
  b.Calculate profit potential and display opportunities in real time with confidence levels.
  c.Implement WebSocket connections for live price updates and rate limiting for efficient API usage.
2.Price Prediction:
  a. use Binance historical data
  b.Predict cryptocurrency prices using a Bidirectional LSTM-based machine learning model.
  c.Display predictions alongside actual prices in an interactive chart.
  d.Provide evaluation metrics like RMSE and MAE for model performance.
3.Robust Backend:
  a.Built using Node.js, Express, and Flask.
  b.Real-time data fetching from Binance API and Jupiter API.
  c.Retry mechanisms and exponential backoff to ensure reliable data fetching.
4.Interactive Frontend:
  a.Developed using React.js with dynamic token selection and visualization.
  b.Charts powered by Chart.js for intuitive data representation.
  c.Seamless navigation between pages using React Router.
5.Machine Learning Integration:
  a.Utilizes LSTM models for sequential price prediction.
  b.Data preprocessing with MinMaxScaler for accurate training.
  c.Evaluation metrics for predictive model accuracy.
6.API Endpoints:
  a.http://localhost:8080/api/arbitrage-opportunities: Fetches arbitrage opportunities.
  b.http://localhost:8080/get-prediction: Predicts future prices for a selected token.



II.INSTALLATION INSTRUCTIONS


1.Prerequisites
Ensure the following tools and dependencies are installed on your system:
a.Node.js (v14 or later)
  ->Enter this command in your terminal 'node -v'
  ->if node is not installed , download from https://nodejs.org/en
b.Python (v3.8 or later)
  ->Enter this command in your terminal 'python --version'
  ->if python not installed ,  download from https://www.python.org/downloads/
  ->Follow the installation instructions for your operating system:
      a.Windows: Run the downloaded installer, and ensure the "Add Python to PATH" option is selected during installation.
      b.MacOS: Use the downloaded installer or Homebrew (brew install python).
      c.Linux: Use your package manager (e.g., sudo apt install python3 for Ubuntu or sudo dnf install python3 for Fedora).
c.npm (comes with Node.js)
d.juypter notebook
  ->check 'pip --version' if not installed use this command 'python -m ensurepip --upgrade'
  ->enter command 'pip install notebook'
e.Get Binance API Key and Secret (for fetching trading data from Binance)


III.USAGE GUIDE


1. Clone the repository
git clone https://github.com/trinadh132/Arbitrage-Scanner.git

2. Set up ML model 
   a. navigate to project folder (Example C:\Users\16028\OneDrive\Documents\GitHub\Arbitrage-Scanner)
   b. pip install flask flask-cors pandas numpy python-binance scikit-learn xgboost tensorflow
   c. enter command 'jupyter notebook' will open jupyter notebook 
   d. open this python file 'aiforprediction.ipynb' add your api_key , secrete_key
   e. run the code and wait until you see 
            WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
               * Running on http://127.0.0.1:5000

3. Set up Backend
    a.navigate to backend foleder arbitrage_api (Example: C:\Users\16028\OneDrive\Documents\GitHub\Arbitrage-Scanner\arbitrage_api>)
    b.enetr command npm install
    c.enter command node index.js

4. Set up Frontend
    a. navigate to frontend folder arbitrage_scanner (C:\Users\16028\OneDrive\Documents\GitHub\Arbitrage-Scanner\arbitrage_scanner>)
    b. enter command npm install
    c. enter command npm start


IV APPLICATION FLOW



1. you see arbitrage opportunities. A table with columns Token ,Action ,Profit,Profit Percentage,Binance Price, Jupiter Price ,Confidence 
   by alalyzing the live data.For every 45 seceonds table is updated based on live data

2. When user click on prediction button navigates to another page
    
3. This page conatins a dropdown which has common tokens of Binance API for CEX and Solana blockchain for DEX , when user selects a token
   Predection graph is dispalyed with futer prediction.



V.TECHNICAL IMPLEMENTATION DETAILS

1. Frontend (React.js)
  Framework: React.js
  State Management: React's useState and useEffect hooks.
  Routing: React Router for seamless navigation between pages.
  Chart Rendering: Chart.js is used to visualize the actual and predicted prices.

Key Features:
1.Arbitrage Opportunities:
  ->Fetches data from the backend endpoint /api/arbitrage-opportunities.
  ->Displays a responsive table with token, action, profit, profit percentage, and confidence.
  ->Periodically refreshes data every 45 seconds without user intervention.
2.Token Selection for Prediction:
  ->Dropdown dynamically populated with tokenSymbol values fetched from /api/trading-pairs.
  ->Displays the selected token's predictions with actual and predicted prices in a chart.
3.Visualization:
  ->Interactive line chart for comparing actual and predicted prices.

2. Backend (Node.js and Express.js)
  ->Framework: Node.js with Express.js for RESTful API development.
  ->WebSocket: Subscribes to Binance's WebSocket for live trading data.
Features:
1.Data Fetching:
  Fetches token information and live prices from:
   ->Binance API: Trading pairs and prices.
   ->Jupiter API: Token data and prices.
2.Arbitrage Calculation:
  ->Matches Binance trading pairs with Jupiter token pairs.
  ->Calculates arbitrage opportunities by comparing prices and accounting for transaction fees.
3.API Endpoints:
  ->/api/trading-pairs: Returns matched trading pairs.
  ->/api/arbitrage-opportunities: Calculates and returns arbitrage opportunities.
  ->/get-prediction: Forwards prediction requests to the ML backend.

3. Machine Learning API (Flask)
    ->Framework: Flask (Python)
    ->Libraries: TensorFlow, Scikit-learn, XGBoost.
Workflow:
1.Data Preprocessing:
  ->Fetches historical price data from Binance.
  ->Normalizes data using MinMaxScaler.
  ->Converts data into sequences for time-series prediction.
2.Model Training:
  ->Uses a Bidirectional LSTM model for price prediction.
  ->Incorporates dropout layers to prevent overfitting.
  ->Trains on 80% of the data and evaluates on the remaining 20%.
3.Prediction and Metrics:
  ->Predicts future prices based on recent trends.
  ->Evaluates model performance using RMSE and MAE.
4.API Endpoint:
  ->/predict: Accepts a token symbol and returns predicted and actual prices along with performance metrics.
4. Communication Between Components
  a.Frontend ↔ Backend:
  b.REST API endpoints for fetching arbitrage opportunities, trading pairs, and predictions.
  c.WebSocket for real-time updates on price changes.
  d.Backend ↔ External APIs:
  e.Binance and Jupiter APIs for live price and token data.
  f.Backend ↔ ML API:
HTTP POST requests to the /predict endpoint for price prediction.



VI. Deployment Choices


1. Backend
   Choice: Deployed the backend on a Node.js-compatible platform (e.g., AWS EC2 or Heroku).
   Rationale:
    ->Node.js's non-blocking architecture is ideal for handling concurrent WebSocket connections.
    ->Easily integrates with APIs for data fetching and processing.
2. Machine Learning API
   Choice: Hosted the ML API on Flask with Python runtime.
   Rationale:
    ->Lightweight and efficient for running trained models.
    ->Python's ML ecosystem simplifies model development and deployment.
3. Frontend
   Choice: Deployed the React.js frontend on a CDN-powered platform (e.g., Netlify or Vercel).
   Rationale:
    ->CDN ensures fast delivery and high availability.
    ->Simplifies continuous deployment workflows for frontend updates.