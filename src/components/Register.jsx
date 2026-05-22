import { useState } from 'react'
import { COURSES } from '../data/courses'
import { registerAccount } from '../utils/auth'

const ROLE_OPTIONS = [
  { role: 'student',    roleLabel: 'Student',                    icon: '📋', desc: 'View your course progress and syllabus' },
  { role: 'instructor', roleLabel: 'Instructor',                 icon: '🧑‍✈️', desc: 'Manage students and log flight time' },
  { role: 'chief',      roleLabel: 'Chief Instructor',           icon: '⭐', desc: 'Full access across all students and locations' },
  { role: 'chief',      roleLabel: 'Assistant Chief Instructor', icon: '🌟', desc: 'Full access across all students and locations' },
]

export default function Register({ students, calcProgress, onSuccess, onBack }) {
  const [step, setStep]               = useState(1)
  const [name, setName]               = useState('')
  const [role, setRole]               = useState('')
  const [roleLabel, setRoleLabel]     = useState('')
  const [studentRecord, setStudentRecord] = useState(null)
  const [search, setSearch]           = useState('')
  const [username, setUsername]       = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [error, setError]             = useState('')

  const searchResults = search.trim().length > 0
    ? students.filter((s) => s.name.toLowerCase().includes(search.toLowerCase().trim()))
    : []

  const totalSteps = role === 'student' ? 4 : 3
  const stepDisplay = step === 4 ? totalSteps : step

  function handleNameNext(e) {
    e.preventDefault()
    if (!name.trim()) return
    setStep(2)
  }

  function handleRoleSelect(r, rl) {
    setRole(r)
    setRoleLabel(rl)
    setUsername(name.trim().toLowerCase().replace(/\s+/g, '.').slice(0, 24))
    if (r === 'student') {
      setSearch(name.trim())
      setStep(3)
    } else {
      setStep(4)
    }
  }

  function handleStudentSelect(student) {
    setStudentRecord(student)
    setStep(4)
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!username.trim()) { setError('Username is required.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (role === 'student' && !studentRecord) { setError('Please select your student record first.'); return }

    const result = registerAccount({
      name: name.trim(),
      username: username.trim(),
      password,
      role,
      roleLabel,
      studentId: studentRecord?.id || null,
    })
    if (result.error) { setError(result.error); return }
    onSuccess(result.account)
  }

  return (
    <div>
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-sm btn-ghost" onClick={step === 1 ? onBack : () => setStep(step - 1)}>← Back</button>
          <span className="logo-badge">Aviation Adventures</span>
          <h1>Create Account</h1>
        </div>
        <small>KHEF · KRMN · KHWY · KOKV · KJYO</small>
      </div>

      <div style={{ padding: '40px 20px', maxWidth: 480, margin: '0 auto' }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {Array.from({ length: totalSteps || 3 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600,
                background: i + 1 <= stepDisplay ? '#1a3a5c' : '#e5e7eb',
                color: i + 1 <= stepDisplay ? '#fff' : '#9ca3af',
              }}>
                {i + 1}
              </div>
              {i < (totalSteps || 3) - 1 && (
                <div style={{ width: 32, height: 2, background: i + 1 < stepDisplay ? '#1a3a5c' : '#e5e7eb' }} />
              )}
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: '28px 24px' }}>

          {/* Step 1 — Name */}
          {step === 1 && (
            <form onSubmit={handleNameNext}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <span style={{ fontSize: 40 }}>👤</span>
                <h2 style={{ marginTop: 10, fontSize: 18, fontWeight: 600 }}>What is your name?</h2>
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Enter your full name as it appears in the system</p>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label>Full name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anna Herrington"
                  autoFocus
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 14px' }}>
                Continue →
              </button>
            </form>
          )}

          {/* Step 2 — Role */}
          {step === 2 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <span style={{ fontSize: 40 }}>🎓</span>
                <h2 style={{ marginTop: 10, fontSize: 18, fontWeight: 600 }}>What is your role?</h2>
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Hi <strong>{name}</strong> — select your role to continue</p>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {ROLE_OPTIONS.map((opt) => (
                  <div
                    key={opt.roleLabel}
                    onClick={() => handleRoleSelect(opt.role, opt.roleLabel)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', border: '1px solid #e5e7eb', borderRadius: 10,
                      cursor: 'pointer', transition: 'border-color .15s, background .15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1a3a5c'; e.currentTarget.style.background = '#f8fafc' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '' }}
                  >
                    <span style={{ fontSize: 28, flexShrink: 0 }}>{opt.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{opt.roleLabel}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{opt.desc}</div>
                    </div>
                    <span style={{ marginLeft: 'auto', color: '#9ca3af' }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Find student record (students only) */}
          {step === 3 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 40 }}>🔍</span>
                <h2 style={{ marginTop: 10, fontSize: 18, fontWeight: 600 }}>Find your student record</h2>
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Your instructor must have already added your profile</p>
              </div>
              <div style={{ marginBottom: 12 }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your name…"
                  autoFocus
                />
              </div>
              {search.trim().length > 0 && searchResults.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280', fontSize: 13 }}>
                  No record found — ask your instructor to add your profile first.
                </div>
              )}
              <div style={{ display: 'grid', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                {searchResults.map((student) => {
                  const p = calcProgress(student)
                  return (
                    <div
                      key={student.id}
                      onClick={() => handleStudentSelect(student)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                        border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1a3a5c'; e.currentTarget.style.background = '#f8fafc' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '' }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1a3a5c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                        {student.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{student.name}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{student.course} · {student.base} · {student.primaryInstructor}</div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#1a3a5c' }}>{p.pct}%</span>
                      <span style={{ color: '#9ca3af' }}>›</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 4 — Create username & password */}
          {step === 4 && (
            <form onSubmit={handleSubmit}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <span style={{ fontSize: 40 }}>🔐</span>
                <h2 style={{ marginTop: 10, fontSize: 18, fontWeight: 600 }}>Create your login</h2>
                {studentRecord && (
                  <div style={{ marginTop: 8, padding: '6px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#15803d', display: 'inline-block' }}>
                    Linked to: <strong>{studentRecord.name}</strong>
                  </div>
                )}
                {!studentRecord && role !== 'student' && (
                  <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                    <strong>{roleLabel}</strong> · {name}
                  </p>
                )}
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Password <span style={{ color: '#9ca3af', fontWeight: 400 }}>(min. 6 characters)</span></label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label>Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  required
                />
              </div>
              {error && (
                <div style={{ marginBottom: 14, padding: '9px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
                  {error}
                </div>
              )}
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 14px', fontSize: 14 }}>
                Create account & sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
