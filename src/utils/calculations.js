import { AIRCRAFT_RATES, LU_FLAT_RATES, SIM_RATE, GROUND_RATE, FSC_INSTR_RATE, instrRate } from '../data/constants'
import { COURSES } from '../data/courses'

/**
 * Repeat-attempt log keys look like `<lessonId>__r1`, `<lessonId>__r2`, etc.
 * Returns the array of synthetic keys present in sLogs for a given lesson.
 */
export function repeatKeysFor(sLogs, lessonId) {
  const prefix = `${lessonId}__r`
  return Object.keys(sLogs).filter((k) => k.startsWith(prefix)).sort()
}

/**
 * Calculate a student's progress and estimated cost.
 * @param {object} student
 * @param {object} logs  — keyed by studentId → lessonId → logData
 * @returns {object}
 */
/**
 * Billing cost for a single lesson given actual logged hours.
 * Redbird-only lessons (sm but no d) ignore any logged dual hours so
 * stale data from older lesson definitions can't pollute the cost.
 */
function lessonCost(lesson, dual, solo, sim, ground, aircraftRate, student, chargeSimDevice = true, rateOverrides = {}, instructorLineRate) {
  // Rate priority for the non-FSC line rate (highest wins):
  //   1. Specific instructor's lineRate (e.g., chiefs/asst chiefs at $110)
  //   2. Course-level instructorRate override (e.g., MEI at $110)
  //   3. Student-base default ($100 KHEF/KJYO, $95 elsewhere)
  // FSC always bumps to $145 regardless of who teaches.
  const flightIr = lesson.fsc
    ? FSC_INSTR_RATE
    : (instructorLineRate || rateOverrides.flight || instrRate(student.base, false))
  const groundRate = lesson.fsc ? FSC_INSTR_RATE : (rateOverrides.ground || GROUND_RATE)

  // Redbird-only: lesson has sm but no d → ignore any logged dual entirely
  const redbirdOnly  = !lesson.d && (lesson.sm || 0) > 0
  const effDual = redbirdOnly ? 0 : dual
  const effSim  = sim

  const flightTime = effDual + solo
  let cost = 0
  cost += flightTime * aircraftRate                    // aircraft (dual + solo, never sim)
  cost += effDual    * flightIr                        // instructor on dual flight
  if (chargeSimDevice) cost += effSim * SIM_RATE       // Redbird device — skipped when course has unlimited-sim enrollment fee
  cost += effSim     * flightIr                        // instructor present for sim (Part 141 sims are dual)
  cost += ground     * groundRate                      // ground instruction
  return { cost, flightTime, effSim }
}

/**
 * Expected cost for an unstarted lesson at its target hours.
 */
function lessonExpectedCost(lesson, aircraftRate, student, chargeSimDevice, rateOverrides, primaryLineRate) {
  const d  = lesson.d  || 0
  const s  = lesson.s  || 0
  const sm = lesson.sm || 0
  const g  = lesson.g  || 0
  const { cost } = lessonCost(lesson, d, s, sm, g, aircraftRate, student, chargeSimDevice, rateOverrides, primaryLineRate)
  return cost
}

