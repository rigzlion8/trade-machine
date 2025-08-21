import React from 'react'

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      <span className="ml-3 text-lg text-gray-600">Loading...</span>
    </div>
  )
}
