import { AIRCRAFT_RATES, LU_FLAT_RATES, LU_FUNDED_REPEATS_PER_COURSE, LU_STANDARD_AIRCRAFT, SIM_RATE, GROUND_RATE, FSC_INSTR_RATE, instrRate } from '../data/constants'
import { COURSES, getCourseDef, syllabusVersionFor } from '../data/courses'

/**
 * Repeat-attempt log keys look like `<lessonId>__r1`, `<lessonId>__r2`, etc.
 * Returns the array of synthetic keys present in sLogs for a given lesson.
 */
export function repeatKeysFor(sLogs, lessonId) {
  const prefix = `${lessonId}__r`
  return Object.keys(sLogs).filter((k) => k.startsWith(prefix)).sort()
}

/**
 * Split-continuation log keys look like `<lessonId>__s1`, `__s2`, etc.
 * These are subsequent sessions of the SAME lesson — Liberty-funded just like
 * the original (not repeats, not OOP). Hours accumulate to the lesson total.
 */
export function splitKeysFor(sLogs, lessonId) {
  const prefix = `${lessonId}__s`
  return Object.keys(sLogs).filter((k) => k.startsWith(prefix)).sort((a, b) => {
    const na = parseInt(a.split('__s')[1], 10) || 0
    const nb = parseInt(b.split('__s')[1], 10) || 0
    return na - nb
  })
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
function lessonCost(lesson, dual, solo, sim, ground, aircraftRate, student, chargeSimDevice = true, rateOverrides = {}, instructorLineRate, standardAircraftRate, rateDiscount = 0) {
  // Rate priority for the non-FSC line rate (highest wins):
  //   1. Specific instructor's lineRate (e.g., chiefs/asst chiefs at $110)
  //   2. Course-level instructorRate override (e.g., MEI at $110)
  //   3. Stage / prog check rate ($110 KHEF/KJYO, $105 elsewhere) when the
  //      lesson is flagged sc:true or pc:true — they're flown with a check
  //      instructor and billed at the higher check rate per AA policy.
  //   4. Student-base line default ($100 KHEF/KJYO, $95 elsewhere)
  // FSC (fsc:true) always bumps to $145 regardless of who teaches.
  const isCheckLesson = !!(lesson.sc || lesson.pc)
  const flightIr = lesson.fsc
    ? FSC_INSTR_RATE
    : (instructorLineRate || rateOverrides.flight || instrRate(student.base, isCheckLesson))
  const groundRate = lesson.fsc ? FSC_INSTR_RATE : (rateOverrides.ground || GROUND_RATE)

  // Redbird-only: lesson has sm but no d → ignore any logged dual entirely
  const redbirdOnly  = !lesson.d && (lesson.sm || 0) > 0
  const effDual = redbirdOnly ? 0 : dual
  const effSim  = sim

  const flightTime = effDual + solo
  // Liberty pays the aircraft at the "least expensive approved" rate for the
  // course. If the student flies a more expensive aircraft, the per-hour delta
  // is OOP. Non-Liberty students just pay the full aircraft rate at LU bucket
  // (oopAircraftSurcharge stays 0 because standardAircraftRate is undefined).
  const luAircraftRate = (standardAircraftRate != null && standardAircraftRate < aircraftRate)
    ? standardAircraftRate
    : aircraftRate
  const oopAircraftSurcharge = flightTime * Math.max(0, aircraftRate - luAircraftRate)

  let cost = 0
  cost += flightTime * luAircraftRate                  // aircraft at LU-covered rate
  cost += effDual    * flightIr                        // instructor on dual flight
  if (chargeSimDevice) cost += effSim * SIM_RATE       // Redbird device — skipped when course has unlimited-sim enrollment fee
  cost += effSim     * flightIr                        // instructor present for sim (Part 141 sims are dual)
  cost += ground     * groundRate                      // ground instruction

  // Per-student rate discount (e.g. spouse / family discount). Caller decides
  // whether to apply it — typically only on the student's CURRENT course so
  // historical billed-at-the-time courses aren't retroactively adjusted.
  const discMul = 1 - (rateDiscount || 0)
  return {
    cost: cost * discMul,
    oopAircraftSurcharge: oopAircraftSurcharge * discMul,
    flightTime, effSim,
  }
}

/**
 * Expected cost for an unstarted lesson at its target hours.
 */
function lessonExpectedCost(lesson, aircraftRate, student, chargeSimDevice, rateOverrides, primaryLineRate, standardAircraftRate, rateDiscount = 0) {
  const d  = lesson.d  || 0
  const s  = lesson.s  || 0
  const sm = lesson.sm || 0
  const g  = lesson.g  || 0
  const { cost, oopAircraftSurcharge } = lessonCost(lesson, d, s, sm, g, aircraftRate, student, chargeSimDevice, rateOverrides, primaryLineRate, standardAircraftRate, rateDiscount)
  // For projections we include the surcharge in the projected total spend (it
  // still hits the student, just under the OOP bucket).
  return { luCost: cost, oopCost: oopAircraftSurcharge }
}

export function calcProgress(student, logs, instructors = [], courseOverride) {
  // courseOverride lets the caller view a historical course's progress without
  // changing the student's current course. Defaults to the active course.
  const activeCourse = courseOverride || student.course
  // Historical courses may have been taken under an older syllabus version;
  // pull that version from courseHistory so lessons / targets reflect what
  // the student actually trained against, not the current syllabus.
  const syllabusVersion = courseOverride ? syllabusVersionFor(student, activeCourse) : undefined
  const course = getCourseDef(activeCourse, syllabusVersion)
  if (!course) return { pct: 0, flown: 0, cost: 0, projected: 0, completed: 0, total: 0, flatRate: null, targetTotal: 0 }

  // New log shape: logs[studentId][course][lessonId]. Old callers pass the
  // current-course logs through automatically since student.course == activeCourse.
  const sLogs = (logs[student.id] || {})[activeCourse] || {}
  const aircraftRate = AIRCRAFT_RATES[student.aircraft] || 0
  // Liberty pays the aircraft at the "least expensive approved" rate for the
  // course. If the student flies a pricier aircraft, the delta is OOP.
  // Non-Liberty students have no surcharge concept.
  const isLiberty = student.school === 'Liberty University'
  const standardAircraft = isLiberty ? LU_STANDARD_AIRCRAFT[activeCourse] : null
  const standardAircraftRate = standardAircraft ? AIRCRAFT_RATES[standardAircraft] : null
  // Rate discount: prefer the per-course override on the courseHistory entry
  // (e.g. Adam's 15% applied only to Commercial 1) over a student-level field.
  // Falls back to 0 (full rates) when neither is set.
  const courseHistEntry = student.courseHistory?.find((h) => h.course === activeCourse)
  const effectiveDiscount = (courseHistEntry?.rateDiscount != null)
    ? courseHistEntry.rateDiscount
    : (student.rateDiscount || 0)
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
  // `costAtPrimaryRate` = what `cost` would be if every logged hour used the
  // primary instructor's rate (the same assumption the projection uses for
  // remaining lessons). `cost - costAtPrimaryRate` = the instructor-premium
  // surcharge baked into the LU projection from flying with higher-rate
  // instructors (e.g. chiefs at $110 instead of line at $100).
  let flown = 0, cost = enrollmentFee, oopCost = 0, completed = 0
  let costAtPrimaryRate = enrollmentFee

  // How many funded repeats Liberty allows for this course. Defaults to the
  // current policy (LU_FUNDED_REPEATS_PER_COURSE = 1) but historical course
  // history entries can override via `libRepeatsAllowed` (e.g. 2 for last
  // semester before Liberty tightened the rule).
  const histEntry = student.courseHistory?.find((h) => h.course === activeCourse)
  const libRepeatsAllowed = histEntry?.libRepeatsAllowed ?? LU_FUNDED_REPEATS_PER_COURSE

  // Determine the FIRST N valid Liberty-funded repeats in the course (left-to-
  // right through the syllabus). Each one may not be on a stage / progress /
  // final stage check (those repeats are always OOP).
  const libFundedRepeatIds = []
  for (const lesson of course.lessons) {
    if (libFundedRepeatIds.length >= libRepeatsAllowed) break
    const lg = sLogs[lesson.id]
    if (lg?.repeatedLib && !lesson.sc && !lesson.fsc && !lesson.pc) {
      libFundedRepeatIds.push(lesson.id)
    }
  }

  // Is a given repeat-attempt log Out of Pocket?
  // `repeatIndex` is the 0-based position of the repeat within the lesson
  // (0 = first repeat, 1 = second repeat, ...).
  const repeatIsOop = (lesson, repeatIndex) => {
    const parent = sLogs[lesson.id] || {}
    if (parent.repeatedOop) return true                          // explicitly OOP
    if (parent.repeatedLib && (lesson.sc || lesson.fsc || lesson.pc)) return true  // policy violation
    if (parent.repeatedLib && !libFundedRepeatIds.includes(lesson.id)) return true // past allowance → OOP
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
    // Per-log aircraft override — students can mix-and-match aircraft across
    // lessons (e.g. one flight in C-172-S, next in C-172-L-P). Falls back to
    // the student's default aircraft when not set on the log.
    const logAircraftRate = lg.aircraft && AIRCRAFT_RATES[lg.aircraft]
      ? AIRCRAFT_RATES[lg.aircraft]
      : aircraftRate
    const { cost: lc, oopAircraftSurcharge, flightTime, effSim } = lessonCost(
      lesson,
      lg.dual   || 0,
      lg.solo   || 0,
      lg.sim    || 0,
      lg.ground || 0,
      logAircraftRate,
      student,
      chargeSimDevice,
      rateOverrides,
      loggedInstrRate,
      standardAircraftRate,
      effectiveDiscount,
    )
    if (isOop) oopCost += lc
    else       cost    += lc
    // Parallel cost at the primary instructor's rate (matches projection
    // assumption). Only tracked for LU-billed rows so the delta represents the
    // bump to the LU projection — not OOP.
    if (!isOop) {
      const { cost: lcPrimary } = lessonCost(
        lesson,
        lg.dual   || 0,
        lg.solo   || 0,
        lg.sim    || 0,
        lg.ground || 0,
        logAircraftRate,
        student,
        chargeSimDevice,
        rateOverrides,
        primaryLineRate,            // <-- use primary's rate, not the logged instructor's
        standardAircraftRate,
        effectiveDiscount,
      )
      costAtPrimaryRate += lcPrimary
    }
    // Aircraft surcharge (S model vs L/P, etc.) is always OOP — even on a
    // Liberty-covered first attempt — because LU only funds the standard rate.
    oopCost += oopAircraftSurcharge
    flown += flightTime + effSim
    if (countCompletion && lg.completed) completed++
  }

  course.lessons.forEach((lesson) => {
    // The original (first) attempt is normally Liberty-funded, unless the log
    // is explicitly marked `paidOop` (e.g. a final stage check the student paid
    // out of pocket because LU's allowance was exhausted).
    const origLg = sLogs[lesson.id]
    addLessonLog(lesson, origLg, { countCompletion: true, isOop: !!origLg?.paidOop })
    // Split continuations: subsequent sessions of the SAME lesson. Normally
    // Liberty-funded, but a split that comes AFTER an OOP repeat inherits the
    // OOP billing (it's finishing an OOP attempt, e.g. a busted FSC's retry
    // that ran out of time for weather). Hours accumulate toward the lesson
    // total either way.
    const repeatChain = repeatKeysFor(sLogs, lesson.id)
    splitKeysFor(sLogs, lesson.id).forEach((sk) => {
      const slg = sLogs[sk]
      const splitDate = slg?.date
      const oopRepeatBeforeThisSplit = repeatChain.some((rk, idx) => {
        const rlg = sLogs[rk]
        // Only consider repeats dated on or before this split.
        if (!rlg) return false
        if (splitDate && rlg.date && rlg.date > splitDate) return false
        return !!rlg.paidOop || repeatIsOop(lesson, idx)
      })
      const isOop = !!slg?.paidOop || oopRepeatBeforeThisSplit
      addLessonLog(lesson, slg, { countCompletion: false, isOop })
    })
    // Repeat attempts: only the FIRST repeat of the FIRST eligible lesson is
    // Liberty-funded; everything else is OOP. A repeat can also be explicitly
    // marked `paidOop` for absolute clarity.
    repeatKeysFor(sLogs, lesson.id).forEach((rk, idx) => {
      const rlg = sLogs[rk]
      addLessonLog(lesson, rlg, { countCompletion: false, isOop: !!rlg?.paidOop || repeatIsOop(lesson, idx) })
    })
  })

  // Projected total = actual cost so far + expected cost of not-yet-started lessons
  // This avoids the "early expensive lessons inflate the projection" problem of
  // the naive (cost/pct)*100 formula.
  let remainingLuCost = 0
  let remainingOopCost = 0
  course.lessons.forEach((lesson) => {
    if (isStarted(sLogs[lesson.id])) return   // already started — captured in actual cost
    const { luCost, oopCost: oopForLesson } = lessonExpectedCost(
      lesson, aircraftRate, student, chargeSimDevice, rateOverrides, primaryLineRate, standardAircraftRate, effectiveDiscount
    )
    remainingLuCost  += luCost
    remainingOopCost += oopForLesson
  })

  const total    = course.lessons.length
  const pct      = total > 0 ? Math.round((completed / total) * 100) : 0
  // Flat rate is per-course, so use the course being viewed (could be a past
  // course) — not the student's current course.
  const flatRate = student.school === 'Liberty University' ? LU_FLAT_RATES[activeCourse] : null
  // Projected LU spend (counts vs flat rate) AND projected total to the student.
  const projected = Math.round(cost + remainingLuCost)
  const projectedTotal = Math.round(cost + oopCost + remainingLuCost + remainingOopCost)

  // "With repeat allowance" projection — mirrors the official syllabus assumption
  // that most students will use Liberty's one funded repeat. Adds the cost of a
  // typical extra lesson (2.0 hr dual + 0.7 hr ground at the student's rates).
  //
  // Crucially: don't double-count. If the student has already used all of
  // Liberty's funded repeats (`libFundedRepeatIds`), no further LU-funded
  // repeat is possible. Whether to still budget for ANOTHER (OOP) repeat is a
  // judgement call — we just drop the buffer to zero so the "w/ repeat" line
  // reflects reality. UI can hide the line when the buffer is zero.
  const repeatsRemaining = Math.max(0, libRepeatsAllowed - libFundedRepeatIds.length)
  const bufferLesson = { d: 2.0, g: 0.7 }
  const { luCost: bufferLu, oopCost: bufferOop } = repeatsRemaining > 0
    ? lessonExpectedCost(
        bufferLesson, aircraftRate, student, chargeSimDevice, rateOverrides, primaryLineRate, standardAircraftRate, effectiveDiscount
      )
    : { luCost: 0, oopCost: 0 }
  const projectedWithRepeat = Math.round(cost + remainingLuCost + bufferLu + bufferOop)

  // Projected aircraft-surcharge OOP from staying on the current (pricier)
  // aircraft for all remaining lessons. Combined with what's already been
  // incurred, gives the chief a forward-looking OOP estimate.
  const projectedAircraftOop = Math.round(oopCost + remainingOopCost)

  return {
    pct,
    flown: parseFloat(flown.toFixed(1)),
    cost: Math.round(cost),                  // Liberty-billed cost (counts vs flat rate)
    oopCost: Math.round(oopCost),            // out-of-pocket charges (do NOT count vs flat rate)
    totalCost: Math.round(cost + oopCost),   // total student-incurred charges
    projected,                               // projected LU spend at target hours
    projectedTotal,                          // projected total (LU + OOP) at target hours
    projectedAircraftOop,                    // forward-looking OOP from aircraft choice
    projectedWithRepeat,
    repeatBufferCost: Math.round(bufferLu + bufferOop),
    // Exposed so the UI can hide the "w/ repeat" line once Liberty's repeat
    // allowance is already used up (no meaningful "what if" left to show).
    repeatsRemaining,
    // Positive number = how much of the current LU cost (and therefore the LU
    // projection) is the result of flying with higher-rate instructors than the
    // primary. Lets the UI explain "↑ $X from chief rate" rather than leaving
    // chiefs as a silent source of projection growth.
    instructorPremium: Math.max(0, Math.round(cost - costAtPrimaryRate)),
    completed,
    total,
    flatRate,
    targetTotal: course.targetTotal,
  }
}

/** Running over/under vs target hours */
export function overUnder(student, logs, courseOverride) {
  const activeCourse = courseOverride || student.course
  const version = courseOverride ? syllabusVersionFor(student, activeCourse) : undefined
  const course = getCourseDef(activeCourse, version)
  if (!course) return 0
  const sLogs = (logs[student.id] || {})[activeCourse] || {}
  let actual = 0
  const add = (lg) => { if (lg) actual += (lg.dual || 0) + (lg.solo || 0) + (lg.sim || 0) }
  course.lessons.forEach((l) => {
    add(sLogs[l.id])
    splitKeysFor(sLogs, l.id).forEach((sk) => add(sLogs[sk]))
    repeatKeysFor(sLogs, l.id).forEach((rk) => add(sLogs[rk]))
  })
  return parseFloat((actual - course.targetTotal).toFixed(1))
}

/** Budget percentage used (0-100), null if no flat rate */
export function budgetPct(progress) {
  if (!progress.flatRate) return null
  return Math.min(100, Math.round((progress.cost / progress.flatRate) * 100))
}

/** Budget colour based on usage.
 *  Liberty money is meant to be spent, so the bar stays green while the
 *  student is within budget and only flips red once they exceed it.
 */
export function budgetColor(pct) {
  if (pct === null) return '#9ca3af'
  if (pct <= 100) return '#16a34a'   // green — within budget
  return '#dc2626'                    // red   — over budget
}
