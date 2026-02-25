import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import styles from './Layout.module.css'

export default function Layout({ children, darkMode, setDarkMode, collapsed, setCollapsed, brandName, logoUrl, logout }) {
  const location = useLocation()
  const isEmbed = location.pathname.startsWith('/semantic-layer')
               || location.pathname === '/dashboard'
               || location.pathname === '/ai-analyst'

  return (
    <div className={styles.layout}>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        brandName={brandName}
        logoUrl={logoUrl}
        logout={logout}
      />
      <div className={styles.body}>
        <main className={`${styles.main} ${isEmbed ? styles.mainEmbed : ''}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
