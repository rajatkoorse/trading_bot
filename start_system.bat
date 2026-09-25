@echo off
echo ===================================================
echo Starting AI Signals Trader (NSE / BSE) Platform
echo ===================================================
echo.
start "AI Trader - Backend Engine" cmd /k "cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
timeout /t 3 /nobreak >nul
start "AI Trader - Frontend Dashboard" cmd /k "cd frontend && npm run dev"
echo.
echo Both services launched!
echo - Backend API:  http://127.0.0.1:8000/docs
echo - Dashboard UI: http://localhost:5173
echo ===================================================
