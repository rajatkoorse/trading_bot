import os
import sqlite3
from app.database import init_db, get_db_connection

def reset_all_data():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Clean all signals
    cursor.execute("DELETE FROM signals")
    # Clean all trades
    cursor.execute("DELETE FROM trades")
    # Reset portfolio state
    cursor.execute("DELETE FROM portfolio_state")
    cursor.execute("""
        INSERT INTO portfolio_state (id, cash_balance, initial_equity, updated_at)
        VALUES (1, 100000.0, 100000.0, datetime('now'))
    """)
    conn.commit()
    conn.close()
    print("Database wiped successfully. Clean starting capital: Rs 100,000.00")

if __name__ == "__main__":
    reset_all_data()
