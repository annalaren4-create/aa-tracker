import { useState } from 'react'
import { COURSES, COURSE_NAMES } from '../data/courses'
import { LOCATIONS, SCHOOLS } from '../data/constants'
import { registerAccount } from '../utils/auth'

// Default aircraft per course — mirrors AddStudentModal's logic
function defaultAircraft(course) {
  const cflp = ['Private 1', 'Private 2', 'Commercial 1', 'Commercial 2', 'Commercial 3', 'CFI']
  const twin = ['Multi Engine', 'Multi Engine Instructor']
  if (twin.includes(course)) return 'PA-30'
  if (cflp.includes(course)) return 'C-172-L-P'
  return 'C-172-S'
}

const ROLE_OPTIONS = [
  { role: 'student',    roleLabel: 'Student',                            desc: 'View your course progress and syllabus' },
  { role: 'instructor', roleLabel: 'Instructor',                         desc: 'Manage students and log flight time' },
  { role: 'chief',      roleLabel: 'Chief / Assistant Chief Instructor', desc: 'Sets policy, manages instructor roster, approves Chief / Stage Check designations' },
]

export default function Register({ students, instructors = [], calcProgress, onAddStudent, onSuccess, onBack }) {
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
  // Self-service profile form (used when student isn't in the roster yet)
  const [createMode, setCreateMode]   = useState(false)
  const [profile, setProfile]         = useState({
    base: 'KHEF',
    course: 'Private 1',
    school: 'Liberty University',
    primaryInstructor: '',
    secondaryInstructor: '',
  })

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

  function handleCreateProfile(e) {
    e.preventDefault()
    setError('')
    if (!profile.base)   { setError('Please choose a location.'); return }
    if (!profile.course) { setError('Please choose a course.'); return }
    // Build the new student record. Aircraft defaults based on course.
    const newStudent = {
      name: name.trim(),
      course: profile.course,
      aircraft: defaultAircraft(profile.course),
      school: profile.school || 'Liberty University',
      base: profile.base,
      primaryInstructor: profile.primaryInstructor || '',
      secondaryInstructor: profile.secondaryInstructor || '',
      selfCreated: true,
    }
    const created = onAddStudent(newStudent)
    setStudentRecord(created || newStudent)
    setCreateMode(false)
    setStep(4)
  }

  // Instructors at the chosen base for the optional dropdowns
  const baseInstructors = instructors
    .filter((i) => !i.base || i.base === profile.base)
    .map((i) => i.name)
    .sort()

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
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              // Role-aware back navigation — the forward flow skips step 3
              // (student-record lookup) for non-student roles, so Back from
              // step 4 has to skip it the same way going backwards.
              if (step === 1) { onBack(); return }
              if (step === 3 && createMode) { setCreateMode(false); return }
              if (step === 4) { setStep(role === 'student' ? 3 : 2); return }
              setStep(step - 1)
            }}
          >← Back</button>
          <img className="logo-badge" src="/aviation-adventures-logo.png" alt="Aviation Adventures" />
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

          {/* Step 3 — Find existing record OR create your own */}
          {step === 3 && !createMode && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <h2 style={{ marginTop: 10, fontSize: 18, fontWeight: 600 }}>Find your student record</h2>
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>If your instructor already added you, search below</p>
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
                <div style={{ textAlign: 'center', padding: '14px', color: '#6b7280', fontSize: 13, background: '#f9fafb', borderRadius: 8, marginBottom: 12 }}>
                  No record found with that name.
                </div>
              )}
              <div style={{ display: 'grid', gap: 8, maxHeight: 240, overflowY: 'auto', marginBottom: 16 }}>
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
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--aa-red)'; e.currentTarget.style.background = '#fef2f2' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '' }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--aa-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                        {student.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{student.name}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{student.course} · {student.base} · {student.primaryInstructor}</div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--aa-navy)' }}>{p.pct}%</span>
                      <span style={{ color: '#9ca3af' }}>›</span>
                    </div>
                  )
                })}
              </div>

              {/* Self-service entry point */}
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 14, textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Don't see your name?</p>
                <button
                  className="btn"
                  style={{ width: '100%', justifyContent: 'center', padding: '9px 14px' }}
                  onClick={() => setCreateMode(true)}
                >
                  Create my profile →
                </button>
              </div>
            </div>
          )}

          {/* Step 3b — Self-service profile questionnaire */}
          {step === 3 && createMode && (
            <form onSubmit={handleCreateProfile}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <h2 style={{ marginTop: 10, fontSize: 18, fontWeight: 600 }}>Tell us about your training</h2>
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                  Hi <strong>{name}</strong> — a few quick details and we'll set up your profile
                </p>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label>Home base airport <span style={{ color: 'var(--aa-red)' }}>*</span></label>
                <select
                  value={profile.base}
                  onChange={(e) => setProfile({ ...profile, base: e.target.value, primaryInstructor: '', secondaryInstructor: '' })}
                  autoFocus
                  required
                >
                  {LOCATIONS.map((loc) => (<option key={loc} value={loc}>{loc}</option>))}
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label>Course <span style={{ color: 'var(--aa-red)' }}>*</span></label>
                <select
                  value={profile.course}
                  onChange={(e) => setProfile({ ...profile, course: e.target.value })}
                  required
                >
                  {COURSE_NAMES.map((c) => (
                    <option key={c} value={c}>{c} ({COURSES[c].avia})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label>School</label>
                <select
                  value={profile.school}
                  onChange={(e) => setProfile({ ...profile, school: e.target.value })}
                >
                  {SCHOOLS.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label>Primary instructor <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
                <select
                  value={profile.primaryInstructor}
                  onChange={(e) => setProfile({ ...profile, primaryInstructor: e.target.value })}
                >
                  <option value="">— I don't know yet —</option>
                  {baseInstructors.map((n) => (<option key={n} value={n}>{n}</option>))}
                </select>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label>Secondary instructor <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
                <select
                  value={profile.secondaryInstructor}
                  onChange={(e) => setProfile({ ...profile, secondaryInstructor: e.target.value })}
                >
                  <option value="">— none —</option>
                  {baseInstructors.map((n) => (<option key={n} value={n}>{n}</option>))}
                </select>
              </div>

              {error && (
                <div style={{ marginBottom: 14, padding: '9px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn" onClick={() => { setCreateMode(false); setError('') }} style={{ flex: 1, justifyContent: 'center' }}>
                  ← Back to search
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                  Create profile →
                </button>
              </div>
            </form>
          )}

          {/* Step 4 — Create username & password */}
          {step === 4 && (
            <form onSubmit={handleSubmit}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
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
