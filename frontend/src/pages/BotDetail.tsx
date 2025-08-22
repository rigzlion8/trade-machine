import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, 
  Play, 
  Square, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Filter,
  BarChart3,
  Activity,
  DollarSign,
  Clock
} from 'lucide-react';
import { BotService } from '../services/api';
import { BotResponse } from '../types/trading';

import { ActivityData } from '../types/trading';

const BotDetail: React.FC = () => {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const [bot, setBot] = useState<BotResponse | null>(null);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  
  // Activity filter states
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activityType, setActivityType] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('7d');

  useEffect(() => {
    if (botId) {
      fetchBotDetail();
      fetchBotActivity();
    }
  }, [botId]);

  useEffect(() => {
    if (selectedPeriod) {
      setDateRangeFromPeriod(selectedPeriod);
    }
  }, [selectedPeriod]);

  const setDateRangeFromPeriod = (period: string) => {
    const now = new Date();
    let start = new Date();
    
    switch (period) {
      case '1d':
        start.setDate(now.getDate() - 1);
        break;
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        start.setDate(now.getDate() - 7);
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  };

  const fetchBotDetail = async () => {
    try {
      setLoading(true);
      const botDetail = await BotService.getBotDetail(botId!);
      setBot(botDetail);
    } catch (error) {
      toast.error('Failed to fetch bot details');
      console.error('Error fetching bot detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBotActivity = async () => {
    if (!botId) return;
    
    try {
      setActivityLoading(true);
      const activity = await BotService.getBotActivity(botId, startDate, endDate, activityType);
      setActivityData(activity);
    } catch (error) {
      toast.error('Failed to fetch bot activity');
      console.error('Error fetching bot activity:', error);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleActivityFilter = () => {
    fetchBotActivity();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Bot Not Found</h2>
            <button
              onClick={() => navigate('/bots')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Back to Bots
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/bots')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{bot.name}</h1>
                <p className="text-gray-600">{bot.symbol} • {bot.strategy}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                bot.status === 'running' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {bot.status === 'running' ? 'Active' : 'Stopped'}
              </span>
              
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                <Play size={16} />
                <span>Start Bot</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Bot Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Balance</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(bot.balance)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total PnL</p>
                <p className={`text-2xl font-bold ${bot.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(bot.total_pnl)}
                </p>
              </div>
              {bot.total_pnl >= 0 ? (
                <TrendingUp className="h-8 w-8 text-green-600" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-600" />
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Trades</p>
                <p className="text-2xl font-bold text-gray-900">{bot.total_trades}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Risk per Trade</p>
                <p className="text-2xl font-bold text-gray-900">{formatPercentage(bot.risk_per_trade)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Activity Filter Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Activity Analysis</h2>
            <Filter className="h-5 w-5 text-gray-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Quick Period Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quick Select</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="1d">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Activity Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type</label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Activities</option>
                <option value="trades">Trades Only</option>
                <option value="signals">Signals Only</option>
                <option value="performance">Performance Only</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleActivityFilter}
              disabled={activityLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {activityLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <Filter size={16} />
                  <span>Apply Filters</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Activity Results */}
        {activityData && (
          <div className="space-y-6">
            {/* Performance Summary */}
            {activityData.performance && (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{activityData.performance.total_trades}</p>
                    <p className="text-sm text-gray-600">Total Trades</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{activityData.performance.winning_trades}</p>
                    <p className="text-sm text-gray-600">Winning Trades</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{formatPercentage(activityData.performance.win_rate)}</p>
                    <p className="text-sm text-gray-600">Win Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(activityData.performance.avg_trade_pnl)}</p>
                    <p className="text-sm text-gray-600">Avg Trade PnL</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Trades */}
            {activityData.trades && activityData.trades.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Trades</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PnL</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {activityData.trades.map((trade) => (
                        <tr key={trade.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(trade.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              trade.type === 'buy' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {trade.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {trade.amount.toFixed(6)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(trade.price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(trade.pnl)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Trading Signals */}
            {activityData.signals && activityData.signals.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Trading Signals</h3>
                <div className="space-y-3">
                  {activityData.signals.map((signal) => (
                    <div key={signal.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          signal.type === 'buy' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {signal.type.toUpperCase()}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{signal.reason}</p>
                          <p className="text-xs text-gray-500">{formatDate(signal.timestamp)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">Strength: {signal.strength.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            {activityData.metadata && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  Showing {activityData.metadata.activity_type} activity from{' '}
                  {formatDate(activityData.metadata.start_date)} to{' '}
                  {formatDate(activityData.metadata.end_date)} •{' '}
                  {activityData.metadata.total_records} records found
                </p>
              </div>
            )}
          </div>
        )}

        {/* No Activity Data */}
        {!activityData && !activityLoading && (
          <div className="bg-white p-12 rounded-lg shadow-sm border text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Data</h3>
            <p className="text-gray-600 mb-4">
              Select a date range and activity type to view bot performance data.
            </p>
            <button
              onClick={handleActivityFilter}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Load Default Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BotDetail;
