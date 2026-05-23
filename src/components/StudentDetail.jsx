import { useState } from 'react'
import { COURSES, getCourseDef, syllabusVersionFor } from '../data/courses'
import { AIRCRAFT_LIST, AIRCRAFT_RATES, instrRate } from '../data/constants'
import { budgetPct, budgetColor, overUnder, repeatKeysFor, splitKeysFor } from '../utils/calculations'
import LogFlightModal from './modals/LogFlightModal'
import TrainingReviewModal from './modals/TrainingReviewModal'
import LedgerModal from './modals/LedgerModal'

// Columns: Lesson · Dual · Solo · XC · Instr · Sim · Tgt Total · Actual Flt · Over/Under · Ground · Objectives · Date · Status
const COLS = '58px 44px 44px 44px 44px 44px 52px 56px 64px 56px 1fr 88px 64px'

export default function StudentDetail({
  student, logs, instructors, isInstructor, account, onLogFlight, onClearLesson, onUpdateStudent, onBack, calcProgress,
}) {
  const [logLesson, setLogLesson] = useState(null)
  const [showTR, setShowTR] = useState(false)
  const [ledgerMode, setLedgerMode] = useState(null)  // 'hours' | 'cost' | 'balance' | null
  const [showLegend, setShowLegend] = useState(false)
  // Course selector — defaults to the student's current/active course. When
  // switched to a past course (from courseHistory), the page renders that
  // course's logs read-only.
  const [viewCourse, setViewCourse] = useState(student.course)
  const isViewingPastCourse = viewCourse !== student.course
  const canEdit = isInstructor && !isViewingPastCourse
  const [editingDate, setEditingDate] = useState(null)
  const [editingAircraft, setEditingAircraft] = useState(false)
  const [editingPrimary, setEditingPrimary] = useState(false)
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
  const acRate    = AIRCRAFT_RATES[student.aircraft] || 0
  const ou        = overUnder(student, logs, viewCourse)
  const bp        = budgetPct(progress)
  const remaining = progress.flatRate ? progress.flatRate - progress.cost : null

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
          <button className="btn btn-sm btn-ghost" onClick={() => window.print()}>🖨 Print</button>
          <div>
            <h1>{student.name}</h1>
            <small>
              {viewCourse} · {COURSES[viewCourse]?.avia} · {student.base} ·{' '}
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
              <option value={student.course}>{student.course} (current)</option>
              {(student.courseHistory || []).map((h) => (
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
            {isInstructor && (
              <button
                className="btn btn-sm btn-ghost"
                style={{ marginLeft: 'auto', fontSize: 11 }}
                onClick={() => {
                  const courseName = prompt('Course name (e.g. "Commercial 1"):')
                  if (!courseName || !COURSES[courseName]) {
                    if (courseName) alert(`Course "${courseName}" not found. Must match an entry in courses.js exactly.`)
                    return
                  }
                  const completedDate = prompt('Completion date (YYYY-MM-DD), or leave blank:') || ''
                  const newHist = [...(student.courseHistory || []), { course: courseName, completedDate }]
                  onUpdateStudent(student.id, { courseHistory: newHist })
                  setViewCourse(courseName)
                }}
              >
                + Add completed course
              </button>
            )}
          </div>
        )}

        {/* Instructor contact card — visible to students AND instructors */}
        {(() => {
          const findInstr = (n) => n ? instructors.find((i) => i.name === n) : null
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

        {/* Stats */}
        <div className={isInstructor ? 'grid4' : 'grid2'} style={{ marginBottom: 16 }}>
          <StatCard label="Progress" value={`${progress.pct}%`} valueColor="#1a3a5c">
            <div style={{ marginTop: 6 }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress.pct}%`, background: '#1a3a5c' }} />
              </div>
            </div>
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
          </StatCard>

          <StatCard label="Hours flown" value={`${totFlown.toFixed(1)}h`} onClick={() => setLedgerMode('hours')}>
            <div style={{ fontSize: 12, marginTop: 4, color: ou > 0 ? '#b45309' : ou < 0 ? '#15803d' : '#6b7280' }}>
              {ou >= 0 ? '+' : ''}{ou.toFixed(1)}h vs {parseFloat(course.targetTotal).toFixed(1)}h target
            </div>
          </StatCard>

          {isInstructor && (
            <StatCard label="Est. cost" value={`$${progress.cost.toLocaleString()}`} onClick={() => setLedgerMode('cost')}>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                ${acRate}/hr acft · ${instrRate(student.base)}/hr instr
              </div>
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
              {progress.projectedWithRepeat != null && (
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }} title="Adds a typical 1-repeat buffer (2.0 hr dual + 0.7 hr ground) on top of the baseline projection.">
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
              </StatCard>
            ) : (
              <StatCard label="School" value={student.school} valueSize={14} />
            )
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
            <span style={{ textAlign: 'right' }}>Dual</span>
            <span style={{ textAlign: 'right' }}>Solo</span>
            <span style={{ textAlign: 'right' }}>XC</span>
            <span style={{ textAlign: 'right' }} title="Hood / instrument time">Instr</span>
            <span style={{ textAlign: 'right' }} title="Simulator hours">Sim</span>
            <span style={{ textAlign: 'right' }} title="Target total flight time for the lesson">Target</span>
            <span style={{ textAlign: 'right' }} title="Actual flight time logged this attempt">Actual</span>
            <span style={{ textAlign: 'right' }} title="Actual minus target — amber if over, green if under">Over/Under</span>
            <span style={{ textAlign: 'right' }}>Ground</span>
            <span>Objectives</span>
            <span style={{ textAlign: 'center' }}>Date</span>
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
            // Split continuations come right after the original lesson row,
            // before any repeats. They're billed as Lib-funded.
            splitKeysFor(sLogs, lesson.id).forEach((sk) => items.push({ key: sk, isSplit: true }))
            // If the latest split was marked "Split — finish later" and there
            // isn't an empty next-split row yet, spawn one so the instructor
            // has somewhere to log the next session.
            const splitKeys = splitKeysFor(sLogs, lesson.id)
            const lastSplitKey = splitKeys[splitKeys.length - 1]
            const lastSplitLg  = lastSplitKey ? sLogs[lastSplitKey] : null
            const needsNextSplit =
              (myLg.splitContinuing && splitKeys.length === 0) ||
              (lastSplitLg?.splitContinuing && lastSplitKey)
            if (needsNextSplit) {
              const usedSplitNums = splitKeys.map((k) => parseInt(k.split('__s')[1], 10) || 0)
              const nextSplitNum  = (usedSplitNums.length ? Math.max(...usedSplitNums) : 0) + 1
              const placeholderKey = `${lesson.id}__s${nextSplitNum}`
              if (!sLogs[placeholderKey]) {
                items.push({ key: placeholderKey, isSplit: true, pending: true })
              }
            }
            const repeatKeys = repeatKeysFor(sLogs, lesson.id)
            repeatKeys.forEach((rk) => items.push({ key: rk, isRepeat: true }))
            const origLg = sLogs[lesson.id] || {}
            // Find the latest log entry for this lesson chain.
            const latestKey = repeatKeys.length > 0 ? repeatKeys[repeatKeys.length - 1] : lesson.id
            const latestLg  = sLogs[latestKey] || {}
            const latestNeedsFollowup =
              latestLg.repeatedLib || latestLg.repeatedOop || latestLg.incomplete
            if (latestNeedsFollowup) {
              const usedNums = repeatKeys.map((k) => parseInt(k.split('__r')[1], 10) || 0)
              const nextNum  = (usedNums.length ? Math.max(...usedNums) : 0) + 1
              items.push({ key: `${lesson.id}__r${nextNum}`, isRepeat: true, pending: true })
            }
            return items
          }).map(({ key, isRepeat, isSplit, pending }) => {
            // Resolve the underlying lesson definition (strip __rN or __sN suffixes).
            const baseId = key.split('__r')[0].split('__s')[0]
            const lesson = course.lessons.find((l) => l.id === baseId)
            const lg = sLogs[key] || {}
            // Status pill: "unsuccessful" (busted) gets its own treatment on
            // stage/progress/final-stage checks; "incomplete" is distinct from
            // "in prog" (which means partial data but no explicit flag).
            const lessonDef = lesson  // alias for clarity
            const isCheckLesson = lessonDef.sc || lessonDef.fsc || lessonDef.pc
            const status = lg.completed
              ? 'done'
              : lg.incomplete
                ? (isCheckLesson ? 'unsuccessful' : 'incomplete')
                : Object.keys(lg).length > 0 ? 'partial' : 'pending'
            const origLg = sLogs[baseId] || {}
            // 0-based index of this repeat (1st repeat = 0, 2nd = 1, ...). We
            // derive it directly from the __rN suffix to avoid any dependency on
            // how the storage keys happen to sort.
            const repeatNum = isRepeat ? (parseInt(key.split('__r')[1], 10) || 1) : 0
            const repeatIdx = isRepeat ? repeatNum - 1 : 0
            const repeatBadge = isRepeat ? repeatBillingType(lesson, repeatIdx) : null

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
                        : lesson.sc ? 'rgba(26,58,92,.05)' : lesson.pc ? 'rgba(245,158,11,.04)' : '',
                  borderLeft: isCombinedChild
                    ? '3px solid #0284c7'
                    : isSplit
                      ? '3px solid #0284c7'
                      : isRepeat ? '3px solid #dc2626' : undefined,
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
                    <div className={`tag ${lesson.sc ? 'tag-blue' : 'tag-amber'}`} style={{ marginTop: 2, fontSize: 10 }}>
                      {lesson.sc ? 'stage' : 'prog'}
                    </div>
                  )}
                </div>

                {/* Syllabus targets — read-only single numbers per lesson.
                    Uses showLesson so combined pairs (e.g. 8.1 + 8.2) display
                    the summed targets on one line. */}
                <TargetCell value={showLesson.d  || showLesson.sm} />
                <TargetCell value={showLesson.s} />
                <TargetCell value={showLesson.x} />
                <TargetCell value={showLesson.i} />
                <TargetCell value={showLesson.sm} />
                <TargetCell value={showLesson.t} bold />

                {/* Actual flight time logged this attempt */}
                {(() => {
                  const actualFlt = (lg.dual || 0) + (lg.solo || 0) + (lg.sim || 0)
                  const target    = showLesson.t || 0
                  const diff      = actualFlt - target
                  const showDiff  = actualFlt > 0 && target > 0
                  return (
                    <>
                      <div style={{ textAlign: 'right', fontWeight: 500 }}>
                        {actualFlt > 0 ? actualFlt.toFixed(1) : '—'}
                      </div>
                      <div style={{
                        textAlign: 'right', fontSize: 11, fontWeight: 600,
                        color: !showDiff ? '#d1d5db' : diff > 0 ? '#b45309' : diff < 0 ? '#15803d' : '#6b7280',
                      }}>
                        {showDiff ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}` : '—'}
                      </div>
                    </>
                  )
                })()}

                {/* Ground time logged this attempt — keeps the logged/target overlay */}
                <LogCell logged={lg.ground} rec={showLesson.g} />

                <span style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.35, wordBreak: 'break-word', whiteSpace: 'normal' }}>
                  {isCombinedPrimary ? `${lesson.o} · ${siblingDef.o}` : lesson.o}
                </span>

                {/* Date cell — inline editable for instructors */}
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
                      {lg.date || '—'}
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
                  {status === 'pending'      && <span className="tag tag-gray">pending</span>}
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
            // Over/Under total = sum of each row's per-attempt over/under
            // (only rows that actually have flight logged + a target).
            let overUnderTot = 0
            let anyDiff = false
            const addDiff = (lesson, lg) => {
              const actualFlt = (lg.dual || 0) + (lg.solo || 0) + (lg.sim || 0)
              const target    = lesson.t || 0
              if (actualFlt > 0 && target > 0) {
                overUnderTot += (actualFlt - target)
                anyDiff = true
              }
            }
            course.lessons.forEach((lesson) => {
              addDiff(lesson, sLogs[lesson.id] || {})
              repeatKeysFor(sLogs, lesson.id).forEach((rk) => addDiff(lesson, sLogs[rk] || {}))
            })
            return (
              <div style={{
                display: 'grid', gridTemplateColumns: COLS, gap: 4,
                padding: '8px 10px', background: '#f8fafc',
                fontSize: 12, fontWeight: 600, borderTop: '2px solid #e5e7eb',
                minWidth: 1080,
              }}>
                <span>Totals</span>
                <span style={{ textAlign: 'right' }}>{fmt(targetDual)}</span>
                <span style={{ textAlign: 'right' }}>{fmt(targetSolo)}</span>
                <span style={{ textAlign: 'right' }}>{fmt(targetXC)}</span>
                <span style={{ textAlign: 'right' }}>{fmt(targetInst)}</span>
                <span style={{ textAlign: 'right' }}>{fmt(targetSim)}</span>
                <span style={{ textAlign: 'right' }}>{parseFloat(course.targetTotal).toFixed(1)}</span>
                <span style={{ textAlign: 'right' }}>{fmt(totFlown)}</span>
                <span style={{
                  textAlign: 'right',
                  color: overUnderTot > 0 ? '#b45309' : overUnderTot < 0 ? '#15803d' : '#6b7280',
                }}>
                  {anyDiff ? `${overUnderTot > 0 ? '+' : ''}${overUnderTot.toFixed(1)}` : '—'}
                </span>
                <TotalCell logged={totGround} rec={targetGnd} />
                <span />
                <span />
                <span style={{ textAlign: 'center' }}>{progress.completed}/{progress.total}</span>
              </div>
            )
          })()}
        </div>
      </div>

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
          oopLessons={oopLessons}
          policyViolations={policyViolations}
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
                onLogFlight(student.id, viewCourse, parentId, { ...parentLg, completed: true, splitContinuing: undefined })
              }
              splitKeysFor(sLogs, parentId).forEach((sk) => {
                const num = parseInt(sk.split('__s')[1], 10) || 0
                if (num < currentNum) {
                  const slg = sLogs[sk] || {}
                  if (!slg.completed) {
                    onLogFlight(student.id, viewCourse, sk, { ...slg, completed: true, splitContinuing: undefined })
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

            // Case A: just flagged the ORIGINAL as a repeat → jump straight to
            // the first repeat slot so the instructor can log it immediately.
            const isOriginal = !logLesson.key.includes('__r')
            const justFlaggedRepeat = isOriginal &&
              (lessonData.repeatedLib || lessonData.repeatedOop) &&
              !(prevLg.repeatedLib || prevLg.repeatedOop)
            if (justFlaggedRepeat) {
              const parentId = logLesson.lesson.id
              const existing = repeatKeysFor(sLogs, parentId)
              const nums = existing.map((k) => parseInt(k.split('__r')[1], 10) || 0)
              const nextNum = (nums.length ? Math.max(...nums) : 0) + 1
              setLogLesson({ lesson: logLesson.lesson, key: `${parentId}__r${nextNum}` })
              return
            }

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
          onClear={() => { onClearLesson(student.id, viewCourse, logLesson.key); setLogLesson(null) }}
          onClose={() => setLogLesson(null)}
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
              📞 {ins.phone}
            </a>
          )}
          {ins.email && (
            <a href={`mailto:${ins.email}`} style={{ color: '#1a3a5c', textDecoration: 'none' }}>
              ✉ {ins.email}
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
      textAlign: 'right', fontSize: 12,
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
      <div style={{ textAlign: 'right', fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
        {val.toFixed(1)} ✓
      </div>
    )
  }
  const valColor = val === 0 ? '#d1d5db' : (over ? '#dc2626' : '#111827')
  return (
    <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
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
    <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
      <div style={{ fontSize: 12 }}>{logged > 0 ? logged.toFixed(1) : '—'}</div>
      {hasRec && (
        <div style={{ fontSize: 9, fontWeight: 600, color: met ? '#16a34a' : '#2d6ab4' }}>
          {rec.toFixed(1)} rec
        </div>
      )}
    </div>
  )
}
