import { useState } from 'react'
import { lsGet, lsSet, uid } from './utils/storage'
import { calcProgress } from './utils/calculations'
import { SEED_STUDENTS, SEED_INSTRUCTORS } from './data/seed'
import Home from './components/Home'
import InstructorLogin from './components/InstructorLogin'
import StudentLogin from './components/StudentLogin'
import InstructorDash from './components/InstructorDash'
import StudentDetail from './components/StudentDetail'

export default function App() {
  const [view, setView] = useState('home')
  const [students, setStudents] = useState(() => lsGet('students') || SEED_STUDENTS)
  const [instructors, setInstructors] = useState(() => lsGet('instructors') || SEED_INSTRUCTORS)
  const [logs, setLogs] = useState(() => lsGet('logs') || {})
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [activeLocation, setActiveLocation] = useState('KHEF')
  const [isInstructor, setIsInstructor] = useState(false)

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
  const deleteInstructor = (name) => saveInstructors(instructors.filter((i) => i.name !== name))

  /* ── flight logging ──────────────────────────────────────────── */
  const logFlight = (studentId, lessonId, data) => {
    saveLogs({
      ...logs,
      [studentId]: { ...(logs[studentId] || {}), [lessonId]: data },
    })
  }

  /* ── shared helpers ──────────────────────────────────────────── */
  const calc = (student) => calcProgress(student, logs)

  const goToStudentDetail = (student) => {
    setSelectedStudent(student)
    setView('detail')
  }

  /* ── routing ─────────────────────────────────────────────────── */
  if (view === 'home') return (
    <Home setView={setView} studentCount={students.length} />
  )

  if (view === 'instructor-login') return (
    <InstructorLogin
      onSuccess={() => { setIsInstructor(true); setView('dash') }}
      onBack={() => setView('home')}
    />
  )

  if (view === 'student-login') return (
    <StudentLogin
      students={students}
      calcProgress={calc}
      onLogin={(student) => { setIsInstructor(false); goToStudentDetail(student) }}
      onBack={() => setView('home')}
    />
  )

  if (view === 'dash') return (
    <InstructorDash
      students={students}
      instructors={instructors}
      activeLocation={activeLocation}
      setActiveLocation={setActiveLocation}
      setView={setView}
      onSelectStudent={goToStudentDetail}
      onAddStudent={addStudent}
      onDeleteStudent={deleteStudent}
      onAddInstructor={addInstructor}
      onDeleteInstructor={deleteInstructor}
      calcProgress={calc}
    />
  )

  if (view === 'detail') return (
    <StudentDetail
      student={selectedStudent}
      logs={logs}
      instructors={instructors}
      isInstructor={isInstructor}
      onLogFlight={logFlight}
      onUpdateStudent={updateStudent}
      onBack={() => setView(isInstructor ? 'dash' : 'student-login')}
      calcProgress={calc}
    />
  )

  return null
}
