import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function AuthError() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const message = searchParams.get('message') || 'Authentication failed'
    toast.error(message)
    
    // Redirect to login after 3 seconds
    const timer = setTimeout(() => {
      navigate('/login')
    }, 3000)

    return () => clearTimeout(timer)
  }, [searchParams, navigate])

  const message = searchParams.get('message') || 'Authentication failed'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Error</h1>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="space-y-4">
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
          >
            Go Home
          </button>
        </div>
        <p className="text-gray-500 text-sm mt-4">
          Redirecting to login page in 3 seconds...
        </p>
      </div>
    </div>
  )
}
