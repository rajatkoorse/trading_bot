# AI Signals Trading Platform (NSE / BSE)

Institutional-grade personal AI Trading Platform, Autonomous Bot, and Real-Time Interactive Dashboard specifically built for **Indian Markets (NSE / BSE)** with strict **Minimal-Loss / Capital Preservation Safeguards**.

---

## 🚀 Key Highlights

1. **100% Real-Time Market Feed**:
   - Fetches live sub-second tick candles directly for Indian Indices (`^NSEI`, `^NSEBANK`) and Equities (`RELIANCE.NS`, `HDFCBANK.NS`, `TCS.NS`, `INFY.NS`, `ICICIBANK.NS`, `SBIN.NS`, `TATAMOTORS.NS`, `ITC.NS`, etc.).
   - No mock/fake prices — all technical indicators (EMA, SuperTrend, VWAP, RSI, MACD, ATR) compute on actual live exchange market prints.

2. **Real-Time Funds & Capital Management Hub**:
   - Dedicated dashboard section displaying **Total Net Equity**, **Available Free Cash Margin**, **Invested Capital in Active Trades**, and **Live Floating Unrealized & Realized P&L**.
   - Custom Paper Capital Adjuster (`₹25k`, `₹50k`, `₹1L`, `₹2L`, `₹5L`, `₹10L` or custom amount).

3. **Zero-Fee Broker Integrations**:
   - **DhanHQ API**: 100% Free official broker API with zero monthly charges.
   - **Angel One SmartAPI**: 100% Free official API with automated TOTP login.
   - **Zerodha Free Direct Login**: Direct browser session `enctoken` cookie connector (zero ₹2,000/mo fee).
   - **Real-Time Paper Simulator**: Sub-second execution with realistic 0.02% slippage and Indian statutory charges (STT, ₹20 exchange brokerage, GST).

4. **Institutional Minimal-Loss Protection Rules**:
   - **1.0% Max Risk per Trade**: Dynamic position sizing based on ATR volatility stop.
   - **Auto Break-Even Lock at 1.0R (`🛡️`)**: Automatically shifts Stop Loss to entry price + round-trip exchange tax cover.
   - **50% Partial Take-Profit (`💰`)**: Takes half off at Target 1 and trails the remainder.
   - **Daily 2.0% Circuit Breaker & 2-Loss 45-min Cooldown**.

---

## 🛠️ Quick Start (Local Windows)

Run the one-click startup script:
```cmd
start_system.bat
```
- **Trading Dashboard UI**: [http://localhost:5173](http://localhost:5173)
- **FastAPI Interactive Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 🌐 Hosting & Accessing from Anywhere (Mobile / Remote)

### Option A: Free Cloudflare Tunnel (Recommended - Zero Server Cost)
Keep your laptop/PC running and access your dashboard securely on your phone from anywhere in the world:
1. Download Cloudflare Tunnel (`cloudflared`):
   ```cmd
   winget install Cloudflare.cloudflared
   ```
2. Start tunnel for your frontend:
   ```cmd
   cloudflared tunnel --url http://localhost:5173
   ```
3. Open the generated HTTPS link on your phone.

### Option B: Deploy to Cloud VPS / Railway / Render
1. Push this repository to a **Private GitHub Repository**:
   ```cmd
   git init
   git add .
   git commit -m "Initial AI Signals Trading Platform"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
   git push -u origin main
   ```
2. Deploy backend (`f:\Trader\backend`):
   - Command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
3. Deploy frontend (`f:\Trader\frontend`):
   - Command: `npm run build`
