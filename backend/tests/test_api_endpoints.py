import pytest
import httpx
from app.main import app

@pytest.mark.asyncio
async def test_health_endpoint():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

@pytest.mark.asyncio
async def test_market_watchlist():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/market/watchlist")
        assert response.status_code == 200
        data = response.json()
        assert "watchlist" in data
        assert isinstance(data["watchlist"], list)

@pytest.mark.asyncio
async def test_signals_recent():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/signals/recent?limit=20")
        assert response.status_code == 200
        data = response.json()
        assert "signals" in data
        assert isinstance(data["signals"], list)

@pytest.mark.asyncio
async def test_trades_portfolio():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/trades/portfolio")
        assert response.status_code == 200
        data = response.json()
        assert "total_equity" in data
        assert "cash_balance" in data
        assert "win_rate" in data

@pytest.mark.asyncio
async def test_trades_positions():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/trades/positions")
        assert response.status_code == 200
        data = response.json()
        assert "positions" in data
        assert isinstance(data["positions"], list)

@pytest.mark.asyncio
async def test_bot_status():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/bot/status")
        assert response.status_code == 200
        data = response.json()
        assert "mode" in data
        assert "is_running" in data


