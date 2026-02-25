import styles from './EmbedPage.module.css'

export default function TreeMapPage() {
  return (
    <div className={styles.embedWrap}>
      <iframe
        src="http://localhost:8766/treemap.html"
        className={styles.frame}
        title="Omni Semantic Layer — Treemap"
      />
    </div>
  )
}
