import { AIRCRAFT_RATES, LU_FLAT_RATES, SIM_RATE, instrRate } from '../data/constants'
import { COURSES } from '../data/courses'

/**
 * Calculate a student's progress and estimated cost.
 * @param {object} student
 * @param {object} logs  — keyed by studentId → lessonId → logData
 * @returns {object}
 */
export function calcProgress(student, logs) {
  const course = COURSES[student.course]
  if (!course) return { pct: 0, flown: 0, cost: 0, completed: 0, total: 0, flatRate: null, targetTotal: 0 }

  const sLogs = logs[student.id] || {}
  const aircraftRate = AIRCRAFT_RATES[student.aircraft] || 0
  let flown = 0, cost = 0, completed = 0

  course.lessons.forEach((lesson) => {
    const lg = sLogs[lesson.id]
    if (!lg) return

    const dual    = lg.dual    || 0
    const solo    = lg.solo    || 0
    const sim     = lg.sim     || 0
    const ground  = lg.ground  || 0
    const flightTime = dual + solo
    const isCheck = lesson.sc || lesson.pc
    const ir = instrRate(student.base, isCheck)

    cost += flightTime * aircraftRate  // aircraft time (dual + solo)
    cost += dual * ir                  // instructor rate for dual flight time
    cost += sim * SIM_RATE             // sim device (Redbird)
    cost += sim * ir                   // instructor present during sim sessions
    cost += ground * ir                // ground instruction

    flown += flightTime + sim
    if (lg.completed) completed++
  })

  const total = course.lessons.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const flatRate = student.school === 'Liberty University' ? LU_FLAT_RATES[student.course] : null

  return {
    pct,
    flown: parseFloat(flown.toFixed(1)),
    cost: Math.round(cost),
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
