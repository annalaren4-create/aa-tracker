import { useState, useEffect } from 'react'
import { COURSES, getCourseDef, syllabusVersionFor } from '../data/courses'
import { AIRCRAFT_LIST, AIRCRAFT_RATES, LU_STANDARD_AIRCRAFT, LU_TERMS, instrRate } from '../data/constants'
import { budgetPct, budgetColor, repeatKeysFor, splitKeysFor } from '../utils/calculations'
import { eqName } from '../utils/storage'
import { flightDeadline, daysToDeadline, paceStatus, effectiveDeadline, daysToEffectiveDeadline, flightsPerWeek, activeTermForSubterm, targetDatesForCourse, behindSchedule, getTerm, selectableTerms, fmtShortDate } from '../utils/terms'
import LogFlightModal from './modals/LogFlightModal'
import TrainingReviewModal from './modals/TrainingReviewModal'
import LedgerModal from './modals/LedgerModal'
import AccountSettingsModal from './modals/AccountSettingsModal'
import { InstructorContact, StatCard } from './StudentDetail/cells'
import CourseTransitionBanner from './StudentDetail/CourseTransitionBanner'
import TrainingReviewHistory from './StudentDetail/TrainingReviewHistory'
import LessonTable from './StudentDetail/LessonTable'
import { useToast } from './Toast'

