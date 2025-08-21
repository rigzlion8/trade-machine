import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AuthService } from '../services/api'
import toast from 'react-hot-toast'

export default function GoogleCallback() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        
        if (error) {
          setError('Google authentication failed')
          toast.error('Google authentication failed')
          setTimeout(() => navigate('/login'), 3000)
          return
        }
        
        if (!code) {
          setError('No authorization code received')
          toast.error('No authorization code received')
          setTimeout(() => navigate('/login'), 3000)
          return
        }

        // Exchange code for tokens
        const response = await AuthService.googleAuth(
          code,
          `${window.location.origin}/auth/google/callback`
        )

        const { user, access_token, token_type } = response
        
        // Transform user data to match our User interface
        const userData = {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          profile_picture: user.profile_picture,
          phone_number: user.phone_number,
          country: 'Kenya', // Default for now
          currency: 'KES', // Default for now
          wallet_balance_kes: user.wallet_balance_kes || 0,
          wallet_balance_usdt: user.wallet_balance_usdt || 0,
          wallet_status: user.status || 'active',
          is_verified: user.is_email_verified || false
        }
        
        const tokens = {
          access_token,
          token_type,
          refresh_token: response.refresh_token
        }
        
        login(userData, tokens)
        toast.success('Google login successful!')
        navigate('/dashboard')
        
      } catch (error: any) {
        console.error('Google callback failed:', error)
        // Ensure we always set a string to error state
        let errorMessage = 'Google authentication failed'
        if (error.response?.data?.detail) {
          errorMessage = typeof error.response.data.detail === 'string' 
            ? error.response.data.detail 
            : 'Google authentication failed'
        } else if (error.message) {
          errorMessage = typeof error.message === 'string' 
            ? error.message 
            : 'Google authentication failed'
        }
        setError(errorMessage)
        toast.error(errorMessage)
        setTimeout(() => navigate('/login'), 3000)
      } finally {
        setIsLoading(false)
      }
    }

    handleGoogleCallback()
  }, [searchParams, navigate, login])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Completing Google Sign In...</h2>
          <p className="text-gray-600 mt-2">Please wait while we complete your authentication.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900">Authentication Failed</h2>
          <p className="text-gray-600 mt-2">{typeof error === 'string' ? error : 'Authentication failed'}</p>
          <p className="text-gray-500 mt-4">Redirecting to login page...</p>
        </div>
      </div>
    )
  }

  return null
}
