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
      // One-time: seed Adam Medina's completed Commercial 1 last semester
      // (primary Anna Herrington, secondary Daniel Wang) into courseHistory.
      if (s.id === 'seed-09' && !s.courseHistory?.some((h) => h.course === 'Commercial 1')) {
        return {
          ...s,
          courseHistory: [
            ...(s.courseHistory || []),
            { course: 'Commercial 1', completedDate: '2026-05-12', primaryInstructor: 'Anna Herrington', secondaryInstructor: 'Daniel Wang', rateDiscount: 0.15 },
          ],
        }
      }
      // Backfill rateDiscount on Adam's existing Commercial 1 entry if missing.
      if (s.id === 'seed-09' && s.courseHistory?.some((h) => h.course === 'Commercial 1' && h.rateDiscount == null)) {
        return {
          ...s,
          courseHistory: s.courseHistory.map((h) =>
            h.course === 'Commercial 1' && h.rateDiscount == null
              ? { ...h, rateDiscount: 0.15 }
              : h
          ),
        }
      }
      // Backfill the older syllabus version on Adam's Commercial 1 (where
      // lesson 3.4 was 5.0 hr instead of the current 6.0).
      if (s.id === 'seed-09' && s.courseHistory?.some((h) => h.course === 'Commercial 1' && !h.syllabusVersion)) {
        return {
          ...s,
          courseHistory: s.courseHistory.map((h) =>
            h.course === 'Commercial 1' && !h.syllabusVersion
              ? { ...h, syllabusVersion: 'pre-2026-spring' }
              : h
          ),
        }
      }
      // One-time: seed Gwen Pinto's Private 2 from last semester (primary Anna
      // Herrington). Uses the pre-2026-spring syllabus version (6.1 and 6.2 as
      // separate lessons) since that's what she trained against.
      if (s.id === 'seed-03' && !s.courseHistory?.some((h) => h.course === 'Private 2')) {
        return {
          ...s,
          courseHistory: [
            ...(s.courseHistory || []),
            { course: 'Private 2', completedDate: '2026-04-24', primaryInstructor: 'Anna Herrington', syllabusVersion: 'pre-2026-spring', libRepeatsAllowed: 2 },
          ],
        }
      }
      // Backfill the syllabusVersion if Gwen's Private 2 entry was seeded
      // before the version concept existed.
      if (s.id === 'seed-03' && s.courseHistory?.some((h) => h.course === 'Private 2' && !h.syllabusVersion)) {
        return {
          ...s,
          courseHistory: s.courseHistory.map((h) =>
            h.course === 'Private 2' && !h.syllabusVersion
              ? { ...h, syllabusVersion: 'pre-2026-spring', completedDate: h.completedDate || '2026-04-24', libRepeatsAllowed: h.libRepeatsAllowed ?? 2 }
              : h
          ),
        }
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
  const [logs, setLogs] = useState(() => {
    const saved = lsGet('logs') || {}
    // Migration: logs used to be { studentId: { lessonId: data } } — but a student
    // can take multiple courses over time, and lesson IDs collide across courses.
    // New shape: { studentId: { course: { lessonId: data } } }. Detect old shape
    // (any value is a log entry, not a course-keyed object) and lift it under the
    // student's current course.
    const currentStudents = lsGet('students') || []
    const courseOf = (sid) => currentStudents.find((s) => s.id === sid)?.course || 'Unknown'
    const migrated = {}
    let didMigrate = false
    for (const [sid, byKey] of Object.entries(saved)) {
      if (!byKey || typeof byKey !== 'object') { migrated[sid] = byKey; continue }
      // A course-namespaced entry's value is itself an object of lesson logs (not
      // a single log with .date/.dual etc.). Detect old shape by checking if any
      // entry looks like a flat log.
      const isOldShape = Object.values(byKey).some((v) =>
        v && typeof v === 'object' && (
          'dual' in v || 'solo' in v || 'sim' in v || 'ground' in v ||
          'completed' in v || 'date' in v || 'incomplete' in v ||
          'repeatedLib' in v || 'repeatedOop' in v
        )
      )
      if (isOldShape) {
        migrated[sid] = { [courseOf(sid)]: { ...byKey } }
        didMigrate = true
      } else {
        migrated[sid] = byKey
      }
    }
    // One-time: seed Gwen Pinto's Private 2 historical logs from her tracker,
    // cross-referenced against the Aviation Adventures charge statement.
    const GWEN_ID = 'seed-03'
    const dual  = (h, date, ground) => ({ dual: h, ground: ground ?? 0.7, date, completed: true })
    const solo  = (h, date) => ({ solo: h, date, completed: true })
    if (!migrated[GWEN_ID]?.['Private 2']) {
      migrated[GWEN_ID] = {
        ...(migrated[GWEN_ID] || {}),
        'Private 2': {
          // Cleanly logged from the detailed flight history Gwen shared.
          // libRepeatsAllowed=2 (old policy) → first 2 Lib-flagged non-check
          // lessons get funded repeats. Here 7.2 and 9.1.
          '6.1':     dual(1.8, '2026-02-03'),
          '6.2':     dual(1.9, '2026-02-04'),
          '6.3':     dual(1.8, '2026-02-05'),
          '6.4':     solo(1.2, '2026-02-05'),
          '7.1':     dual(1.8, '2026-02-09', 3.0),
          // 7.2 — Lib-funded repeat (1st of 2 allowed)
          '7.2':         { ...dual(2.5, '2026-02-13'), repeatedLib: true },
          '7.2__r1':     dual(2.1, '2026-02-18'),
          // 7.3 — stage check, partial 2nd attempt counts as OOP repeat
          '7.3':         { ...dual(2.5, '2026-03-09'), repeatedOop: true },
          '7.3__r1':     dual(0.4, '2026-03-10'),
          '7.4':     solo(2.2, '2026-03-10'),
          '8.1':     dual(3.3, '2026-03-19'),         // night dual; covered 8.1 + part of 8.2
          // 9.1 — Lib-funded repeat (2nd of 2 allowed) — exhausts allowance
          '9.1':         { ...dual(2.2, '2026-04-01'), repeatedLib: true },
          '9.1__r1':     dual(2.1, '2026-04-07'),
          '9.2':     dual(2.0, '2026-04-08'),
          '9.3':     dual(2.3, '2026-04-09'),
          // 9.4 — repeated 3 more times; all OOP (Lib allowance used up)
          '9.4':         { ...dual(2.3, '2026-04-10'), repeatedOop: true },
          '9.4__r1':     dual(2.7, '2026-04-13'),
          '9.4__r2':     dual(2.5, '2026-04-14', 0.5),
          '9.4__r3':     dual(1.9, '2026-04-20'),
          // 10.1 stage check (correct date 4/16, not 4/13 as previously seeded)
          '10.1':    dual(1.7, '2026-04-16', 3.0),
          // 10.2 final stage check — student paid OOP
          '10.2':    {
            dual: 1.9, ground: 3.7, date: '2026-04-24',
            completed: true,
            instructor: 'Elias Kontanis',
            aircraft: 'C-172-S',
            paidOop: true,
          },
        },
      }
      didMigrate = true
    } else if (!migrated[GWEN_ID]['Private 2']['7.2__r1']) {
      // Upgrade path: detect old seed (missing repeat keys) and fully replace
      // Private 2 with the detailed history from the flight log view.
      // Safe because Gwen's Private 2 is all seeded data — no manual edits.
      migrated[GWEN_ID]['Private 2'] = {
        '6.1':     dual(1.8, '2026-02-03'),
        '6.2':     dual(1.9, '2026-02-04'),
        '6.3':     dual(1.8, '2026-02-05'),
        '6.4':     solo(1.2, '2026-02-05'),
        '7.1':     dual(1.8, '2026-02-09', 3.0),
        '7.2':         { ...dual(2.5, '2026-02-13'), repeatedLib: true },
        '7.2__r1':     dual(2.1, '2026-02-18'),
        '7.3':         { ...dual(2.5, '2026-03-09'), repeatedOop: true },
        '7.3__r1':     dual(0.4, '2026-03-10'),
        '7.4':     solo(2.2, '2026-03-10'),
        '8.1':     dual(3.3, '2026-03-19'),
        '9.1':         { ...dual(2.2, '2026-04-01'), repeatedLib: true },
        '9.1__r1':     dual(2.1, '2026-04-07'),
        '9.2':     dual(2.0, '2026-04-08'),
        '9.3':     dual(2.3, '2026-04-09'),
        '9.4':         { ...dual(2.3, '2026-04-10'), repeatedOop: true },
        '9.4__r1':     dual(2.7, '2026-04-13'),
        '9.4__r2':     dual(2.5, '2026-04-14', 0.5),
        '9.4__r3':     dual(1.9, '2026-04-20'),
        '10.1':    dual(1.7, '2026-04-16', 3.0),
        '10.2':    {
          dual: 1.9, ground: 3.7, date: '2026-04-24',
          completed: true,
          instructor: 'Elias Kontanis',
          aircraft: 'C-172-S',
          paidOop: true,
        },
      }
      didMigrate = true
    }

    // One-time: seed Adam Medina's completed Commercial 1 historical logs from
    // last semester. Dates and hours sourced from his CTA flight log (the
    // school's scheduling system, source of truth) — supersedes the original
    // tracker which had some incorrect dates.
    const ADAM_ID = 'seed-09'
    const adamDual  = (h, date) => ({ dual: h, ground: 0.7, date, completed: true })
    const adamSolo  = (h, date) => ({ solo: h, date, completed: true })
    const adamCheck = (h, date) => ({ dual: h, ground: 0.7, date, completed: true })
    const adamComm1Expected = {
      '1.1': adamDual(3.1, '2026-03-25'),
      '1.2': adamDual(1.0, '2026-03-25'),
      '1.3': adamSolo(3.6, '2026-04-06'),
      '1.4': adamDual(3.9, '2026-04-06'),
      '1.5': adamSolo(0.9, '2026-04-07'),
      '2.1': adamSolo(3.9, '2026-04-09'),         // CTA: 4/9 (was 4/10)
      '2.2': adamSolo(1.4, '2026-04-15'),         // CTA: 4/15 1.4 (was 4/16 1.5)
      '2.4': adamSolo(3.8, '2026-04-21'),
      '2.3': adamSolo(6.4, '2026-04-27'),         // CTA: 4/27 (was 4/17)
      '2A':  adamCheck(2.7, '2026-05-01'),        // CTA: 5/1 (was 4/24)
      '3.1': adamSolo(2.0, '2026-05-01'),
      '3.4': adamSolo(6.5, '2026-05-07'),         // CTA: 5/7 (was 5/1)
      '3A':  adamCheck(2.6, '2026-05-12'),        // CTA: 5/12 (was 5/6)
    }
    if (!migrated[ADAM_ID]?.['Commercial 1']) {
      migrated[ADAM_ID] = { ...(migrated[ADAM_ID] || {}), 'Commercial 1': adamComm1Expected }
      didMigrate = true
    } else {
      // Upgrade path: detect old tracker-based seed (where 2.1 was 4/10) and
      // replace with the CTA-corrected log.
      const existing = migrated[ADAM_ID]['Commercial 1']
      if (existing['2.1']?.date === '2026-04-10' || existing['2.3']?.date === '2026-04-17') {
        migrated[ADAM_ID]['Commercial 1'] = adamComm1Expected
        didMigrate = true
      }
    }
    if (didMigrate) lsSet('logs', migrated)
    return migrated
  })
  // Role-change requests submitted by instructors, pending Chief approval.
  // Each item: { id, instructorName, base, field: 'chief'|'stageCheck', requestedAt, note }
  const [roleRequests, setRoleRequests] = useState(() => lsGet('roleRequests') || [])
  const saveRoleRequests = (arr) => { setRoleRequests(arr); lsSet('roleRequests', arr) }
  const submitRoleRequest = (req) => {
    // Dedupe — don't queue a second request for the same field on the same instructor
    const exists = roleRequests.find((r) =>
      r.instructorName === req.instructorName &&
      r.base === req.base &&
      r.field === req.field
    )
    if (exists) return false
    saveRoleRequests([...roleRequests, { ...req, id: uid(), requestedAt: new Date().toISOString() }])
    return true
  }
  const resolveRoleRequest = (id, approve) => {
    const req = roleRequests.find((r) => r.id === id)
    if (!req) return
    if (approve) {
      // Apply the change
      const next = instructors.map((i) => {
        if (i.name !== req.instructorName || i.base !== req.base) return i
        if (req.field === 'chief')      return { ...i, lineRate: 110 }
        if (req.field === 'stageCheck') return { ...i, stageCheck: true }
        return i
      })
      saveInstructors(next)
    }
    saveRoleRequests(roleRequests.filter((r) => r.id !== id))
  }
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

  // Append a Training Review record to the student's profile. The form is
  // saved on email or print so the school always has a local audit trail
  // matching what was sent to Liberty. Visible to chiefs, instructors and
  // the student themselves on the student-detail page.
  const saveTrainingReview = (id, review) => saveStudents(students.map((s) => {
    if (s.id !== id) return s
    return { ...s, trainingReviews: [...(s.trainingReviews || []), review] }
  }))
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
  // Logs are namespaced by course (course string is required) so multi-course
  // student histories don't collide on lesson IDs like '1.1'.
  const logFlight = (studentId, course, lessonId, data) => {
    setLogs((prev) => {
      const studentLogs = prev[studentId] || {}
      const courseLogs = studentLogs[course] || {}
      const next = {
        ...prev,
        [studentId]: { ...studentLogs, [course]: { ...courseLogs, [lessonId]: data } },
      }
      lsSet('logs', next)
      return next
    })
  }

  const clearLesson = (studentId, course, lessonId) => {
    setLogs((prev) => {
      const studentLogs = prev[studentId] || {}
      const courseLogs = { ...(studentLogs[course] || {}) }
      delete courseLogs[lessonId]
      const next = {
        ...prev,
        [studentId]: { ...studentLogs, [course]: courseLogs },
      }
      lsSet('logs', next)
      return next
    })
  }

  // Wipe ALL logs for a single course on a student (used by the
  // "Remove syllabus" button on StudentDetail — irreversible).
  const clearAllLogsForCourse = (studentId, course) => {
    setLogs((prev) => {
      const studentLogs = { ...(prev[studentId] || {}) }
      delete studentLogs[course]
      const next = { ...prev, [studentId]: studentLogs }
      lsSet('logs', next)
      return next
    })
  }

  /* ── shared helpers ──────────────────────────────────────────── */
  const calc = (student, courseOverride) => calcProgress(student, logs, instructors, courseOverride)

  const goToStudentDetail = (student, asInstructor = true) => {
    setSelectedStudent(student)
    setView('detail')
  }

  /* ── auth ────────────────────────────────────────────────────── */
  const handleLoginSuccess = (account) => {
    setCurrentAccount(account)
    // Auto-select the location tab on sign-in based on the logged-in
    // user's home base. We look up the instructor roster entry by name
    // (eqName-tolerant — case and nickname differences) and use their
    // base if found. For chiefs without a roster entry (e.g. the seed
    // admin) we fall back to 'All' so they still see everyone.
    const rosterEntry = instructors.find((i) =>
      i.name && account.name && i.name.trim().toLowerCase() === account.name.trim().toLowerCase()
    )
    const homeBase = rosterEntry?.base
    if (account.role === 'chief') {
      setActiveLocation(homeBase || 'All')
      setView('chief')
    } else if (account.role === 'instructor') {
      setActiveLocation(homeBase || 'KHEF')
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

  // Sync App-level currentAccount after the user changes their own username
  // or password in the AccountSettingsModal — keeps role/name etc. intact
  // while picking up the updated fields.
  const handleUpdateAccount = (nextAccount) => {
    if (!nextAccount) return
    setCurrentAccount((prev) => ({ ...prev, ...nextAccount }))
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
      logs={logs}
      activeLocation={activeLocation}
      setActiveLocation={setActiveLocation}
      setView={setView}
      onSelectStudent={(student) => goToStudentDetail(student, true)}
      onAddStudent={addStudent}
      onDeleteStudent={deleteStudent}
      onDeleteStudentAccount={deleteStudentAccount}
      onUpdateStudent={updateStudent}
      onAddInstructor={addInstructor}
      onDeleteInstructor={deleteInstructor}
      onUpdateInstructor={updateInstructor}
      roleRequests={roleRequests}
      onSubmitRoleRequest={submitRoleRequest}
      onResolveRoleRequest={resolveRoleRequest}
      calcProgress={calc}
      onSignOut={handleSignOut}
      onUpdateAccount={handleUpdateAccount}
    />
  )

  if (view === 'dash') return (
    <InstructorDash
      students={students}
      instructors={instructors}
      logs={logs}
      activeLocation={activeLocation}
      setActiveLocation={setActiveLocation}
      setView={setView}
      onSelectStudent={(student) => goToStudentDetail(student, true)}
      onAddStudent={addStudent}
      onDeleteStudent={deleteStudent}
      onAddInstructor={addInstructor}
      onDeleteInstructor={deleteInstructor}
      onUpdateInstructor={updateInstructor}
      roleRequests={roleRequests}
      onSubmitRoleRequest={submitRoleRequest}
      onResolveRoleRequest={resolveRoleRequest}
      calcProgress={calc}
      account={currentAccount}
      onSignOut={handleSignOut}
      onUpdateAccount={handleUpdateAccount}
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
      account={currentAccount}
      onUpdateAccount={handleUpdateAccount}
      onLogFlight={logFlight}
      onClearLesson={clearLesson}
      onClearAllLogs={clearAllLogsForCourse}
      onUpdateStudent={updateStudent}
      onSaveTrainingReview={saveTrainingReview}
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
