import { useState } from 'react'
import { COURSES, COURSE_NAMES } from '../data/courses'
import { LOCATIONS, SCHOOLS, CHIEF_ACCESS_CODE } from '../data/constants'
import { registerAccount } from '../utils/auth'
import { eqName } from '../utils/storage'
import { useToast } from './Toast'

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
  const toast = useToast()
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
    // Default to Liberty if it's in the SCHOOLS list, otherwise fall back
    // to the first entry — guards against React's "value not in options"
    // warning if the list ever gets reordered.
    school: SCHOOLS.includes('Liberty University') ? 'Liberty University' : SCHOOLS[0],
    primaryInstructor: '',
    secondaryInstructor: '',
  })

  const searchResults = search.trim().length > 0
    ? students.filter((s) => s.name.toLowerCase().includes(search.toLowerCase().trim()))
    : []

  // Students always have a 4-step flow. Instructors/chiefs are 3 steps by
  // default but bump to 4 when they're shown the "Is this you?" confirmation.
  const hasInstructorMatchStep = role && role !== 'student' && instructors.some((i) => eqName(i.name, name))
  const totalSteps = (role === 'student' || hasInstructorMatchStep) ? 4 : 3
  const stepDisplay = step === 4 ? totalSteps : step

  function handleNameNext(e) {
    e.preventDefault()
    if (!name.trim()) return
    setStep(2)
  }

  // Pre-computed list of instructor roster entries that the entered name
  // resolves to via eqName (handles casing, whitespace, and nickname aliases).
  // Used to show an "Is this you?" confirmation step for instructor/chief
  // registrations so accounts attach to the canonical roster entry.
  const rosterMatches = instructors.filter((i) => eqName(i.name, name))

  async function handleRoleSelect(r, rl) {
    // Strict role enforcement based on roster membership. If the typed
    // name appears on the STUDENT roster but NOT on the instructor
    // roster, they must register as a student — block the chief /
    // instructor tile entirely. (Dual-role people like David Pagano
    // appear on BOTH rosters and bypass this check so they can pick
    // either role.)
    const onStudentRoster    = students.some((s) => eqName(s.name, name))
    const onInstructorRoster = instructors.some((i) => eqName(i.name, name))
    if ((r === 'instructor' || r === 'chief') && onStudentRoster && !onInstructorRoster) {
      toast.error(
        `${name} is registered as a student. You must use the Student portal. ` +
        `If you should also be on the instructor roster, please ask a chief to add you first.`
      )
      return
    }
    // Reverse direction: name is on the INSTRUCTOR roster only — they have
    // no student record so they can't legitimately register as a student.
    // (Dual-role on both rosters bypasses this check, since the student
    // path is also legitimate for them.)
    if (r === 'student' && onInstructorRoster && !onStudentRoster) {
      toast.error(
        `${name} is registered as an instructor. You must use the Instructor portal. ` +
        `If you should also have a student record, please ask a chief to add you first.`
      )
      return
    }

    // Roster-verified chief flag (e.g. Brenda Gillespie has chief:true on
    // her instructor record). Used to (a) auto-suggest the right role if
    // she clicks Instructor, and (b) skip the invite-code prompt since
    // the roster already proves she's a chief.
    const rosterChiefMatch = instructors.find((i) => i.chief && eqName(i.name, name))

    // Wrong tile catch — if she meant chief but tapped instructor.
    if (r === 'instructor' && rosterChiefMatch) {
      const fix = await toast.confirm(
        `${rosterChiefMatch.name} is listed as a Chief / Assistant Chief Instructor on the roster.\n\n` +
        `Register as Chief instead?\n\nOK = switch to Chief · Cancel = stay as Instructor`
      )
      if (fix) {
        r = 'chief'
        rl = 'Chief / Assistant Chief Instructor'
      }
    }

    // Chief / Assistant Chief is normally gated by an invite code so
    // randoms can't grant themselves management access. EXCEPTION: if
    // the typed name matches a roster entry that is already flagged as
    // a chief, we trust the roster and skip the code. The code only
    // exists to protect against people NOT on the chief list.
    if (r === 'chief' && !rosterChiefMatch) {
      // TODO: replace window.prompt with a dedicated InvitationCodeModal
      //   once the toast/dialog system gains a `prompt()` variant. The
      //   one-liner stays inline for now since this only fires for an
      //   off-roster chief signup.
      const entered = window.prompt('Chief Instructor access is restricted.\n\nEnter the chief invite code to continue:')
      if (entered === null) return                                   // cancelled
      if (entered.trim() !== CHIEF_ACCESS_CODE) {
        toast.error('Invalid chief invite code. Request the current code from a chief instructor, or pick the Instructor role instead.')
        return
      }
    }
    setRole(r)
    setRoleLabel(rl)
    setUsername(name.trim().toLowerCase().replace(/\s+/g, '.').slice(0, 24))
    // Picking a non-student role wipes any leftover student-record link
    // from a previous pass through the form — otherwise "Linked to: Adam
    // Medina" would haunt a follow-up instructor signup for Bob Hepp.
    if (r !== 'student') {
      setStudentRecord(null)
      setCreateMode(false)
    }
    if (r === 'student') {
      setSearch(name.trim())
      setStep(3)
    } else if (instructors.some((i) => eqName(i.name, name))) {
      // Possible instructor-roster match — interrupt with confirmation so
      // the account snaps to the canonical roster spelling.
      setStep(3)
    } else {
      // No roster match; skip the confirmation step entirely.
      setStep(4)
    }
  }

  // "Yes, that's me" — snap the displayed name to the canonical roster
  // spelling (e.g. "Brendy Gillespie" → "Brenda Gillespie") and continue.
  function handleConfirmInstructor(roster) {
    setName(roster.name)
    setStep(4)
  }
  // "No, I'm a new instructor" — keep the typed name as-is and continue.
  function handleSkipInstructorMatch() {
    setStep(4)
  }

  async function handleStudentSelect(student) {
    setStudentRecord(student)
    // If the typed name is also on the INSTRUCTOR roster (e.g. David Pagano
    // who teaches and is also working on his own ratings), give them a
    // chance to "merge" into a single instructor account instead of
    // creating a student-only login. Instructor accounts already pick up
    // their own training record under the new "My Course" section, so
    // there's no loss of access — and they gain logging / management.
    const rosterMatch = instructors.find((i) => eqName(i.name, name))
    if (rosterMatch) {
      const upgrade = await toast.confirm(
        `${rosterMatch.name} is also on the instructor roster.\n\n` +
        `Register as an Instructor instead? You'll still see your own training record under "My Course," plus you can log flights for students you teach.\n\n` +
        `OK = register as Instructor (recommended) · Cancel = register as Student only`
      )
      if (upgrade) {
        setRole('instructor')
        setRoleLabel('Instructor')
        setName(rosterMatch.name)              // snap to canonical roster spelling
        setStudentRecord(null)                 // instructor accounts don't store studentId
      }
    }
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

    // For instructor/chief signups with a roster match, the user already
    // confirmed the canonical spelling at step 3 ("Is this you?") and
    // setName updated state to the roster entry. We just use it directly.
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #e8eef5 0%, #f8fafc 35%, #ffffff 100%)',
    }}>
      {/* Slim back row */}
      <div style={{ padding: '14px 16px' }}>
        <button
          className="btn btn-sm"
          onClick={() => {
            // Role-aware back navigation — the forward flow skips step 3
            // (student-record lookup) for non-student roles, so Back from
            // step 4 has to skip it the same way going backwards.
            if (step === 1) { onBack(); return }
            // Going back to step 1 = the user wants to start over.
            // Reset any downstream state from a previous attempt so the
            // next role pick doesn't inherit a stale Linked-to label,
            // username, role, or error.
            if (step === 2) {
              setRole('')
              setRoleLabel('')
              setStudentRecord(null)
              setSearch('')
              setUsername('')
              setError('')
              setCreateMode(false)
              setStep(1)
              return
            }
            if (step === 3 && createMode) { setCreateMode(false); return }
            if (step === 4) {
              // Back from password-step lands on whichever step came before:
              //   - student → step 3 (find-record search)
              //   - instructor/chief WITH roster matches → step 3 ("is this you?")
              //   - instructor/chief WITHOUT matches → step 2 (role select)
              const skippedStep3 = role !== 'student' && !hasInstructorMatchStep
              setStep(skippedStep3 ? 2 : 3)
              return
            }
            setStep(step - 1)
          }}
        >← Back</button>
      </div>

      <div style={{ flex: 1, padding: '8px 20px 40px', maxWidth: 500, margin: '0 auto', width: '100%' }}>
        {/* Logo over the wizard so the page feels branded but not heavy. */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <img
            src="/aviation-adventures-logo.png"
            alt="Aviation Adventures"
            style={{ maxWidth: 180, width: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Create your account
          </div>
        </div>

        {/* Step indicator — compact pills with optional labels for each step.
            Numbered circles still convey position; the label underneath
            tells the user what's coming. */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 4, marginBottom: 22 }}>
          {Array.from({ length: totalSteps || 3 }).map((_, i) => {
            const labels = role === 'student'
              ? ['Name', 'Role', 'Find record', 'Password']
              : (hasInstructorMatchStep ? ['Name', 'Role', 'Confirm', 'Password'] : ['Name', 'Role', 'Password'])
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 64 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
                    background: i + 1 <= stepDisplay ? '#1a3a5c' : '#e5e7eb',
                    color: i + 1 <= stepDisplay ? '#fff' : '#9ca3af',
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 500, color: i + 1 <= stepDisplay ? '#1a3a5c' : '#9ca3af', textAlign: 'center' }}>
                    {labels[i]}
                  </span>
                </div>
                {i < (totalSteps || 3) - 1 && (
                  <div style={{ width: 24, height: 2, marginTop: 11, background: i + 1 < stepDisplay ? '#1a3a5c' : '#e5e7eb' }} />
                )}
              </div>
            )
          })}
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: '28px 24px',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
          }}
        >

          {/* Step 1 — Name */}
          {step === 1 && (
            <form onSubmit={handleNameNext}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h2 style={{ marginTop: 10, fontSize: 18, fontWeight: 600 }}>What is your name?</h2>
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Use your full legal name — it'll be matched against the school's roster.</p>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label>Full name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First Last"
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

          {/* Step 3 (instructor/chief) — "Is this you?" confirmation. Shows
              the roster entries whose names eqName-match what the user typed
              so the account links to the canonical roster spelling instead
              of creating a parallel record. */}
          {step === 3 && role !== 'student' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <h2 style={{ marginTop: 10, fontSize: 18, fontWeight: 600 }}>Is this you?</h2>
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                  We found {rosterMatches.length === 1 ? 'a matching' : 'matching'} instructor record{rosterMatches.length === 1 ? '' : 's'} for <strong>{name}</strong>
                </p>
              </div>
              <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                {rosterMatches.map((ins) => (
                  <div
                    key={ins.id || `${ins.name}-${ins.base || ''}`}
                    onClick={() => handleConfirmInstructor(ins)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                      border: '1px solid #e5e7eb', borderRadius: 10, cursor: 'pointer',
                      transition: 'border-color .15s, background .15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--aa-red)'; e.currentTarget.style.background = '#fef2f2' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '' }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--aa-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                      {ins.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{ins.name}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>
                        {[ins.base, ins.cert, ins.lineRate ? `$${ins.lineRate}/hr` : null].filter(Boolean).join(' · ') || 'Instructor'}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--aa-red)', fontWeight: 600 }}>Yes, that's me →</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 14, textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Not you? Continue as a new instructor with that name.</p>
                <button
                  className="btn"
                  style={{ width: '100%', justifyContent: 'center', padding: '9px 14px' }}
                  onClick={handleSkipInstructorMatch}
                >
                  No, I'm new →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Find existing record OR create your own */}
          {step === 3 && role === 'student' && !createMode && (
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
          {step === 3 && role === 'student' && createMode && (
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

      <footer style={{ textAlign: 'center', padding: '14px 20px', fontSize: 11, color: '#94a3b8', borderTop: '1px solid #e5e7eb', background: '#fff' }}>
        Aviation Adventures · {LOCATIONS.join(' · ')}
      </footer>
    </div>
  )
}
