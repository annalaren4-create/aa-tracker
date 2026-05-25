import { useState } from 'react'
import { COURSES } from '../data/courses'

export default function StudentLogin({ students, calcProgress, onLogin, onBack }) {
  const [search, setSearch] = useState('')

  const results = search.trim().length > 0
    ? students.filter((s) => s.name.toLowerCase().includes(search.toLowerCase().trim()))
    : []

  return (
    <div>
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-sm btn-ghost" onClick={onBack}>← Back</button>
          <img className="logo-badge" src="/aviation-adventures-logo.png" alt="Aviation Adventures" />
          <h1>Student Portal</h1>
        </div>
        <small>KHEF · KRMN · KHWY · KOKV · KJYO</small>
      </div>

      <div style={{ padding: '40px 20px', maxWidth: 520, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2 style={{ marginTop: 10, fontSize: 20, fontWeight: 600 }}>Find Your Record</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            Type your name to view your progress and syllabus
          </p>
        </div>

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type your name…"
            style={{ paddingLeft: 34 }}
            autoFocus
          />
        </div>

        {search.trim().length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af', fontSize: 13 }}>
            Start typing your name above to find your profile
          </div>
        )}

        {search.trim().length > 0 && results.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '32px 20px', color: '#6b7280' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}></div>
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>No student found</p>
            <p style={{ fontSize: 13 }}>Ask your instructor to add your profile to the system.</p>
          </div>
        )}

        {results.length > 0 && (
          <div style={{ display: 'grid', gap: 10 }}>
            {results.map((student) => {
              const p = calcProgress(student)
              return (
                <div
                  key={student.id}
                  className="card"
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'border-color .15s, transform .15s' }}
                  onClick={() => onLogin(student)}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1a3a5c'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.transform = '' }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1a3a5c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                    {student.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{student.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 7 }}>
                      {student.course} · {COURSES[student.course]?.avia} · {student.base} · {student.primaryInstructor}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress-bar" style={{ flex: 1 }}>
                        <div
                          className="progress-fill"
                          style={{ width: `${p.pct}%`, background: p.pct >= 100 ? '#16a34a' : '#1a3a5c' }}
                        />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{p.pct}%</span>
                    </div>
                  </div>
                  <span style={{ color: '#9ca3af', fontSize: 20 }}>›</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
