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

function App() {
  return (
    <Layout>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/bots" element={<BotList />} />
          <Route path="/bots/:id" element={<BotDetail />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App
