import { useState } from 'react'
import { COURSES } from '../data/courses'

export default function StudentPortal({ students, calcProgress, onSelectStudent, onBack }) {
  const [search, setSearch] = useState('')

  const results = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.primaryInstructor.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div>
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-sm btn-ghost" onClick={onBack}>← Home</button>
          <h1>Student portal</h1>
        </div>
      </div>

      <div style={{ padding: 20, maxWidth: 560, margin: '0 auto' }}>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or instructor…"
            style={{ paddingLeft: 34 }}
          />
        </div>

        {results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>
            {students.length === 0
              ? 'No students in the system yet — ask your instructor to add your profile.'
              : 'No results found'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {results.map((student) => {
              const p = calcProgress(student)
              return (
                <div
                  key={student.id}
                  className="card"
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                  onClick={() => onSelectStudent(student)}
                >
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#1a3a5c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 500, flexShrink: 0 }}>
                    {student.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{student.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                      {student.course} · {COURSES[student.course]?.avia} · {student.base} · {student.primaryInstructor}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress-bar" style={{ flex: 1 }}>
                        <div className="progress-fill" style={{ width: `${p.pct}%`, background: p.pct >= 100 ? '#16a34a' : '#1a3a5c' }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{p.pct}%</span>
                    </div>
                  </div>
                  <span style={{ color: '#9ca3af' }}>›</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
