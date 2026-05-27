/**
 * Small presentational sub-components used inside StudentDetail.jsx.
 * Each is dumb / pure — props in, JSX out. Extracted from
 * StudentDetail.jsx during the pre-backend cleanup so the main file
 * stays focused on data wiring + layout.
 */

/** Instructor contact card — name, cert, chief tag, phone/email links. */
export function InstructorContact({ label, ins }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginTop: 2 }}>{ins.name}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
        {ins.cert}
        {ins.lineRate === 110 && <span style={{ marginLeft: 6, color: '#dc2626' }}>· Chief</span>}
      </div>
      {(ins.phone || ins.email) ? (
        <div style={{ fontSize: 12, color: '#374151', marginTop: 6, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {ins.phone && (
            <a href={`tel:${ins.phone.replace(/[^\d+]/g, '')}`} style={{ color: '#1a3a5c', textDecoration: 'none' }}>
              {ins.phone}
            </a>
          )}
          {ins.email && (
            <a href={`mailto:${ins.email}`} style={{ color: '#1a3a5c', textDecoration: 'none' }}>
              {ins.email}
            </a>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, fontStyle: 'italic' }}>No contact info on file</div>
      )}
    </div>
  )
}

/** Top-of-page summary tile (Progress %, Est. cost, LU balance, OOP). */
export function StatCard({ label, value, valueColor, valueSize = 20, children, onClick }) {
  const interactive = !!onClick
  return (
    <div
      className="stat-card"
      onClick={onClick}
      style={interactive ? { cursor: 'pointer', transition: 'box-shadow .12s, transform .12s' } : undefined}
      onMouseEnter={interactive ? (e) => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(26,58,92,.08)' } : undefined}
      onMouseLeave={interactive ? (e) => { e.currentTarget.style.boxShadow = '' } : undefined}
      title={interactive ? 'Click to open detailed ledger' : undefined}
    >
      <div className="stat-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{label}</span>
        {interactive && <span style={{ fontSize: 10, color: '#9ca3af' }}>▸</span>}
      </div>
      <div className="stat-val" style={{ fontSize: valueSize, color: valueColor }}>{value}</div>
      {children}
    </div>
  )
}

/**
 * Single read-only target value (used for Dual / Solo / XC / Instr / Sim columns,
 * which mirror the syllabus and are not edited per attempt).
 */
export function TargetCell({ value, bold = false }) {
  const has = (value || 0) > 0
  return (
    <div style={{
      textAlign: 'center', fontSize: 12,
      color: has ? '#111827' : '#d1d5db',
      fontWeight: bold ? 600 : 400,
    }}>
      {has ? value.toFixed(1) : '—'}
    </div>
  )
}

/**
 * Ground column cell — shows logged hours with the recommended target below in blue.
 * Turns green once logged meets or exceeds the recommendation.
 */
export function LogCell({ logged, rec }) {
  const val = logged || 0
  const hasRec = rec > 0
  const over = hasRec && val > rec
  const met  = hasRec && val >= rec && !over
  // When logged exactly equals the target, show one number with a ✓ instead of
  // stacking the same value twice (which read as a UI glitch in feedback).
  if (met) {
    return (
      <div style={{ textAlign: 'center', fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
        {val.toFixed(1)} ✓
      </div>
    )
  }
  const valColor = val === 0 ? '#d1d5db' : (over ? '#dc2626' : '#111827')
  return (
    <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
      <div style={{ fontSize: 12, color: valColor, fontWeight: over ? 600 : 400 }}>
        {val > 0 ? val.toFixed(1) : '—'}
      </div>
      {hasRec && (
        <div style={{ fontSize: 9, fontWeight: 600, color: over ? '#dc2626' : '#2d6ab4' }}>
          {rec.toFixed(1)}
        </div>
      )}
    </div>
  )
}

/**
 * Ground totals cell — shows sum logged and course-wide recommended total.
 */
export function TotalCell({ logged, rec }) {
  const hasRec = rec > 0
  const met = hasRec && logged >= rec
  return (
    <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
      <div style={{ fontSize: 12 }}>{logged > 0 ? logged.toFixed(1) : '—'}</div>
      {hasRec && (
        <div style={{ fontSize: 9, fontWeight: 600, color: met ? '#16a34a' : '#2d6ab4' }}>
          {rec.toFixed(1)} rec
        </div>
      )}
    </div>
  )
}
