import { useState } from 'react'
import { SettingsIcon } from '../components/icons'
import styles from './SettingsPage.module.css'

const DEFAULT_BRAND = 'Omni'

export default function SettingsPage({ brandName, setBrandName }) {
  const [draft, setDraft] = useState(brandName)

  function handleSave(e) {
    e.preventDefault()
    const trimmed = draft.trim() || DEFAULT_BRAND
    setDraft(trimmed)
    setBrandName(trimmed)
  }

  function handleReset() {
    setDraft(DEFAULT_BRAND)
    setBrandName(DEFAULT_BRAND)
  }

  const isDirty   = draft !== brandName
  const isDefault = brandName === DEFAULT_BRAND

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.iconWrap}>
          <SettingsIcon />
        </div>
        <div>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.desc}>Configure your workspace preferences. Changes are saved to this browser.</p>
        </div>
      </div>

      <div className={styles.sections}>

        {/* ── Appearance ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Appearance</h2>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="brand-name">
              Brand name
              <span className={styles.labelHint}>Shown in the sidebar top-left</span>
            </label>
            <form className={styles.inputRow} onSubmit={handleSave}>
              <input
                id="brand-name"
                className={styles.input}
                type="text"
                value={draft}
                maxLength={32}
                placeholder={DEFAULT_BRAND}
                onChange={e => setDraft(e.target.value)}
              />
              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={!isDirty}
              >
                Save
              </button>
              {!isDefault && (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={handleReset}
                  title="Reset to default"
                >
                  Reset
                </button>
              )}
            </form>
            {!isDirty && !isDefault && (
              <p className={styles.savedNote}>
                ✓ Saved — sidebar shows <strong>{brandName}</strong>
              </p>
            )}
          </div>
        </section>

      </div>
    </div>
  )
}
