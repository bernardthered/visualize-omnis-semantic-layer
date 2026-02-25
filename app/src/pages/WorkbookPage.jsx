import { useState, useEffect } from 'react'
import styles from './DashboardPage.module.css'

const CONTENT_ID = '/w/183b789c'

export default function WorkbookPage({ darkMode }) {
  const [iframeUrl, setIframeUrl] = useState(null)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    setIframeUrl(null)
    setError(null)

    const prefersDark = darkMode ? 'true' : 'false'
    fetch(`/api/embed-url?contentId=${encodeURIComponent(CONTENT_ID)}&prefersDark=${prefersDark}`)
      .then(r => r.json())
      .then(({ url, error }) => {
        if (error) setError(error)
        else setIframeUrl(url)
      })
      .catch(err => setError(err.message))
  }, [darkMode])

  if (error) {
    return (
      <div className={`${styles.status} ${styles.error}`}>
        <p className={styles.errorTitle}>Failed to load Workbook</p>
        <p className={styles.errorDetail}>{error}</p>
      </div>
    )
  }

  if (!iframeUrl) {
    return (
      <div className={styles.status}>
        <div className={styles.spinner} />
        <p>Loading Workbook…</p>
      </div>
    )
  }

  return (
    <iframe
      src={iframeUrl}
      className={styles.iframe}
      title="Workbook"
      allow="clipboard-write"
    />
  )
}
