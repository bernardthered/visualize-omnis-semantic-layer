import { useState, useEffect, useMemo } from 'react'
import styles from './DashboardPage.module.css'

export default function AiAnalystPage({ darkMode }) {
  // Fresh UUID per mount — each page visit starts a new chat session
  const contentId = useMemo(() => `/chat/${crypto.randomUUID()}`, [])

  const [iframeUrl, setIframeUrl] = useState(null)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    setIframeUrl(null)
    setError(null)

    const controller = new AbortController()
    const prefersDark = darkMode ? 'true' : 'false'
    fetch(`/api/embed-url?contentId=${encodeURIComponent(contentId)}&prefersDark=${prefersDark}`, { signal: controller.signal })
      .then(r => r.json())
      .then(({ url, error }) => {
        if (error) setError(error)
        else setIframeUrl(url)
      })
      .catch(err => { if (err.name !== 'AbortError') setError(err.message) })
    return () => controller.abort()
  }, [contentId, darkMode])

  if (error) {
    return (
      <div className={`${styles.status} ${styles.error}`}>
        <p className={styles.errorTitle}>Failed to load AI Analyst</p>
        <p className={styles.errorDetail}>{error}</p>
      </div>
    )
  }

  if (!iframeUrl) {
    return (
      <div className={styles.status}>
        <div className={styles.spinner} />
        <p>Starting AI Analyst session…</p>
      </div>
    )
  }

  return (
    <iframe
      src={iframeUrl}
      className={styles.iframe}
      title="AI Analyst"
      allow="clipboard-write"
    />
  )
}
