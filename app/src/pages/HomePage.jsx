import { NavLink } from 'react-router-dom'
import { LayoutIcon, AiChatIcon, GridIcon, TreeIcon, SunburstIcon } from '../components/icons'
import styles from './HomePage.module.css'

const QUICK_LINKS = [
  { label: 'Dashboard',         path: '/dashboard',                icon: LayoutIcon,   desc: 'Embedded analytics overview'              },
  { label: 'AI Analyst',        path: '/ai-analyst',               icon: AiChatIcon,   desc: 'Chat with your data in natural language'  },
  { label: 'Tree Map',          path: '/semantic-layer/treemap',   icon: GridIcon,     desc: 'Visualize the semantic layer as a treemap' },
  { label: 'Topic Tree',        path: '/semantic-layer/tree',      icon: TreeIcon,     desc: 'Navigate topics as a collapsible tree'    },
  { label: 'Sunburst',          path: '/semantic-layer/sunburst',  icon: SunburstIcon, desc: 'Zoomable sunburst chart'                  },
]

export default function HomePage({ brandName = 'Omni' }) {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.heading}>
          Welcome to the <span className={styles.brand}>{brandName}</span> Portal
        </h1>
        <p className={styles.tagline}>
          Explore your semantic layer, analyze data, and uncover insights.
        </p>
      </div>

      <div className={styles.grid}>
        {QUICK_LINKS.map(({ label, path, icon: Icon, desc }) => (
          <NavLink key={path} to={path} className={styles.card}>
            <span className={styles.cardIcon}><Icon /></span>
            <span className={styles.cardLabel}>{label}</span>
            <span className={styles.cardDesc}>{desc}</span>
          </NavLink>
        ))}
      </div>
    </div>
  )
}
