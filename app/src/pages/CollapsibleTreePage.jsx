import styles from './EmbedPage.module.css'

export default function CollapsibleTreePage() {
  return (
    <div className={styles.embedWrap}>
      <iframe
        src="http://localhost:8766/tree.html"
        className={styles.frame}
        title="Omni Semantic Layer — Collapsible Tree"
      />
    </div>
  )
}
