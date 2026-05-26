import { LU_TERMS, LU_DOUBLEUP_BUFFER_DAYS } from '../data/constants'

/**
 * Term-pace helpers. A "pace" is `{ semester, subterm }` — e.g.
 * `{ semester: 'Summer 2026', subterm: 'B' }` — and tells the app when
 * the student's flight training for the current course must be wrapped
 * up. Stored on the student record.
 */

/** Quick lookup for a specific term entry. */
export function getTerm(pace) {
  if (!pace || !pace.semester || !pace.subterm) return null
  return LU_TERMS.find((t) => t.semester === pace.semester && t.subterm === pace.subterm) || null
}

/**
 * Hard flight-completion deadline implied by the chosen pace (term).
 *   A term (regular)     → A end date
 *   A term (accelerated) → D start date − LU_DOUBLEUP_BUFFER_DAYS
 *                          (student plans to pick up a D-term course
 *                          next, so the A course must wrap with the
 *                          school's 2-week buffer)
 *   D term               → D end date
 *
 * `accelerated` is true when the caller wants the doubleup buffer rule
 * applied to an A-term pace. Pass `student.accelerated` from the caller.
 *
 * Returns ISO yyyy-mm-dd or null when the pace doesn't resolve.
 */
export function flightDeadline(pace, accelerated = false) {
  const term = getTerm(pace)
  if (!term) return null
  if (term.subterm === 'A' && accelerated) {
    const dTerm = LU_TERMS.find((t) => t.semester === pace.semester && t.subterm === 'D')
    if (!dTerm) return term.end                            // no D in this semester → fall back to A end
    const d = new Date(dTerm.start + 'T00:00:00')
    d.setDate(d.getDate() - LU_DOUBLEUP_BUFFER_DAYS)
    return d.toISOString().slice(0, 10)
  }
  return term.end
}

/**
 * Effective deadline for the per-week pacer. Order of preference:
 *   1. student.scheduledFsc — only honored if the course HAS an FSC
 *      lesson (some courses, like Commercial 2, don't end with a Final
 *      Stage Check — those students just work off the term cutoff)
 *   2. student.backupFsc    — same gating as scheduledFsc
 *   3. flightDeadline(student.pace) — term-based hard cutoff
 * Returns ISO yyyy-mm-dd or null.
 *
 * `courseHasFsc` defaults to true so existing callers behave the same;
 * callers that know the course should pass it explicitly so FSC dates
 * are ignored on FSC-less courses.
 */
export function effectiveDeadline(student, courseHasFsc = true) {
  if (!student) return null
  if (courseHasFsc) {
    if (student.scheduledFsc) return student.scheduledFsc
    if (student.backupFsc)    return student.backupFsc
  }
  return flightDeadline(student.pace, student.accelerated)
}

/**
 * Days from `today` to a given ISO date. Negative = past.
 */
function daysBetween(dateIso, today = new Date()) {
  if (!dateIso) return null
  const d = new Date(dateIso + 'T00:00:00')
  const t = new Date(today.toISOString().slice(0, 10) + 'T00:00:00')
  return Math.round((d - t) / (1000 * 60 * 60 * 24))
}

/** Days to the *pace* (term) deadline only — used by the original chip. */
export function daysToDeadline(pace, today = new Date()) {
  return daysBetween(flightDeadline(pace), today)
}

/** Days to the *effective* deadline (FSC scheduled / backup / pace). */
export function daysToEffectiveDeadline(student, courseHasFsc = true, today = new Date()) {
  return daysBetween(effectiveDeadline(student, courseHasFsc), today)
}

/**
 * Pace status for the at-a-glance chip.
 *   'on-track' — student is well within deadline OR completed
 *   'tight'    — within 14 days of deadline
 *   'overdue'  — past deadline (only relevant if course isn't done)
 *   null       — no deadline / pace set
 */
export function paceStatus(student, progress, courseHasFsc = true, today = new Date()) {
  if (progress?.pct >= 100) return 'on-track'              // done is done
  // Back-compat: callers may pass a `pace` object directly instead of a
  // full student record (old signature). Handle both. The `today` arg
  // was previously in the third slot; if a Date object was passed there
  // we treat it as today for back-compat (rather than as courseHasFsc).
  if (courseHasFsc instanceof Date) {
    today = courseHasFsc
    courseHasFsc = true
  }
  const isStudent = student && (student.scheduledFsc || student.backupFsc || student.pace)
  const days = isStudent
    ? daysToEffectiveDeadline(student, courseHasFsc, today)
    : daysToDeadline(student, today)                       // legacy: student arg was actually a pace
  if (days == null) return null
  if (days < 0)  return 'overdue'
  if (days <= 14) return 'tight'
  return 'on-track'
}

