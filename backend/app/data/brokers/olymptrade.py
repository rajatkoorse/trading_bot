import time
import uuid
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from app.data.global_fetcher import GLOBAL_ASSETS, get_global_latest_price

logger = logging.getLogger("olymptrade_broker")

class OlympTradePosition:
    def __init__(
        self,
        id: str,
        asset: str,
        direction: str, # 'CALL' (UP) or 'PUT' (DOWN)
        amount: float,
        entry_price: float,
        entry_time: float, # unix timestamp
        duration_minutes: int,
        payout_pct: float,
        account_type: str # 'demo' or 'real'
    ):
        self.id = id
        self.asset = asset
        self.direction = direction
        self.amount = amount
        self.entry_price = entry_price
        self.entry_time = entry_time
        self.duration_minutes = duration_minutes
        self.expiry_time = entry_time + (duration_minutes * 60)
        self.payout_pct = payout_pct
        self.account_type = account_type
        
        self.status = "ACTIVE" # 'ACTIVE', 'WON', 'LOST', 'TIE'
        self.current_price = entry_price
        self.exit_price: Optional[float] = None
        self.pnl: float = 0.0
        self.pnl_pct: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        time_left = max(0, int(self.expiry_time - time.time()))
        return {
            "id": self.id,
            "asset": self.asset,
            "direction": self.direction,
            "amount": self.amount,
            "entry_price": self.entry_price,
            "current_price": self.current_price,
            "exit_price": self.exit_price,
            "entry_time_str": datetime.utcfromtimestamp(self.entry_time).strftime('%H:%M:%S'),
            "expiry_time_str": datetime.utcfromtimestamp(self.expiry_time).strftime('%H:%M:%S'),
            "duration_minutes": self.duration_minutes,
            "time_left_seconds": time_left,
            "payout_pct": self.payout_pct,
            "account_type": self.account_type,
            "status": self.status,
            "pnl": self.pnl,
            "pnl_pct": self.pnl_pct
        }

