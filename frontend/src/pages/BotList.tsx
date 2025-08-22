import React, { useState, useEffect } from 'react';
import { PlusIcon, PlayIcon, StopIcon, TrashIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { BotService } from '../services/api';

interface Bot {
  id: string;
  name: string;
  strategy: string;
  symbol: string;
  balance: number;
  risk_per_trade: number;
  status: string;
  started_at: string;
  total_trades: number;
  total_pnl: number;
  last_signal?: any;
}

interface Strategy {
  name: string;
  symbol: string;
  timeframe: string;
  parameters: Record<string, any>;
  performance: Record<string, any>;
}

const BotList: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBot, setNewBot] = useState({
    name: '',
    strategy: '',
    symbol: 'BTCUSDT',
    balance: 1000,
    risk_per_trade: 0.02
  });

  useEffect(() => {
    fetchBots();
    fetchStrategies();
  }, []);

  const fetchBots = async () => {
    try {
      const response = await BotService.getUserBots();
      setBots(response);
    } catch (error) {
      console.error('Error fetching bots:', error);
      toast.error('Failed to fetch bots');
    } finally {
      setLoading(false);
    }
  };

  const fetchStrategies = async () => {
    try {
      const response = await BotService.getAvailableStrategies();
      setStrategies(response);
    } catch (error) {
      console.error('Error fetching strategies:', error);
    }
  };

  const handleCreateBot = async () => {
    try {
      await BotService.createBot(newBot);
      toast.success('Bot created successfully!');
      setShowCreateModal(false);
      setNewBot({ name: '', strategy: '', symbol: 'BTCUSDT', balance: 1000, risk_per_trade: 0.02 });
      fetchBots();
    } catch (error) {
      console.error('Error creating bot:', error);
      toast.error('Failed to create bot');
    }
  };

  const handleStartBot = async (botId: string) => {
    try {
      await BotService.startBot(botId);
      toast.success('Bot started successfully!');
      fetchBots();
    } catch (error) {
      console.error('Error starting bot:', error);
      toast.error('Failed to start bot');
    }
  };

  const handleStopBot = async (botId: string) => {
    try {
      await BotService.stopBot(botId);
      toast.success('Bot stopped successfully!');
      fetchBots();
    } catch (error) {
      console.error('Error stopping bot:', error);
      toast.error('Failed to stop bot');
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (window.confirm('Are you sure you want to delete this bot?')) {
      try {
        await BotService.deleteBot(botId);
        toast.success('Bot deleted successfully!');
        fetchBots();
      } catch (error) {
        console.error('Error deleting bot:', error);
        toast.error('Failed to delete bot');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trading Bots</h1>
          <p className="text-gray-600 mt-2">Manage your automated trading strategies</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Create Bot
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-primary" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bots</p>
              <p className="text-2xl font-bold text-gray-900">{bots.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <PlayIcon className="h-8 w-8 text-success" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Bots</p>
              <p className="text-2xl font-bold text-gray-900">
                {bots.filter(bot => bot.status === 'running').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold">$</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(bots.reduce((sum, bot) => sum + bot.balance, 0))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 font-bold">P&L</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total P&L</p>
              <p className={`text-2xl font-bold ${bots.reduce((sum, bot) => sum + bot.total_pnl, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(bots.reduce((sum, bot) => sum + bot.total_pnl, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bots List */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Your Bots</h3>
        </div>
        
        {bots.length === 0 ? (
          <div className="text-center py-12">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No bots yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first trading bot.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 btn-primary"
            >
              Create Bot
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bot
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Strategy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bots.map((bot) => (
                  <tr key={bot.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{bot.name}</div>
                        <div className="text-sm text-gray-500">Started {formatDate(bot.started_at)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{bot.strategy}</div>
                      <div className="text-sm text-gray-500">{bot.total_trades} trades</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {bot.symbol}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(bot.balance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        bot.status === 'running' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {bot.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        bot.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(bot.total_pnl)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {bot.status === 'running' ? (
                          <button
                            onClick={() => handleStopBot(bot.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Stop Bot"
                          >
                            <StopIcon className="h-5 w-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartBot(bot.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Start Bot"
                          >
                            <PlayIcon className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteBot(bot.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Bot"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Bot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Trading Bot</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bot Name</label>
                  <input
                    type="text"
                    value={newBot.name}
                    onChange={(e) => setNewBot({ ...newBot, name: e.target.value })}
                    className="input-field mt-1"
                    placeholder="My Trading Bot"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Strategy</label>
                  <select
                    value={newBot.strategy}
                    onChange={(e) => setNewBot({ ...newBot, strategy: e.target.value })}
                    className="input-field mt-1"
                  >
                    <option value="">Select Strategy</option>
                    {strategies.map((strategy) => (
                      <option key={strategy.name} value={strategy.name}>
                        {strategy.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Symbol</label>
                  <input
                    type="text"
                    value={newBot.symbol}
                    onChange={(e) => setNewBot({ ...newBot, symbol: e.target.value.toUpperCase() })}
                    className="input-field mt-1"
                    placeholder="BTCUSDT"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Initial Balance (USD)</label>
                  <input
                    type="number"
                    value={newBot.balance}
                    onChange={(e) => setNewBot({ ...newBot, balance: parseFloat(e.target.value) })}
                    className="input-field mt-1"
                    min="100"
                    step="100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Risk Per Trade (%)</label>
                  <input
                    type="number"
                    value={newBot.risk_per_trade * 100}
                    onChange={(e) => setNewBot({ ...newBot, risk_per_trade: parseFloat(e.target.value) / 100 })}
                    className="input-field mt-1"
                    min="1"
                    max="10"
                    step="0.1"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBot}
                  disabled={!newBot.name || !newBot.strategy}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Bot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotList;
