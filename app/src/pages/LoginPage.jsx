import { useState } from 'react'
import { LayersIcon } from '../components/icons'
import styles from './LoginPage.module.css'

export default function LoginPage({ onLogin, brandName = 'Omni', logoUrl = '' }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [imgError, setImgError] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    // Short delay gives visual feedback that something happened
    setTimeout(() => {
      const ok = onLogin(username, password)
      if (!ok) {
        setError('Incorrect username or password.')
        setLoading(false)
      }
    }, 280)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        {/* ── Brand mark ── */}
        <div className={styles.brand}>
          <div className={styles.logoMark}>
            {logoUrl && !imgError
              ? <img src={logoUrl} alt="" className={styles.logoImg} onError={() => setImgError(true)} />
              : <LayersIcon />
            }
          </div>
          <span className={styles.brandName}>{brandName}</span>
        </div>

        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>Enter your credentials to continue</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-username">Username</label>
            <input
              id="login-username"
              className={styles.input}
              type="text"
              value={username}
              autoComplete="username"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className={styles.input}
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading || !username || !password}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className={styles.hint}>
          Default credentials: <code>admin</code> / <code>password</code>
        </p>
      </div>
    </div>
  )
}
