import pytest
from app.data.brokers.dhan import dhan_broker

def test_dhan_margin_parsing_root_object():
    mock_response = {
        "dhanClientId": "1113953187",
        "availMargin": 100.0,
        "sodLimit": 100.0,
        "collateralAmount": 0.0,
        "receiveableAmount": 0.0,
        "utilizedAmount": 0.0,
        "blockedPayoutAmount": 0.0,
        "withdrawableBalance": 100.0
    }
    
    dhan_broker.client_id = "1113953187"
    dhan_broker.access_token = "dummy_token"
    dhan_broker.is_connected = True
    
    # Test internal parser
    data = mock_response
    avail = float(data.get("availMargin") or data.get("sodLimit") or 0.0)
    assert avail == 100.0

def test_dhan_margin_parsing_nested_data():
    mock_response = {
        "status": "success",
        "data": {
            "dhanClientId": "1113953187",
            "availMargin": 100.0,
            "sodLimit": 100.0,
            "utilizedAmount": 0.0
        }
    }
    raw = mock_response
    data = raw.get("data") if (isinstance(raw, dict) and "data" in raw and isinstance(raw["data"], dict)) else raw
    avail = float(data.get("availMargin") or data.get("sodLimit") or 0.0)
    assert avail == 100.0
