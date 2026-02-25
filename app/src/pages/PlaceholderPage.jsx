import styles from './PlaceholderPage.module.css'
import { HomeIcon, BarChartIcon, FileTextIcon, UsersIcon, SettingsIcon } from '../components/icons'

const ICONS = {
  dashboard: HomeIcon,
  analytics: BarChartIcon,
  reports: FileTextIcon,
  users: UsersIcon,
  settings: SettingsIcon,
}

const COLORS = {
  dashboard: '#7c3aed',
  analytics: '#0e7490',
  reports:   '#d97706',
  users:     '#059669',
  settings:  '#475569',
}

export default function PlaceholderPage({ title, icon, description }) {
  const Icon = ICONS[icon] || HomeIcon
  const color = COLORS[icon] || '#7c3aed'

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.iconWrap} style={{ '--accent': color }}>
          <Icon />
        </div>
        <div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.desc}>{description}</p>
        </div>
      </div>

      <div className={styles.cards}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className={styles.card}>
            <div className={styles.cardBar} style={{ '--accent': color }} />
            <div className={styles.cardContent}>
              <div className={styles.shimmer} style={{ width: '60%', height: 14, marginBottom: 8 }} />
              <div className={styles.shimmer} style={{ width: '85%', height: 10, marginBottom: 6 }} />
              <div className={styles.shimmer} style={{ width: '70%', height: 10 }} />
            </div>
          </div>
        ))}
      </div>

      <div className={styles.placeholder}>
        <div className={styles.placeholderInner}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
            stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ opacity: 0.4 }}>
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
          <p>Content coming soon</p>
        </div>
      </div>
    </div>
  )
}
