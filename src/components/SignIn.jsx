import { useState } from 'react'
import { signInWithEmail } from '../utils/supabaseAuth'
import { LOCATIONS } from '../data/constants'

export default function SignIn({ onSuccess, onRegister, onBack }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { account, error } = await signInWithEmail(email, password)
    setLoading(false)
    if (account) {
      onSuccess(account)
    } else {
      setError(error || 'Incorrect email or password.')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #e8eef5 0%, #f8fafc 35%, #ffffff 100%)',
    }}>
      {/* Slim back-row instead of a full app header — keeps the page focused on the form */}
      <div style={{ padding: '14px 16px' }}>
        <button className="btn btn-sm" onClick={onBack}>← Back</button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 20px 60px' }}>
        <div style={{ maxWidth: 400, width: '100%' }}>
          {/* Brand row centered above the card */}
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <img
              src="/aviation-adventures-logo.png"
              alt="Aviation Adventures"
              style={{ maxWidth: 220, width: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
            />
          </div>

          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: '24px 22px',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
            }}
          >
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
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
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onRegister}
                style={{
                  color: '#1a3a5c', fontWeight: 600, cursor: 'pointer',
                  background: 'transparent', border: 'none', padding: 0,
                  fontSize: 'inherit', fontFamily: 'inherit',
                }}
              >
                Create one
              </button>
            </div>

          </div>
        </div>
      </div>

      <footer style={{ textAlign: 'center', padding: '14px 20px', fontSize: 11, color: '#94a3b8', borderTop: '1px solid #e5e7eb', background: '#fff' }}>
        Aviation Adventures · {LOCATIONS.join(' · ')}
      </footer>
    </div>
  )
}
