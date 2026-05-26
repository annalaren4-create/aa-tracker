import { useState, useEffect } from 'react'
import { COURSES, getCourseDef, syllabusVersionFor, NEXT_COURSE_OPTIONS } from '../data/courses'
import { AIRCRAFT_LIST, AIRCRAFT_RATES, LU_STANDARD_AIRCRAFT, LU_TERMS, instrRate } from '../data/constants'
import { budgetPct, budgetColor, repeatKeysFor, splitKeysFor } from '../utils/calculations'
import { eqName } from '../utils/storage'
import { flightDeadline, daysToDeadline, paceStatus, effectiveDeadline, daysToEffectiveDeadline, flightsPerWeek, activeTermForSubterm, targetDatesForCourse, behindSchedule, getTerm, predictNextPace } from '../utils/terms'
import LogFlightModal from './modals/LogFlightModal'
import TrainingReviewModal from './modals/TrainingReviewModal'
import LedgerModal from './modals/LedgerModal'
import AccountSettingsModal from './modals/AccountSettingsModal'

// Columns: Lesson · Dual · Solo · XC · Instr · Sim · Tgt Total · Actual Flt · Over/Under · Ground · Objectives · Target Date · Actual Date · Status
const COLS = '58px 44px 44px 44px 44px 44px 52px 56px 84px 56px 1fr 76px 76px 64px'