export default function StudentDetail({
  student, logs, instructors, isInstructor, account, onUpdateAccount, onLogFlight, onClearLesson, onClearAllLogs, onUpdateStudent, onSaveTrainingReview, onDeleteTrainingReview, onBack, calcProgress,
}) {
  const toast = useToast()
  const [logLesson, setLogLesson] = useState(null)
  const [showTR, setShowTR] = useState(false)
  const [ledgerMode, setLedgerMode] = useState(null)  // 'hours' | 'cost' | 'balance' | null
  const [showLegend, setShowLegend] = useState(false)
  const [showAcctSettings, setShowAcctSettings] = useState(false)
  // (Next-course banner state lives inside CourseTransitionBanner.)
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
    if (viewCourse !== student.course) return
    const history = student.courseHistory || []
    const selfIdx = history.findIndex((h) => h.course === student.course)
    const today = new Date().toISOString().slice(0, 10)

    if (progress.pct >= 100) {
      // Course is complete — make sure it's stamped completed.
      if (selfIdx === -1) {
        onUpdateStudent?.(student.id, {
          courseHistory: [
            ...history,
            {
              course: student.course,
              completedDate: today,
              primaryInstructor: student.primaryInstructor,
              secondaryInstructor: student.secondaryInstructor,
            },
          ],
        })
      } else if (!history[selfIdx].completedDate) {
        // Re-completed after a dip — restore the completed stamp.
        const next = [...history]
        next[selfIdx] = { ...next[selfIdx], completedDate: today }
        onUpdateStudent?.(student.id, { courseHistory: next })
      }
    } else if (selfIdx !== -1) {
      // Dropped back below 100% — it's no longer a completed record.
      const entry = history[selfIdx]
      const hasBillingData = entry.rateDiscount != null || entry.syllabusVersion || entry.libRepeatsAllowed != null
      if (hasBillingData) {
        // Keep the entry + its billing config; just clear the "completed" stamp.
        if (entry.completedDate) {
          const next = [...history]
          next[selfIdx] = { ...entry, completedDate: null }
          onUpdateStudent?.(student.id, { courseHistory: next })
        }
      } else {
        // Bare auto-archive marker with no extra data — drop it entirely.
        onUpdateStudent?.(student.id, { courseHistory: history.filter((_, i) => i !== selfIdx) })
      }
    }
    // courseHistory included so a 100→99→100 flip re-checks against the
    // latest history and self-corrects (add/clear/restore) without looping.
  }, [progress.pct, viewCourse, student.course, student.id, student.courseHistory, student.primaryInstructor, student.secondaryInstructor])
  // Per-lesson target dates — spread evenly between training start and the
  // effective deadline. Only meaningful when a deadline (pace or FSC) is
  // set; otherwise targetDates is {} and cells render "—".
  const courseHasFsc  = !!course?.lessons?.some((l) => l.fsc)
  const effectiveDl   = effectiveDeadline(student, courseHasFsc)
  // Anchor the per-lesson schedule at the term start when it's in the
  // future (e.g. a D-term student looking at their schedule before D
  // begins). Otherwise targetDatesForCourse falls back to today.
  const termStart     = getTerm(student.pace)?.start || null
  const targetDates   = targetDatesForCourse(course?.lessons || [], sLogs, effectiveDl, undefined, termStart)
  const acRate    = AIRCRAFT_RATES[student.aircraft] || 0
  const bp        = budgetPct(progress)
  const remaining = progress.flatRate ? progress.flatRate - progress.cost : null

  // How many StatCards will render in the top row. Drives the grid class
  // (grid2/3/4) below so the cards distribute evenly regardless of which
  // combination of student/instructor/OOP cards are visible today. The
  // OOP tile is student-only — instructors see OOP inline on their Est.
  // cost card instead.
  const showOopCard   = !isInstructor && (progress.oopCost > 0 || progress.projectedAircraftOop > 0)
  const statCardCount = 1 + (isInstructor ? 2 : 0) + (showOopCard ? 1 : 0)
  const statCardGridClass = statCardCount >= 4 ? 'grid4'
    : statCardCount === 3 ? 'grid3'
    : statCardCount === 2 ? 'grid2'
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
  const hasTrTrigger = oopLessons.length > 0 || policyViolations.length > 0 || multiRepeatLessons.length > 0

  // Suppress the "Training Review required" banner once a TR has been
  // generated covering the current OOP state. The banner reappears the
  // moment a NEW OOP trigger appears (any new repeatedOop log, new
  // stage-check repeat, or additional repeat on an existing lesson).
  //
  // Approach: compute a "fingerprint" of the current OOP triggers and
  // compare against the snapshot the latest TR saved when it was
  // generated. Different fingerprints → a new OOP exists that the TR
  // didn't cover → banner returns.
  const oopFingerprint = (() => {
    const parts = []
    oopLessons.forEach((l)        => parts.push(`oop:${l.id}`))
    policyViolations.forEach((l)  => parts.push(`viol:${l.id}`))
    multiRepeatLessons.forEach((l) => {
      parts.push(`multi:${l.id}:${repeatKeysFor(sLogs, l.id).length}`)
    })
    return parts.sort().join('|')
  })()
  const trCovered = (() => {
    if (!oopFingerprint) return false
    const courseTRs = (student.trainingReviews || []).filter((tr) =>
      tr.courseName === viewCourse ||
      (!tr.courseName && typeof tr.course === 'string' && tr.course.startsWith(viewCourse))
    )
    // Compare against the LATEST TR that carries a fingerprint snapshot.
    // Pre-snapshot TRs (saved before this feature shipped) remain in the
    // audit trail but never silence the banner — every chief gets prompted
    // to generate a fresh TR for the current OOP state, which seeds a
    // proper snapshot for next time.
    const latestWithFp = courseTRs
      .filter((tr) => !!tr.oopFingerprint)
      .sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || ''))[0]
    if (!latestWithFp) return false
    return latestWithFp.oopFingerprint === oopFingerprint
  })()
  const needsTR = hasTrTrigger && !trCovered

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
                    {viewCourse} <span style={{ fontSize: 14, color: 'rgba(255,255,255,.85)', marginLeft: 5, fontWeight: 700 }}>▾</span>
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
                    {student.aircraft} <span style={{ fontSize: 14, color: 'rgba(255,255,255,.85)', marginLeft: 5, fontWeight: 700 }}>▾</span>
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
                      {primaryName} <span style={{ fontSize: 14, color: 'rgba(255,255,255,.85)', marginLeft: 5, fontWeight: 700 }}>▾</span>
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
                      {secondaryName || '— none —'} <span style={{ fontSize: 14, color: 'rgba(255,255,255,.85)', marginLeft: 5, fontWeight: 700 }}>▾</span>
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
                // Only tag "100%" when there's an actual completed stamp — a
                // course edited back below 100% clears it (see effect above).
                const completedSelf = (student.courseHistory || []).find((h) => h.course === student.course && h.completedDate)
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
                {progress.pct >= 100 ? 'Historical record' : 'Past course · not 100%'}
              </span>
            )}
            {isViewingPastCourse && isInstructor && (
              <button
                type="button"
                className="btn btn-sm"
                style={{ fontSize: 11, color: '#dc2626', borderColor: '#fecaca' }}
                title="Remove this past course from the student's history"
                onClick={async () => {
                  const ok = await toast.confirm(
                    `Delete ${viewCourse} from ${student.name}'s course history?\n\n` +
                    `This permanently removes the course entry, ALL logged flights for it, ` +
                    `AND every Training Review written for that course.\n\n` +
                    `This cannot be undone.`
                  )
                  if (!ok) return
                  onUpdateStudent(student.id, {
                    courseHistory: (student.courseHistory || []).filter((h) => h.course !== viewCourse),
                    // Cascade-delete TRs tied to this course so the audit trail
                    // doesn't keep ghost entries pointing at a course that no
                    // longer exists. Matches by courseName (preferred) with a
                    // back-compat label-prefix fallback.
                    trainingReviews: (student.trainingReviews || []).filter((tr) => (
                      tr.courseName
                        ? tr.courseName !== viewCourse
                        : !(typeof tr.course === 'string' && tr.course.startsWith(viewCourse))
                    )),
                  })
                  onClearAllLogs?.(student.id, viewCourse)
                  setViewCourse(student.course)
                  toast.success(`${viewCourse} removed from history.`)
                }}
              >
                Delete this course
              </button>
            )}
          </div>
        )}

        {/* "Course complete — move to next" banner. Surfaces once the
            current course hits 100%. See CourseTransitionBanner for the
            picker logic; this file just wires the move action. */}
        {canEdit && progress.pct >= 100 && viewCourse === student.course && (
          <CourseTransitionBanner
            student={student}
            onMoveToNextCourse={({ course, pace, accelerated }) => {
              onUpdateStudent(student.id, {
                course, pace, accelerated,
                scheduledFsc: null,
                backupFsc: null,
              })
              setViewCourse(course)
            }}
          />
        )}

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

        {/* Training Review audit trail — scoped to the active course so
            historical reviews stay attached to the course they were
            written for. When the student moves to a new course, this
            section clears out; toggling back to the past course via
            "View past course" surfaces those reviews again. */}
        <TrainingReviewHistory
          student={student}
          viewCourse={viewCourse}
          canDelete={isInstructor}
          onDelete={onDeleteTrainingReview ? (reviewId) => onDeleteTrainingReview(student.id, reviewId) : null}
        />

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
              // courseHasFsc declared in the outer scope; reuse here so
              // the FSC-aware pacer follows the same rule everywhere.
              const dl = effectiveDeadline(student, courseHasFsc)
              const status = paceStatus(student, progress, courseHasFsc)
              const days = daysToEffectiveDeadline(student, courseHasFsc)
              const fpw = flightsPerWeek(student, progress, courseHasFsc)
              const statusColor = status === 'overdue' ? '#dc2626' : status === 'tight' ? '#b45309' : '#15803d'
              const fmtDate = (iso) => iso ? fmtShortDate(iso) : ''
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
                    // Visible semesters use selectableTerms() so the
                    // 2028 calendar entries stay hidden until we're
                    // past 2026 (same filter the banner picker uses).
                    const allSemesters = [...new Set(
                      selectableTerms()
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
        <LessonTable
          student={student}
          course={course}
          viewCourse={viewCourse}
          sLogs={sLogs}
          progress={progress}
          isInstructor={isInstructor}
          targetDates={targetDates}
          repeatBillingType={repeatBillingType}
          totFlown={totFlown}
          totGround={totGround}
          editingDate={editingDate}
          setEditingDate={setEditingDate}
          onLogFlight={onLogFlight}
          setLogLesson={setLogLesson}
        />
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
          oopFingerprint={oopFingerprint}
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
