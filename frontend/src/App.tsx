import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const BotList = lazy(() => import('./pages/BotList'))
const BotDetail = lazy(() => import('./pages/BotDetail'))
const Strategies = lazy(() => import('./pages/Strategies'))
const Wallet = lazy(() => import('./pages/Wallet'))
const GoogleCallback = lazy(() => import('./pages/GoogleCallback'))

function App() {
  return (
    <Layout>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/bots" element={<BotList />} />
          <Route path="/bots/:botId" element={<BotDetail />} />
          <Route path="/strategies" element={<Strategies />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App
