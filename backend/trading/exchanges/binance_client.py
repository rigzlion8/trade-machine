import asyncio
import aiohttp
import hmac
import hashlib
import time
from typing import Dict, List, Optional
from urllib.parse import urlencode
import logging

logger = logging.getLogger(__name__)

class BinanceClient:
    """Binance API client for trading operations."""
    
    def __init__(self, api_key: str, api_secret: str, testnet: bool = True):
        self.api_key = api_key
        self.api_secret = api_secret
        self.testnet = testnet
        
        # Base URLs
        if testnet:
            self.base_url = "https://testnet.binance.vision"
            self.ws_url = "wss://testnet.binance.vision/ws"
        else:
            self.base_url = "https://api.binance.com"
            self.ws_url = "wss://stream.binance.com:9443/ws"
        
        # Rate limiting
        self.request_weight = 0
        self.last_request_time = 0
        
    def _generate_signature(self, params: Dict) -> str:
        """Generate HMAC SHA256 signature for authenticated requests."""
        query_string = urlencode(params)
        return hmac.new(
            self.api_secret.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
    
    def _add_timestamp(self, params: Dict) -> Dict:
        """Add timestamp to request parameters."""
        params['timestamp'] = int(time.time() * 1000)
        return params
    
    async def _make_request(self, method: str, endpoint: str, 
                           params: Dict = None, signed: bool = False) -> Dict:
        """Make HTTP request to Binance API."""
        url = f"{self.base_url}{endpoint}"
        
        if params is None:
            params = {}
        
        if signed:
            params = self._add_timestamp(params)
            params['signature'] = self._generate_signature(params)
        
        headers = {'X-MBX-APIKEY': self.api_key} if signed else {}
        
        try:
            async with aiohttp.ClientSession() as session:
                if method == 'GET':
                    async with session.get(url, params=params, headers=headers) as response:
                        return await response.json()
                elif method == 'POST':
                    async with session.post(url, data=params, headers=headers) as response:
                        return await response.json()
                elif method == 'DELETE':
                    async with session.delete(url, params=params, headers=headers) as response:
                        return await response.json()
        except Exception as e:
            logger.error(f"Binance API request failed: {e}")
            raise
    
    async def get_account_info(self) -> Dict:
        """Get account information."""
        return await self._make_request('GET', '/api/v3/account', signed=True)
    
    async def get_klines(self, symbol: str, interval: str, 
                         limit: int = 100) -> List[List]:
        """Get kline/candlestick data."""
        params = {
            'symbol': symbol,
            'interval': interval,
            'limit': limit
        }
        return await self._make_request('GET', '/api/v3/klines', params)
    
    async def get_ticker_price(self, symbol: str) -> Dict:
        """Get current price for a symbol."""
        params = {'symbol': symbol}
        return await self._make_request('GET', '/api/v3/ticker/price', params)
    
    async def place_order(self, symbol: str, side: str, order_type: str,
                         quantity: float, price: Optional[float] = None) -> Dict:
        """Place a new order."""
        params = {
            'symbol': symbol,
            'side': side.upper(),
            'type': order_type.upper(),
            'quantity': quantity
        }
        
        if price and order_type.upper() == 'LIMIT':
            params['price'] = price
            params['timeInForce'] = 'GTC'
        
        return await self._make_request('POST', '/api/v3/order', params, signed=True)
    
    async def cancel_order(self, symbol: str, order_id: int) -> Dict:
        """Cancel an existing order."""
        params = {
            'symbol': symbol,
            'orderId': order_id
        }
        return await self._make_request('DELETE', '/api/v3/order', params, signed=True)
    
    async def get_open_orders(self, symbol: Optional[str] = None) -> List[Dict]:
        """Get open orders."""
        params = {}
        if symbol:
            params['symbol'] = symbol
        return await self._make_request('GET', '/api/v3/openOrders', params, signed=True)
    
    async def get_order_status(self, symbol: str, order_id: int) -> Dict:
        """Get order status."""
        params = {
            'symbol': symbol,
            'orderId': order_id
        }
        return await self._make_request('GET', '/api/v3/order', params, signed=True)
