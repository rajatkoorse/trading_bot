import sys
import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager

# Configure Windows UTF-8 stdout/stderr to prevent charmap/UnicodeEncodeError with symbols & emojis
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.database import init_db
from app.execution.bot_engine import bot_engine
from app.api.websocket_manager import ws_manager
from app.api.routes_market import router as market_router
from app.api.routes_signals import router as signals_router
from app.api.routes_trades import router as trades_router
from app.api.routes_bot import router as bot_router
from app.api.routes_backtest import router as backtest_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing SQLite database & schema...")
    init_db()
    logger.info("Database initialized successfully.")
    
    # Auto-start Indian NSE/BSE bot engine
    bot_engine.start()
    logger.info("Indian NSE/BSE Autonomous Trading Engine started.")
    yield
    # Shutdown
    logger.info("Shutting down bot background loops...")
    bot_engine.stop()

app = FastAPI(
    title="AI Indian Equities Trading Platform (NSE / BSE)",
    description="Institutional-grade personal AI trading engine & bot for Indian Equities (NSE/BSE) with Zerodha Kite, DhanHQ, and Angel One",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(market_router)
app.include_router(signals_router)
app.include_router(trades_router)
app.include_router(bot_router)
app.include_router(backtest_router)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "mode": bot_engine.mode,
        "is_running": bot_engine.is_running
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and listen for client commands
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

# Production Static File Serving for 24/7 Cloud Deployment
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if not frontend_dist.exists():
    frontend_dist = Path(__file__).resolve().parent / "dist"

if frontend_dist.exists():
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