/**
 * Per-week flight pace required to finish remaining lessons by the
 * student's effective deadline. Returns a number (lessons/week, rounded
 * to 1 decimal) or null when there's no deadline / nothing left to fly.
 *
 * Implementation: 1 lesson = 1 flight (splits / repeats not budgeted).
 */
export function flightsPerWeek(student, progress, courseHasFsc = true, today = new Date()) {
  if (!progress) return null
  const remaining = (progress.total || 0) - (progress.completed || 0)
  if (remaining <= 0) return null
  const days = daysToEffectiveDeadline(student, courseHasFsc, today)
  if (days == null) return null
  if (days <= 0) return remaining                          // overdue → all of them, "now"
  const weeks = Math.max(days / 7, 1 / 7)                  // at least one day → ~7/wk equivalent
  return Math.round((remaining / weeks) * 10) / 10
}

/**
 * Active + future terms only — what should appear in the pace picker.
 * Filters out:
 *   - B and any non-A/D subterm (AA students only enroll in A or D)
 *   - Terms that have already ended
 *   - Terms whose start year is more than 1 year ahead of today (so the
 *     2028 calendar entries stay hidden in 2026 even though they're in
 *     LU_TERMS for forward planning).
 */
export function selectableTerms(today = new Date()) {
  const cutoff = today.toISOString().slice(0, 10)
  const maxYear = today.getFullYear() + 1
  return LU_TERMS.filter((t) => {
    if (t.subterm !== 'A' && t.subterm !== 'D') return false
    if (t.end < cutoff) return false
    const startYear = parseInt(t.start.slice(0, 4), 10)
    return startYear <= maxYear
  })
}

/**
 * Build a per-lesson schedule of target completion dates, spread evenly
 * between a start anchor and the student's effective deadline. Mirrors
 * the "Target Comp. Date" column on the paper tracking sheets — every
 * lesson gets a planned date so the chief / student can see if they're
 * ahead or behind on any individual row.
 *
 * Args:
 *   lessons       — array of lesson defs (course.lessons)
 *   sLogs         — logs[student.id][course] keyed by lessonId
 *   deadlineIso   — ISO yyyy-mm-dd; usually effectiveDeadline(student)
 *   today         — Date object (testable)
 *
 * Returns an object mapping `lessonId → 'YYYY-MM-DD'`. Returns {} when
 * there's no deadline or no lessons.
 *
 * Anchor logic: the EARLIEST logged date across the course defines when
 * training started. If nothing is logged yet, anchor = today. Anchor
 * stays fixed even as lessons get completed, so the target schedule
 * doesn't reshuffle every time something is logged (matches the paper
 * sheets where targets are set once at the start of the course).
 */
export function targetDatesForCourse(lessons, sLogs, deadlineIso, today = new Date(), termStartIso = null) {
  if (!deadlineIso || !lessons || lessons.length === 0) return {}
  const todayIso = today.toISOString().slice(0, 10)

  // Anchor — when the student's per-lesson schedule should start spreading from:
  //   1. Earliest log date in this course, if they've already flown. Once
  //      they've started, the schedule locks to their actual start.
  //   2. Otherwise the term start date if it's in the future (D-term
  //      students whose term hasn't begun yet shouldn't be told to fly
  //      lessons retroactively).
  //   3. Otherwise today (term already started but no flights logged).
  let anchorIso = todayIso
  if (sLogs) {
    const dates = Object.values(sLogs).map((lg) => lg?.date).filter(Boolean).sort()
    if (dates.length) {
      anchorIso = dates[0]
    } else if (termStartIso && termStartIso > todayIso) {
      anchorIso = termStartIso
    }
  } else if (termStartIso && termStartIso > todayIso) {
    anchorIso = termStartIso
  }

  const anchor   = new Date(anchorIso   + 'T00:00:00')
  const deadline = new Date(deadlineIso + 'T00:00:00')
  const totalDays = Math.max(0, (deadline - anchor) / (1000 * 60 * 60 * 24))
  // Spread evenly across N-1 intervals (so first lesson lands on anchor,
  // last lesson lands on deadline). Single-lesson edge case → just the deadline.
  const N = lessons.length
  const map = {}
  lessons.forEach((lesson, i) => {
    const offset = N === 1 ? 0 : (i * totalDays) / (N - 1)
    const d = new Date(anchor)
    d.setDate(d.getDate() + Math.round(offset))
    map[lesson.id] = d.toISOString().slice(0, 10)
  })
  return map
}

