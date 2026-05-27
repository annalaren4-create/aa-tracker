import { useState } from 'react'
import { COURSES } from '../data/courses'
import { LOCATIONS } from '../data/constants'

/**
 * Student-side "find your record" search. Shown when a student account
 * isn't linked to a studentId yet (e.g. account created before the chief
 * added them to the roster). Once they click their card we link the
 * account and bounce them to their progress view.
 */
export default function StudentLogin({ students, calcProgress, onLogin, onBack }) {
  const [search, setSearch] = useState('')

  const q = search.trim().toLowerCase()
  const results = q.length > 0
    ? students.filter((s) => s.name.toLowerCase().includes(q))
    : []

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #e8eef5 0%, #f8fafc 35%, #ffffff 100%)',
    }}>
      {/* Slim back row */}
      <div style={{ padding: '14px 20px 0' }}>
        <button className="btn btn-sm" onClick={onBack}>← Back</button>
      </div>

      {/* Hero */}
      <div style={{ padding: '24px 20px 12px', textAlign: 'center' }}>
        <img
          src="/aviation-adventures-logo.png"
          alt="Aviation Adventures"
          style={{ maxWidth: 220, width: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
        />
        <h1 style={{ marginTop: 14, fontSize: 22, fontWeight: 700, color: '#1a3a5c' }}>
          Find your record
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>
          Type your name below to link your account to your training profile.
        </p>
      </div>

      {/* Search + results card */}
      <div style={{ padding: '8px 20px 32px', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: 20,
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="First Last"
              autoFocus
              style={{ width: '100%', paddingRight: search ? 30 : 12 }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear"
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  border: 'none', background: 'transparent', color: '#9ca3af',
                  fontSize: 14, cursor: 'pointer', padding: 4,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {q.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 12px', color: '#9ca3af', fontSize: 13 }}>
              Start typing your name to find your profile.
            </div>
          )}

          {q.length > 0 && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 12px', color: '#6b7280' }}>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                No student found matching "{search}"
              </p>
              <p style={{ fontSize: 12 }}>
                Ask your instructor to add your profile, then try again.
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div style={{ display: 'grid', gap: 10 }}>
              {results.map((student) => {
                const p = calcProgress(student)
                const initials = student.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => onLogin(student)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', textAlign: 'left',
                      background: '#fff',
                      border: '1px solid #e5e7eb', borderRadius: 10,
                      padding: 12, cursor: 'pointer',
                      transition: 'border-color .15s, transform .15s, box-shadow .15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#1a3a5c'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.06)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.transform = ''
                      e.currentTarget.style.boxShadow = ''
                    }}
                  >
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%',
                      background: '#1a3a5c', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 600, flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{student.name}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                        {student.course} · {COURSES[student.course]?.avia} · {student.base} · {student.primaryInstructor}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div
                            className="progress-fill"
                            style={{ width: `${p.pct}%`, background: p.pct >= 100 ? '#16a34a' : '#1a3a5c' }}
                          />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{p.pct}%</span>
                      </div>
                    </div>
                    <span style={{ color: '#9ca3af', fontSize: 20 }}>›</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'auto', padding: '20px', textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>
        Aviation Adventures · {LOCATIONS.join(' · ')}
      </div>
    </div>
  )
}
