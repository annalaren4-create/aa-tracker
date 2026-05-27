import { LOCATIONS } from '../data/constants'

export default function Home({ onSignIn, onRegister }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      // Subtle navy → off-white wash, evokes "horizon"
      background: 'linear-gradient(180deg, #e8eef5 0%, #f8fafc 35%, #ffffff 100%)',
    }}>
      {/* ── HERO ────────────────────────────────────────────────── */}
      <div style={{ padding: '56px 20px 24px', textAlign: 'center' }}>
        <img
          src="/aviation-adventures-logo.png"
          alt="Aviation Adventures"
          style={{ maxWidth: 280, width: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
        />
        <h1 style={{ marginTop: 16, fontSize: 24, fontWeight: 700, color: '#1a3a5c', letterSpacing: '-0.01em' }}>
          Student Progress Tracker
        </h1>
        <p style={{ fontSize: 14, color: '#475569', marginTop: 10, lineHeight: 1.55, maxWidth: 520, margin: '10px auto 0' }}>
          Flight training progress and billing — all in one place for
          students, instructors, and chiefs.
        </p>
      </div>

      {/* ── SIGN-IN CARD ────────────────────────────────────────── */}
      <div style={{ padding: '0 20px 32px', display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: '24px',
            maxWidth: 380,
            width: '100%',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
            display: 'grid',
            gap: 10,
          }}
        >
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
      </div>

      {/* ── ROLE HIGHLIGHTS ─────────────────────────────────────── */}
      <div style={{ padding: '0 20px 48px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, maxWidth: 880, width: '100%' }}>
          <FeatureCard
            title="For Students"
            body="See your progress, target completion dates, and out-of-pocket charges. Print your training records any time."
          />
          <FeatureCard
            title="For Instructors"
            body="Log flights in seconds, manage your roster, and stay on top of every student's pace at a glance."
          />
          <FeatureCard
            title="For Chiefs"
            body="One dashboard for every student at every base — budget pace, deadlines, training reviews, and audit-ready records."
          />
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer
        style={{
          textAlign: 'center',
          padding: '18px 20px',
          fontSize: 11,
          color: '#94a3b8',
          borderTop: '1px solid #e5e7eb',
          background: '#fff',
        }}
      >
        <div style={{ fontWeight: 600, color: '#475569', marginBottom: 2 }}>Aviation Adventures</div>
        <div>{LOCATIONS.join(' · ')}</div>
      </footer>
    </div>
  )
}

function FeatureCard({ title, body }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: '16px 18px',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3a5c', marginBottom: 6, letterSpacing: '0.01em' }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
        {body}
      </div>
    </div>
  )
}
