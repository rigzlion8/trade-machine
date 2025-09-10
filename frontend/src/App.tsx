import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'
import ConnectionPoolMonitor from './components/ConnectionPoolMonitor'

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const BotList = lazy(() => import('./pages/BotList'))
const BotDetail = lazy(() => import('./pages/BotDetail'))
const Strategies = lazy(() => import('./pages/Strategies'))
const Wallet = lazy(() => import('./pages/Wallet'))
const Crypto = lazy(() => import('./pages/Crypto'))
const GoogleCallback = lazy(() => import('./pages/GoogleCallback'))
const AuthError = lazy(() => import('./pages/AuthError'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))

function App() {
  const isDevelopment = import.meta.env.DEV

  return (
    <Layout>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/bots" element={<BotList />} />
          <Route path="/bots/:botId" element={<BotDetail />} />
          <Route path="/strategies" element={<Strategies />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/crypto" element={<Crypto />} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
          <Route path="/auth/error" element={<AuthError />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Routes>
      </Suspense>
      
      {/* Show connection pool monitor in development */}
      {isDevelopment && <ConnectionPoolMonitor show={true} />}
    </Layout>
  )
}

export default App
