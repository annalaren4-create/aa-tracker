import { useState, useEffect } from 'react'
import { lsGet, lsSet, uid } from './utils/storage'
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
  const [students, setStudents] = useState(() => lsGet('students') || SEED_STUDENTS)
  const [instructors, setInstructors] = useState(() => {
    const saved = lsGet('instructors')
    // Re-seed if instructors pre-date the base field, or still contain the
    // old "Abdul Khan" entry (now merged into Saboor Khan)
    if (!saved || saved.length === 0) return SEED_INSTRUCTORS
    if (!saved[0].base) return SEED_INSTRUCTORS
    if (saved.some((i) => i.name === 'Abdul Khan')) return SEED_INSTRUCTORS
    return saved
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
  const addStudent = (data) => saveStudents([...students, { ...data, id: uid() }])
  const updateStudent = (id, changes) => saveStudents(students.map((s) => s.id === id ? { ...s, ...changes } : s))
  const deleteStudent = (id) => saveStudents(students.filter((s) => s.id !== id))

  /* ── instructor roster ───────────────────────────────────────── */
  const addInstructor = (ins) => {
    if (!instructors.find((i) => i.name === ins.name)) saveInstructors([...instructors, ins])
  }
  const deleteInstructor = (name, base) => saveInstructors(
    instructors.filter((i) => !(i.name === name && i.base === base))
  )

  /* ── flight logging ──────────────────────────────────────────── */
  const logFlight = (studentId, lessonId, data) => {
    saveLogs({
      ...logs,
      [studentId]: { ...(logs[studentId] || {}), [lessonId]: data },
    })
  }

  /* ── shared helpers ──────────────────────────────────────────── */
  const calc = (student) => calcProgress(student, logs)

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
      calcProgress={calc}
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
      onAddInstructor={addInstructor}
      onDeleteInstructor={deleteInstructor}
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