export default function StudentDetail({
  student, logs, instructors, isInstructor, account, onUpdateAccount, onLogFlight, onClearLesson, onClearAllLogs, onUpdateStudent, onSaveTrainingReview, onBack, calcProgress,
}) {
  const [logLesson, setLogLesson] = useState(null)
  const [showTR, setShowTR] = useState(false)
  const [ledgerMode, setLedgerMode] = useState(null)  // 'hours' | 'cost' | 'balance' | null
  const [showLegend, setShowLegend] = useState(false)
  const [showAcctSettings, setShowAcctSettings] = useState(false)
  const [nextCourseChoice,      setNextCourseChoice]      = useState('')   // course pick in "move to next" banner
  const [nextSemesterChoice,    setNextSemesterChoice]    = useState('')   // semester override in same banner
  const [nextTermChoice,        setNextTermChoice]        = useState('')   // 'A' or 'D' override
  const [nextAcceleratedChoice, setNextAcceleratedChoice] = useState(null) // checkbox override (null = use predicted)
  // Course selector — defaults to the student's current/active course. When
  // switched to a past course (from courseHistory), the page renders that
  // course's logs read-only.
  const [viewCourse, setViewCourse] = useState(student.course)
  const isViewingPastCourse = viewCourse !== student.course
  const canEdit = isInstructor && !isViewingPastCourse
  const [editingDate, setEditingDate] = useState(null)
  const [editingAircraft, setEditingAircraft] = useState(false)
  const [editingCourse, setEditingCourse] = useState(false)
  const [editingPrimary, setEditingPrimary] = useState(false)
  const [replaceCourseMode, setReplaceCourseMode] = useState(false)   // bottom "Replace syllabus" inline picker
  const [replaceCourseChoice, setReplaceCourseChoice] = useState('')
  const [editingSecondary, setEditingSecondary] = useState(false)

  // Instructors at the same base as the student — used for the dropdowns
  const baseInstructors = instructors
    .filter((i) => !i.base || i.base === student.base)
    .map((i) => i.name)
    .sort()

  // Historical courses may use an older syllabus snapshot (see COURSE_VERSIONS).
  const viewSyllabusVersion = viewCourse !== student.course ? syllabusVersionFor(student, viewCourse) : undefined
  const course    = getCourseDef(viewCourse, viewSyllabusVersion)
  const sLogs     = (logs[student.id] || {})[viewCourse] || {}
  const progress  = calcProgress(student, viewCourse)  // calc fn signature is (student, courseOverride)

  // Auto-archive: when the CURRENT course hits 100%, stamp it into
  // courseHistory with today's date + the primary/secondary instructor
  // at time of completion. Idempotent — won't double-archive if the
  // entry is already there. Triggers only on the current course, not
  // while viewing past courses.
  useEffect(() => {
    if (progress.pct < 100) return
    if (viewCourse !== student.course) return
    const already = (student.courseHistory || []).some((h) => h.course === student.course)
    if (already) return
    const today = new Date().toISOString().slice(0, 10)
    onUpdateStudent?.(student.id, {
      courseHistory: [
        ...(student.courseHistory || []),
        {
          course: student.course,
          completedDate: today,
          primaryInstructor: student.primaryInstructor,
          secondaryInstructor: student.secondaryInstructor,
        },
      ],
    })
  }, [progress.pct, viewCourse, student.course, student.id])
  // Per-lesson target dates — spread evenly between training start and the
  // effective deadline. Only meaningful when a deadline (pace or FSC) is
  // set; otherwise targetDates is {} and cells render "—".
  const _courseHasFsc = !!getCourseDef(viewCourse, viewCourse === student.course ? undefined : syllabusVersionFor(student, viewCourse))?.lessons?.some((l) => l.fsc)
  const _effectiveDl  = effectiveDeadline(student, _courseHasFsc)
  const _courseLessons = getCourseDef(viewCourse, viewCourse === student.course ? undefined : syllabusVersionFor(student, viewCourse))?.lessons || []
  // Anchor the per-lesson schedule at the term start when it's in the
  // future (e.g. a D-term student looking at their schedule before D
  // begins). Otherwise targetDatesForCourse falls back to today.
  const _termStart    = getTerm(student.pace)?.start || null
  const targetDates   = targetDatesForCourse(_courseLessons, sLogs, _effectiveDl, undefined, _termStart)
  const acRate    = AIRCRAFT_RATES[student.aircraft] || 0
  const bp        = budgetPct(progress)
  const remaining = progress.flatRate ? progress.flatRate - progress.cost : null

  // How many StatCards will render in the top row. Drives the grid class
  // (grid2/3/4) below so the cards distribute evenly regardless of which
  // combination of student/instructor/OOP cards are visible today. The
  // OOP tile is student-only — instructors see OOP inline on their Est.
  // cost card instead.
  const _showOopCard   = !isInstructor && (progress.oopCost > 0 || progress.projectedAircraftOop > 0)
  const _statCardCount = 1 + (isInstructor ? 2 : 0) + (_showOopCard ? 1 : 0)
  const statCardGridClass = _statCardCount >= 4 ? 'grid4'
    : _statCardCount === 3 ? 'grid3'
    : _statCardCount === 2 ? 'grid2'
    : ''

  // Running over/under across all STARTED lessons — same calc the Totals
  // row uses at the bottom of the lesson table, so the two numbers always
  // agree. Surfaces in the LU balance tile too.
  const runningOverUnder = (() => {
    const _course = getCourseDef(viewCourse, viewCourse === student.course ? undefined : syllabusVersionFor(student, viewCourse))
    if (!_course) return null
    const hrs = (lg) => (lg?.dual || 0) + (lg?.solo || 0) + (lg?.sim || 0)
    let total = 0, any = false
    _course.lessons.forEach((lesson) => {
      const origLg = sLogs[lesson.id]
      if (origLg?.combinedFrom) return                     // child of combined — hours live on primary
      let chainActual = hrs(origLg)
      splitKeysFor(sLogs, lesson.id).forEach((sk) => { chainActual += hrs(sLogs[sk]) })
      let target = lesson.t || 0
      if (lesson.combinableWith) {
        const sibLg = sLogs[lesson.combinableWith]
        if (sibLg?.combinedFrom === lesson.id) {
          const sibDef = _course.lessons.find((l) => l.id === lesson.combinableWith)
          if (sibDef) target += (sibDef.t || 0)
        }
      }
      if (chainActual > 0 && target > 0) { total += (chainActual - target); any = true }
      repeatKeysFor(sLogs, lesson.id).forEach((rk) => {
        const r = hrs(sLogs[rk])
        if (r > 0 && (lesson.t || 0) > 0) { total += (r - (lesson.t || 0)); any = true }
      })
    })
    return any ? total : null
  })()

  // Per-field totals for the totals row (includes repeat-attempt logs).
  let totDual = 0, totSolo = 0, totXC = 0, totSim = 0
  let totHood = 0, totNight = 0, totGround = 0, totFlown = 0
  const addToTotals = (lg) => {
    if (!lg) return
    totDual   += lg.dual   || 0
    totSolo   += lg.solo   || 0
    totXC     += lg.xc     || 0
    totSim    += lg.sim    || 0
    totHood   += lg.hood   || 0
    totNight  += lg.night  || 0
    totGround += lg.ground || 0
    totFlown  += (lg.dual || 0) + (lg.solo || 0) + (lg.sim || 0)
  }
  course.lessons.forEach((l) => {
    addToTotals(sLogs[l.id])
    repeatKeysFor(sLogs, l.id).forEach((rk) => addToTotals(sLogs[rk]))
  })

  const fmt = (v) => v > 0 ? `${v.toFixed(1)}` : '—'

  // Aviation Adventures repeat policy:
  //  • Liberty funds at most ONE repeated lesson per course
  //  • Stage check repeats are always out of pocket (never Lib)
  //  • Any other repeat is out of pocket → Training Review required
  const lessonsWithLog = course.lessons.map((l) => ({ ...l, ...(sLogs[l.id] || {}) }))
  const oopLessons = lessonsWithLog.filter((l) => l.repeatedOop)
  const libRepeats = lessonsWithLog.filter((l) => l.repeatedLib)
  const stageCheckLibViolations = libRepeats.filter((l) => l.sc || l.fsc || l.pc)
  const extraLibViolations = libRepeats.length > 1 ? libRepeats.slice(1) : []
  // Lessons with more than one repeat attempt — only the first repeat is Lib-funded,
  // any additional repeats on the same lesson are automatically OOP.
  const multiRepeatLessons = course.lessons.filter(
    (l) => repeatKeysFor(sLogs, l.id).length > 1
  )
  // Row badge: mirrors the calc logic. First repeat of each Lib-flagged lesson
  // is Lib (up to the course's funded-repeats allowance), all others are OOP.
  const allowedRepeats = (() => {
    const histEntry = student.courseHistory?.find((h) => h.course === viewCourse)
    if (histEntry?.libRepeatsAllowed != null) return histEntry.libRepeatsAllowed
    return 1  // current policy
  })()
  const libFundedLessonIds = []
  for (const l of course.lessons) {
    if (libFundedLessonIds.length >= allowedRepeats) break
    const lg = sLogs[l.id]
    if (lg?.repeatedLib && !l.sc && !l.fsc && !l.pc) libFundedLessonIds.push(l.id)
  }
  const repeatBillingType = (lesson, repeatIndex) => {
    const parent = sLogs[lesson.id] || {}
    if (repeatIndex === 0) {
      if (parent.repeatedOop) return 'OOP'
      if (parent.repeatedLib && libFundedLessonIds.includes(lesson.id)) return 'Lib'
      if (parent.repeatedLib) return 'OOP'    // beyond the funded allowance
      return 'repeat'
    }
    return 'OOP'
  }
  const policyViolations = [...stageCheckLibViolations, ...extraLibViolations]
  const needsTR = oopLessons.length > 0 || policyViolations.length > 0 || multiRepeatLessons.length > 0

  // Pace estimate: based on completed lessons per week since the student's first
  // logged flight. Returns null when there's not enough history to project (need
  // at least 2 distinct flight dates).
  const paceProjection = (() => {
    const allLogs = Object.values(sLogs).filter((lg) => lg && lg.date)
    if (allLogs.length < 2) return null
    const dates = allLogs.map((lg) => new Date(lg.date + 'T00:00:00').getTime()).sort((a, b) => a - b)
    const firstDate = dates[0]
    const lastDate  = dates[dates.length - 1]
    const daysActive = Math.max(1, (lastDate - firstDate) / 86_400_000)
    const completedLessons = Object.values(sLogs).filter((lg) => lg?.completed).length
    if (completedLessons === 0) return null
    const lessonsPerWeek = (completedLessons / daysActive) * 7
    const remaining = Math.max(0, progress.total - progress.completed)
    if (remaining === 0) return { lessonsPerWeek, finishDate: null, weeksRemaining: 0, done: true }
    const weeksRemaining = remaining / lessonsPerWeek
    const finishDate = new Date(Date.now() + weeksRemaining * 7 * 86_400_000)
    return { lessonsPerWeek, finishDate, weeksRemaining, done: false }
  })()

  return (
    <div>
      {/* Header */}
      <div className="header no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-sm btn-ghost" onClick={onBack}>← Back</button>
          <button className="btn btn-sm btn-ghost" onClick={() => window.print()}>Print</button>
          {/* Account settings only on the signed-in student's OWN detail page —
              instructors/chiefs use the Account button on their dashboard so it
              doesn't appear when they're viewing someone else's record. */}
          {account?.role === 'student' && account?.studentId === student.id && (
            <button className="btn btn-sm btn-ghost" onClick={() => setShowAcctSettings(true)}>Account</button>
          )}
          <div>
            <h1>{student.name}</h1>
            <small>
              {/* Course name — click-to-edit for instructors/chiefs when
                  viewing the CURRENT course. Lets them fix a wrong
                  enrollment in seconds. Past courses (via the course
                  selector) stay read-only since editing those would
                  invalidate historical logs. */}
              {canEdit && !isViewingPastCourse ? (
                editingCourse ? (
                  <select
                    value={student.course}
                    autoFocus
                    onChange={(e) => {
                      const next = e.target.value
                      if (next !== student.course) {
                        // Switching the current course: clear pace + FSC
                        // dates because the new course gets its own
                        // schedule. Existing logs under the old course
                        // stay intact (auto-archive on 100% still works
                        // if those logs would have hit that threshold).
                        onUpdateStudent(student.id, {
                          course: next,
                          pace: null,
                          accelerated: false,
                          scheduledFsc: null,
                          backupFsc: null,
                        })
                        setViewCourse(next)
                      }
                      setEditingCourse(false)
                    }}
                    onBlur={() => setEditingCourse(false)}
                    style={{ fontSize: 12, padding: '1px 4px', borderRadius: 4, border: '1px solid rgba(255,255,255,.4)', background: '#1a3a5c', color: '#fff' }}
                  >
                    {Object.keys(COURSES).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <span
                    onClick={() => setEditingCourse(true)}
                    style={{ cursor: 'pointer', borderBottom: '1px dashed rgba(255,255,255,.5)', paddingBottom: 1 }}
                    title="Click to change course"
                  >
                    {viewCourse} ✏
                  </span>
                )
              ) : (
                viewCourse
              )}
              {' · '}{COURSES[viewCourse]?.avia} · {student.base} ·{' '}
              {isViewingPastCourse && <span style={{ background: 'rgba(255,255,255,.15)', padding: '1px 6px', borderRadius: 4, marginRight: 4 }}>past</span>}
              {isInstructor ? (
                editingAircraft ? (
                  <select
                    value={student.aircraft}
                    autoFocus
                    onChange={(e) => { onUpdateStudent(student.id, { aircraft: e.target.value }); setEditingAircraft(false) }}
                    onBlur={() => setEditingAircraft(false)}
                    style={{ fontSize: 12, padding: '1px 4px', borderRadius: 4, border: '1px solid rgba(255,255,255,.4)', background: '#1a3a5c', color: '#fff' }}
                  >
                    {AIRCRAFT_LIST.map((a) => (
                      <option key={a} value={a}>{a} — ${AIRCRAFT_RATES[a] || 0}/hr</option>
                    ))}
                  </select>
                ) : (
                  <span
                    onClick={() => setEditingAircraft(true)}
                    style={{ cursor: 'pointer', borderBottom: '1px dashed rgba(255,255,255,.5)', paddingBottom: 1 }}
                    title="Click to change aircraft"
                  >
                    {student.aircraft} ✏
                  </span>
                )
              ) : student.aircraft}
            </small>
          </div>
        </div>
        {/* Primary / Secondary for the course being viewed. When viewing a past
            course, pull from courseHistory and render read-only (those facts are
            historical and shouldn't be editable). */}
        {(() => {
          const histEntry = isViewingPastCourse
            ? student.courseHistory?.find((h) => h.course === viewCourse)
            : null
          const primaryName   = histEntry?.primaryInstructor   || student.primaryInstructor
          const secondaryName = histEntry?.secondaryInstructor || student.secondaryInstructor
          const editable = isInstructor && !isViewingPastCourse
          return (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.85)' }}>
                Primary:{' '}
                {editable ? (
                  editingPrimary ? (
                    <select
                      value={primaryName}
                      autoFocus
                      onChange={(e) => { onUpdateStudent(student.id, { primaryInstructor: e.target.value }); setEditingPrimary(false) }}
                      onBlur={() => setEditingPrimary(false)}
                      style={{ fontSize: 12, padding: '1px 4px', borderRadius: 4, border: '1px solid rgba(255,255,255,.4)', background: '#1a3a5c', color: '#fff', width: 'auto', display: 'inline-block' }}
                    >
                      {baseInstructors.map((n) => (<option key={n} value={n}>{n}</option>))}
                    </select>
                  ) : (
                    <span
                      onClick={() => setEditingPrimary(true)}
                      style={{ cursor: 'pointer', borderBottom: '1px dashed rgba(255,255,255,.5)', paddingBottom: 1 }}
                      title="Click to change primary instructor"
                    >
                      {primaryName} ✏
                    </span>
                  )
                ) : primaryName}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)' }}>
                Secondary:{' '}
                {editable ? (
                  editingSecondary ? (
                    <select
                      value={secondaryName || ''}
                      autoFocus
                      onChange={(e) => { onUpdateStudent(student.id, { secondaryInstructor: e.target.value }); setEditingSecondary(false) }}
                      onBlur={() => setEditingSecondary(false)}
                      style={{ fontSize: 12, padding: '1px 4px', borderRadius: 4, border: '1px solid rgba(255,255,255,.4)', background: '#1a3a5c', color: '#fff', width: 'auto', display: 'inline-block' }}
                    >
                      <option value="">— none —</option>
                      {baseInstructors.map((n) => (<option key={n} value={n}>{n}</option>))}
                    </select>
                  ) : (
                    <span
                      onClick={() => setEditingSecondary(true)}
                      style={{ cursor: 'pointer', borderBottom: '1px dashed rgba(255,255,255,.5)', paddingBottom: 1 }}
                      title="Click to change secondary instructor"
                    >
                      {secondaryName || '— none —'} ✏
                    </span>
                  )
                ) : (secondaryName || '')}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Print-only header */}
      <div className="print-only print-header">
        <h1 style={{ margin: 0, fontSize: 18 }}>{student.name}</h1>
        <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>
          {student.course} · {COURSES[student.course]?.avia} · {student.base} · {student.aircraft}
        </div>
        <div style={{ fontSize: 12, color: '#374151' }}>
          Primary: {student.primaryInstructor}
          {student.secondaryInstructor ? ` · Secondary: ${student.secondaryInstructor}` : ''}
        </div>
        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
          Printed {new Date().toLocaleDateString()}
        </div>
      </div>

      <div style={{ padding: 16, maxWidth: 1280, margin: '0 auto' }} className="print-container">
        {/* Course selector — present when the student has any past courses to view. */}
        {(student.courseHistory?.length > 0 || canEdit) && (
          <div className="no-print" style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, color: '#6b7280' }}>Viewing course:</label>
            <select
              value={viewCourse}
              onChange={(e) => setViewCourse(e.target.value)}
              style={{ fontSize: 13, padding: '4px 8px', width: 'auto', borderRadius: 6 }}
            >
              {/* Current course (auto-archived to history once it hits 100%,
                  so we suppress that history entry below to avoid showing
                  the same course twice in the dropdown). */}
              {(() => {
                const completedSelf = (student.courseHistory || []).find((h) => h.course === student.course)
                return (
                  <option value={student.course}>
                    {student.course} (current{completedSelf ? ' · 100%' : ''})
                  </option>
                )
              })()}
              {(student.courseHistory || [])
                .filter((h) => h.course !== student.course)
                .map((h) => (
                  <option key={h.course} value={h.course}>
                    {h.course} {h.completedDate ? `(completed ${h.completedDate})` : '(completed)'}
                  </option>
                ))}
            </select>
            {isViewingPastCourse && (
              <span style={{ fontSize: 11, color: '#92400e', background: '#fef3c7', padding: '2px 8px', borderRadius: 12 }}>
                Read-only · historical record
              </span>
            )}
          </div>
        )}

        {/* "Course complete — move to next" banner. Surfaces once the
            current course hits 100%. Three picks:
              • Next course (dropdown of typical next syllabuses)
              • Next term (A or D of whatever semester is recommended)
              • Accelerated flag (only meaningful for A — D is inherently
                accelerated, so the toggle is hidden for D)
            All three default to the predicted recommendation but can be
            overridden before confirming. */}
        {canEdit && progress.pct >= 100 && viewCourse === student.course && (() => {
          const options = NEXT_COURSE_OPTIONS[student.course] || []
          const completedSet = new Set((student.courseHistory || []).map((h) => h.course))
          const availableOptions = options.filter((c) => !completedSet.has(c))
          if (availableOptions.length === 0) return null

          const nextCourse = nextCourseChoice || availableOptions[0]
          const predicted = predictNextPace(student)        // null if no upcoming term in LU_TERMS

          // Upcoming semesters the student could enroll in. Includes the
          // predicted one plus any further-future semesters in LU_TERMS,
          // so a student can deliberately push their next course out a
          // semester or two if needed.
          const todayIso = new Date().toISOString().slice(0, 10)
          const upcomingSemesters = [...new Set(
            LU_TERMS
              .filter((t) => (t.subterm === 'A' || t.subterm === 'D') && t.end >= todayIso)
              .sort((a, b) => a.start.localeCompare(b.start))
              .map((t) => t.semester)
          )]
          const chosenSemester = nextSemesterChoice || predicted?.pace.semester || upcomingSemesters[0] || ''
          const semesterTerms = chosenSemester
            ? LU_TERMS.filter((t) => t.semester === chosenSemester && (t.subterm === 'A' || t.subterm === 'D'))
            : []
          const defaultSubterm = predicted?.pace.subterm || (semesterTerms[0]?.subterm ?? 'A')
          // If the user switched the semester away from the predicted one,
          // ignore the predicted subterm and just default to A.
          const baseSubterm = chosenSemester === predicted?.pace.semester ? defaultSubterm : 'A'
          const chosenSubterm = nextTermChoice || baseSubterm
          const chosenAccelerated = nextAcceleratedChoice ?? (predicted?.accelerated ?? false)

          const wasAccelerated = student.pace?.subterm === 'A' && student.accelerated
          const acceleratedDeadline = wasAccelerated ? flightDeadline(student.pace, true) : null
          const finishedOnTime = wasAccelerated
            ? (!acceleratedDeadline || new Date().toISOString().slice(0, 10) <= acceleratedDeadline)
            : null

          return (
            <div
              className="no-print"
              style={{
                marginBottom: 16, padding: '12px 16px', borderRadius: 8,
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>
                  ✓ {student.course} complete
                </div>
                <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>
                  Pick where {student.name.split(' ')[0]} goes next:
                </div>
                {wasAccelerated && finishedOnTime === false && (
                  <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>
                    Missed the {acceleratedDeadline} accelerated buffer — defaulting away from same-semester D.
                  </div>
                )}
              </div>

              {/* Course picker */}
              <select
                value={nextCourse}
                onChange={(e) => setNextCourseChoice(e.target.value)}
                style={{ fontSize: 13, padding: '6px 10px', width: 'auto', borderRadius: 6, border: '1px solid #86efac', background: '#fff' }}
              >
                {availableOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Semester picker — every upcoming semester on the
                  Liberty calendar is selectable so students can push
                  out a course if they need extra time. */}
              {upcomingSemesters.length > 0 && (
                <select
                  value={chosenSemester}
                  onChange={(e) => {
                    setNextSemesterChoice(e.target.value)
                    setNextTermChoice('')   // reset term + accel when semester changes
                    setNextAcceleratedChoice(null)
                  }}
                  style={{ fontSize: 13, padding: '6px 10px', width: 'auto', borderRadius: 6, border: '1px solid #86efac', background: '#fff' }}
                  title="Semester"
                >
                  {upcomingSemesters.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}

              {/* Term picker — A or D within the chosen semester. */}
              {semesterTerms.length > 0 && (
                <select
                  value={chosenSubterm}
                  onChange={(e) => setNextTermChoice(e.target.value)}
                  style={{ fontSize: 13, padding: '6px 10px', width: 'auto', borderRadius: 6, border: '1px solid #86efac', background: '#fff' }}
                  title={`Term within ${chosenSemester}`}
                >
                  {semesterTerms.map((t) => (
                    <option key={t.subterm} value={t.subterm}>{t.subterm} term</option>
                  ))}
                </select>
              )}

              {/* Accelerated toggle — only meaningful for A term picks. */}
              {chosenSubterm === 'A' && (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#15803d', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!chosenAccelerated}
                    onChange={(e) => setNextAcceleratedChoice(e.target.checked)}
                    style={{ width: 'auto' }}
                  />
                  Accelerated
                </label>
              )}

              <button
                className="btn btn-sm btn-primary"
                onClick={() => {
                  const nextPace = chosenSemester
                    ? { semester: chosenSemester, subterm: chosenSubterm }
                    : null
                  // D term is inherently accelerated; no flag stored for D.
                  const isAcc = chosenSubterm === 'A' && !!chosenAccelerated
                  onUpdateStudent(student.id, {
                    course: nextCourse,
                    pace: nextPace,
                    accelerated: isAcc,
                    scheduledFsc: null,
                    backupFsc: null,
                  })
                  setNextCourseChoice('')
                  setNextSemesterChoice('')
                  setNextTermChoice('')
                  setNextAcceleratedChoice(null)
                  setViewCourse(nextCourse)
                }}
              >
                Move to {nextCourse}{chosenSemester ? ` · ${chosenSubterm}${chosenSubterm === 'A' && chosenAccelerated ? '*' : ''}` : ''}
              </button>
            </div>
          )
        })()}

        {/* Instructor contact card — visible to students AND instructors */}
        {(() => {
          const findInstr = (n) => n ? instructors.find((i) => eqName(i.name, n)) : null
          // When viewing a past course, prefer the primary/secondary recorded
          // for that course in courseHistory; otherwise fall back to current.
          const histEntry = isViewingPastCourse
            ? student.courseHistory?.find((h) => h.course === viewCourse)
            : null
          const primaryName   = histEntry?.primaryInstructor   || student.primaryInstructor
          const secondaryName = histEntry?.secondaryInstructor || student.secondaryInstructor
          const primary = findInstr(primaryName)
          const secondary = findInstr(secondaryName)
          const shown = [primary, secondary].filter(Boolean)
          if (shown.length === 0) return null
          return (
            <div style={{ marginBottom: 16, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Instructors
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: shown.length === 2 ? '1fr 1fr' : '1fr', gap: 16 }}>
                {primary && <InstructorContact label="Primary" ins={primary} />}
                {secondary && <InstructorContact label="Secondary" ins={secondary} />}
              </div>
            </div>
          )
        })()}

        {/* Training Review required banner */}
        {needsTR && (
          <div className="tr-banner no-print">
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#991b1b' }}>
                ⚠ Training Review required
              </div>
              {oopLessons.length > 0 && (
                <div style={{ fontSize: 12, color: '#7f1d1d', marginTop: 2 }}>
                  {oopLessons.length} out-of-pocket repeat{oopLessons.length === 1 ? '' : 's'} logged
                  {' '}({oopLessons.map((l) => l.id).join(', ')}).
                </div>
              )}
              {stageCheckLibViolations.length > 0 && (
                <div style={{ fontSize: 12, color: '#7f1d1d', marginTop: 2 }}>
                  Stage check / progress check repeats must be out of pocket — fix:{' '}
                  {stageCheckLibViolations.map((l) => l.id).join(', ')}
                </div>
              )}
              {extraLibViolations.length > 0 && (
                <div style={{ fontSize: 12, color: '#7f1d1d', marginTop: 2 }}>
                  Only 1 funded repeat allowed per course — these must be OOP:{' '}
                  {extraLibViolations.map((l) => l.id).join(', ')}
                </div>
              )}
              {multiRepeatLessons.length > 0 && (
                <div style={{ fontSize: 12, color: '#7f1d1d', marginTop: 2 }}>
                  Only the first repeat per lesson is funded — additional repeats are OOP on:{' '}
                  {multiRepeatLessons.map((l) => l.id).join(', ')}
                </div>
              )}
              <div style={{ fontSize: 12, color: '#7f1d1d', marginTop: 4 }}>
                A signed TR must be e-mailed to flightaffiliate@liberty.edu.
              </div>
            </div>
            {isInstructor && (
              <button className="btn btn-primary" onClick={() => setShowTR(true)}>
                Generate Training Review
              </button>
            )}
          </div>
        )}

        {/* Training Review history — visible to everyone (chiefs, instructors,
            students). Lists every saved review with date / author / rationale
            so the trail is preserved in case a printed/emailed copy goes
            missing. Stays hidden when no reviews have been generated yet. */}
        {(student.trainingReviews || []).length > 0 && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                Training Review history ({student.trainingReviews.length})
              </h3>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>Saved when a review is e-mailed or printed</span>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {[...student.trainingReviews].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((tr) => (
                <details key={tr.id} style={{ border: '1px solid #f1f5f9', borderRadius: 6, padding: '6px 10px', background: '#fafafa' }}>
                  <summary style={{ cursor: 'pointer', fontSize: 12, color: '#374151', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong>{tr.date ? new Date(tr.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</strong>
                    <span style={{ color: '#6b7280' }}>{tr.course}</span>
                    <span style={{ color: '#9ca3af' }}>· written by {tr.writtenBy || '—'}</span>
                    {tr.designeeSig && tr.studentSig && (
                      <span className="tag tag-green" style={{ fontSize: 10 }}>signed</span>
                    )}
                  </summary>
                  <div style={{ marginTop: 8, fontSize: 11, color: '#374151', display: 'grid', gap: 6 }}>
                    {tr.rationale && (
                      <div><strong style={{ color: '#6b7280' }}>Rationale:</strong>
                        <pre style={{ whiteSpace: 'pre-wrap', margin: '2px 0 0', fontFamily: 'inherit', fontSize: 11 }}>{tr.rationale}</pre>
                      </div>
                    )}
                    {tr.outcomes && (
                      <div><strong style={{ color: '#6b7280' }}>Outcomes / Next Steps:</strong>
                        <pre style={{ whiteSpace: 'pre-wrap', margin: '2px 0 0', fontFamily: 'inherit', fontSize: 11 }}>{tr.outcomes}</pre>
                      </div>
                    )}
                    {tr.funding && (
                      <div><strong style={{ color: '#6b7280' }}>Funding Plan:</strong>
                        <pre style={{ whiteSpace: 'pre-wrap', margin: '2px 0 0', fontFamily: 'inherit', fontSize: 11 }}>{tr.funding}</pre>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 4, color: '#6b7280' }}>
                      <div>
                        <strong>FTA Designee:</strong>{' '}
                        {tr.designeeSigName || <span style={{ color: '#9ca3af' }}>(no printed name)</span>}
                        <div style={{ marginTop: 4 }}>
                          {tr.designeeSig
                            ? <img src={tr.designeeSig} alt="FTA Designee signature" style={{ maxWidth: '100%', height: 50, border: '1px solid #e5e7eb', borderRadius: 4, background: '#fff' }} />
                            : <span style={{ color: '#dc2626', fontStyle: 'italic' }}>— unsigned —</span>}
                        </div>
                      </div>
                      <div>
                        <strong>Student:</strong>{' '}
                        {tr.studentSigName || <span style={{ color: '#9ca3af' }}>(no printed name)</span>}
                        <div style={{ marginTop: 4 }}>
                          {tr.studentSig
                            ? <img src={tr.studentSig} alt="Student signature" style={{ maxWidth: '100%', height: 50, border: '1px solid #e5e7eb', borderRadius: 4, background: '#fff' }} />
                            : <span style={{ color: '#dc2626', fontStyle: 'italic' }}>— unsigned —</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* Stats — Progress always shown. Est. cost + LU balance shown
            only to instructors. Out-of-pocket card appears for anyone
            (student or instructor) when OOP charges exist. Grid sizes
            to whichever combination is actually visible. */}
        <div
          className={statCardGridClass}
          style={{ marginBottom: 16 }}
        >
          <StatCard label="Progress" value={`${progress.pct}%`} valueColor="#1a3a5c">
            <div style={{ marginTop: 6 }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress.pct}%`, background: '#1a3a5c' }} />
              </div>
            </div>
            {/* "Falling behind" warning — surfaces when at least one lesson's
                target completion date is 10+ days in the past and that
                lesson isn't done yet. Visible to all viewers. */}
            {(() => {
              const bs = behindSchedule(student, course, sLogs)
              if (!bs.behind) return null
              return (
                <div
                  style={{
                    marginTop: 8, padding: '4px 8px', borderRadius: 4,
                    background: '#fef2f2', border: '1px solid #fecaca',
                    color: '#b91c1c', fontSize: 11, fontWeight: 700,
                    display: 'inline-block',
                  }}
                  title={`Lesson ${bs.lessonId}'s target was ${bs.daysBehind} days ago and still isn't logged.`}
                >
                  ⚠ Falling behind — {bs.daysBehind}d on lesson {bs.lessonId}
                </div>
              )
            })()}
            {paceProjection && !paceProjection.done && (
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }} title={`Based on ${paceProjection.lessonsPerWeek.toFixed(1)} lessons/week pace since first flight`}>
                Projected finish:{' '}
                <span style={{ fontWeight: 600, color: '#374151' }}>
                  {paceProjection.finishDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span style={{ color: '#9ca3af', marginLeft: 6 }}>
                  ({paceProjection.lessonsPerWeek.toFixed(1)}/wk)
                </span>
              </div>
            )}
            {paceProjection?.done && (
              <div style={{ fontSize: 11, color: '#16a34a', marginTop: 6, fontWeight: 600 }}>✓ All lessons complete</div>
            )}
            {!paceProjection && progress.completed > 0 && (
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                Need more logged flights to project pace
              </div>
            )}
            {/* Term-pace + FSC dates + per-week pacing — Liberty A/B/D
                subterm pacing PLUS a scheduled FSC date (and backup) so
                the pacer can target the actual planned check ride rather
                than the term cutoff. Effective deadline order:
                scheduledFsc → backupFsc → term-pace deadline. */}
            {(() => {
              // Some courses (e.g. Commercial 2) don't end with an FSC, so
              // the scheduled/backup FSC inputs don't apply there. Only
              // honor them when the current course actually has an fsc:true
              // lesson; otherwise the pacer falls back to the term cutoff.
              const courseHasFsc = !!course?.lessons?.some((l) => l.fsc)
              const dl = effectiveDeadline(student, courseHasFsc)
              const status = paceStatus(student, progress, courseHasFsc)
              const days = daysToEffectiveDeadline(student, courseHasFsc)
              const fpw = flightsPerWeek(student, progress, courseHasFsc)
              const statusColor = status === 'overdue' ? '#dc2626' : status === 'tight' ? '#b45309' : '#15803d'
              const fmtDate = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
              // D-term is accelerated by definition (8-week back-half of
              // the semester) so we label it as such. A-term gets the
              // accelerated tag only when the student explicitly toggled it.
              const isAcceleratedPace = student.pace?.subterm === 'D'
                || (student.pace?.subterm === 'A' && !!student.accelerated)
              const deadlineSource = courseHasFsc && student.scheduledFsc ? 'scheduled FSC'
                : courseHasFsc && student.backupFsc ? 'backup FSC'
                : student.pace      ? `${student.pace.semester} · ${student.pace.subterm} term${isAcceleratedPace ? ' (accelerated)' : ''}`
                : null
              return (
                <div style={{ fontSize: 11, marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e5e7eb', display: 'grid', gap: 6 }}>
                  {/* Row 1 — semester + subterm pickers. AA students only
                      enroll in A or D; the Accelerated toggle is a sub-
                      option under A (D is inherently accelerated). Both
                      pickers default to the next upcoming term but a
                      student / instructor can push a semester or switch
                      A↔D at any time. */}
                  {(() => {
                    const todayIsoNow = new Date().toISOString().slice(0, 10)
                    const allSemesters = [...new Set(
                      LU_TERMS
                        .filter((t) => (t.subterm === 'A' || t.subterm === 'D') && t.end >= todayIsoNow)
                        .sort((a, b) => a.start.localeCompare(b.start))
                        .map((t) => t.semester)
                    )]
                    const activeSemester = student.pace?.semester || allSemesters[0] || ''
                    const semesterHasA = LU_TERMS.some((t) => t.semester === activeSemester && t.subterm === 'A')
                    const semesterHasD = LU_TERMS.some((t) => t.semester === activeSemester && t.subterm === 'D')
                    return (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <span style={{ color: '#6b7280', paddingTop: 4 }}>Enrolled in:</span>
                        {allSemesters.length > 0 && (
                          <select
                            value={activeSemester}
                            onChange={(e) => {
                              const newSem = e.target.value
                              // Preserve the currently-picked subterm if
                              // the new semester offers it, else default
                              // to A (every semester has A).
                              const wantedSub = student.pace?.subterm || 'A'
                              const hasWanted = LU_TERMS.some((t) => t.semester === newSem && t.subterm === wantedSub)
                              const subterm = hasWanted ? wantedSub : 'A'
                              onUpdateStudent(student.id, {
                                pace: { semester: newSem, subterm },
                                accelerated: false,
                              })
                            }}
                            style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid #d1d5db', background: '#fff' }}
                          >
                            {allSemesters.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        )}
                        {['A', 'D'].map((letter) => {
                          const active = student.pace?.subterm === letter && student.pace?.semester === activeSemester
                          const available = letter === 'A' ? semesterHasA : semesterHasD
                          return (
                            <div key={letter} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!available) return
                                  onUpdateStudent(student.id, {
                                    pace: { semester: activeSemester, subterm: letter },
                                    accelerated: false,
                                  })
                                }}
                                disabled={!available}
                                title={available ? `${activeSemester} · ${letter} term` : `No ${letter} term in ${activeSemester}`}
                                style={{
                                  fontSize: 11, fontWeight: 700, padding: '2px 10px',
                                  border: `1px solid ${active ? '#1a3a5c' : '#d1d5db'}`,
                                  background: active ? '#1a3a5c' : '#fff',
                                  color: active ? '#fff' : (available ? '#374151' : '#d1d5db'),
                                  borderRadius: 4,
                                  cursor: available ? 'pointer' : 'not-allowed',
                                }}
                              >
                                {letter} term
                              </button>
                              {letter === 'A' && active && (
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#6b7280', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={!!student.accelerated}
                                    onChange={(e) => onUpdateStudent(student.id, { accelerated: e.target.checked })}
                                    style={{ width: 'auto' }}
                                  />
                                  Accelerated
                                </label>
                              )}
                            </div>
                          )
                        })}
                        {student.pace && (
                          <button
                            type="button"
                            onClick={() => onUpdateStudent(student.id, { pace: null, accelerated: false })}
                            style={{ fontSize: 10, color: '#9ca3af', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
                          >
                            clear
                          </button>
                        )}
                        {student.pace && (
                          <span style={{ color: '#9ca3af' }}>
                            (term cutoff {fmtDate(flightDeadline(student.pace, student.accelerated))})
                          </span>
                        )}
                      </div>
                    )
                  })()}

                  {/* Row 2 — scheduled + backup FSC date inputs. Only
                      shown for courses that actually include an FSC
                      lesson. Courses like Commercial 2 don't have one,
                      so the pacer relies purely on the term cutoff. */}
                  {courseHasFsc ? (
                    <>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <label style={{ display: 'flex', gap: 4, alignItems: 'center', color: '#6b7280' }}>
                        Scheduled FSC:
                        <input
                          type="date"
                          value={student.scheduledFsc || ''}
                          onChange={(e) => onUpdateStudent(student.id, { scheduledFsc: e.target.value || null })}
                          style={{ fontSize: 11, padding: '1px 4px', border: '1px solid #d1d5db', borderRadius: 4 }}
                        />
                      </label>
                      <label style={{ display: 'flex', gap: 4, alignItems: 'center', color: '#6b7280' }}>
                        Backup:
                        <input
                          type="date"
                          value={student.backupFsc || ''}
                          onChange={(e) => onUpdateStudent(student.id, { backupFsc: e.target.value || null })}
                          style={{ fontSize: 11, padding: '1px 4px', border: '1px solid #d1d5db', borderRadius: 4 }}
                        />
                      </label>
                    </div>
                    {/* Buffer warning for accelerated A students — if the
                        scheduled FSC is within 14 days of D term start,
                        they won't have time to pick up a D-term course. */}
                    {(() => {
                      if (!student.accelerated) return null
                      if (student.pace?.subterm !== 'A') return null
                      const fsc = student.scheduledFsc || student.backupFsc
                      if (!fsc) return null
                      const dTerm = activeTermForSubterm('D')
                      if (!dTerm || dTerm.semester !== student.pace.semester) return null
                      const fscDate = new Date(fsc + 'T00:00:00')
                      const dStart  = new Date(dTerm.start + 'T00:00:00')
                      const daysBefore = (dStart - fscDate) / (1000 * 60 * 60 * 24)
                      if (daysBefore >= 14) return null
                      return (
                        <div style={{ marginTop: 2, padding: '4px 8px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 4, color: '#92400e', fontSize: 11 }}>
                          ⚠ This date is within 14 days of D term start ({dTerm.start}). The student won't have the required 2-week buffer to pick up a D-term course next.
                        </div>
                      )
                    })()}
                    </>
                  ) : (
                    <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                      This course has no Final Stage Check — pacer uses the term cutoff.
                    </div>
                  )}

                  {/* Row 3 — effective deadline + per-week pacer */}
                  {dl && (
                    <div>
                      <span style={{ color: '#6b7280' }}>Finish by </span>
                      <span style={{ fontWeight: 700, color: statusColor }}>{fmtDate(dl)}</span>
                      {deadlineSource && (
                        <span style={{ color: '#9ca3af' }}> ({deadlineSource})</span>
                      )}
                      {status !== 'on-track' && days != null && (
                        <span style={{ color: statusColor, fontWeight: 600, marginLeft: 4 }}>
                          · {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                        </span>
                      )}
                      {fpw != null && (
                        <div style={{ color: '#374151', marginTop: 2 }}>
                          Need{' '}
                          <span style={{ fontWeight: 700, color: statusColor }}>
                            {fpw.toFixed(1)} flight{fpw === 1 ? '' : 's'}/week
                          </span>
                          {' '}to hit that.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}
          </StatCard>

          {isInstructor && (
            <StatCard label="Est. cost" value={`$${progress.cost.toLocaleString()}`} onClick={() => setLedgerMode('cost')}>
              {(() => {
                // Show the LU-covered aircraft rate (capped at the course's
                // standard aircraft for Liberty students) so the figure
                // matches what's actually driving the projection. Pricier
                // student aircraft choice flows through to OOP only.
                const isLiberty = student.school === 'Liberty University'
                const standardAcId = isLiberty ? LU_STANDARD_AIRCRAFT[viewCourse] : null
                const standardRate = standardAcId ? AIRCRAFT_RATES[standardAcId] : null
                const luAcRate = (standardRate != null && standardRate < acRate) ? standardRate : acRate
                return (
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                    ${luAcRate}/hr acft · ${instrRate(student.base)}/hr instr
                  </div>
                )
              })()}
              {course?.enrollmentFee > 0 && course?.enrollmentFeeLabel && (
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  Incl. ${course.enrollmentFee.toLocaleString()} {course.enrollmentFeeLabel}
                </div>
              )}
              {/* One OOP line. If a forward projection is meaningfully larger
                  than what's been incurred, show both as "so far · est. at end".
                  Otherwise just show the single number. */}
              {(progress.oopCost > 0 || progress.projectedAircraftOop > 0) && (
                <div
                  style={{ fontSize: 11, color: '#b45309', marginTop: 2, fontWeight: 600 }}
                  title="Out-of-pocket charges so far. Projection assumes the student keeps flying their current aircraft for the rest of the course."
                >
                  + ${progress.oopCost.toLocaleString()} OOP
                  {progress.projectedAircraftOop > progress.oopCost && (
                    <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 6 }}>
                      (~${progress.projectedAircraftOop.toLocaleString()} at course end)
                    </span>
                  )}
                </div>
              )}
              {progress.projected != null && (
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  proj. <span style={{ fontWeight: 600, color: '#374151' }}>${progress.projected.toLocaleString()}</span> at target hrs
                </div>
              )}
              {progress.instructorPremium > 0 && (
                <div
                  style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}
                  title="LU still pays full rate for higher-rate instructors (chiefs/asst chiefs). This is the extra amount baked into the LU projection because logged flights used an instructor whose rate exceeds the primary's."
                >
                  ↑ ${progress.instructorPremium.toLocaleString()} from higher-rate instructor
                </div>
              )}
              {progress.projectedWithRepeat != null && progress.repeatsRemaining > 0 && (
                <div
                  style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}
                  title={`Adds a typical 1-repeat buffer (${(course.repeatBufferDual ?? 2.0).toFixed(1)} hr dual + 0.7 hr ground) on top of the baseline projection. Hidden once Liberty's funded repeat allowance is used up.`}
                >
                  w/ repeat <span style={{ fontWeight: 600, color: '#374151' }}>${progress.projectedWithRepeat.toLocaleString()}</span>
                </div>
              )}
            </StatCard>
          )}

          {isInstructor && (
            progress.flatRate ? (
              <StatCard
                label="LU balance"
                value={remaining >= 0 ? `$${remaining.toLocaleString()}` : `-$${Math.abs(remaining).toLocaleString()}`}
                valueColor={remaining < 0 ? '#dc2626' : '#15803d'}
                onClick={() => setLedgerMode('balance')}
              >
                <div className="budget-bar" style={{ marginTop: 6 }}>
                  <div className="budget-fill" style={{ width: `${Math.min(100, bp || 0).toFixed(0)}%`, background: budgetColor(bp) }} />
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
                  {Math.round(bp || 0)}% of ${progress.flatRate.toLocaleString()} used
                </div>
                {/* Running over/under across all STARTED lessons — same
                    value as the Totals row at the bottom of the lesson
                    table, summed lesson-by-lesson as the student flies. */}
                {runningOverUnder != null && (() => {
                  const color = runningOverUnder > 0 ? '#b45309' : runningOverUnder < 0 ? '#15803d' : '#6b7280'
                  return (
                    <div style={{ fontSize: 11, marginTop: 4, color }}>
                      <span style={{ fontWeight: 600 }}>
                        {runningOverUnder >= 0 ? '+' : ''}{runningOverUnder.toFixed(1)}h
                      </span>
                      <span style={{ color: '#9ca3af' }}>
                        {' '}running over/under
                      </span>
                    </div>
                  )
                })()}
              </StatCard>
            ) : (
              <StatCard label="School" value={student.school} valueSize={14} />
            )
          )}

          {/* Out-of-pocket balance — student-facing only. Instructors and
              chiefs already see the OOP line inline on their Est. cost
              card, so duplicating it as a separate tile is redundant.
              Clicking opens the OOP-only ledger so the student can see
              each charge that contributed to their out-of-pocket total. */}
          {!isInstructor && (progress.oopCost > 0 || progress.projectedAircraftOop > 0) && (
            <StatCard
              label="Out of pocket"
              value={`$${progress.oopCost.toLocaleString()}`}
              valueColor="#b45309"
              onClick={() => setLedgerMode('oop')}
            >
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                Charges outside Liberty's flat-rate coverage
              </div>
              {progress.projectedAircraftOop > progress.oopCost && (
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  proj. <span style={{ fontWeight: 600, color: '#b45309' }}>${progress.projectedAircraftOop.toLocaleString()}</span> at course end
                </div>
              )}
            </StatCard>
          )}
        </div>

        {/* Syllabus table */}
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
              Course syllabus — {student.course}
              <span
                onMouseEnter={() => setShowLegend(true)}
                onMouseLeave={() => setShowLegend(false)}
                style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
              >
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#e5e7eb', color: '#6b7280',
                    fontSize: 10, fontWeight: 700,
                  }}
                >
                  i
                </span>
                {showLegend && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, marginTop: 6,
                    background: '#1f2937', color: '#fff',
                    padding: '8px 12px', borderRadius: 6,
                    fontSize: 11, fontWeight: 400, lineHeight: 1.5,
                    whiteSpace: 'nowrap', zIndex: 50,
                    boxShadow: '0 4px 12px rgba(0,0,0,.18)',
                  }}>
                    <div><strong>Dual · Solo · XC · Instr · Sim · Target</strong> — syllabus targets (read-only)</div>
                    <div><strong>Actual · Ground</strong> — entered per attempt</div>
                    <div>Over/Under = actual − target  (amber over, green under)</div>
                  </div>
                )}
              </span>
            </h2>
            {isInstructor && <span style={{ fontSize: 12, color: '#6b7280' }}>Click a row to log flight time</span>}
          </div>

          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: COLS, gap: 4,
            padding: '7px 10px', fontSize: 11, color: '#6b7280', fontWeight: 500,
            borderBottom: '1px solid #e5e7eb', background: '#f8fafc',
            minWidth: 1080,
          }}>
            <span>Lesson</span>
            <span style={{ textAlign: 'center' }}>Dual</span>
            <span style={{ textAlign: 'center' }}>Solo</span>
            <span style={{ textAlign: 'center' }}>XC</span>
            <span style={{ textAlign: 'center' }} title="Hood / instrument time">Instr</span>
            <span style={{ textAlign: 'center' }} title="Simulator hours">Sim</span>
            <span style={{ textAlign: 'center' }} title="Target total flight time for the lesson">Target</span>
            <span style={{ textAlign: 'center' }} title="Actual flight time logged this attempt">Actual</span>
            <span style={{ textAlign: 'center', paddingLeft: 16 }} title="Actual minus target — amber if over, green if under">Over/Under</span>
            <span style={{ textAlign: 'center' }}>Ground</span>
            <span style={{ textAlign: 'center' }}>Objectives</span>
            <span style={{ textAlign: 'center' }} title="Planned completion date — auto-spread between training start and the effective deadline">Target</span>
            <span style={{ textAlign: 'center' }} title="Actual completion date">Actual</span>
            <span style={{ textAlign: 'center' }}>Status</span>
          </div>

          {course.lessons.flatMap((lesson) => {
            // Build an "expanded" list: the original lesson row, plus a row for every
            // repeat-attempt key in storage. Then, if the LATEST entry (original or
            // newest repeat) was marked Repeat (Lib/OOP) or Incomplete, append an
            // empty placeholder row so the instructor has somewhere to log the next
            // attempt without having to dig through menus.
            //
            // Skip lessons that have been absorbed into a sibling combined flight
            // (e.g. 8.2 when 8.1's log was saved with "Combined with 8.2") — the
            // primary lesson's row will render a merged label for both.
            const myLg = sLogs[lesson.id] || {}
            if (myLg.combinedFrom) return []
            const items = [{ key: lesson.id, isRepeat: false }]
            const splitKeys  = splitKeysFor(sLogs, lesson.id)
            const repeatKeys = repeatKeysFor(sLogs, lesson.id)
            splitKeys.forEach((sk)  => items.push({ key: sk, isSplit: true }))
            repeatKeys.forEach((rk) => items.push({ key: rk, isRepeat: true }))

            // Identify the truly LATEST entry across original + splits + repeats
            // by date (falling back to insertion order if dates are missing).
            // Spawn rules:
            //   • latest has repeatedLib/Oop → spawn next __rN (repeat attempt)
            //   • latest has incomplete/splitContinuing → spawn next __sN
            //     (Liberty-funded continuation, or OOP if it inherits from an
            //     OOP repeat — handled in calcProgress)
            const allCandidates = [
              { key: lesson.id, lg: myLg },
              ...splitKeys.map((k) => ({ key: k, lg: sLogs[k] || {} })),
              ...repeatKeys.map((k) => ({ key: k, lg: sLogs[k] || {} })),
            ].filter((c) => c.lg && Object.keys(c.lg).length > 0)
            const latest = allCandidates.reduce((best, c) => {
              if (!best) return c
              const bestD = best.lg.date || ''
              const cD = c.lg.date || ''
              return cD >= bestD ? c : best
            }, null)
            const latestLg = latest?.lg || {}

            if (latestLg.repeatedLib || latestLg.repeatedOop) {
              const usedNums = repeatKeys.map((k) => parseInt(k.split('__r')[1], 10) || 0)
              const nextNum  = (usedNums.length ? Math.max(...usedNums) : 0) + 1
              const placeholderKey = `${lesson.id}__r${nextNum}`
              if (!sLogs[placeholderKey]) {
                items.push({ key: placeholderKey, isRepeat: true, pending: true })
              }
            }
            if (latestLg.splitContinuing || latestLg.incomplete) {
              const usedNums = splitKeys.map((k) => parseInt(k.split('__s')[1], 10) || 0)
              const nextNum  = (usedNums.length ? Math.max(...usedNums) : 0) + 1
              const placeholderKey = `${lesson.id}__s${nextNum}`
              if (!sLogs[placeholderKey]) {
                items.push({ key: placeholderKey, isSplit: true, pending: true })
              }
            }
            return items
          }).map(({ key, isRepeat, isSplit, pending }) => {
            // Resolve the underlying lesson definition (strip __rN or __sN suffixes).
            const baseId = key.split('__r')[0].split('__s')[0]
            const lesson = course.lessons.find((l) => l.id === baseId)
            const lg = sLogs[key] || {}
            // Status pill: "unsuccessful" (busted) ONLY applies to a Final
            // Stage Check marked with repeatedOop. FSC marked with incomplete
            // (weather/illness) is just a normal incomplete that spawns a
            // Liberty-funded continuation.
            const lessonDef = lesson  // alias for clarity
            const fscBusted = lessonDef.fsc && lg.repeatedOop
            const status = lg.completed
              ? 'done'
              : fscBusted
                ? 'unsuccessful'
                : lg.incomplete
                  ? 'incomplete'
                  : Object.keys(lg).length > 0 ? 'partial' : 'pending'
            const origLg = sLogs[baseId] || {}
            // 0-based index of this repeat (1st repeat = 0, 2nd = 1, ...). We
            // derive it directly from the __rN suffix to avoid any dependency on
            // how the storage keys happen to sort.
            const repeatNum = isRepeat ? (parseInt(key.split('__r')[1], 10) || 1) : 0
            const repeatIdx = isRepeat ? repeatNum - 1 : 0
            const repeatBadge = isRepeat ? repeatBillingType(lesson, repeatIdx) : null

            // Split target redistribution: when a lesson is being split across
            // multiple sessions, divide the lesson's total target between them.
            //  - Original row's "target" = hours actually logged this session
            //  - Each split row's "target" = remaining unfilled portion of the
            //    lesson, given what's been logged earlier in the chain
            // Sum across the chain therefore equals the lesson's original target.
            // Include the *placeholder* __sN row in the chain too, so on the
            // very first split the original row's target shrinks immediately
            // even before any real __sN data exists in storage yet.
            const splitsStorage   = splitKeysFor(sLogs, lesson.id)
            const baseOrigLg      = sLogs[lesson.id] || {}
            const lastStoredKey   = splitsStorage[splitsStorage.length - 1]
            const lastStoredLg    = lastStoredKey ? sLogs[lastStoredKey] : null
            const placeholderPending =
              (!lastStoredKey && (baseOrigLg.splitContinuing || baseOrigLg.incomplete)) ||
              (lastStoredKey  && (lastStoredLg?.splitContinuing || lastStoredLg?.incomplete))
            const effectiveSplitKeys = (() => {
              if (!placeholderPending) return splitsStorage
              const nums = splitsStorage.map((k) => parseInt(k.split('__s')[1], 10) || 0)
              const nextN = (nums.length ? Math.max(...nums) : 0) + 1
              return [...splitsStorage, `${lesson.id}__s${nextN}`]
            })()
            const splitChainKeys = [lesson.id, ...effectiveSplitKeys]
            const inSplitChain   = splitChainKeys.length > 1
            const myChainIdx     = inSplitChain ? splitChainKeys.indexOf(key) : -1
            let splitDisplayTarget = null
            if (inSplitChain && myChainIdx >= 0) {
              const myActual = (lg.dual || 0) + (lg.solo || 0) + (lg.sim || 0)
              if (myChainIdx === 0) {
                // Original row — target is what was actually flown this session.
                splitDisplayTarget = myActual
              } else {
                // Split row — target is whatever's left of the lesson total.
                const priorActual = splitChainKeys.slice(0, myChainIdx).reduce((s, k) => {
                  const pl = sLogs[k] || {}
                  return s + (pl.dual || 0) + (pl.solo || 0) + (pl.sim || 0)
                }, 0)
                splitDisplayTarget = Math.max(0, (lesson.t || 0) - priorActual)
              }
            }

            // If this row was auto-marked completed via a sibling lesson's
            // "Combined with" flag, redirect any click to the primary lesson.
            // (After the flatMap skip above this should rarely render, but keep
            // the redirect as a fallback.)
            const combinedFrom = lg.combinedFrom
            const isCombinedChild = !!combinedFrom
            // Detect if THIS lesson is the primary of a combined pair (its
            // sibling has been absorbed into this row via combinedFrom).
            const siblingId = !isRepeat && lesson.combinableWith
            const siblingLg  = siblingId ? sLogs[siblingId] : null
            const siblingDef = siblingId ? course.lessons.find((l) => l.id === siblingId) : null
            const isCombinedPrimary = !!(siblingLg?.combinedFrom === lesson.id && siblingDef)
            // Targets shown in this row — for the combined primary, sum both.
            const showLesson = isCombinedPrimary
              ? {
                  ...lesson,
                  id: `${lesson.id} + ${siblingDef.id}`,
                  d:  (lesson.d  || 0) + (siblingDef.d  || 0),
                  s:  (lesson.s  || 0) + (siblingDef.s  || 0),
                  x:  (lesson.x  || 0) + (siblingDef.x  || 0),
                  i:  (lesson.i  || 0) + (siblingDef.i  || 0),
                  sm: (lesson.sm || 0) + (siblingDef.sm || 0),
                  t:  (lesson.t  || 0) + (siblingDef.t  || 0),
                  g:  (lesson.g  || 0) + (siblingDef.g  || 0),
                }
              : lesson
            const openLog = () => {
              if (!isInstructor) return
              if (isCombinedChild) {
                const primaryLesson = course.lessons.find((l) => l.id === combinedFrom)
                if (primaryLesson) setLogLesson({ lesson: primaryLesson, key: combinedFrom })
              } else {
                setLogLesson({ lesson, key })
              }
            }
            return (
              <div
                key={key}
                style={{
                  display: 'grid', gridTemplateColumns: COLS, gap: 4,
                  alignItems: 'center', padding: '6px 10px',
                  borderBottom: '1px solid #f3f4f6', fontSize: 12, cursor: 'pointer',
                  background: isCombinedChild
                    ? 'rgba(7,89,133,.05)'
                    : isSplit
                      ? 'rgba(2,132,199,.04)'
                      : isRepeat
                        ? 'rgba(220,38,38,.04)'
                        : lesson.fsc ? 'rgba(185,28,28,.12)'    // FSC — bold red wash, biggest visual weight
                        : lesson.sc  ? 'rgba(26,58,92,.05)'     // regular / mock stage check
                        : lesson.pc  ? 'rgba(245,158,11,.04)'   // prog check
                        : '',
                  borderLeft: isCombinedChild
                    ? '3px solid #0284c7'
                    : isSplit
                      ? '3px solid #0284c7'
                      : isRepeat
                        ? '3px solid #dc2626'
                        : lesson.fsc
                          ? '4px solid #b91c1c'                  // FSC — thick red stripe
                          : undefined,
                  opacity: isCombinedChild ? 0.85 : 1,
                  minWidth: 1080,
                }}
                title={isCombinedChild ? `Logged as combined flight with lesson ${combinedFrom} — click to edit there` : undefined}
                onClick={openLog}
              >
                <div>
                  <span style={{ fontWeight: 500 }}>
                    {isRepeat
                      ? <span style={{ color: '#dc2626' }}>↻ {lesson.id}</span>
                      : isSplit
                        ? <span style={{ color: '#0284c7' }}>→ {lesson.id}</span>
                        : isCombinedPrimary ? showLesson.id : lesson.id}
                  </span>
                  {isSplit && (
                    <div className="tag tag-blue" style={{ marginTop: 2, fontSize: 10 }}>
                      split {parseInt(key.split('__s')[1], 10) || ''}{pending ? ' — log' : ''}
                    </div>
                  )}
                  {isCombinedPrimary && (
                    <div className="tag tag-blue" style={{ marginTop: 2, fontSize: 10 }}>
                      combined
                    </div>
                  )}
                  {isCombinedChild && (
                    <div className="tag tag-blue" style={{ marginTop: 2, fontSize: 10 }}>
                      ↔ with {combinedFrom}
                    </div>
                  )}
                  {isRepeat && repeatBadge && (
                    <div className={`tag ${repeatBadge === 'Lib' ? 'tag-blue' : 'tag-amber'}`} style={{ marginTop: 2, fontSize: 10 }}>
                      repeat ({repeatBadge}){pending ? ' — log' : ''}
                    </div>
                  )}
                  {!isRepeat && (lesson.sc || lesson.pc) && (
                    <div
                      className={`tag ${lesson.fsc ? '' : lesson.sc ? 'tag-blue' : 'tag-amber'}`}
                      style={{
                        marginTop: 2, fontSize: 10,
                        // FSC gets its own loud red pill so it can't be
                        // confused with a regular blue 'stage' badge.
                        ...(lesson.fsc ? { background: '#b91c1c', color: '#fff', fontWeight: 700 } : null),
                      }}
                    >
                      {lesson.fsc ? 'FINAL' : lesson.sc ? 'stage' : 'prog'}
                    </div>
                  )}
                </div>

                {/* Syllabus targets — read-only single numbers per lesson.
                    Uses showLesson so combined pairs (e.g. 8.1 + 8.2) display
                    the summed targets on one line. Split-continuation rows
                    show "—" for the per-bucket sub-targets. Lib repeat rows
                    use the course's "repeat buffer" target (1.0 hr dual on
                    Commercial courses, 2.0 hr on everything else) — not the
                    original lesson's full target — because a Liberty-funded
                    repeat is a shorter targeted fix, not a redo of the whole
                    lesson. */}
                {(() => {
                  const isLibRepeat = isRepeat && repeatBadge === 'Lib'
                  const repeatDual  = course.repeatBufferDual ?? 2.0
                  const dualTgt = isSplit ? 0 : isLibRepeat ? repeatDual : (showLesson.d || showLesson.sm)
                  const soloTgt = isSplit ? 0 : isLibRepeat ? 0 : showLesson.s
                  const xcTgt   = isSplit ? 0 : isLibRepeat ? 0 : showLesson.x
                  const iTgt    = isSplit ? 0 : isLibRepeat ? 0 : showLesson.i
                  const smTgt   = isSplit ? 0 : isLibRepeat ? 0 : showLesson.sm
                  const totTgt  = splitDisplayTarget !== null
                    ? splitDisplayTarget
                    : isLibRepeat ? repeatDual : (showLesson.t)
                  return (
                    <>
                      <TargetCell value={dualTgt} />
                      <TargetCell value={soloTgt} />
                      <TargetCell value={xcTgt} />
                      <TargetCell value={iTgt} />
                      <TargetCell value={smTgt} />
                      <TargetCell value={totTgt} bold />
                    </>
                  )
                })()}

                {/* Actual flight time logged this attempt. For split chains
                    we use the redistributed per-row target so over/under is
                    meaningful within each session. */}
                {(() => {
                  const isLibRepeat = isRepeat && repeatBadge === 'Lib'
                  const repeatDual  = course.repeatBufferDual ?? 2.0
                  const actualFlt = (lg.dual || 0) + (lg.solo || 0) + (lg.sim || 0)
                  const target    = splitDisplayTarget !== null
                    ? splitDisplayTarget
                    : isLibRepeat ? repeatDual : (showLesson.t || 0)
                  const diff      = actualFlt - target
                  const showDiff  = actualFlt > 0 && target > 0
                  return (
                    <>
                      <div style={{ textAlign: 'center', fontWeight: 500 }}>
                        {actualFlt > 0 ? actualFlt.toFixed(1) : '—'}
                      </div>
                      <div style={{
                        textAlign: 'center', paddingLeft: 16, fontSize: 11, fontWeight: 600,
                        color: !showDiff ? '#d1d5db' : diff > 0 ? '#b45309' : diff < 0 ? '#15803d' : '#6b7280',
                      }}>
                        {showDiff ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}` : '—'}
                      </div>
                    </>
                  )
                })()}

                {/* Ground time logged this attempt — keeps the logged/target
                    overlay. Lib repeat rows show the buffer ground target
                    (0.7) rather than the original lesson's ground. */}
                <LogCell logged={lg.ground} rec={(isRepeat && repeatBadge === 'Lib') ? 0.7 : showLesson.g} />

                <span style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.35, wordBreak: 'break-word', whiteSpace: 'normal' }}>
                  {isCombinedPrimary ? `${lesson.o} · ${siblingDef.o}` : lesson.o}
                </span>

                {/* Target Date cell — auto-spread from training start →
                    deadline. Coloured amber when the actual completion
                    landed after the target; green when on/before. Empty
                    "—" until a pace or FSC date defines a deadline. */}
                {(() => {
                  const baseId = key.split('__r')[0].split('__s')[0]
                  const target = targetDates[baseId]
                  if (!target) {
                    return <span style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db' }}>—</span>
                  }
                  const shortTarget = new Date(target + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
                  let color = '#6b7280'
                  if (lg.date) {
                    color = lg.date <= target ? '#15803d' : '#b45309'   // green if hit, amber if late
                  }
                  return (
                    <span style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color }} title={`Target: ${target}`}>
                      {shortTarget}
                    </span>
                  )
                })()}

                {/* Actual Date cell — inline editable for instructors */}
                <span
                  style={{ textAlign: 'center', fontSize: 11, color: '#6b7280', cursor: isInstructor && Object.keys(lg).length > 0 ? 'pointer' : 'default' }}
                  onClick={(e) => {
                    if (isInstructor && Object.keys(lg).length > 0) {
                      e.stopPropagation()
                      setEditingDate(key)
                    }
                  }}
                >
                  {editingDate === key ? (
                    <input
                      type="date"
                      defaultValue={lg.date || new Date().toISOString().slice(0, 10)}
                      autoFocus
                      style={{ fontSize: 11, padding: '2px 4px', border: '1px solid #1a3a5c', borderRadius: 4, width: '100%' }}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => { onLogFlight(student.id, viewCourse, key, { ...lg, date: e.target.value }); setEditingDate(null) }}
                    />
                  ) : (
                    <span>
                      {lg.date
                        ? new Date(lg.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
                        : '—'}
                      {isInstructor && Object.keys(lg).length > 0 && (
                        <span style={{ marginLeft: 4, color: '#d1d5db', fontSize: 10 }}>✏</span>
                      )}
                    </span>
                  )}
                </span>

                <span style={{ textAlign: 'center' }}>
                  {status === 'done'         && <span className="tag tag-green">done</span>}
                  {status === 'partial'      && <span className="tag tag-amber">in prog</span>}
                  {status === 'incomplete'   && <span className="tag tag-amber">incomplete</span>}
                  {status === 'unsuccessful' && <span className="tag tag-red">unsuccessful</span>}
                  {status === 'pending'      && (
                    <span
                      className="tag"
                      style={{
                        background: '#fff',
                        color: '#6b7280',
                        border: '1px solid #d1d5db',
                        fontWeight: 600,
                      }}
                    >
                      pending
                    </span>
                  )}
                </span>
              </div>
            )
          })}

          {/* Totals row */}
          {(() => {
            const targetDual = course.lessons.reduce((s,l) => s + (l.d  || l.sm || 0), 0)
            const targetSolo = course.lessons.reduce((s,l) => s + (l.s  || 0), 0)
            const targetXC   = course.lessons.reduce((s,l) => s + (l.x  || 0), 0)
            const targetInst = course.lessons.reduce((s,l) => s + (l.i  || 0), 0)
            const targetSim  = course.lessons.reduce((s,l) => s + (l.sm || 0), 0)
            const targetGnd  = course.lessons.reduce((s,l) => s + (l.g  || 0), 0)
            // Over/Under total = sum of (actual − target) per lesson "attempt",
            // where an attempt is the chain of original + split-continuations
            // (those all sum vs ONE lesson target), and each repeat is its own
            // attempt vs the lesson target. Combined-primary rows include the
            // sibling lesson's target; combined-child rows are skipped (their
            // hours are recorded on the primary).
            let overUnderTot = 0
            let anyDiff = false
            const hours = (lg) => (lg?.dual || 0) + (lg?.solo || 0) + (lg?.sim || 0)
            course.lessons.forEach((lesson) => {
              const origLg = sLogs[lesson.id]
              // Combined child: its hours are folded into the primary row.
              if (origLg?.combinedFrom) return

              // Original + splits → one summed attempt vs the lesson target
              let chainActual = hours(origLg)
              splitKeysFor(sLogs, lesson.id).forEach((sk) => { chainActual += hours(sLogs[sk]) })

              let target = lesson.t || 0
              // If this lesson is the primary of a combined pair, add sibling target.
              if (lesson.combinableWith) {
                const sibLg = sLogs[lesson.combinableWith]
                if (sibLg?.combinedFrom === lesson.id) {
                  const sibDef = course.lessons.find((l) => l.id === lesson.combinableWith)
                  if (sibDef) target += (sibDef.t || 0)
                }
              }

              if (chainActual > 0 && target > 0) {
                overUnderTot += (chainActual - target)
                anyDiff = true
              }

              // Each repeat: its own attempt vs the (single) lesson target
              repeatKeysFor(sLogs, lesson.id).forEach((rk) => {
                const r = hours(sLogs[rk])
                if (r > 0 && (lesson.t || 0) > 0) {
                  overUnderTot += (r - (lesson.t || 0))
                  anyDiff = true
                }
              })
            })
            return (
              <div style={{
                display: 'grid', gridTemplateColumns: COLS, gap: 4,
                padding: '8px 10px', background: '#f8fafc',
                fontSize: 12, fontWeight: 600, borderTop: '2px solid #e5e7eb',
                minWidth: 1080,
              }}>
                <span>Totals</span>
                <span style={{ textAlign: 'center' }}>{fmt(targetDual)}</span>
                <span style={{ textAlign: 'center' }}>{fmt(targetSolo)}</span>
                <span style={{ textAlign: 'center' }}>{fmt(targetXC)}</span>
                <span style={{ textAlign: 'center' }}>{fmt(targetInst)}</span>
                <span style={{ textAlign: 'center' }}>{fmt(targetSim)}</span>
                <span style={{ textAlign: 'center' }}>{parseFloat(course.targetTotal).toFixed(1)}</span>
                <span style={{ textAlign: 'center' }}>{fmt(totFlown)}</span>
                <span style={{
                  textAlign: 'center', paddingLeft: 16,
                  color: overUnderTot > 0 ? '#b45309' : overUnderTot < 0 ? '#15803d' : '#6b7280',
                }}>
                  {anyDiff ? `${overUnderTot > 0 ? '+' : ''}${overUnderTot.toFixed(1)}` : '—'}
                </span>
                <TotalCell logged={totGround} rec={targetGnd} />
                <span />
                <span />
                <span />
                <span style={{ textAlign: 'center' }}>{progress.completed}/{progress.total}</span>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Replace syllabus — destructive footer action for fixing a wrong
          course assignment. Inline picker: click "Replace this syllabus"
          to reveal a dropdown of every course, pick the right one,
          confirm — old course's logs are wiped, history entry removed,
          student.course atomically swapped to the new course. */}
      {canEdit && (
        <div className="no-print" style={{ padding: '40px 16px 32px', maxWidth: 1280, margin: '0 auto', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
          {!replaceCourseMode ? (
            <>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => {
                  setReplaceCourseMode(true)
                  // Default the dropdown to whatever else makes sense
                  // (first course that isn't the current one).
                  const other = Object.keys(COURSES).find((c) => c !== viewCourse) || ''
                  setReplaceCourseChoice(other)
                }}
              >
                Replace {viewCourse} syllabus
              </button>
              <div style={{ marginTop: 6, fontSize: 11, color: '#9ca3af' }}>
                Fixes a wrong course assignment — wipes all logs for {viewCourse}{(student.courseHistory || []).some((h) => h.course === viewCourse) ? ' and removes the course-history record' : ''}, then enrolls {student.name.split(' ')[0]} in the new course.
              </div>
            </>
          ) : (
            <div style={{
              display: 'inline-flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
              padding: '12px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
            }}>
              <span style={{ fontSize: 13, color: '#991b1b', fontWeight: 600 }}>
                Replace {viewCourse} with:
              </span>
              <select
                value={replaceCourseChoice}
                onChange={(e) => setReplaceCourseChoice(e.target.value)}
                autoFocus
                style={{ fontSize: 13, padding: '4px 8px', width: 'auto', borderRadius: 6, border: '1px solid #fca5a5' }}
              >
                {Object.keys(COURSES).filter((c) => c !== viewCourse).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => {
                  if (!replaceCourseChoice) return
                  const wasCurrent = viewCourse === student.course
                  const inHistory = (student.courseHistory || []).some((h) => h.course === viewCourse)
                  // Atomically: wipe old course's logs, drop its history
                  // entry, swap student.course to the new pick, reset
                  // pace + FSC dates (new course gets its own schedule).
                  onClearAllLogs?.(student.id, viewCourse)
                  const nextUpdates = {}
                  if (inHistory) {
                    nextUpdates.courseHistory = (student.courseHistory || []).filter((h) => h.course !== viewCourse)
                  }
                  if (wasCurrent) {
                    nextUpdates.course = replaceCourseChoice
                    nextUpdates.pace = null
                    nextUpdates.accelerated = false
                    nextUpdates.scheduledFsc = null
                    nextUpdates.backupFsc = null
                  }
                  if (Object.keys(nextUpdates).length > 0) {
                    onUpdateStudent(student.id, nextUpdates)
                  }
                  setViewCourse(replaceCourseChoice)
                  setReplaceCourseMode(false)
                  setReplaceCourseChoice('')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                Confirm replace
              </button>
              <button
                className="btn btn-sm"
                onClick={() => { setReplaceCourseMode(false); setReplaceCourseChoice('') }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {ledgerMode && (
        <LedgerModal
          student={student}
          logs={logs}
          instructors={instructors}
          mode={ledgerMode}
          viewCourse={viewCourse}
          onClose={() => setLedgerMode(null)}
        />
      )}

      {showTR && (
        <TrainingReviewModal
          student={student}
          logs={sLogs}
          instructors={instructors}
          oopLessons={oopLessons}
          policyViolations={policyViolations}
          onSaveReview={onSaveTrainingReview}
          onClose={() => setShowTR(false)}
        />
      )}

      {logLesson && (
        <LogFlightModal
          key={logLesson.key}  // force fresh state (e.g. Repeat again checkbox) on every repeat transition
          lesson={logLesson.lesson}
          existing={sLogs[logLesson.key] || {}}
          instructors={instructors}
          libRepeatUsedElsewhere={libRepeats.some((l) => l.id !== logLesson.lesson.id)}
          isRepeatAttempt={logLesson.key.includes('__r')}
          defaultInstructor={account?.role === 'instructor' || account?.role === 'chief' ? account?.name : undefined}
          defaultAircraft={student.aircraft}
          siblingLesson={logLesson.lesson?.combinableWith ? course.lessons.find((l) => l.id === logLesson.lesson.combinableWith) : null}
          siblingAlreadyCombined={
            logLesson.lesson?.combinableWith
              ? sLogs[logLesson.lesson.combinableWith]?.combinedFrom === logLesson.lesson.id
              : false
          }
          isLastRepeat={(() => {
            if (!logLesson.key.includes('__r')) return false
            const parentId = logLesson.key.split('__r')[0]
            const currentNum = parseInt(logLesson.key.split('__r')[1], 10) || 0
            // True only when no later repeat (__r(N+1), __r(N+2), ...) exists yet.
            const laterExists = repeatKeysFor(sLogs, parentId).some(
              (k) => (parseInt(k.split('__r')[1], 10) || 0) > currentNum
            )
            return !laterExists
          })()}
          onSave={(data) => {
            const { _repeatAgain, _combineWith, _uncombineSibling, _splitContinuing, ...lessonData } = data
            const prevLg = sLogs[logLesson.key] || {}
            // Carry the split-continuing flag onto the log so the syllabus
            // renderer knows to spawn the next __sN placeholder row.
            onLogFlight(student.id, viewCourse, logLesson.key, {
              ...lessonData,
              splitContinuing: _splitContinuing || undefined,
            })

            // "Combined with sibling lesson" — write a minimal sibling entry so
            // the syllabus shows both lessons completed by this single flight.
            // Mark it with `combinedFrom` so the row renders read-only and a
            // click redirects to the primary log (no double-logging).
            if (_combineWith) {
              const siblingLg = sLogs[_combineWith] || {}
              onLogFlight(student.id, viewCourse, _combineWith, {
                ...siblingLg,
                completed: true,
                date: lessonData.date || siblingLg.date,
                notes: siblingLg.notes || `Combined with ${logLesson.key}`,
                combinedFrom: logLesson.key,
              })
            }
            // "Uncombine" — user opened a combined lesson and unchecked the
            // Combined box. Clear the sibling's log so it's a separate row again.
            if (_uncombineSibling) {
              onClearLesson(student.id, viewCourse, _uncombineSibling)
            }

            // If this was a SPLIT session marked Completed ✓, also mark the
            // original (parent) lesson + any earlier splits complete.
            if (logLesson.key.includes('__s') && lessonData.completed) {
              const parentId = logLesson.key.split('__s')[0]
              const currentNum = parseInt(logLesson.key.split('__s')[1], 10) || 0
              const parentLg = sLogs[parentId] || {}
              if (!parentLg.completed) {
                onLogFlight(student.id, viewCourse, parentId, { ...parentLg, completed: true, splitContinuing: undefined, incomplete: undefined })
              }
              splitKeysFor(sLogs, parentId).forEach((sk) => {
                const num = parseInt(sk.split('__s')[1], 10) || 0
                if (num < currentNum) {
                  const slg = sLogs[sk] || {}
                  if (!slg.completed) {
                    onLogFlight(student.id, viewCourse, sk, { ...slg, completed: true, splitContinuing: undefined, incomplete: undefined })
                  }
                }
              })
            }
            // If this was a repeat attempt marked Completed ✓, also mark the
            // original (parent) lesson AND every earlier repeat attempt complete.
            // (Completing a later attempt implies all prior attempts are done too.)
            if (logLesson.key.includes('__r') && lessonData.completed) {
              const parentId = logLesson.key.split('__r')[0]
              const currentNum = parseInt(logLesson.key.split('__r')[1], 10) || 0

              // Parent (original) lesson
              const parentLg = sLogs[parentId] || {}
              if (!parentLg.completed) {
                onLogFlight(student.id, viewCourse, parentId, { ...parentLg, completed: true })
              }

              // Each earlier repeat attempt (__r1 ... __r(N-1))
              repeatKeysFor(sLogs, parentId).forEach((rk) => {
                const num = parseInt(rk.split('__r')[1], 10) || 0
                if (num < currentNum) {
                  const rlg = sLogs[rk] || {}
                  if (!rlg.completed) {
                    onLogFlight(student.id, viewCourse, rk, { ...rlg, completed: true })
                  }
                }
              })
            }

            // Case A: just flagged the ORIGINAL as a repeat. The parent's
            // repeatedLib / repeatedOop flag automatically makes the row
            // mapper render a pending __rN placeholder line on the
            // tracking sheet, so we just close the modal here — the
            // instructor can click the new row whenever they're ready to
            // log it. (Previously we auto-opened the next modal, which
            // felt jarring.)

            // Case B: user checked "Repeat again" on a repeat-attempt modal. Save
            // the current attempt (already done above) AND seed an empty next-repeat
            // entry so a new row appears on the tracking sheet, ready to be clicked
            // and logged. Then close the modal — no auto-opening another one.
            if (_repeatAgain && logLesson.key.includes('__r')) {
              const parentId = logLesson.key.split('__r')[0]
              const existing = repeatKeysFor(sLogs, parentId)
              const nums = existing.map((k) => parseInt(k.split('__r')[1], 10) || 0)
              const currentNum = parseInt(logLesson.key.split('__r')[1], 10) || 0
              const nextNum = Math.max(currentNum, ...(nums.length ? nums : [0])) + 1
              onLogFlight(student.id, viewCourse, `${parentId}__r${nextNum}`, {})
            }

            setLogLesson(null)
          }}
          onClear={() => {
            const key = logLesson.key
            onClearLesson(student.id, viewCourse, key)
            // If we just cleared a repeat or split row, also strip the
            // parent's spawn-trigger flags so a placeholder doesn't
            // immediately re-render the same row.
            if (key.includes('__r') || key.includes('__s')) {
              const parentId = key.split('__r')[0].split('__s')[0]
              const parentLg = sLogs[parentId] || {}
              const remainingRepeats = repeatKeysFor(sLogs, parentId).filter((k) => k !== key)
              const remainingSplits  = splitKeysFor(sLogs, parentId).filter((k) => k !== key)
              if (remainingRepeats.length === 0 && remainingSplits.length === 0) {
                const cleaned = { ...parentLg }
                delete cleaned.repeatedLib
                delete cleaned.repeatedOop
                delete cleaned.incomplete
                delete cleaned.splitContinuing
                onLogFlight(student.id, viewCourse, parentId, cleaned)
              }
            }
            setLogLesson(null)
          }}
          onClose={() => setLogLesson(null)}
        />
      )}
      {showAcctSettings && account && (
        <AccountSettingsModal
          account={account}
          onUpdateAccount={onUpdateAccount}
          onClose={() => setShowAcctSettings(false)}
        />
      )}
    </div>
  )
}

function InstructorContact({ label, ins }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginTop: 2 }}>{ins.name}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
        {ins.cert}
        {ins.lineRate === 110 && <span style={{ marginLeft: 6, color: '#dc2626' }}>· Chief</span>}
      </div>
      {(ins.phone || ins.email) ? (
        <div style={{ fontSize: 12, color: '#374151', marginTop: 6, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {ins.phone && (
            <a href={`tel:${ins.phone.replace(/[^\d+]/g, '')}`} style={{ color: '#1a3a5c', textDecoration: 'none' }}>
              {ins.phone}
            </a>
          )}
          {ins.email && (
            <a href={`mailto:${ins.email}`} style={{ color: '#1a3a5c', textDecoration: 'none' }}>
              {ins.email}
            </a>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, fontStyle: 'italic' }}>No contact info on file</div>
      )}
    </div>
  )
}

function StatCard({ label, value, valueColor, valueSize = 20, children, onClick }) {
  const interactive = !!onClick
  return (
    <div
      className="stat-card"
      onClick={onClick}
      style={interactive ? { cursor: 'pointer', transition: 'box-shadow .12s, transform .12s' } : undefined}
      onMouseEnter={interactive ? (e) => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(26,58,92,.08)' } : undefined}
      onMouseLeave={interactive ? (e) => { e.currentTarget.style.boxShadow = '' } : undefined}
      title={interactive ? 'Click to open detailed ledger' : undefined}
    >
      <div className="stat-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{label}</span>
        {interactive && <span style={{ fontSize: 10, color: '#9ca3af' }}>▸</span>}
      </div>
      <div className="stat-val" style={{ fontSize: valueSize, color: valueColor }}>{value}</div>
      {children}
    </div>
  )
}

/**
 * Single read-only target value (used for Dual / Solo / XC / Instr / Sim columns,
 * which mirror the syllabus and are not edited per attempt).
 */
function TargetCell({ value, bold = false }) {
  const has = (value || 0) > 0
  return (
    <div style={{
      textAlign: 'center', fontSize: 12,
      color: has ? '#111827' : '#d1d5db',
      fontWeight: bold ? 600 : 400,
    }}>
      {has ? value.toFixed(1) : '—'}
    </div>
  )
}

/**
 * Ground column cell — shows logged hours with the recommended target below in blue.
 * Turns green once logged meets or exceeds the recommendation.
 */
function LogCell({ logged, rec }) {
  const val = logged || 0
  const hasRec = rec > 0
  const over = hasRec && val > rec
  const met  = hasRec && val >= rec && !over
  // When logged exactly equals the target, show one number with a ✓ instead of
  // stacking the same value twice (which read as a UI glitch in feedback).
  if (met) {
    return (
      <div style={{ textAlign: 'center', fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
        {val.toFixed(1)} ✓
      </div>
    )
  }
  const valColor = val === 0 ? '#d1d5db' : (over ? '#dc2626' : '#111827')
  return (
    <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
      <div style={{ fontSize: 12, color: valColor, fontWeight: over ? 600 : 400 }}>
        {val > 0 ? val.toFixed(1) : '—'}
      </div>
      {hasRec && (
        <div style={{ fontSize: 9, fontWeight: 600, color: over ? '#dc2626' : '#2d6ab4' }}>
          {rec.toFixed(1)}
        </div>
      )}
    </div>
  )
}

/**
 * Ground totals cell — shows sum logged and course-wide recommended total.
 */
function TotalCell({ logged, rec }) {
  const hasRec = rec > 0
  const met = hasRec && logged >= rec
  return (
    <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
      <div style={{ fontSize: 12 }}>{logged > 0 ? logged.toFixed(1) : '—'}</div>
      {hasRec && (
        <div style={{ fontSize: 9, fontWeight: 600, color: met ? '#16a34a' : '#2d6ab4' }}>
          {rec.toFixed(1)} rec
        </div>
      )}
    </div>
  )
}