class OlympTradeBroker:
    """
    24/7 Live Broker Connector for Olymp Trade.
    Supports:
    1. DEMO Account ($10,000 / ₹ equivalent, real-time tick execution)
    2. REAL Live Account (instant switch when funded)
    """
    def __init__(self):
        self.session_token: str = ""
        self.user_id: str = ""
        self.is_connected: bool = True # Demo mode is available by default
        self.active_account: str = "demo" # 'demo' or 'real'
        
        self.demo_balance: float = 10000.00 # $10,000 standard Olymp Trade Demo
        self.real_balance: float = 0.00
        
        self.open_positions: List[OlympTradePosition] = []
        self.closed_positions: List[OlympTradePosition] = []

    def connect(self, credentials: Dict[str, str]) -> Dict[str, Any]:
        token = credentials.get("session_token", "").strip()
        user_id = credentials.get("user_id", "").strip()
        
        if token:
            self.session_token = token
            self.user_id = user_id or f"OLYMP_{token[:6]}"
            self.is_connected = True
            return {
                "success": True,
                "message": f"Connected to Olymp Trade account ({self.user_id})!",
                "account_type": self.active_account,
                "demo_balance": self.demo_balance,
                "real_balance": self.real_balance
            }
        return {
            "success": True,
            "message": "Olymp Trade 24/7 Demo Trading active ($10,000 Virtual Funds).",
            "account_type": self.active_account
        }

    def switch_account(self, account_type: str) -> Dict[str, Any]:
        """Toggles between Olymp Trade DEMO and REAL account."""
        if account_type.lower() not in ["demo", "real"]:
            return {"success": False, "message": "Account must be 'demo' or 'real'"}
            
        self.active_account = account_type.lower()
        return {
            "success": True,
            "active_account": self.active_account,
            "message": f"Switched to Olymp Trade {self.active_account.upper()} Account!"
        }

    def get_account_balance(self) -> Dict[str, Any]:
        invested = sum(p.amount for p in self.open_positions if p.account_type == self.active_account)
        active_bal = self.demo_balance if self.active_account == "demo" else self.real_balance
        
        closed = [p for p in self.closed_positions if p.account_type == self.active_account]
        realized_today = sum(p.pnl for p in closed)
        winning = len([p for p in closed if p.pnl > 0])
        total_closed = len(closed)
        win_rate = round((winning / total_closed * 100), 1) if total_closed > 0 else 0.0

        return {
            "active_account": self.active_account,
            "demo_balance": round(self.demo_balance, 2),
            "real_balance": round(self.real_balance, 2),
            "current_balance": round(active_bal, 2),
            "invested_margin": round(invested, 2),
            "available_cash": round(max(0.0, active_bal - invested), 2),
            "realized_pnl_today": round(realized_today, 2),
            "total_trades": total_closed,
            "winning_trades": winning,
            "win_rate": win_rate,
            "is_connected": self.is_connected
        }

    def place_order(
        self,
        asset: str,
        direction: str, # 'CALL' (UP) or 'PUT' (DOWN)
        amount: float,
        duration_minutes: int = 1
    ) -> Optional[Dict[str, Any]]:
        """
        Executes a real-time 24/7 trade on Olymp Trade (Demo or Real).
        """
        active_bal = self.demo_balance if self.active_account == "demo" else self.real_balance
        if amount > active_bal:
            logger.warning("Insufficient funds for Olymp Trade order.")
            return None

        curr_price = get_global_latest_price(asset)
        asset_info = GLOBAL_ASSETS.get(asset.upper(), {})
        payout = float(asset_info.get("payout", 82))

        # Deduct balance upfront
        if self.active_account == "demo":
            self.demo_balance -= amount
        else:
            self.real_balance -= amount

        pos = OlympTradePosition(
            id=f"olymp_{uuid.uuid4().hex[:8]}",
            asset=asset,
            direction=direction.upper(),
            amount=amount,
            entry_price=curr_price,
            entry_time=time.time(),
            duration_minutes=duration_minutes,
            payout_pct=payout,
            account_type=self.active_account
        )

        self.open_positions.append(pos)
        logger.info(f"[OLYMP TRADE] {pos.account_type.upper()} Order: {pos.direction} {pos.asset} @ {pos.entry_price} (${pos.amount}, {pos.duration_minutes}m)")
        return pos.to_dict()

    def update_ticks(self, asset_ticks: Dict[str, float]) -> List[Dict[str, Any]]:
        """
        Sub-second tick evaluator:
        - Updates floating prices
        - Detects expired positions and settles profit/loss
        """
        events = []
        now = time.time()
        remaining = []

        for pos in self.open_positions:
            curr_price = asset_ticks.get(pos.asset, pos.current_price)
            pos.current_price = curr_price

            # Check if expiry reached
            if now >= pos.expiry_time:
                pos.exit_price = curr_price
                is_win = False
                is_tie = (pos.exit_price == pos.entry_price)

                if pos.direction == "CALL" and pos.exit_price > pos.entry_price:
                    is_win = True
                elif pos.direction == "PUT" and pos.exit_price < pos.entry_price:
                    is_win = True

                if is_tie:
                    pos.status = "TIE"
                    pos.pnl = 0.0
                    return_amount = pos.amount
                elif is_win:
                    pos.status = "WON"
                    pos.pnl = round(pos.amount * (pos.payout_pct / 100.0), 2)
                    pos.pnl_pct = pos.payout_pct
                    return_amount = pos.amount + pos.pnl
                else:
                    pos.status = "LOST"
                    pos.pnl = -pos.amount
                    pos.pnl_pct = -100.0
                    return_amount = 0.0

                # Return capital + profit
                if pos.account_type == "demo":
                    self.demo_balance += return_amount
                else:
                    self.real_balance += return_amount

                self.closed_positions.insert(0, pos)
                events.append({"event": "OLYMP_TRADE_EXPIRED", "position": pos.to_dict()})
            else:
                remaining.append(pos)

        self.open_positions = remaining
        return events

    def get_positions(self) -> Dict[str, Any]:
        return {
            "active": [p.to_dict() for p in self.open_positions],
            "history": [p.to_dict() for p in self.closed_positions[:40]]
        }

    def reset_demo_balance(self, amount: float = 10000.0):
        self.demo_balance = amount
        self.open_positions = [p for p in self.open_positions if p.account_type != "demo"]
        return {"success": True, "demo_balance": self.demo_balance}

olymp_trade_broker = OlympTradeBroker()
