import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { AuthService } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [isVerifying, setIsVerifying] = useState(true)
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token')
      
      if (!token) {
        setVerificationStatus('error')
        setErrorMessage('No verification token provided')
        setIsVerifying(false)
        return
      }

      try {
        const response = await AuthService.verifyEmail(token)
        setVerificationStatus('success')
        toast.success('Email verified successfully!')
        
        // Auto-login user if tokens are provided
        if (response.access_token && response.user) {
          // Transform user data to match our User interface
          const userData = {
            id: response.user.id,
            email: response.user.email,
            full_name: response.user.full_name,
            profile_picture: response.user.profile_picture,
            phone_number: response.user.phone_number,
            country: 'Kenya', // Default for now
            currency: 'KES', // Default for now
            wallet_balance_kes: response.user.wallet_balance_kes || 0,
            wallet_balance_usdt: response.user.wallet_balance_usdt || 0,
            wallet_status: response.user.status || 'active',
            is_verified: response.user.is_email_verified || false
          }
          
          // Store tokens and user data
          localStorage.setItem('access_token', response.access_token)
          localStorage.setItem('refresh_token', response.refresh_token)
          localStorage.setItem('user', JSON.stringify(userData))
          
          // Update auth context
          login(userData)
          
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate('/dashboard')
          }, 2000)
        } else {
          // Fallback to login page if no tokens
          setTimeout(() => {
            navigate('/login')
          }, 3000)
        }
        
      } catch (error: any) {
        console.error('Email verification failed:', error)
        setVerificationStatus('error')
        
        if (error.response?.data?.detail) {
          setErrorMessage(error.response.data.detail)
        } else {
          setErrorMessage('Email verification failed. Please try again.')
        }
        
        toast.error('Email verification failed')
      } finally {
        setIsVerifying(false)
      }
    }

    verifyEmail()
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <img src="/logo-tm-transparent.svg" alt="TM" className="h-8 w-8 mr-2" />
            <h1 className="text-3xl font-bold text-primary-600">Trade Machine</h1>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {verificationStatus === 'verifying' && (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying your email...</h2>
                <p className="text-gray-600">Please wait while we verify your email address.</p>
              </>
            )}

            {verificationStatus === 'success' && (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
                <p className="text-gray-600 mb-4">
                  Your email has been successfully verified. You're now logged in and ready to start trading!
                </p>
                <p className="text-sm text-gray-500">
                  Redirecting to your dashboard in a few seconds...
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </>
            )}

            {verificationStatus === 'error' && (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
                <p className="text-gray-600 mb-4">
                  {errorMessage || 'There was an error verifying your email address.'}
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => navigate('/signup')}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Back to Signup
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
