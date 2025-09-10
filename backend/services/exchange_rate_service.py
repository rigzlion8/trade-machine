import httpx
import logging
from typing import Dict, Optional
from datetime import datetime, timedelta
from models.payment import ExchangeRatesResponse

logger = logging.getLogger(__name__)

class ExchangeRateService:
    def __init__(self):
        # Using ExchangeRate-API (free tier: 1500 requests/month)
        self.api_key = "your-api-key-here"  # You can get a free key from https://exchangerate-api.com/
        self.base_url = "https://v6.exchangerate-api.com/v6"
        self.cache_duration = timedelta(hours=1)  # Cache rates for 1 hour
        self._cached_rates = None
        self._cache_timestamp = None
    
    async def get_exchange_rates(self, base_currency: str = "KES") -> Optional[ExchangeRatesResponse]:
        """Get current exchange rates with caching."""
        try:
            # Check if we have cached rates that are still valid
            if (self._cached_rates and 
                self._cache_timestamp and 
                datetime.utcnow() - self._cache_timestamp < self.cache_duration):
                return self._cached_rates
            
            # Fetch new rates
            rates = await self._fetch_rates_from_api(base_currency)
            if rates:
                self._cached_rates = rates
                self._cache_timestamp = datetime.utcnow()
                return rates
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting exchange rates: {e}")
            return None
    
    async def _fetch_rates_from_api(self, base_currency: str) -> Optional[ExchangeRatesResponse]:
        """Fetch exchange rates from the API."""
        try:
            # For demo purposes, we'll use mock data since we don't have an API key
            # In production, you would use a real API like ExchangeRate-API, Fixer.io, or CurrencyAPI
            
            # Mock exchange rates (these would come from the API)
            # Updated with more realistic rates as of 2024
            mock_rates = {
                "USD": 0.0067,  # 1 KES = 0.0067 USD (149 KES = 1 USD)
                "EUR": 0.0062,  # 1 KES = 0.0062 EUR (161 KES = 1 EUR)
                "GBP": 0.0053,  # 1 KES = 0.0053 GBP (189 KES = 1 GBP)
                "NGN": 6.67,    # 1 KES = 6.67 NGN (0.15 NGN = 1 KES)
                "UGX": 24.5,    # 1 KES = 24.5 UGX (0.041 UGX = 1 KES)
                "TZS": 15.8,    # 1 KES = 15.8 TZS (0.063 TZS = 1 KES)
                "RWF": 8.2,     # 1 KES = 8.2 RWF (0.122 RWF = 1 KES)
                "ETB": 0.37,    # 1 KES = 0.37 ETB (2.7 ETB = 1 KES)
                "CAD": 0.0091,  # 1 KES = 0.0091 CAD (110 KES = 1 CAD)
                "AUD": 0.0101,  # 1 KES = 0.0101 AUD (99 KES = 1 AUD)
                "CHF": 0.0059,  # 1 KES = 0.0059 CHF (169 KES = 1 CHF)
                "JPY": 1.01,    # 1 KES = 1.01 JPY (0.99 JPY = 1 KES)
                "CNY": 0.048,   # 1 KES = 0.048 CNY (20.8 KES = 1 CNY)
                "INR": 0.56,    # 1 KES = 0.56 INR (1.79 INR = 1 KES)
                "ZAR": 0.12,    # 1 KES = 0.12 ZAR (8.33 ZAR = 1 KES)
            }
            
            return ExchangeRatesResponse(
                base=base_currency,
                rates=mock_rates,
                last_updated=datetime.utcnow()
            )
            
            # Uncomment this section when you have a real API key:
            """
            url = f"{self.base_url}/{self.api_key}/latest/{base_currency}"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=10.0)
                response.raise_for_status()
                
                data = response.json()
                if data.get("result") == "success":
                    return ExchangeRatesResponse(
                        base=data["base_code"],
                        rates=data["conversion_rates"],
                        last_updated=datetime.utcnow()
                    )
                else:
                    logger.error(f"API error: {data.get('error-type', 'Unknown error')}")
                    return None
            """
                    
        except Exception as e:
            logger.error(f"Error fetching rates from API: {e}")
            return None
    
    async def convert_amount(self, amount: float, from_currency: str, to_currency: str) -> Optional[float]:
        """Convert amount from one currency to another."""
        try:
            if from_currency == to_currency:
                return amount
            
            rates = await self.get_exchange_rates(from_currency)
            if not rates or to_currency not in rates.rates:
                return None
            
            # Convert using the exchange rate
            return amount * rates.rates[to_currency]
            
        except Exception as e:
            logger.error(f"Error converting amount: {e}")
            return None
    
    async def get_popular_rates(self) -> Dict[str, float]:
        """Get popular exchange rates for display."""
        try:
            rates = await self.get_exchange_rates("KES")
            if not rates:
                return {}
            
            # Return popular currencies
            popular_currencies = ["USD", "EUR", "GBP", "NGN", "UGX"]
            return {currency: rates.rates.get(currency, 0) for currency in popular_currencies}
            
        except Exception as e:
            logger.error(f"Error getting popular rates: {e}")
            return {}

# Global instance
exchange_rate_service = ExchangeRateService()
