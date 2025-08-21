import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { 
  ChartBarIcon, 
  CogIcon, 
  WalletIcon,
  ArrowRightIcon,
  CurrencyDollarIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
          Trade Machine
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-3xl mx-auto">
          The smart crypto trading platform designed for the Kenyan market. 
          Trade with AI-powered bots and manage your money with our integrated mobile wallet.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          {user ? (
            <Link
              to="/dashboard"
              className="btn-primary inline-flex items-center"
            >
              Go to Dashboard
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
          ) : (
            <Link
              to="/login"
              className="btn-primary inline-flex items-center"
            >
              Get Started
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
          )}
          <Link
            to="/about"
            className="btn-secondary inline-flex items-center"
          >
            Learn More
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
        {/* Trading Bots */}
        <div className="card text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
            <CogIcon className="h-6 w-6 text-primary-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">AI Trading Bots</h3>
          <p className="mt-2 text-sm text-gray-600">
            Automated trading strategies that learn and adapt to market conditions.
          </p>
        </div>

        {/* Mobile Wallet */}
        <div className="card text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-success-100">
            <WalletIcon className="h-6 w-6 text-success-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Mobile Wallet</h3>
          <p className="mt-2 text-sm text-gray-600">
            Send money to friends, transfer to banks, and manage your KES & USDT.
          </p>
        </div>

        {/* Real-time Analytics */}
        <div className="card text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-warning-100">
            <ChartBarIcon className="h-6 w-6 text-warning-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Real-time Analytics</h3>
          <p className="mt-2 text-sm text-gray-600">
            Live performance tracking and market insights for informed decisions.
          </p>
        </div>

        {/* Kenyan Market Focus */}
        <div className="card text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-kenya-green bg-opacity-20">
            <GlobeAltIcon className="h-6 w-6 text-kenya-green" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Kenyan Market</h3>
          <p className="mt-2 text-sm text-gray-600">
            Built for Kenya with M-Pesa integration and local currency support.
          </p>
        </div>

        {/* Secure Payments */}
        <div className="card text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-purple-100">
            <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Secure Payments</h3>
          <p className="mt-2 text-sm text-gray-600">
            Powered by Paystack with bank-grade security and fraud protection.
          </p>
        </div>

        {/* Mobile First */}
        <div className="card text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Mobile First</h3>
          <p className="mt-2 text-sm text-gray-600">
            Optimized for mobile trading with touch-friendly interface.
          </p>
        </div>
      </div>

      {/* CTA Section */}
      {!user && (
        <div className="bg-primary-50 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-primary-900">
            Ready to start trading?
          </h2>
          <p className="mt-4 text-primary-700">
            Join thousands of traders using AI-powered bots and our secure mobile wallet.
          </p>
          <Link
            to="/login"
            className="mt-6 btn-primary inline-flex items-center"
          >
            Create Free Account
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </Link>
        </div>
      )}
    </div>
  )
}
