# 🇮🇳 AI Indian Equities (NSE/BSE) Trading Terminal & Autonomous Bot

An institutional-grade, AI-powered trading terminal and autonomous algorithmic execution bot built specifically for **Indian Equities & Indices (NSE / BSE)**.

Supports **Zerodha Kite**, **DhanHQ**, **Angel One SmartAPI**, and **Virtual Paper Trading (₹1,00,000)**.

---

## 🌐 Hosting on GitHub Pages (`*.github.io`)

The repository includes an automated **GitHub Actions Workflow** (`.github/workflows/deploy.yml`) that automatically builds and deploys the frontend web app to **`https://<your-username>.github.io/<your-repo-name>/`** on every push!

### How to Enable GitHub Pages:
1. Push your repository to GitHub (see [Pushing to GitHub](#-how-to-push-to-github) below).
2. On your GitHub repository page:
   - Go to **Settings** $\rightarrow$ **Pages** (in the left sidebar).
   - Under **Build and deployment** $\rightarrow$ **Source**, select **GitHub Actions**.
3. Push to `master` (or trigger the workflow manually under the **Actions** tab).
4. GitHub will automatically build and publish your website to **`https://<your-username>.github.io/<your-repo-name>/`**.

### Connecting `github.io` to your 24/7 Cloud Backend:
Because GitHub Pages is a static host, the web terminal can connect to your 24/7 Python Bot Engine running on Render, Railway, or a VPS:
1. Open your `https://<your-username>.github.io/<repo>` URL on your phone or browser.
2. Tap the **Server** button in the top navigation bar.
3. Paste your cloud backend URL (e.g., `https://your-trader.onrender.com`).
4. Click **Save & Connect** — your static GitHub Pages site is now directly streaming live market data and executing trades with Kite!

---

## 🚀 Key Features

- **Institutional AI Confluence Engine**: Multi-indicator consensus algorithm combining EMA Ribbon (9/21/50/200), SuperTrend, VWAP, RSI Momentum, MACD Histogram, and ATR Volatility Filters.
- **Zero-Cost Direct Broker Connectors**:
  - **Zerodha Kite**: Free session login via `enctoken` or official Kite Connect v3 API.
  - **DhanHQ**: 100% free official API with 30-day tokens.
  - **Angel One SmartAPI**: 100% free official broker API with automated TOTP authentication.
  - **Paper Trading Engine**: Virtual ₹1,00,000 simulator with sub-second order fills and realistic slippage/fees.
- **📱 Phone-First Mobile UI & Dedicated Mobile Kite Login**:
  - Automatic mobile detection (`isMobileDevice`).
  - 1-tap mobile bookmarklet tool to extract `enctoken` on mobile browsers (Safari / Chrome iOS & Android) where F12 DevTools are unavailable.
- **☁️ 24/7 Cloud Ready (No Laptop Needed)**:
  - Docker multi-stage build that serves both FastAPI backend and React frontend from a single port.
  - 1-click deployment configs for **Render**, **Railway**, or any VPS.
- **Robust Risk Engine**: Max daily drawdown limits, trailing stop loss, automated break-even locking, circuit breakers, and emergency Kill Switch.
- **Real-Time Discord Webhook Alerts**: Live trade notifications with entry price, stop-loss, targets, and PnL.

---

## 📱 How to Use on Your Phone (Without Keeping Your Laptop On)

### Step 1: Deploy Backend to Cloud (Free on Render or Railway)

Deploying the backend to the cloud allows the bot to run 24 hours a day, 7 days a week, so you can close your laptop and control everything from your phone.

#### Option A: 1-Click Render Deployment
1. Go to [render.com](https://render.com) and create a **New Web Service**.
2. Connect your GitHub repository.
3. Select **Docker** environment (Render will automatically detect `Dockerfile` and `render.yaml`).
4. Click **Deploy**. You will receive a live URL like `https://ai-trader-xxxx.onrender.com`.

#### Option B: Railway Deployment
1. Go to [railway.app](https://railway.app) and click **New Project** $\rightarrow$ **Deploy from GitHub repo**.
2. Railway will automatically build the Docker container and provide a live public HTTPS URL.

---

### Step 2: Logging in to Zerodha Kite from Your Phone

Because phone browsers (iOS Safari, Android Chrome) hide Developer Tools (F12), the terminal includes an interactive **Phone Login Guide**:

1. Open your website (either `github.io` or your cloud domain) on your phone browser.
2. Tap the **Broker Connect** button (Key icon in the top navigation bar).
3. Select **Zerodha Kite** $\rightarrow$ **📱 Phone Login Guide**.
4. Tap **Copy Script** to copy the 1-tap mobile bookmarklet.
5. In a new tab, log in to [kite.zerodha.com](https://kite.zerodha.com).
6. In your phone's address bar, type `javascript:` and paste the copied script $\rightarrow$ tap **Go / Enter**.
7. A prompt will display your `enctoken`. Copy and paste it into the terminal.
8. Tap **Connect ZERODHA** — you are now live and trading from your phone!

> **💡 Pro Tip (100% Free 30-Day Mobile Token)**: If you use **Dhan**, you can generate a 30-day token directly inside the Dhan mobile app (*Profile $\rightarrow$ DhanHQ APIs $\rightarrow$ Generate Token*) without needing to copy cookies every day!

---

## 💻 Local Development Setup

If you wish to run the platform locally on your machine:

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Start Backend Engine
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Start Frontend UI
```bash
cd frontend
npm install
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🛠️ Testing & Verification

Run automated backend unit tests:
```bash
cd backend
python -m pytest
```

Build production frontend:
```bash
cd frontend
npm run build
```

---

## 📤 How to Push to GitHub

To push your clean codebase to GitHub:

```bash
# 1. Initialize git remote if not already set:
# git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# 2. Stage all files:
git add .

# 3. Commit your changes:
git commit -m "feat: Add GitHub Pages deployment, dynamic cloud server connector, and mobile Kite support"

# 4. Push to master / main branch:
git push origin master
```

---

## 🛡️ Architecture & Security

- **No Stored Plaintext Credentials**: Broker session tokens are kept in memory and secured environment variables.
- **Kill Switch Protection**: 1-tap hardware stop to immediately close open positions and halt new order triggers.
- **Fail-Safe Circuit Breaker**: Auto-trips if daily portfolio loss threshold is reached.
