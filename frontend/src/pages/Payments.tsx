import React, { useState, useEffect } from 'react'
import { 
  ArrowDownTrayIcon, 
  ArrowUpTrayIcon, 
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  BanknotesIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import PaymentService, { Payment, PaymentStats, BankAccount, Bank, PaymentFilters, ExchangeRates, MobileMoneyProvider } from '../services/paymentService'
import CurrencyConverter from '../components/CurrencyConverter'
import toast from 'react-hot-toast'

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null)
  const [mobileMoneyProviders, setMobileMoneyProviders] = useState<MobileMoneyProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false)
  const [showAddBankModal, setShowAddBankModal] = useState(false)
  const [showCurrencyConverter, setShowCurrencyConverter] = useState(false)
  const [filters, setFilters] = useState<PaymentFilters>({})
  
  // Form states
  const [depositAmount, setDepositAmount] = useState('')
  const [depositMethod, setDepositMethod] = useState('card')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [selectedBankAccount, setSelectedBankAccount] = useState('')
  const [newBankAccount, setNewBankAccount] = useState({
    account_number: '',
    bank_code: '',
    account_name: ''
  })
  const [bankSearchTerm, setBankSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [paymentsData, statsData, bankAccountsData, banksData, exchangeRatesData, mobileMoneyData] = await Promise.all([
        PaymentService.getPaymentHistory({ limit: 50 }),
        PaymentService.getPaymentStats(),
        PaymentService.getBankAccounts(),
        PaymentService.getSupportedBanks(),
        PaymentService.getExchangeRates(),
        PaymentService.getMobileMoneyProviders()
      ])
      
      setPayments(paymentsData)
      setStats(statsData)
      setBankAccounts(bankAccountsData)
      setBanks(banksData.banks)
      setExchangeRates(exchangeRatesData)
      setMobileMoneyProviders(mobileMoneyData.providers)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load payment data')
    } finally {
      setLoading(false)
    }
  }

  const handleDeposit = async () => {
    try {
      const amount = parseFloat(depositAmount)
      if (amount < 100) {
        toast.error('Minimum deposit amount is KES 100')
        return
      }

      // Validate mobile money requirements
      if (depositMethod === 'mpesa' || depositMethod === 'airtel_money') {
        if (!phoneNumber) {
          toast.error('Phone number is required for mobile money payments')
          return
        }
      }

      const result = await PaymentService.initializeDeposit(amount, depositMethod, phoneNumber)
      
      if (result.authorization_url) {
        // Redirect to Paystack payment page
        window.open(result.authorization_url, '_blank')
        toast.success('Redirecting to payment page...')
        setShowDepositModal(false)
        setDepositAmount('')
        setPhoneNumber('')
        setDepositMethod('card')
      }
    } catch (error: any) {
      console.error('Deposit error:', error)
      
      // Better error handling
      let errorMessage = 'Failed to initialize deposit'
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
    }
  }

  const handleWithdrawal = async () => {
    try {
      const amount = parseFloat(withdrawalAmount)
      if (amount < 500) {
        toast.error('Minimum withdrawal amount is KES 500')
        return
      }

      if (!selectedBankAccount) {
        toast.error('Please select a bank account')
        return
      }

      const result = await PaymentService.initializeWithdrawal(amount, selectedBankAccount)
      toast.success('Withdrawal initiated successfully!')
      setShowWithdrawalModal(false)
      setWithdrawalAmount('')
      setSelectedBankAccount('')
      loadData()
    } catch (error: any) {
      console.error('Withdrawal error:', error)
      toast.error(error.response?.data?.detail || 'Failed to initialize withdrawal')
    }
  }

  const handleAddBankAccount = async () => {
    try {
      if (!newBankAccount.account_number || !newBankAccount.bank_code) {
        toast.error('Please fill in all required fields')
        return
      }

      // Resolve account name first
      const resolveResult = await PaymentService.resolveAccountNumber(
        newBankAccount.account_number,
        newBankAccount.bank_code
      )

      const bankAccount = {
        account_number: newBankAccount.account_number,
        bank_code: newBankAccount.bank_code,
        account_name: resolveResult.account_name
      }

      await PaymentService.addBankAccount(bankAccount)
      toast.success('Bank account added successfully!')
      setShowAddBankModal(false)
      setNewBankAccount({ account_number: '', bank_code: '', account_name: '' })
      setBankSearchTerm('')
      loadData()
    } catch (error: any) {
      console.error('Add bank account error:', error)
      toast.error(error.response?.data?.detail || 'Failed to add bank account')
    }
  }

  const handleDeleteBankAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return

    try {
      await PaymentService.deleteBankAccount(accountId)
      toast.success('Bank account deleted successfully!')
      loadData()
    } catch (error: any) {
      console.error('Delete bank account error:', error)
      toast.error('Failed to delete bank account')
    }
  }

  const applyFilters = async () => {
    try {
      setLoading(true)
      const filteredPayments = await PaymentService.getPaymentHistory(filters)
      setPayments(filteredPayments)
      setShowFilters(false)
    } catch (error) {
      console.error('Filter error:', error)
      toast.error('Failed to apply filters')
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setFilters({})
    loadData()
  }

  const refreshExchangeRates = async () => {
    try {
      const rates = await PaymentService.getExchangeRates()
      setExchangeRates(rates)
      toast.success('Exchange rates updated!')
    } catch (error) {
      console.error('Error refreshing rates:', error)
      toast.error('Failed to refresh exchange rates')
    }
  }

  const filteredBanks = banks.filter(bank => 
    bank.name.toLowerCase().includes(bankSearchTerm.toLowerCase()) ||
    bank.code.toLowerCase().includes(bankSearchTerm.toLowerCase())
  )

  if (loading && payments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your deposits, withdrawals, and payment history
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-wrap gap-3">
          <button
            onClick={() => setShowCurrencyConverter(!showCurrencyConverter)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ChartBarIcon className="h-4 w-4 mr-2" />
            Converter
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
          <button
            onClick={() => setShowDepositModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Deposit
          </button>
          <button
            onClick={() => setShowWithdrawalModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
            Withdraw
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BanknotesIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Deposits
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {PaymentService.formatAmount(stats.total_deposits)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ArrowUpTrayIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Withdrawals
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {PaymentService.formatAmount(stats.total_withdrawals)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Completed
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.completed_transactions}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Monthly Total
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {PaymentService.formatAmount(stats.monthly_deposits + stats.monthly_withdrawals)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exchange Rates */}
      {exchangeRates && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Exchange Rates</h3>
            <p className="text-sm text-gray-500">
              Last updated: {new Date(exchangeRates.last_updated).toLocaleString()}
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(exchangeRates.rates).map(([currency, rate]) => (
                <div key={currency} className="text-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                  <div className="text-sm font-medium text-gray-900">{currency}</div>
                  <div className="text-lg font-bold text-primary-600">
                    {rate.toFixed(4)}
                  </div>
                  <div className="text-xs text-gray-500">per KES</div>
                </div>
              ))}
            </div>
            
            {/* Quick Converter Widget */}
            <div className="mt-6 p-4 bg-primary-50 rounded-lg">
              <h4 className="text-sm font-medium text-primary-900 mb-3">Quick Convert</h4>
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="1000"
                    className="w-full px-3 py-2 border border-primary-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value)
                      if (amount && exchangeRates) {
                        const usdAmount = (amount * exchangeRates.rates.USD).toFixed(2)
                        const eurAmount = (amount * exchangeRates.rates.EUR).toFixed(2)
                        const gbpAmount = (amount * exchangeRates.rates.GBP).toFixed(2)
                        
                        // Update the display
                        const resultElement = document.getElementById('quick-convert-result')
                        if (resultElement) {
                          resultElement.innerHTML = `
                            <div class="text-xs text-primary-700">
                              ${amount.toLocaleString()} KES = 
                              <span class="font-semibold">$${usdAmount}</span> USD, 
                              <span class="font-semibold">€${eurAmount}</span> EUR, 
                              <span class="font-semibold">£${gbpAmount}</span> GBP
                            </div>
                          `
                        }
                      } else {
                        const resultElement = document.getElementById('quick-convert-result')
                        if (resultElement) {
                          resultElement.innerHTML = ''
                        }
                      }
                    }}
                  />
                </div>
                <div className="text-sm text-primary-600 font-medium">KES</div>
              </div>
              <div id="quick-convert-result" className="mt-2"></div>
            </div>
          </div>
        </div>
      )}

      {/* Currency Converter */}
      {showCurrencyConverter && (
        <CurrencyConverter 
          exchangeRates={exchangeRates} 
          onRefreshRates={refreshExchangeRates}
        />
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Payments</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Type</label>
              <select
                value={filters.payment_type || ''}
                onChange={(e) => setFilters({ ...filters, payment_type: e.target.value || undefined })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Types</option>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="transfer">Transfer</option>
                <option value="fee">Fee</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount Range</label>
              <div className="mt-1 flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.min_amount || ''}
                  onChange={(e) => setFilters({ ...filters, min_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.max_amount || ''}
                  onChange={(e) => setFilters({ ...filters, max_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <button
              onClick={clearFilters}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Bank Accounts */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Bank Accounts</h3>
            <button
              onClick={() => setShowAddBankModal(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Account
            </button>
          </div>
        </div>
        <div className="p-6">
          {bankAccounts.length === 0 ? (
            <div className="text-center py-6">
              <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No bank accounts</h3>
              <p className="mt-1 text-sm text-gray-500">
                Add a bank account to enable withdrawals
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bankAccounts.map((account) => (
                <div key={account.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{account.account_name}</h4>
                      <p className="text-sm text-gray-500">{account.bank_name}</p>
                      <p className="text-sm text-gray-500">****{account.account_number.slice(-4)}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteBankAccount(account.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-2xl mr-3">
                        {PaymentService.getPaymentTypeIcon(payment.payment_type)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 capitalize">
                          {payment.payment_type}
                        </div>
                        <div className="text-sm text-gray-500">
                          {PaymentService.getPaymentMethodIcon(payment.payment_method)} {payment.payment_method.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {PaymentService.formatAmount(payment.amount)}
                    </div>
                    {payment.fees > 0 && (
                      <div className="text-sm text-gray-500">
                        Fee: {PaymentService.formatAmount(payment.fees)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${PaymentService.getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {PaymentService.formatDate(payment.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {payment.reference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Deposit Funds</h3>
              
              {/* Payment Method Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <label className="flex items-center p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={depositMethod === 'card'}
                      onChange={(e) => setDepositMethod(e.target.value)}
                      className="mr-3"
                    />
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">💳</span>
                      <span className="text-sm font-medium">Card Payment</span>
                    </div>
                  </label>
                  
                  {mobileMoneyProviders.map((provider) => (
                    <label key={provider.code} className="flex items-center p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={provider.code}
                        checked={depositMethod === provider.code}
                        onChange={(e) => setDepositMethod(e.target.value)}
                        className="mr-3"
                      />
                      <div className="flex items-center">
                        <span className="text-2xl mr-2">📱</span>
                        <span className="text-sm font-medium">{provider.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Phone Number for Mobile Money */}
              {(depositMethod === 'mpesa' || depositMethod === 'airtel_money') && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., 0712345678"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter your {depositMethod === 'mpesa' ? 'M-Pesa' : 'Airtel Money'} phone number</p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (KES)
                </label>
                <input
                  type="number"
                  min="100"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter amount"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum: KES 100</p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeposit}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  Proceed to Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Withdraw Funds</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (KES)
                </label>
                <input
                  type="number"
                  min="500"
                  step="0.01"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter amount"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum: KES 500</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Account
                </label>
                <select
                  value={selectedBankAccount}
                  onChange={(e) => setSelectedBankAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select bank account</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} - {account.bank_name} (****{account.account_number.slice(-4)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowWithdrawalModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdrawal}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Withdraw
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Bank Account Modal */}
      {showAddBankModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Bank Account</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search for a Kenyan bank..."
                    value={bankSearchTerm}
                    onChange={(e) => setBankSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
                  />
                  <div className="absolute right-3 top-2 text-gray-400">
                    🔍
                  </div>
                </div>
                <select
                  value={newBankAccount.bank_code}
                  onChange={(e) => setNewBankAccount({ ...newBankAccount, bank_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  size={Math.min(filteredBanks.length + 1, 8)}
                >
                  <option value="">Select bank</option>
                  {filteredBanks.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name} ({bank.code})
                    </option>
                  ))}
                </select>
                {filteredBanks.length === 0 && bankSearchTerm && (
                  <p className="text-sm text-gray-500 mt-1">No banks found matching "{bankSearchTerm}"</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  🇰🇪 Showing {filteredBanks.length} Kenyan banks
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={newBankAccount.account_number}
                  onChange={(e) => setNewBankAccount({ ...newBankAccount, account_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter 10-15 digit account number"
                  maxLength={15}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Kenyan account numbers are typically 10-15 digits
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddBankModal(false)
                    setBankSearchTerm('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddBankAccount}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  Add Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
