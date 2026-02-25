import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import PlaceholderPage from './pages/PlaceholderPage'
import TreeMapPage from './pages/TreeMapPage'
import CollapsibleTreePage from './pages/CollapsibleTreePage'

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('darkMode')
    return stored !== null ? stored === 'true' : true
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  return (
    <BrowserRouter>
      <Layout
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
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
            <PlaceholderPage title="Settings" icon="settings"
              description="Configure your workspace, connections, and preferences." />
          } />
          <Route path="/semantic-layer/treemap" element={<TreeMapPage />} />
          <Route path="/semantic-layer/tree" element={<CollapsibleTreePage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