export function calcProgress(student, logs, instructors = []) {
  const course = COURSES[student.course]
  if (!course) return { pct: 0, flown: 0, cost: 0, projected: 0, completed: 0, total: 0, flatRate: null, targetTotal: 0 }

  const sLogs = logs[student.id] || {}
  const aircraftRate = AIRCRAFT_RATES[student.aircraft] || 0
  const chargeSimDevice = !course.simUnlimited
  const enrollmentFee = course.enrollmentFee || 0
  const rateOverrides = { flight: course.instructorRate, ground: course.groundRate }

  // Build a name → lineRate lookup so logged-lesson costs respect each instructor's rate.
  const rateByName = {}
  instructors.forEach((i) => { if (i.lineRate) rateByName[i.name] = i.lineRate })

  // Rate used for unstarted/projected lessons — the student's primary instructor's
  // rate if they have a custom one, else falls through to defaults inside lessonCost.
  const primaryLineRate = rateByName[student.primaryInstructor]

  // `cost` = Liberty-billed cost (counts toward LU flat-rate balance).
  // `oopCost` = student's out-of-pocket charges (do NOT count toward LU balance).
  let flown = 0, cost = enrollmentFee, oopCost = 0, completed = 0

  // Determine the first valid Liberty-funded repeat in the course (left-to-right
  // through the syllabus). Liberty funds at most ONE repeat per course, and that
  // repeat may never be on a stage check, final stage check, or progress check.
  let firstLibRepeatId = null
  for (const lesson of course.lessons) {
    const lg = sLogs[lesson.id]
    if (lg?.repeatedLib && !lesson.sc && !lesson.fsc && !lesson.pc) {
      firstLibRepeatId = lesson.id
      break
    }
  }

  // Is a given repeat-attempt log Out of Pocket?
  // `repeatIndex` is the 0-based position of the repeat within the lesson
  // (0 = first repeat, 1 = second repeat, ...).
  const repeatIsOop = (lesson, repeatIndex) => {
    const parent = sLogs[lesson.id] || {}
    if (parent.repeatedOop) return true                          // explicitly OOP
    if (parent.repeatedLib && (lesson.sc || lesson.fsc || lesson.pc)) return true  // policy violation
    if (parent.repeatedLib && lesson.id !== firstLibRepeatId) return true          // 2nd+ Lib lesson → OOP
    if (parent.repeatedLib && repeatIndex > 0) return true                         // 2nd+ repeat within same lesson → OOP
    return false
  }

  // A log entry counts as "started" only if it has any logged hours or is marked completed.
  // Empty/zeroed entries (left over from clearing the lesson) are treated as unstarted.
  const isStarted = (lg) => !!lg && (
    lg.completed ||
    (lg.dual || 0) > 0 || (lg.solo || 0) > 0 || (lg.xc || 0) > 0 ||
    (lg.sim || 0) > 0 || (lg.hood || 0) > 0 || (lg.night || 0) > 0 ||
    (lg.ground || 0) > 0
  )

  const addLessonLog = (lesson, lg, { countCompletion, isOop }) => {
    if (!isStarted(lg)) return
    const loggedInstrRate = rateByName[lg.instructor]
    const { cost: lc, flightTime, effSim } = lessonCost(
      lesson,
      lg.dual   || 0,
      lg.solo   || 0,
      lg.sim    || 0,
      lg.ground || 0,
      aircraftRate,
      student,
      chargeSimDevice,
      rateOverrides,
      loggedInstrRate,
    )
    if (isOop) oopCost += lc
    else       cost    += lc
    flown += flightTime + effSim
    if (countCompletion && lg.completed) completed++
  }

  course.lessons.forEach((lesson) => {
    // The original (first) attempt is always Liberty-funded.
    addLessonLog(lesson, sLogs[lesson.id], { countCompletion: true, isOop: false })
    // Repeat attempts: only the FIRST repeat of the FIRST eligible lesson is
    // Liberty-funded; everything else is OOP.
    repeatKeysFor(sLogs, lesson.id).forEach((rk, idx) =>
      addLessonLog(lesson, sLogs[rk], { countCompletion: false, isOop: repeatIsOop(lesson, idx) })
    )
  })

  // Projected total = actual cost so far + expected cost of not-yet-started lessons
  // This avoids the "early expensive lessons inflate the projection" problem of
  // the naive (cost/pct)*100 formula.
  let remainingCost = 0
  course.lessons.forEach((lesson) => {
    if (isStarted(sLogs[lesson.id])) return   // already started — captured in actual cost
    remainingCost += lessonExpectedCost(lesson, aircraftRate, student, chargeSimDevice, rateOverrides, primaryLineRate)
  })

  const total    = course.lessons.length
  const pct      = total > 0 ? Math.round((completed / total) * 100) : 0
  const flatRate = student.school === 'Liberty University' ? LU_FLAT_RATES[student.course] : null
  const projected = Math.round(cost + remainingCost)

  // "With repeat allowance" projection — mirrors the official syllabus assumption
  // that most students will use Liberty's one funded repeat. Adds the cost of a
  // typical extra lesson (2.0 hr dual + 0.7 hr ground at the student's rates).
  const bufferLesson = { d: 2.0, g: 0.7 }
  const repeatBufferCost = lessonExpectedCost(
    bufferLesson, aircraftRate, student, chargeSimDevice, rateOverrides, primaryLineRate
  )
  const projectedWithRepeat = Math.round(cost + remainingCost + repeatBufferCost)

  return {
    pct,
    flown: parseFloat(flown.toFixed(1)),
    cost: Math.round(cost),                  // Liberty-billed cost (counts vs flat rate)
    oopCost: Math.round(oopCost),            // out-of-pocket charges (do NOT count vs flat rate)
    totalCost: Math.round(cost + oopCost),   // total student-incurred charges
    projected,
    projectedWithRepeat,
    repeatBufferCost: Math.round(repeatBufferCost),
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
  const add = (lg) => { if (lg) actual += (lg.dual || 0) + (lg.solo || 0) + (lg.sim || 0) }
  course.lessons.forEach((l) => {
    add(sLogs[l.id])
    repeatKeysFor(sLogs, l.id).forEach((rk) => add(sLogs[rk]))
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
