import { useState } from 'react'
import { checkLogin } from '../utils/auth'

export default function SignIn({ onSuccess, onRegister, onBack }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const account = checkLogin(username.trim(), password)
    if (account) {
      onSuccess(account)
    } else {
      setError('Incorrect username or password.')
    }
  }

  return (
    <div>
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-sm btn-ghost" onClick={onBack}>← Back</button>
          <span className="logo-badge">Aviation Adventures</span>
          <h1>Sign In</h1>
        </div>
        <small>KHEF · KRMN · KHWY · KOKV · KJYO</small>
      </div>

      <div style={{ padding: '60px 20px', maxWidth: 400, margin: '0 auto' }}>
        <div className="card" style={{ padding: '32px 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <span style={{ fontSize: 44 }}>✈️</span>
            <h2 style={{ marginTop: 10, fontSize: 20, fontWeight: 600 }}>Welcome back</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Sign in to your portal</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label>Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                autoFocus
                required
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div style={{ marginBottom: 14, padding: '9px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px 14px', fontSize: 14 }}
            >
              Sign in
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
            Don't have an account?{' '}
            <span
              style={{ color: '#1a3a5c', fontWeight: 500, cursor: 'pointer' }}
              onClick={onRegister}
            >
              Create one
            </span>
          </div>

          <div className="info-box" style={{ marginTop: 16 }}>
            Default admin: <strong>admin</strong> / <strong>aviation2026</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
