import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.execution.bot_engine import bot_engine
from app.api.websocket_manager import ws_manager
from app.api.routes_market import router as market_router
from app.api.routes_signals import router as signals_router
from app.api.routes_trades import router as trades_router
from app.api.routes_bot import router as bot_router
from app.api.routes_backtest import router as backtest_router
from app.api.routes_olymptrade import router as olymp_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing SQLite database & schema...")
    init_db()
    logger.info("Database initialized successfully.")
    
    # Auto-start bot loop
    bot_engine.start()
    yield
    # Shutdown
    logger.info("Shutting down bot background loop...")
    bot_engine.stop()

app = FastAPI(
    title="AI Signals Trading Platform (NSE / BSE & Olymp Trade 24/7)",
    description="Institutional-grade personal AI trading engine & bot for Indian Equities, BSE/NSE & Olymp Trade 24/7 Global Markets",
    version="1.1.0",
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

# Register Routers
app.include_router(market_router)
app.include_router(signals_router)
app.include_router(trades_router)
app.include_router(bot_router)
app.include_router(backtest_router)
app.include_router(olymp_router)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
