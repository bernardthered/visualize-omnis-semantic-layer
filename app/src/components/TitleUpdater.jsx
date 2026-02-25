import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const PAGE_NAMES = {
  '/dashboard':              'Dashboard',
  '/analytics':              'Analytics',
  '/reports':                'Reports',
  '/users':                  'Users',
  '/settings':               'Settings',
  '/semantic-layer/treemap': 'Tree Map',
  '/semantic-layer/tree':    'Collapsible Tree',
}

export default function TitleUpdater({ brandName }) {
  const { pathname } = useLocation()

  useEffect(() => {
    const pageName = PAGE_NAMES[pathname] ?? 'Dashboard'
    document.title = `${brandName} - ${pageName}`
  }, [brandName, pathname])

  return null
}
