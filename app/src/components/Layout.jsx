import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import styles from './Layout.module.css'

export default function Layout({ children, darkMode, setDarkMode, collapsed, setCollapsed }) {
  const location = useLocation()
  const isEmbed = location.pathname.startsWith('/semantic-layer')

  return (
    <div className={styles.layout}>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
      <div className={styles.body}>
        <main className={`${styles.main} ${isEmbed ? styles.mainEmbed : ''}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
