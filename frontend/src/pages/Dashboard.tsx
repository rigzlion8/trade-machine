import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { 
  ChartBarIcon, 
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  WalletIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please log in to view your dashboard.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.full_name}! 👋
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening with your trading bots and wallet today.
        </p>
      </div>

      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KES Balance */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <WalletIcon className="h-8 w-8 text-kenya-green" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">KES Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                KES {user.wallet_balance_kes?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUpIcon className="h-4 w-4 text-success-500 mr-1" />
            <span className="text-success-600">+2.5%</span>
            <span className="text-gray-500 ml-1">from yesterday</span>
          </div>
        </div>

        {/* USDT Balance */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">USDT Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                {user.wallet_balance_usdt?.toFixed(2) || '0.00'} USDT
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowDownIcon className="h-4 w-4 text-danger-500 mr-1" />
            <span className="text-danger-600">-1.2%</span>
            <span className="text-gray-500 ml-1">from yesterday</span>
          </div>
        </div>

        {/* Active Bots */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Bots</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUpIcon className="h-4 w-4 text-success-500 mr-1" />
            <span className="text-success-600">+1</span>
            <span className="text-gray-500 ml-1">new this week</span>
          </div>
        </div>

        {/* Total Profit */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Profit</p>
              <p className="text-2xl font-bold text-gray-900">KES 15,420</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUpIcon className="h-4 w-4 text-success-500 mr-1" />
            <span className="text-success-600">+8.3%</span>
            <span className="text-gray-500 ml-1">this month</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <WalletIcon className="h-5 w-5 mr-2" />
            Send Money
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Create Bot
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <CurrencyDollarIcon className="h-5 w-5 mr-2" />
            Add Funds
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            View Reports
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-success-500 rounded-full mr-3"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Bot BTC-001 executed trade</p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
            </div>
            <span className="text-sm font-medium text-success-600">+KES 2,450</span>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-primary-500 rounded-full mr-3"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Received from +254700123456</p>
                <p className="text-xs text-gray-500">1 hour ago</p>
              </div>
            </div>
            <span className="text-sm font-medium text-primary-600">+KES 5,000</span>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-warning-500 rounded-full mr-3"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Bot ETH-002 stopped</p>
                <p className="text-xs text-gray-500">3 hours ago</p>
              </div>
            </div>
            <span className="text-sm font-medium text-warning-600">Stopped</span>
          </div>
        </div>
      </div>
    </div>
  )
}
