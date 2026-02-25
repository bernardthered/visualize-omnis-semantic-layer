import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import PlaceholderPage from './pages/PlaceholderPage'
import SettingsPage from './pages/SettingsPage'
import TreeMapPage from './pages/TreeMapPage'
import CollapsibleTreePage from './pages/CollapsibleTreePage'

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('darkMode')
    return stored !== null ? stored === 'true' : true
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [brandName, setBrandName] = useState(() =>
    localStorage.getItem('brandName') || 'Omni'
  )
  const [logoUrl, setLogoUrl] = useState(() =>
    localStorage.getItem('logoUrl') || ''
  )
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    localStorage.getItem('isAuthenticated') === 'true'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  useEffect(() => {
    localStorage.setItem('brandName', brandName)
  }, [brandName])

  useEffect(() => {
    localStorage.setItem('logoUrl', logoUrl)
  }, [logoUrl])

  function login(username, password) {
    const storedUser = localStorage.getItem('authUsername') || 'admin'
    const storedPass = localStorage.getItem('authPassword') || 'password'
    if (username === storedUser && password === storedPass) {
      localStorage.setItem('isAuthenticated', 'true')
      setIsAuthenticated(true)
      return true
    }
    return false
  }

  function logout() {
    localStorage.removeItem('isAuthenticated')
    setIsAuthenticated(false)
  }

  // ── Show login page until authenticated ──
  if (!isAuthenticated) {
    return <LoginPage onLogin={login} brandName={brandName} logoUrl={logoUrl} />
  }

  return (
    <BrowserRouter>
      <Layout
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        brandName={brandName}
        logoUrl={logoUrl}
        logout={logout}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={
            <PlaceholderPage title="Dashboard" icon="dashboard"
              description="Overview of your key metrics and recent activity." />
          } />
          <Route path="/analytics" element={
            <PlaceholderPage title="Analytics" icon="analytics"
              description="Explore usage trends, query performance, and data insights." />
          } />
          <Route path="/reports" element={
            <PlaceholderPage title="Reports" icon="reports"
              description="Schedule, build, and download reports from your data model." />
          } />
          <Route path="/users" element={
            <PlaceholderPage title="Users" icon="users"
              description="Manage team members, roles, and access permissions." />
          } />
          <Route path="/settings" element={
            <SettingsPage
              brandName={brandName} setBrandName={setBrandName}
              logoUrl={logoUrl}     setLogoUrl={setLogoUrl}
            />
          } />
          <Route path="/semantic-layer/treemap" element={<TreeMapPage />} />
          <Route path="/semantic-layer/tree" element={<CollapsibleTreePage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
