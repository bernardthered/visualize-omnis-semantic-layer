import { useState, useEffect } from 'react'
import { SettingsIcon, LayersIcon, EyeIcon, EyeOffIcon } from '../components/icons'
import styles from './SettingsPage.module.css'

const DEFAULT_BRAND = 'Omni'

export default function SettingsPage({ brandName, setBrandName, logoUrl, setLogoUrl }) {

  // ── Brand name draft ──────────────────────────────────────────────────────
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

  // ── Logo URL draft ────────────────────────────────────────────────────────
  const [urlDraft, setUrlDraft]         = useState(logoUrl)
  const [previewError, setPreviewError] = useState(false)
  const isUrlDirty = urlDraft !== logoUrl

  useEffect(() => { setPreviewError(false) }, [urlDraft])

  function handleUrlSave(e) {
    e.preventDefault()
    setLogoUrl(urlDraft.trim())
  }

  function handleUrlClear() {
    setUrlDraft('')
    setLogoUrl('')
  }

  // ── Credentials ───────────────────────────────────────────────────────────
  const [userDraft, setUserDraft] = useState(
    () => localStorage.getItem('authUsername') || 'admin'
  )
  const [passDraft, setPassDraft]   = useState('')
  const [showPass,  setShowPass]    = useState(false)
  const [credSaved, setCredSaved]   = useState(false)

  const currentUser    = localStorage.getItem('authUsername') || 'admin'
  const isUserDirty    = userDraft.trim() !== currentUser
  const isPassDirty    = passDraft.length > 0
  const isCredsDirty   = isUserDirty || isPassDirty

  function handleCredsSave(e) {
    e.preventDefault()
    const newUser = userDraft.trim() || currentUser
    setUserDraft(newUser)
    localStorage.setItem('authUsername', newUser)
    if (passDraft) {
      localStorage.setItem('authPassword', passDraft)
      setPassDraft('')
    }
    setCredSaved(true)
    setTimeout(() => setCredSaved(false), 3000)
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

        {/* ── Appearance ───────────────────────────────────────────────────── */}
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

        {/* ── Security ─────────────────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Security</h2>
          <p className={styles.sectionDesc}>
            Change the login credentials for this browser. Leave the password blank to keep the current one.
          </p>

          <form className={styles.credForm} onSubmit={handleCredsSave}>
            {/* Username */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="cred-username">Username</label>
              <input
                id="cred-username"
                className={styles.input}
                type="text"
                value={userDraft}
                maxLength={64}
                autoComplete="username"
                onChange={e => { setUserDraft(e.target.value); setCredSaved(false) }}
              />
            </div>

            {/* Password */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="cred-password">
                New password
                <span className={styles.labelHint}>Leave blank to keep current</span>
              </label>
              <div className={styles.passwordRow}>
                <input
                  id="cred-password"
                  className={`${styles.input} ${styles.inputFlex}`}
                  type={showPass ? 'text' : 'password'}
                  value={passDraft}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="New password"
                  onChange={e => { setPassDraft(e.target.value); setCredSaved(false) }}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPass(s => !s)}
                  title={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className={styles.credFooter}>
              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={!isCredsDirty}
              >
                Save credentials
              </button>
              {credSaved && (
                <p className={styles.savedNote} style={{ margin: 0 }}>✓ Credentials updated</p>
              )}
            </div>
          </form>
        </section>

      </div>
    </div>
  )
}
