import React, { useState, useEffect } from 'react'
import { 
  ArrowPathIcon, 
  StarIcon,
  ClockIcon,
  CalculatorIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import PaymentService, { ExchangeRates, CurrencyConversion } from '../services/paymentService'
import toast from 'react-hot-toast'

interface CurrencyConverterProps {
  exchangeRates: ExchangeRates | null
  onRefreshRates: () => void
}

interface ConversionHistory {
  id: string
  fromAmount: number
  fromCurrency: string
  toAmount: number
  toCurrency: string
  rate: number
  timestamp: Date
}

export default function CurrencyConverter({ exchangeRates, onRefreshRates }: CurrencyConverterProps) {
  const [fromAmount, setFromAmount] = useState<string>('')
  const [toAmount, setToAmount] = useState<string>('')
  const [fromCurrency, setFromCurrency] = useState<string>('KES')
  const [toCurrency, setToCurrency] = useState<string>('USD')
  const [isConverting, setIsConverting] = useState(false)
  const [favoriteCurrencies, setFavoriteCurrencies] = useState<string[]>(['KES', 'USD', 'EUR', 'GBP'])
  const [conversionHistory, setConversionHistory] = useState<ConversionHistory[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const currencies = exchangeRates ? Object.keys(exchangeRates.rates) : []
  const allCurrencies = ['KES', ...currencies].filter((currency, index, self) => self.indexOf(currency) === index)

  useEffect(() => {
    // Load favorites and history from localStorage
    const savedFavorites = localStorage.getItem('currencyFavorites')
    if (savedFavorites) {
      setFavoriteCurrencies(JSON.parse(savedFavorites))
    }

    const savedHistory = localStorage.getItem('conversionHistory')
    if (savedHistory) {
      setConversionHistory(JSON.parse(savedHistory).map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      })))
    }
  }, [])

  const saveFavorites = (favorites: string[]) => {
    setFavoriteCurrencies(favorites)
    localStorage.setItem('currencyFavorites', JSON.stringify(favorites))
  }

  const saveToHistory = (conversion: ConversionHistory) => {
    const newHistory = [conversion, ...conversionHistory.slice(0, 9)] // Keep last 10
    setConversionHistory(newHistory)
    localStorage.setItem('conversionHistory', JSON.stringify(newHistory))
  }

  const toggleFavorite = (currency: string) => {
    if (favoriteCurrencies.includes(currency)) {
      saveFavorites(favoriteCurrencies.filter(c => c !== currency))
    } else {
      saveFavorites([...favoriteCurrencies, currency])
    }
  }

  const swapCurrencies = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
    setFromAmount(toAmount)
    setToAmount(fromAmount)
  }

  const convertCurrency = async (amount: string, from: string, to: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      setToAmount('')
      return
    }

    try {
      setIsConverting(true)
      
      if (from === to) {
        setToAmount(amount)
        return
      }

      const result: CurrencyConversion = await PaymentService.convertCurrency(
        parseFloat(amount),
        from,
        to
      )

      setToAmount(result.converted_amount.toFixed(4))

      // Save to history
      const historyItem: ConversionHistory = {
        id: Date.now().toString(),
        fromAmount: parseFloat(amount),
        fromCurrency: from,
        toAmount: result.converted_amount,
        toCurrency: to,
        rate: result.rate,
        timestamp: new Date()
      }
      saveToHistory(historyItem)

    } catch (error: any) {
      console.error('Conversion error:', error)
      toast.error('Failed to convert currency')
      setToAmount('')
    } finally {
      setIsConverting(false)
    }
  }

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value)
    if (value && !isNaN(parseFloat(value))) {
      convertCurrency(value, fromCurrency, toCurrency)
    } else {
      setToAmount('')
    }
  }

  const handleFromCurrencyChange = (currency: string) => {
    setFromCurrency(currency)
    if (fromAmount && !isNaN(parseFloat(fromAmount))) {
      convertCurrency(fromAmount, currency, toCurrency)
    }
  }

  const handleToCurrencyChange = (currency: string) => {
    setToCurrency(currency)
    if (fromAmount && !isNaN(parseFloat(fromAmount))) {
      convertCurrency(fromAmount, fromCurrency, currency)
    }
  }

  const clearHistory = () => {
    setConversionHistory([])
    localStorage.removeItem('conversionHistory')
    toast.success('History cleared')
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount)
  }

  const getCurrencyFlag = (currency: string) => {
    const flags: Record<string, string> = {
      'KES': '🇰🇪',
      'USD': '🇺🇸',
      'EUR': '🇪🇺',
      'GBP': '🇬🇧',
      'NGN': '🇳🇬',
      'UGX': '🇺🇬',
      'TZS': '🇹🇿',
      'RWF': '🇷🇼',
      'ETB': '🇪🇹'
    }
    return flags[currency] || '🌍'
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CalculatorIcon className="h-6 w-6 text-primary-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Currency Converter</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onRefreshRates}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Refresh rates"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="View history"
            >
              <ClockIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Converter Form */}
        <div className="space-y-4">
          {/* From Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From
            </label>
            <div className="flex space-x-3">
              <div className="flex-1">
                <input
                  type="number"
                  value={fromAmount}
                  onChange={(e) => handleFromAmountChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter amount"
                  step="0.01"
                />
              </div>
              <div className="w-32">
                <select
                  value={fromCurrency}
                  onChange={(e) => handleFromCurrencyChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {allCurrencies.map(currency => (
                    <option key={currency} value={currency}>
                      {getCurrencyFlag(currency)} {currency}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={swapCurrencies}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              title="Swap currencies"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          </div>

          {/* To Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To
            </label>
            <div className="flex space-x-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={toAmount}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                  placeholder={isConverting ? "Converting..." : "Converted amount"}
                />
              </div>
              <div className="w-32">
                <select
                  value={toCurrency}
                  onChange={(e) => handleToCurrencyChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {allCurrencies.map(currency => (
                    <option key={currency} value={currency}>
                      {getCurrencyFlag(currency)} {currency}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Amounts
          </label>
          <div className="flex flex-wrap gap-2">
            {[100, 500, 1000, 5000, 10000].map(amount => (
              <button
                key={amount}
                onClick={() => handleFromAmountChange(amount.toString())}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                {formatCurrency(amount, fromCurrency)}
              </button>
            ))}
          </div>
        </div>

        {/* Favorite Currencies */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Favorite Currencies
          </label>
          <div className="flex flex-wrap gap-2">
            {favoriteCurrencies.map(currency => (
              <button
                key={currency}
                onClick={() => {
                  if (fromCurrency === currency) {
                    setToCurrency(currency)
                  } else {
                    setFromCurrency(currency)
                  }
                }}
                className="flex items-center px-3 py-1 text-sm bg-primary-100 text-primary-700 hover:bg-primary-200 rounded-md"
              >
                {getCurrencyFlag(currency)} {currency}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(currency)
                  }}
                  className="ml-1"
                >
                  <StarIconSolid className="h-3 w-3 text-yellow-500" />
                </button>
              </button>
            ))}
          </div>
        </div>

        {/* Add to Favorites */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add to Favorites
          </label>
          <div className="flex flex-wrap gap-2">
            {allCurrencies.filter(currency => !favoriteCurrencies.includes(currency)).map(currency => (
              <button
                key={currency}
                onClick={() => toggleFavorite(currency)}
                className="flex items-center px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                {getCurrencyFlag(currency)} {currency}
                <StarIcon className="h-3 w-3 ml-1 text-gray-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Conversion History */}
        {showHistory && (
          <div className="mt-6 border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-900">Recent Conversions</h4>
              {conversionHistory.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Clear History
                </button>
              )}
            </div>
            
            {conversionHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No conversion history yet
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {conversionHistory.map((conversion) => (
                  <div key={conversion.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">
                        {formatCurrency(conversion.fromAmount, conversion.fromCurrency)}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(conversion.toAmount, conversion.toCurrency)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {conversion.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Exchange Rate Info */}
        {exchangeRates && fromCurrency !== toCurrency && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <ChartBarIcon className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-900">Exchange Rate</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              1 {fromCurrency} = {exchangeRates.rates[toCurrency]?.toFixed(4) || 'N/A'} {toCurrency}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Last updated: {new Date(exchangeRates.last_updated).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
