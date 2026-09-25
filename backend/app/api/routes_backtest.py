from fastapi import APIRouter, HTTPException
from app.models.schemas import BacktestRequest, BacktestResult
from app.backtest.backtester import run_backtest

router = APIRouter(prefix="/api/backtest", tags=["Backtesting Engine"])

@router.post("/run", response_model=BacktestResult)
def execute_backtest(request: BacktestRequest):
    try:
        result = run_backtest(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtest execution failed: {str(e)}")
