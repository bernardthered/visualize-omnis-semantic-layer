import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  HomeIcon, BarChartIcon, FileTextIcon, UsersIcon, SettingsIcon,
  LayersIcon, GridIcon, TreeIcon,
  ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon,
  MoonIcon, SunIcon, LogOutIcon,
} from './icons'
import styles from './Sidebar.module.css'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: HomeIcon,      path: '/dashboard' },
  { id: 'analytics', label: 'Analytics', icon: BarChartIcon,  path: '/analytics' },
  { id: 'reports',   label: 'Reports',   icon: FileTextIcon,  path: '/reports'   },
  { id: 'users',     label: 'Users',     icon: UsersIcon,     path: '/users'     },
  { id: 'settings',  label: 'Settings',  icon: SettingsIcon,  path: '/settings'  },
  {
    id: 'semantic-layer', label: 'Semantic Layer', icon: LayersIcon,
    children: [
      { id: 'treemap', label: 'Tree Map',        icon: GridIcon, path: '/semantic-layer/treemap' },
      { id: 'tree',    label: 'Collapsible Tree', icon: TreeIcon, path: '/semantic-layer/tree'    },
    ],
  },
]

export default function Sidebar({ collapsed, setCollapsed, darkMode, setDarkMode, brandName = 'Omni', logoUrl = '', logout }) {
  const location = useLocation()
  const [imgError, setImgError] = useState(false)
  const [openMenus, setOpenMenus] = useState(() => {
    // Auto-open semantic-layer submenu if on that path
    if (location.pathname.startsWith('/semantic-layer')) return new Set(['semantic-layer'])
    return new Set()
  })

  // Reset error state whenever the URL changes so the new URL gets a fresh load attempt
  useEffect(() => { setImgError(false) }, [logoUrl])

  function toggleMenu(id) {
    if (collapsed) {
      // Expand sidebar first, then open submenu
      setCollapsed(false)
      setOpenMenus(new Set([id]))
      return
    }
    setOpenMenus(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function isChildActive(item) {
    return item.children?.some(c => location.pathname === c.path)
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>

      {/* ── Logo row ── */}
      <div className={styles.logo}>
        {!collapsed && (
          <div className={styles.logoMark}>
            {logoUrl && !imgError
              ? <img src={logoUrl} alt="" className={styles.logoImg} onError={() => setImgError(true)} />
              : <LayersIcon />
            }
          </div>
        )}
        {!collapsed && <span className={styles.logoText}>{brandName}</span>}
        <button
          className={styles.collapseBtn}
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className={styles.nav}>
        {NAV.map(item => (
          <div key={item.id}>
            {item.children ? (
              // Parent with submenu
              <>
                <button
                  className={`${styles.navItem} ${styles.navParent}
                    ${isChildActive(item) ? styles.parentActive : ''}
                    ${collapsed ? styles.iconOnly : ''}`}
                  onClick={() => toggleMenu(item.id)}
                  title={collapsed ? item.label : undefined}
                >
                  <span className={styles.navIcon}><item.icon /></span>
                  {!collapsed && (
                    <>
                      <span className={styles.navLabel}>{item.label}</span>
                      <span className={`${styles.chevron} ${openMenus.has(item.id) ? styles.open : ''}`}>
                        <ChevronDownIcon />
                      </span>
                    </>
                  )}
                </button>

                {/* Submenu */}
                {!collapsed && openMenus.has(item.id) && (
                  <div className={styles.submenu}>
                    {item.children.map(child => (
                      <NavLink
                        key={child.id}
                        to={child.path}
                        className={({ isActive }) =>
                          `${styles.subItem} ${isActive ? styles.subActive : ''}`
                        }
                      >
                        <span className={styles.subIcon}><child.icon /></span>
                        <span className={styles.navLabel}>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </>
            ) : (
              // Regular nav item
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.active : ''} ${collapsed ? styles.iconOnly : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <span className={styles.navIcon}><item.icon /></span>
                {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
              </NavLink>
            )}
          </div>
        ))}
      </nav>

      {/* ── Footer: dark mode toggle + sign out ── */}
      <div className={styles.footer}>
        <div className={`${styles.themeToggle} ${collapsed ? styles.iconOnly : ''}`}>
          {!collapsed && (
            <span className={styles.themeLabel}>
              {darkMode ? 'Dark mode' : 'Light mode'}
            </span>
          )}
          <button
            className={styles.toggleBtn}
            onClick={() => setDarkMode(d => !d)}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className={`${styles.toggleTrack} ${darkMode ? styles.trackOn : ''}`}>
              <span className={`${styles.toggleThumb} ${darkMode ? styles.thumbOn : ''}`}>
                {darkMode ? <MoonIcon /> : <SunIcon />}
              </span>
            </span>
          </button>
        </div>

        <button
          className={`${styles.signOutBtn} ${collapsed ? styles.iconOnly : ''}`}
          onClick={logout}
          title="Sign out"
        >
          <span className={styles.navIcon}><LogOutIcon /></span>
          {!collapsed && <span className={styles.navLabel}>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
