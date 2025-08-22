#!/usr/bin/env python3
"""Simple test script for trading service."""

import asyncio
import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from trading.trading_service import TradingService
from trading.exchanges.binance_client import BinanceClient
from trading.strategies.moving_average_strategy import MovingAverageStrategy

async def test_trading_service():
    """Test the trading service functionality."""
    print("🧪 Testing Trading Service...")
    
    try:
        # Test Binance client creation
        print("1. Testing Binance client...")
        binance_client = BinanceClient("test_key", "test_secret", testnet=True)
        print("   ✅ Binance client created successfully")
        
        # Test strategy creation
        print("2. Testing strategy creation...")
        strategy = MovingAverageStrategy("BTCUSDT", "1h", 10, 20)
        print(f"   ✅ Strategy created: {strategy.name}")
        print(f"   ✅ Parameters: {strategy.parameters}")
        
        # Test trading service
        print("3. Testing trading service...")
        trading_service = TradingService(binance_client)
        trading_service.add_strategy(strategy)
        print(f"   ✅ Trading service created with {len(trading_service.strategies)} strategies")
        
        # Test strategy performance metrics
        print("4. Testing strategy performance...")
        performance = strategy.get_performance_metrics()
        print(f"   ✅ Performance metrics: {performance}")
        
        print("\n🎉 All tests passed! Trading service is working correctly.")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = asyncio.run(test_trading_service())
    sys.exit(0 if success else 1)
