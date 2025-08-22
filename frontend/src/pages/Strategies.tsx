import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Activity, 
  Target,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Shield,
  DollarSign,
  Settings
} from 'lucide-react';
import { BotService } from '../services/api';
import { toast } from 'react-hot-toast';

interface Strategy {
  name: string;
  symbol: string;
  timeframe: string;
  parameters: Record<string, any>;
  performance: Record<string, any>;
}

interface StrategyInfo {
  name: string;
  displayName: string;
  description: string;
  type: string;
  bestFor: string[];
  riskLevel: string;
  timeframe: string;
  successRate: string;
  maxDrawdown: string;
  profitFactor: string;
  icon: React.ReactNode;
  color: string;
  parameters: Record<string, any>;
  whenToUse: string[];
  whenToAvoid: string[];
  tips: string[];
}

const Strategies: React.FC = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyInfo | null>(null);

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      setLoading(true);
      const response = await BotService.getAvailableStrategies();
      setStrategies(response);
    } catch (error) {
      console.error('Error fetching strategies:', error);
      toast.error('Failed to fetch strategies');
    } finally {
      setLoading(false);
    }
  };

  // Strategy information database
  const strategyDatabase: StrategyInfo[] = [
    {
      name: "MA_10_20",
      displayName: "Moving Average Crossover",
      description: "A trend-following strategy that uses two moving averages to identify trend changes and generate buy/sell signals.",
      type: "Trend Following",
      bestFor: [
        "Trending markets",
        "Medium to long-term positions",
        "Breakout trading",
        "Momentum strategies"
      ],
      riskLevel: "Medium",
      timeframe: "4 hours - 1 day",
      successRate: "60-70%",
      maxDrawdown: "20-30%",
      profitFactor: "1.4-1.8",
      icon: <TrendingUp className="h-6 w-6" />,
      color: "bg-blue-500",
      parameters: {
        "fast_period": 10,
        "slow_period": 20,
        "timeframe": "1h"
      },
      whenToUse: [
        "Clear trending markets",
        "Strong momentum periods",
        "Breakout from consolidation",
        "Following established trends"
      ],
      whenToAvoid: [
        "Sideways/choppy markets",
        "Low volatility periods",
        "Market reversals",
        "High-frequency trading"
      ],
      tips: [
        "Use longer timeframes for stronger trends",
        "Combine with volume confirmation",
        "Set appropriate stop losses",
        "Avoid trading against strong trends"
      ]
    },
    {
      name: "RSI_Strategy",
      displayName: "RSI Mean Reversion",
      description: "A mean reversion strategy that identifies oversold and overbought conditions using the Relative Strength Index.",
      type: "Mean Reversion",
      bestFor: [
        "Range-bound markets",
        "Sideways trending assets",
        "Short-term trades",
        "Oversold/overbought conditions"
      ],
      riskLevel: "Medium",
      timeframe: "1-4 hours",
      successRate: "65-75%",
      maxDrawdown: "15-25%",
      profitFactor: "1.3-1.8",
      icon: <Activity className="h-6 w-6" />,
      color: "bg-green-500",
      parameters: {
        "rsi_period": 14,
        "oversold_threshold": 30,
        "overbought_threshold": 70
      },
      whenToUse: [
        "Sideways markets",
        "Oversold conditions (RSI < 30)",
        "Overbought conditions (RSI > 70)",
        "Range-bound assets"
      ],
      whenToAvoid: [
        "Strong trending markets",
        "Breakout periods",
        "Low volatility",
        "News-driven moves"
      ],
      tips: [
        "Wait for RSI to cross back above 30 for buys",
        "Use volume confirmation",
        "Set tight stop losses",
        "Don't fight strong trends"
      ]
    },
    {
      name: "MACD_Strategy",
      displayName: "MACD Momentum",
      description: "A momentum-based strategy that uses MACD crossovers and divergences to identify trend changes and momentum shifts.",
      type: "Trend Following",
      bestFor: [
        "Trending markets",
        "Momentum trading",
        "Medium-term positions",
        "Breakout trading"
      ],
      riskLevel: "Medium-High",
      timeframe: "4 hours - 1 day",
      successRate: "60-70%",
      maxDrawdown: "20-30%",
      profitFactor: "1.4-2.0",
      icon: <BarChart3 className="h-6 w-6" />,
      color: "bg-purple-500",
      parameters: {
        "fast_period": 12,
        "slow_period": 26,
        "signal_period": 9
      },
      whenToUse: [
        "Clear trending markets",
        "MACD line crossovers",
        "Divergence signals",
        "Momentum confirmation"
      ],
      whenToAvoid: [
        "Sideways markets",
        "Low volatility",
        "False breakouts",
        "Choppy price action"
      ],
      tips: [
        "Wait for signal line confirmation",
        "Use histogram for momentum",
        "Look for divergences",
        "Combine with trend analysis"
      ]
    },
    {
      name: "Bollinger_Bands_Strategy",
      displayName: "Bollinger Bands Volatility",
      description: "A volatility-based strategy that uses Bollinger Bands to identify overbought/oversold conditions and breakout opportunities.",
      type: "Volatility-Based",
      bestFor: [
        "Range-bound markets",
        "Breakout trading",
        "Volatility trading",
        "Mean reversion",
        "Swing trading"
      ],
      riskLevel: "Medium",
      timeframe: "1 hour - 1 day",
      successRate: "55-70%",
      maxDrawdown: "18-25%",
      profitFactor: "1.2-1.6",
      icon: <Target className="h-6 w-6" />,
      color: "bg-orange-500",
      parameters: {
        "period": 20,
        "std_dev": 2.0,
        "squeeze_threshold": 0.5
      },
      whenToUse: [
        "Price touching bands",
        "Band squeezes",
        "Breakout from bands",
        "Volatility expansion"
      ],
      whenToAvoid: [
        "Very low volatility",
        "Strong trending markets",
        "News events",
        "Gap openings"
      ],
      tips: [
        "Use volume confirmation",
        "Watch for band squeezes",
        "Set stops outside bands",
        "Position size based on volatility"
      ]
    }
  ];

  const getStrategyInfo = (strategyName: string): StrategyInfo | null => {
    return strategyDatabase.find(s => s.name === strategyName) || null;
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'medium-high': return 'text-orange-600 bg-orange-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'trend following': return 'bg-blue-100 text-blue-800';
      case 'mean reversion': return 'bg-green-100 text-green-800';
      case 'volatility-based': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Trading Strategies</h1>
              <p className="text-gray-600 mt-2">
                Choose from our comprehensive collection of proven trading strategies
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Info className="h-4 w-4" />
              <span>{strategies.length} strategies available</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Strategy Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {strategyDatabase.map((strategy) => (
            <div
              key={strategy.name}
              className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedStrategy(strategy)}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${strategy.color} text-white`}>
                    {strategy.icon}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(strategy.type)}`}>
                    {strategy.type}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {strategy.displayName}
                </h3>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {strategy.description}
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Risk Level:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(strategy.riskLevel)}`}>
                      {strategy.riskLevel}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Timeframe:</span>
                    <span className="text-gray-900">{strategy.timeframe}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Success Rate:</span>
                    <span className="text-green-600 font-medium">{strategy.successRate}</span>
                  </div>
                </div>
                
                <div className="flex items-center text-blue-600 text-sm font-medium">
                  <span>View Details</span>
                  <TrendingUp className="h-4 w-4 ml-1" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Strategy Comparison */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Strategy Comparison</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strategy</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Drawdown</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Best For</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {strategyDatabase.map((strategy) => (
                  <tr key={strategy.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg ${strategy.color} text-white mr-3`}>
                          {strategy.icon}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{strategy.displayName}</div>
                          <div className="text-sm text-gray-500">{strategy.timeframe}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(strategy.type)}`}>
                        {strategy.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(strategy.riskLevel)}`}>
                        {strategy.riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {strategy.successRate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {strategy.maxDrawdown}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {strategy.bestFor[0]}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Strategy Detail Modal */}
      {selectedStrategy && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${selectedStrategy.color} text-white`}>
                    {selectedStrategy.icon}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedStrategy.displayName}</h3>
                    <p className="text-gray-600">{selectedStrategy.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStrategy(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Strategy Overview */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Strategy Overview</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(selectedStrategy.type)}`}>
                          {selectedStrategy.type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Risk Level:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(selectedStrategy.riskLevel)}`}>
                          {selectedStrategy.riskLevel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Timeframe:</span>
                        <span className="text-gray-900">{selectedStrategy.timeframe}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Success Rate:</span>
                        <span className="text-green-600 font-medium">{selectedStrategy.successRate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Max Drawdown:</span>
                        <span className="text-red-600 font-medium">{selectedStrategy.maxDrawdown}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Profit Factor:</span>
                        <span className="text-green-600 font-medium">{selectedStrategy.profitFactor}</span>
                      </div>
                    </div>
                  </div>

                  {/* Best For */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      Best For
                    </h4>
                    <ul className="space-y-2">
                      {selectedStrategy.bestFor.map((item, index) => (
                        <li key={index} className="flex items-start">
                          <div className="h-2 w-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span className="text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* When to Use */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Zap className="h-5 w-5 text-blue-600 mr-2" />
                      When to Use
                    </h4>
                    <ul className="space-y-2">
                      {selectedStrategy.whenToUse.map((item, index) => (
                        <li key={index} className="flex items-start">
                          <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span className="text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* When to Avoid */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                      When to Avoid
                    </h4>
                    <ul className="space-y-2">
                      {selectedStrategy.whenToAvoid.map((item, index) => (
                        <li key={index} className="flex items-start">
                          <div className="h-2 w-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span className="text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Trading Tips */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Target className="h-5 w-5 text-purple-600 mr-2" />
                      Trading Tips
                    </h4>
                    <ul className="space-y-2">
                      {selectedStrategy.tips.map((tip, index) => (
                        <li key={index} className="flex items-start">
                          <div className="h-2 w-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span className="text-gray-700">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Parameters */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Settings className="h-5 w-5 text-gray-600 mr-2" />
                      Default Parameters
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(selectedStrategy.parameters).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-sm font-medium text-gray-600 capitalize">
                              {key.replace('_', ' ')}:
                            </span>
                            <span className="text-sm text-gray-900 ml-2">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedStrategy(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // Navigate to create bot with this strategy
                    window.location.href = `/bots?strategy=${selectedStrategy.name}`;
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Use This Strategy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Strategies;
