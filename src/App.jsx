import { useState, useEffect } from 'react'
import { lsGet, lsSet, uid } from './utils/storage'
import { getAccounts, deleteAccount } from './utils/auth'
import { calcProgress } from './utils/calculations'
import { SEED_STUDENTS, SEED_INSTRUCTORS } from './data/seed'
import Home from './components/Home'
import SignIn from './components/SignIn'
import Register from './components/Register'
import StudentLogin from './components/StudentLogin'
import InstructorDash from './components/InstructorDash'
import ChiefDash from './components/ChiefDash'
import StudentDetail from './components/StudentDetail'

export default function App() {
  const [view, setView] = useState('home')
  const [students, setStudents] = useState(() => {
    const saved = lsGet('students')
    if (!saved || saved.length === 0) return SEED_STUDENTS
    // Merge in any NEW seed students (by id) so adding a roster batch to seed.js
    // shows up on existing installs without overwriting anyone the chief added.
    const existingIds = new Set(saved.map((s) => s.id))
    const newSeeds = SEED_STUDENTS.filter((s) => !existingIds.has(s.id))
    // One-time correction: any seed-kjyo-* commercial student still stuck on
    // C-172-S from the original mis-seed should flip to C-172-L-P to match
    // the corrected aircraft default for commercial courses.
    const corrected = saved.map((s) => {
      if (s.id?.startsWith('seed-kjyo-') &&
          s.course?.startsWith('Commercial') &&
          s.aircraft === 'C-172-S') {
        return { ...s, aircraft: 'C-172-L-P' }
      }
      return s
    })
    const changed = corrected.some((s, i) => s !== saved[i])
    if (newSeeds.length === 0 && !changed) return saved
    const merged = [...corrected, ...newSeeds]
    lsSet('students', merged)
    return merged
  })
  const [instructors, setInstructors] = useState(() => {
    const saved = lsGet('instructors')
    // First launch — load the full seed.
    if (!saved || saved.length === 0) return SEED_INSTRUCTORS
    // Legacy data shapes — these triggered the only acceptable wholesale reseed.
    if (!saved[0].base) return SEED_INSTRUCTORS
    if (saved.some((i) => i.name === 'Abdul Khan')) return SEED_INSTRUCTORS

    // Otherwise NEVER wipe user edits. Just:
    //  (a) fill in phone/email from seed for any instructor that has none yet
    //  (b) add any net-new seed instructors the chief hasn't already created
    // This preserves stageCheck flags, lineRate edits, and any other custom fields.
    const key = (i) => `${i.name}__${i.base}`
    const seedByKey = new Map(SEED_INSTRUCTORS.map((i) => [key(i), i]))
    const enriched = saved.map((s) => {
      const seedMatch = seedByKey.get(key(s))
      if (!seedMatch) return s
      const next = { ...s }
      if (!next.phone && seedMatch.phone) next.phone = seedMatch.phone
      if (!next.email && seedMatch.email) next.email = seedMatch.email
      return next
    })
    const savedKeys = new Set(enriched.map(key))
    const toAdd = SEED_INSTRUCTORS.filter((i) => !savedKeys.has(key(i)))
    const changed = toAdd.length > 0 || enriched.some((s, i) => s !== saved[i])
    const merged = toAdd.length > 0 ? [...enriched, ...toAdd] : enriched
    if (changed) lsSet('instructors', merged)
    return merged
  })
  const [logs, setLogs] = useState(() => lsGet('logs') || {})
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [activeLocation, setActiveLocation] = useState('All')
  const [currentAccount, setCurrentAccount] = useState(null)

  /* ── cross-tab sync: keep all portals in sync when another tab writes ── */
  useEffect(() => {
    function onStorage(e) {
      if (e.key === 'aa4-students')    setStudents(e.newValue    ? JSON.parse(e.newValue) : SEED_STUDENTS)
      if (e.key === 'aa4-logs')        setLogs(e.newValue        ? JSON.parse(e.newValue) : {})
      if (e.key === 'aa4-instructors') setInstructors(e.newValue ? JSON.parse(e.newValue) : SEED_INSTRUCTORS)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  /* ── persistence helpers ─────────────────────────────────────── */
  const saveStudents = (arr) => { setStudents(arr); lsSet('students', arr) }
  const saveLogs = (obj) => { setLogs(obj); lsSet('logs', obj) }
  const saveInstructors = (arr) => { setInstructors(arr); lsSet('instructors', arr) }

  /* ── student CRUD ────────────────────────────────────────────── */
  const addStudent = (data) => {
    const newStudent = { ...data, id: uid() }
    saveStudents([...students, newStudent])
    return newStudent
  }
  const updateStudent = (id, changes) => saveStudents(students.map((s) => s.id === id ? { ...s, ...changes } : s))
  // "Remove from dashboard" — drops the student record but keeps the login
  // account so the student can be re-added later (or just sign in to view their
  // history). Use this for graduations, transfers, leaves of absence.
  const deleteStudent = (id) => saveStudents(students.filter((s) => s.id !== id))

  // "Delete account completely" — removes BOTH the student record and the
  // login account. Use this for test accounts or permanent removals. The
  // chief/admin account is protected inside deleteAccount() so it can't be
  // wiped via this path.
  const deleteStudentAccount = (id) => {
    const acct = getAccounts().find((a) => a.studentId === id)
    if (acct) deleteAccount(acct.username)
    saveStudents(students.filter((s) => s.id !== id))
  }

  /* ── instructor roster ───────────────────────────────────────── */
  const addInstructor = (ins) => {
    if (!instructors.find((i) => i.name === ins.name)) saveInstructors([...instructors, ins])
  }
  const deleteInstructor = (name, base) => saveInstructors(
    instructors.filter((i) => !(i.name === name && i.base === base))
  )
  // Update a specific instructor entry (identified by original name + base, since
  // a person can appear at multiple bases as separate entries).
  const updateInstructor = (origName, origBase, changes) => {
    // If the rename collides with another existing instructor at the same base, bail.
    if (changes.name || changes.base) {
      const targetName = changes.name ?? origName
      const targetBase = changes.base ?? origBase
      const collision = instructors.find((i) =>
        i.name === targetName && i.base === targetBase && !(i.name === origName && i.base === origBase)
      )
      if (collision) { alert(`${targetName} is already listed at ${targetBase}`); return }
    }
    saveInstructors(instructors.map((i) =>
      i.name === origName && i.base === origBase ? { ...i, ...changes } : i
    ))
  }

  /* ── flight logging ──────────────────────────────────────────── */
  // Functional updates so multiple logFlight/clearLesson calls in the same tick
  // (e.g. save a repeat attempt AND mark its parent completed) compose correctly
  // instead of clobbering each other via stale state captured at render time.
  const logFlight = (studentId, lessonId, data) => {
    setLogs((prev) => {
      const next = {
        ...prev,
        [studentId]: { ...(prev[studentId] || {}), [lessonId]: data },
      }
      lsSet('logs', next)
      return next
    })
  }

  const clearLesson = (studentId, lessonId) => {
    setLogs((prev) => {
      const studentLogs = { ...(prev[studentId] || {}) }
      delete studentLogs[lessonId]
      const next = { ...prev, [studentId]: studentLogs }
      lsSet('logs', next)
      return next
    })
  }

  /* ── shared helpers ──────────────────────────────────────────── */
  const calc = (student) => calcProgress(student, logs, instructors)

  const goToStudentDetail = (student, asInstructor = true) => {
    setSelectedStudent(student)
    setView('detail')
  }

  /* ── auth ────────────────────────────────────────────────────── */
  const handleLoginSuccess = (account) => {
    setCurrentAccount(account)
    if (account.role === 'chief') {
      setActiveLocation('All')
      setView('chief')
    } else if (account.role === 'instructor') {
      setActiveLocation('KHEF')
      setView('dash')
    } else {
      // student role
      if (account.studentId) {
        const record = students.find((s) => s.id === account.studentId)
        if (record) {
          goToStudentDetail(record, false)
        } else {
          // studentId set but record not found — fall back to search
          setView('student-search')
        }
      } else {
        setView('student-search')
      }
    }
  }

  const handleSignOut = () => {
    setCurrentAccount(null)
    setView('home')
  }

  const isInstructor = currentAccount?.role === 'instructor' || currentAccount?.role === 'chief'

  /* ── routing ─────────────────────────────────────────────────── */
  if (view === 'home') return (
    <Home
      onSignIn={() => setView('sign-in')}
      onRegister={() => setView('register')}
    />
  )

  if (view === 'sign-in') return (
    <SignIn
      onSuccess={handleLoginSuccess}
      onRegister={() => setView('register')}
      onBack={() => setView('home')}
    />
  )

  if (view === 'register') return (
    <Register
      students={students}
      instructors={instructors}
      calcProgress={calc}
      onAddStudent={addStudent}
      onSuccess={handleLoginSuccess}
      onBack={() => setView('home')}
    />
  )

  // Fallback student name-search (for accounts without a linked studentId)
  if (view === 'student-search') return (
    <StudentLogin
      students={students}
      calcProgress={calc}
      onLogin={(student) => goToStudentDetail(student, false)}
      onBack={handleSignOut}
    />
  )

  if (view === 'chief') return (
    <ChiefDash
      account={currentAccount}
      students={students}
      instructors={instructors}
      activeLocation={activeLocation}
      setActiveLocation={setActiveLocation}
      setView={setView}
      onSelectStudent={(student) => goToStudentDetail(student, true)}
      onAddStudent={addStudent}
      onDeleteStudent={deleteStudent}
      onDeleteStudentAccount={deleteStudentAccount}
      onAddInstructor={addInstructor}
      onDeleteInstructor={deleteInstructor}
      onUpdateInstructor={updateInstructor}
      calcProgress={calc}
      onSignOut={handleSignOut}
    />
  )

  if (view === 'dash') return (
    <InstructorDash
      students={students}
      instructors={instructors}
      activeLocation={activeLocation}
      setActiveLocation={setActiveLocation}
      setView={setView}
      onSelectStudent={(student) => goToStudentDetail(student, true)}
      onAddStudent={addStudent}
      onDeleteStudent={deleteStudent}
      onAddInstructor={addInstructor}
      onDeleteInstructor={deleteInstructor}
      onUpdateInstructor={updateInstructor}
      calcProgress={calc}
      account={currentAccount}
      onSignOut={handleSignOut}
    />
  )

  // Always resolve student from the live students array so updates (aircraft change, etc.)
  // are immediately visible in all portals without needing to re-select the student.
  const liveStudent = selectedStudent
    ? students.find((s) => s.id === selectedStudent.id) ?? selectedStudent
    : null

  if (view === 'detail') return (
    <StudentDetail
      student={liveStudent}
      logs={logs}
      instructors={instructors}
      isInstructor={isInstructor}
      onLogFlight={logFlight}
      onClearLesson={clearLesson}
      onUpdateStudent={updateStudent}
      onBack={() => {
        if (currentAccount?.role === 'chief') setView('chief')
        else if (currentAccount?.role === 'instructor') setView('dash')
        else setView('student-search')
      }}
      calcProgress={calc}
    />
  )

  return null
}