/**
 * Predict the next pace for a student who just completed their current
 * course. The logic mirrors how AA students actually move through the
 * Liberty calendar:
 *
 *   • A-term + accelerated, finished BEFORE deadline → same-semester D
 *     (the whole point of accelerated A is to pick up D next)
 *   • A-term + accelerated, MISSED deadline → next semester's A
 *   • A-term (regular) → next semester's A
 *   • D-term → next semester's A
 *
 * Returns `{ pace: { semester, subterm }, accelerated: false }` or null
 * when we can't predict (e.g. next semester isn't in LU_TERMS yet).
 */
export function predictNextPace(student, today = new Date()) {
  if (!student?.pace) return null
  const currentTerm = getTerm(student.pace)
  if (!currentTerm) return null

  // A-term + accelerated → check whether they finished on time.
  if (currentTerm.subterm === 'A' && student.accelerated) {
    const deadline = flightDeadline(student.pace, true)         // accel deadline = D start − 14
    const todayIso = today.toISOString().slice(0, 10)
    if (deadline && todayIso <= deadline) {
      // On time — pick up same-semester D.
      const dTerm = LU_TERMS.find((t) => t.semester === currentTerm.semester && t.subterm === 'D')
      if (dTerm) return { pace: { semester: dTerm.semester, subterm: 'D' }, accelerated: false }
    }
    // Missed the buffer — fall through to next-semester A.
  }

  // Default: roll forward to the next semester's A term.
  const ordered = orderedSemesters()
  const idx = ordered.indexOf(currentTerm.semester)
  if (idx < 0 || idx >= ordered.length - 1) return null
  const nextSemester = ordered[idx + 1]
  const aTerm = LU_TERMS.find((t) => t.semester === nextSemester && t.subterm === 'A')
  if (!aTerm) return null
  return { pace: { semester: aTerm.semester, subterm: 'A' }, accelerated: false }
}

/** Chronological list of semester names (by A-term start date). */
function orderedSemesters() {
  const seen = new Set()
  return LU_TERMS
    .filter((t) => t.subterm === 'A')
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((t) => t.semester)
    .filter((s) => (seen.has(s) ? false : seen.add(s)))
}

/**
 * Returns true when the student is "falling behind" — defined as having
 * at least one lesson whose per-lesson target date was 10+ days ago and
 * that lesson is still not completed. Uses the same target-dates schedule
 * the lesson table shows, so the chip and the table agree by definition.
 *
 * Skips entirely when no pace/FSC deadline is set (no schedule to compare
 * against) or when the course is already 100% complete.
 *
 * Returns `{ behind, daysBehind, lessonId }` so the caller can render
 * a helpful "12 days behind on 4.1" tag rather than a bare warning.
 */
export function behindSchedule(student, course, sLogs, today = new Date()) {
  if (!course?.lessons?.length) return { behind: false }
  const dl = effectiveDeadline(student, !!course.lessons.some((l) => l.fsc))
  if (!dl) return { behind: false }
  const totalLessons    = course.lessons.length
  const completedCount  = course.lessons.filter((l) => sLogs[l.id]?.completed).length
  if (completedCount >= totalLessons) return { behind: false }   // course done

  const targets = targetDatesForCourse(course.lessons, sLogs, dl, today)
  const todayIso = today.toISOString().slice(0, 10)
  const cutoff = new Date(todayIso + 'T00:00:00')
  cutoff.setDate(cutoff.getDate() - 10)
  const cutoffIso = cutoff.toISOString().slice(0, 10)

  // Find the most-overdue uncompleted lesson whose target was 10+ days ago.
  let worst = null
  for (const lesson of course.lessons) {
    const target = targets[lesson.id]
    if (!target) continue
    if (target > cutoffIso) continue                              // target in future or within grace
    if (sLogs[lesson.id]?.completed) continue                     // done — fine
    const daysBehind = Math.round(
      (new Date(todayIso + 'T00:00:00') - new Date(target + 'T00:00:00')) / (1000 * 60 * 60 * 24)
    )
    if (!worst || daysBehind > worst.daysBehind) {
      worst = { daysBehind, lessonId: lesson.id }
    }
  }
  return worst ? { behind: true, ...worst } : { behind: false }
}

/**
 * Given just a subterm letter ('A' | 'B' | 'D') and "today", return the
 * matching term entry that is currently active or about to start. Lets
 * the UI ask "are you on A, B, or D?" and auto-resolve the semester.
 * Returns null if no upcoming term of that subterm is in LU_TERMS.
 */
export function activeTermForSubterm(subterm, today = new Date()) {
  if (!subterm) return null
  // Only A and D are valid for AA students today (B was deprecated).
  if (subterm !== 'A' && subterm !== 'D') return null
  const cutoff = today.toISOString().slice(0, 10)
  const candidates = LU_TERMS
    .filter((t) => t.subterm === subterm && t.end >= cutoff)
    .sort((a, b) => a.start.localeCompare(b.start))
  return candidates[0] || null
}
