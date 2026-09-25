from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from app.models.schemas import AISignal, TradePosition, OrderSide

class BaseBroker(ABC):
    """Abstract interface for Broker Execution Engines."""
    
    @abstractmethod
    def get_account_balance(self) -> Dict[str, float]:
        """Returns {'cash_balance': float, 'total_equity': float}"""
        pass
        
    @abstractmethod
    def get_open_positions(self) -> List[TradePosition]:
        """Returns list of currently open positions."""
        pass
        
    @abstractmethod
    def execute_signal(self, signal: AISignal, quantity: int) -> Optional[TradePosition]:
        """Places market/bracket entry order corresponding to the AI signal."""
        pass
        
    @abstractmethod
    def close_position(self, position_id: str, reason: str = "MANUAL_CLOSE") -> Optional[TradePosition]:
        """Closes an open position at current market price."""
        pass
        
    @abstractmethod
    def update_positions_with_market_tick(self, symbol: str, current_price: float) -> List[Dict[str, Any]]:
        """Updates PnL, triggers dynamic trailing stops, and checks TP/SL hits."""
        pass
