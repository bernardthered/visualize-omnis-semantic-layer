import { useState, useEffect } from 'react'
import { SettingsIcon, LayersIcon } from '../components/icons'
import styles from './SettingsPage.module.css'

const DEFAULT_BRAND = 'Omni'

export default function SettingsPage({ brandName, setBrandName, logoUrl, setLogoUrl }) {
  // ── Brand name draft ──
  const [nameDraft, setNameDraft] = useState(brandName)
  const isNameDirty   = nameDraft !== brandName
  const isNameDefault = brandName === DEFAULT_BRAND

  function handleNameSave(e) {
    e.preventDefault()
    const trimmed = nameDraft.trim() || DEFAULT_BRAND
    setNameDraft(trimmed)
    setBrandName(trimmed)
  }

  function handleNameReset() {
    setNameDraft(DEFAULT_BRAND)
    setBrandName(DEFAULT_BRAND)
  }

  // ── Logo URL draft ──
  const [urlDraft, setUrlDraft]       = useState(logoUrl)
  const [previewError, setPreviewError] = useState(false)
  const isUrlDirty = urlDraft !== logoUrl

  // Reset preview error whenever the draft URL changes
  useEffect(() => { setPreviewError(false) }, [urlDraft])

  function handleUrlSave(e) {
    e.preventDefault()
    setLogoUrl(urlDraft.trim())
  }

  function handleUrlClear() {
    setUrlDraft('')
    setLogoUrl('')
  }

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

          {/* Brand name */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="brand-name">
              Brand name
              <span className={styles.labelHint}>Shown in the sidebar top-left</span>
            </label>
            <form className={styles.inputRow} onSubmit={handleNameSave}>
              <input
                id="brand-name"
                className={styles.input}
                type="text"
                value={nameDraft}
                maxLength={32}
                placeholder={DEFAULT_BRAND}
                onChange={e => setNameDraft(e.target.value)}
              />
              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={!isNameDirty}
              >
                Save
              </button>
              {!isNameDefault && (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={handleNameReset}
                >
                  Reset
                </button>
              )}
            </form>
            {!isNameDirty && !isNameDefault && (
              <p className={styles.savedNote}>
                ✓ Saved — sidebar shows <strong>{brandName}</strong>
              </p>
            )}
          </div>

          <div className={styles.divider} />

          {/* Logo URL */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="logo-url">
              Logo image
              <span className={styles.labelHint}>Public image URL shown next to the brand name</span>
            </label>
            <div className={styles.logoRow}>
              {/* Live preview */}
              <div className={styles.logoPreview} title="Preview">
                {urlDraft && !previewError
                  ? <img
                      src={urlDraft}
                      alt="logo preview"
                      className={styles.logoPreviewImg}
                      onError={() => setPreviewError(true)}
                      onLoad={() => setPreviewError(false)}
                    />
                  : <LayersIcon />
                }
              </div>

              <form className={styles.inputRow} style={{ flex: 1 }} onSubmit={handleUrlSave}>
                <input
                  id="logo-url"
                  className={styles.input}
                  type="url"
                  value={urlDraft}
                  placeholder="https://example.com/logo.png"
                  onChange={e => setUrlDraft(e.target.value)}
                />
                <button
                  type="submit"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={!isUrlDirty || previewError}
                >
                  Save
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnGhost}`}
                    onClick={handleUrlClear}
                  >
                    Clear
                  </button>
                )}
              </form>
            </div>
            {previewError && urlDraft && (
              <p className={styles.errorNote}>⚠ Image couldn't be loaded — check the URL</p>
            )}
            {!isUrlDirty && logoUrl && !previewError && (
              <p className={styles.savedNote}>✓ Custom logo active</p>
            )}
          </div>

        </section>

      </div>
    </div>
  )
}
