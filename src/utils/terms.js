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
 *   A term → A end date
 *   B term → D start date − LU_DOUBLEUP_BUFFER_DAYS (always; assumes the
 *     student is doubling up into D, which is the whole point of B)
 *   D term → D end date
 *
 * Returns an ISO yyyy-mm-dd string, or null if the pace is missing /
 * doesn't resolve.
 */
export function flightDeadline(pace) {
  const term = getTerm(pace)
  if (!term) return null
  if (term.subterm === 'B') {
    const dTerm = LU_TERMS.find((t) => t.semester === pace.semester && t.subterm === 'D')
    if (!dTerm) return term.end                            // no D in this semester → fall back to B end
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
  return flightDeadline(student.pace)
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
export function paceStatus(student, progress, today = new Date()) {
  if (progress?.pct >= 100) return 'on-track'              // done is done
  // Back-compat: callers may pass a `pace` object directly instead of a
  // full student record (old signature). Handle both.
  const days = (student && (student.scheduledFsc || student.backupFsc || student.pace))
    ? daysToEffectiveDeadline(student, today)
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

/** Active + future terms only — what should appear in the pace picker. */
export function selectableTerms(today = new Date()) {
  const cutoff = today.toISOString().slice(0, 10)
  return LU_TERMS.filter((t) => t.end >= cutoff)
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
export function targetDatesForCourse(lessons, sLogs, deadlineIso, today = new Date()) {
  if (!deadlineIso || !lessons || lessons.length === 0) return {}
  const todayIso = today.toISOString().slice(0, 10)

  // Anchor = earliest log date in this course, else today.
  let anchorIso = todayIso
  if (sLogs) {
    const dates = Object.values(sLogs).map((lg) => lg?.date).filter(Boolean).sort()
    if (dates.length) anchorIso = dates[0]
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
 * Given just a subterm letter ('A' | 'B' | 'D') and "today", return the
 * matching term entry that is currently active or about to start. Lets
 * the UI ask "are you on A, B, or D?" and auto-resolve the semester.
 * Returns null if no upcoming term of that subterm is in LU_TERMS.
 */
export function activeTermForSubterm(subterm, today = new Date()) {
  if (!subterm) return null
  const cutoff = today.toISOString().slice(0, 10)
  const candidates = LU_TERMS
    .filter((t) => t.subterm === subterm && t.end >= cutoff)
    .sort((a, b) => a.start.localeCompare(b.start))
  return candidates[0] || null
}
