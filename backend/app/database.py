import sqlite3
import json
import os
from typing import List, Optional, Dict, Any
from app.config import settings

def get_db_connection():
    os.makedirs(os.path.dirname(settings.db_path), exist_ok=True)
    conn = sqlite3.connect(settings.db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Signals table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS signals (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        datetime TEXT NOT NULL,
        signal_type TEXT NOT NULL,
        entry_price REAL NOT NULL,
        stop_loss REAL NOT NULL,
        target_1 REAL NOT NULL,
        target_2 REAL NOT NULL,
        rrr REAL NOT NULL,
        confidence_score REAL NOT NULL,
        ml_probability REAL NOT NULL,
        indicators TEXT NOT NULL,
        reasons TEXT NOT NULL,
        status TEXT NOT NULL,
        executed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
    )
    """)

    # Trades / Positions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        signal_id TEXT,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        entry_price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        current_price REAL NOT NULL,
        stop_loss REAL NOT NULL,
        target_1 REAL NOT NULL,
        target_2 REAL NOT NULL,
        trailing_stop REAL,
        pnl REAL DEFAULT 0.0,
        pnl_pct REAL DEFAULT 0.0,
        status TEXT NOT NULL,
        entry_time TEXT NOT NULL,
        exit_time TEXT,
        exit_price REAL,
        exit_reason TEXT,
        fees_incurred REAL DEFAULT 0.0,
        highest_price REAL,
        lowest_price REAL
    )
    """)

    # Account Portfolio state table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS portfolio_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        cash_balance REAL NOT NULL,
        initial_equity REAL NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)
    
    # Initialize default balance if not present
    cursor.execute("SELECT id FROM portfolio_state WHERE id = 1")
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO portfolio_state (id, cash_balance, initial_equity, updated_at)
        VALUES (1, ?, ?, datetime('now'))
        """, (settings.risk.account_equity, settings.risk.account_equity))

    # App Key-Value Settings table (for dynamic UI updates)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    conn.commit()
    conn.close()

# Database Helper Methods
def save_signal(signal_data: Dict[str, Any]):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO signals (
        id, symbol, timeframe, timestamp, datetime, signal_type,
        entry_price, stop_loss, target_1, target_2, rrr,
        confidence_score, ml_probability, indicators, reasons,
        status, executed, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        signal_data["id"],
        signal_data["symbol"],
        signal_data["timeframe"],
        signal_data["timestamp"],
        signal_data["datetime"],
        signal_data["signal_type"],
        signal_data["entry_price"],
        signal_data["stop_loss"],
        signal_data["target_1"],
        signal_data["target_2"],
        signal_data["rrr"],
        signal_data["confidence_score"],
        signal_data["ml_probability"],
        json.dumps(signal_data["indicators"]),
        json.dumps(signal_data["reasons"]),
        signal_data["status"],
        1 if signal_data.get("executed", False) else 0,
        signal_data["created_at"]
    ))
    conn.commit()
    conn.close()

import math

def sanitize_json_value(val: Any) -> Any:
    """Recursively clean floats (NaN/inf to 0.0) and collections for safe JSON serialization."""
    if val is None:
        return None
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return 0.0
        return round(val, 4)
    if isinstance(val, dict):
        return {k: sanitize_json_value(v) for k, v in val.items()}
    if isinstance(val, (list, tuple)):
        return [sanitize_json_value(v) for v in val]
    return val

def get_recent_signals(limit: int = 50, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if symbol:
        cursor.execute("SELECT * FROM signals WHERE symbol = ? ORDER BY timestamp DESC LIMIT ?", (symbol, limit))
    else:
        cursor.execute("SELECT * FROM signals ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    signals = []
    for r in rows:
        d = dict(r)
        if isinstance(d.get("indicators"), str):
            try:
                d["indicators"] = json.loads(d["indicators"])
            except Exception:
                d["indicators"] = {}
        if isinstance(d.get("reasons"), str):
            try:
                d["reasons"] = json.loads(d["reasons"])
            except Exception:
                d["reasons"] = []
        d["executed"] = bool(d.get("executed", 0))
        d = sanitize_json_value(d)
        signals.append(d)
    return signals

def save_trade(trade_data: Dict[str, Any]):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO trades (
        id, signal_id, symbol, side, entry_price, quantity,
        current_price, stop_loss, target_1, target_2, trailing_stop,
        pnl, pnl_pct, status, entry_time, exit_time, exit_price,
        exit_reason, fees_incurred, highest_price, lowest_price
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        trade_data["id"],
        trade_data.get("signal_id"),
        trade_data["symbol"],
        trade_data["side"],
        trade_data["entry_price"],
        trade_data["quantity"],
        trade_data["current_price"],
        trade_data["stop_loss"],
        trade_data["target_1"],
        trade_data["target_2"],
        trade_data.get("trailing_stop"),
        trade_data.get("pnl", 0.0),
        trade_data.get("pnl_pct", 0.0),
        trade_data["status"],
        trade_data["entry_time"],
        trade_data.get("exit_time"),
        trade_data.get("exit_price"),
        trade_data.get("exit_reason"),
        trade_data.get("fees_incurred", 0.0),
        trade_data.get("highest_price"),
        trade_data.get("lowest_price")
    ))
    conn.commit()
    conn.close()

def get_trades(status: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if status:
        cursor.execute("SELECT * FROM trades WHERE status = ? ORDER BY entry_time DESC LIMIT ?", (status, limit))
    else:
        cursor.execute("SELECT * FROM trades ORDER BY entry_time DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [sanitize_json_value(dict(r)) for r in rows]

def get_portfolio_balance() -> Dict[str, float]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT cash_balance, initial_equity FROM portfolio_state WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    if row:
        return sanitize_json_value({"cash_balance": row["cash_balance"], "initial_equity": row["initial_equity"]})
    return {"cash_balance": settings.risk.account_equity, "initial_equity": settings.risk.account_equity}

def update_portfolio_balance(cash_balance: float, initial_equity: Optional[float] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if initial_equity is not None:
        cursor.execute("""
        UPDATE portfolio_state SET cash_balance = ?, initial_equity = ?, updated_at = datetime('now') WHERE id = 1
        """, (cash_balance, initial_equity))
    else:
        cursor.execute("""
        UPDATE portfolio_state SET cash_balance = ?, updated_at = datetime('now') WHERE id = 1
        """, (cash_balance,))
    conn.commit()
    conn.close()

def set_config_value(key: str, value: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)", (key, value))
    conn.commit()
    conn.close()

def get_config_value(key: str, default: Optional[str] = None) -> Optional[str]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM system_config WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row["value"] if row else default
