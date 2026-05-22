export default function Home({ onSignIn, onRegister }) {
  return (
    <div>
      <div className="header">
        <div>
          <span className="logo-badge">Aviation Adventures</span>
          <h1 style={{ marginTop: 4 }}>Student Progress Tracker</h1>
        </div>
        <small>KHEF · KRMN · KHWY · KOKV · KJYO</small>
      </div>

      <div style={{ padding: '60px 20px', maxWidth: 440, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontSize: 52 }}>✈️</span>
          <h2 style={{ marginTop: 12, fontSize: 22, fontWeight: 600 }}>Welcome back</h2>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 6 }}>
            Part 141 · Liberty University · Purdue Global · California Aeronautics University
          </p>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px 14px', fontSize: 15 }}
            onClick={onSignIn}
          >
            Sign in
          </button>
          <button
            className="btn"
            style={{ width: '100%', justifyContent: 'center', padding: '12px 14px', fontSize: 15 }}
            onClick={onRegister}
          >
            Create account
          </button>
        </div>

        <div className="info-box" style={{ marginTop: 24 }}>
          ✈️&nbsp; Aircraft rates effective 4/1/2026 · New to the system? Click <strong>Create account</strong> to get started.
        </div>
      </div>
    </div>
  )
}
