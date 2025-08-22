import React, { ReactNode, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  HomeIcon, 
  ChartBarIcon, 
  CogIcon, 
  WalletIcon,
  UserIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const navigation = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon },
    { name: 'My Bots', href: '/bots', icon: CogIcon },
    { name: 'Strategies', href: '/strategies', icon: ChartBarIcon },
    { name: 'Wallet', href: '/wallet', icon: WalletIcon },
  ]

  const isActive = (path: string) => location.pathname === path

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-xl font-bold text-primary-600">Trade Machine</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive(item.href)
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
          {user && (
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {user.profile_picture ? (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={user.profile_picture}
                      alt={user.full_name}
                    />
                  ) : (
                    <UserIcon className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user.full_name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="mt-3 w-full text-left text-sm text-gray-600 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4">
            <h1 className="text-xl font-bold text-primary-600">Trade Machine</h1>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive(item.href)
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
          {user && (
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {user.profile_picture ? (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={user.profile_picture}
                      alt={user.full_name}
                    />
                  ) : (
                    <UserIcon className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user.full_name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="mt-3 w-full text-left text-sm text-gray-600 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* Wallet balance display */}
          {user && (
            <div className="flex items-center gap-x-4 ml-auto">
              <div className="hidden sm:flex sm:items-center sm:gap-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    KES {user.wallet_balance_kes?.toLocaleString() || '0'}
                  </p>
                  <p className="text-xs text-gray-500">Wallet Balance</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    USDT {user.wallet_balance_usdt?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-xs text-gray-500">Crypto Balance</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
