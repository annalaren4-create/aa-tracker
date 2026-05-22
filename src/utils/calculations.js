import { AIRCRAFT_RATES, LU_FLAT_RATES, SIM_RATE, GROUND_RATE, FSC_INSTR_RATE, instrRate } from '../data/constants'
import { COURSES } from '../data/courses'

/**
 * Calculate a student's progress and estimated cost.
 * @param {object} student
 * @param {object} logs  — keyed by studentId → lessonId → logData
 * @returns {object}
 */
/**
 * Billing cost for a single lesson given actual logged hours.
 * Handles Redbird-only lessons (sm but no d) — any mistakenly-logged
 * dual hours are rerouted to sim billing so aircraft rate is never charged
 * for a simulator session.
 */
function lessonCost(lesson, dual, solo, sim, ground, aircraftRate, student) {
  const isCheck  = lesson.sc || lesson.pc
  const flightIr = lesson.fsc ? FSC_INSTR_RATE : instrRate(student.base, isCheck)

  // Redbird-only: course has sm but no d → no airplane involved
  const redbirdOnly  = !lesson.d && (lesson.sm || 0) > 0
  const effDual = redbirdOnly ? 0       : dual
  const effSim  = redbirdOnly ? sim + dual : sim

  const flightTime = effDual + solo
  let cost = 0
  cost += flightTime * aircraftRate   // aircraft (dual + solo, never sim)
  cost += effDual    * flightIr       // instructor on dual flight
  cost += effSim     * SIM_RATE       // Redbird device — flat $90/hr
  cost += effSim     * flightIr       // instructor present during sim
  cost += ground     * GROUND_RATE    // ground instruction — flat $100/hr
  return { cost, flightTime, effSim }
}

/**
 * Expected cost for an unstarted lesson at its target hours.
 */
function lessonExpectedCost(lesson, aircraftRate, student) {
  const d  = lesson.d  || 0
  const s  = lesson.s  || 0
  const sm = lesson.sm || 0
  const g  = lesson.g  || 0
  const { cost } = lessonCost(lesson, d, s, sm, g, aircraftRate, student)
  return cost
}

export function calcProgress(student, logs) {
  const course = COURSES[student.course]
  if (!course) return { pct: 0, flown: 0, cost: 0, projected: 0, completed: 0, total: 0, flatRate: null, targetTotal: 0 }

  const sLogs = logs[student.id] || {}
  const aircraftRate = AIRCRAFT_RATES[student.aircraft] || 0
  let flown = 0, cost = 0, completed = 0

  course.lessons.forEach((lesson) => {
    const lg = sLogs[lesson.id]
    if (!lg) return

    const { cost: lc, flightTime, effSim } = lessonCost(
      lesson,
      lg.dual   || 0,
      lg.solo   || 0,
      lg.sim    || 0,
      lg.ground || 0,
      aircraftRate,
      student,
    )
    cost  += lc
    flown += flightTime + effSim
    if (lg.completed) completed++
  })

  // Projected total = actual cost so far + expected cost of not-yet-started lessons
  // This avoids the "early expensive lessons inflate the projection" problem of
  // the naive (cost/pct)*100 formula.
  let remainingCost = 0
  course.lessons.forEach((lesson) => {
    if (sLogs[lesson.id]) return   // already started — captured in actual cost
    remainingCost += lessonExpectedCost(lesson, aircraftRate, student)
  })

  const total    = course.lessons.length
  const pct      = total > 0 ? Math.round((completed / total) * 100) : 0
  const flatRate = student.school === 'Liberty University' ? LU_FLAT_RATES[student.course] : null
  const projected = Math.round(cost + remainingCost)

  return {
    pct,
    flown: parseFloat(flown.toFixed(1)),
    cost: Math.round(cost),
    projected,
    completed,
    total,
    flatRate,
    targetTotal: course.targetTotal,
  }
}

/** Running over/under vs target hours */
export function overUnder(student, logs) {
  const course = COURSES[student.course]
  if (!course) return 0
  const sLogs = logs[student.id] || {}
  let actual = 0
  course.lessons.forEach((l) => {
    const lg = sLogs[l.id]
    if (lg) actual += (lg.dual || 0) + (lg.solo || 0) + (lg.sim || 0)
  })
  return parseFloat((actual - course.targetTotal).toFixed(1))
}

/** Budget percentage used (0-100), null if no flat rate */
export function budgetPct(progress) {
  if (!progress.flatRate) return null
  return Math.min(100, Math.round((progress.cost / progress.flatRate) * 100))
}

/** Budget colour based on usage */
export function budgetColor(pct) {
  if (pct === null) return '#9ca3af'
  if (pct < 75) return '#16a34a'
  if (pct < 90) return '#d97706'
  return '#dc2626'
}
