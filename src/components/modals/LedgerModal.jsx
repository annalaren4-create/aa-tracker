import { COURSES, getCourseDef, syllabusVersionFor } from '../../data/courses'
import { AIRCRAFT_RATES, SIM_RATE, GROUND_RATE, FSC_INSTR_RATE, LU_FLAT_RATES, LU_STANDARD_AIRCRAFT, LU_FUNDED_REPEATS_PER_COURSE, instrRate } from '../../data/constants'
import { repeatKeysFor } from '../../utils/calculations'

/**
 * Drill-down view for any of the student-detail stat tiles. Shows a chronological
 * ledger of every logged flight with the math behind each entry so a chief or
 * instructor can answer "where did that hour come from" or "what added up to $X".
 */
export default function LedgerModal({ student, logs, instructors, mode = 'hours', viewCourse, onClose }) {
  const activeCourse = viewCourse || student.course
  const ledgerVersion = activeCourse !== student.course ? syllabusVersionFor(student, activeCourse) : undefined
  const course = getCourseDef(activeCourse, ledgerVersion)
  // Logs are namespaced by course: logs[studentId][course][lessonId]
  const sLogs  = (logs[student.id] || {})[activeCourse] || {}
  const defaultAircraftRate = AIRCRAFT_RATES[student.aircraft] || 0
  const chargeSimDevice = !course?.simUnlimited
  const rateByName = {}
  instructors.forEach((i) => { if (i.lineRate) rateByName[i.name] = i.lineRate })

  // Mirror calcProgress's OOP repeat policy so the balance ledger only deducts
  // from Liberty when LU actually pays. Only the first N repeats (per course
  // policy) on non-stagecheck lessons are LU-funded; everything else is OOP.
  const histEntry = student.courseHistory?.find((h) => h.course === activeCourse)
  const libRepeatsAllowed = histEntry?.libRepeatsAllowed ?? LU_FUNDED_REPEATS_PER_COURSE
  const libFundedRepeatIds = []
  if (course) {
    for (const lesson of course.lessons) {
      if (libFundedRepeatIds.length >= libRepeatsAllowed) break
      const lg = sLogs[lesson.id]
      if (lg?.repeatedLib && !lesson.sc && !lesson.fsc && !lesson.pc) {
        libFundedRepeatIds.push(lesson.id)
      }
    }
  }
  const repeatIsOop = (lesson, repeatIndex) => {
    const parent = sLogs[lesson.id] || {}
    if (parent.repeatedOop) return true
    if (parent.repeatedLib && (lesson.sc || lesson.fsc || lesson.pc)) return true
    if (parent.repeatedLib && !libFundedRepeatIds.includes(lesson.id)) return true
    if (parent.repeatedLib && repeatIndex > 0) return true   // 2nd+ repeat → OOP
    return false
  }

  // Flatten every log entry (original + repeats) into a sortable list.
  const rows = []
  course?.lessons.forEach((lesson) => {
    const add = (key, lg, repeatIdx, isOop) => {
      if (!lg) return
      if (!lg.date && !lg.dual && !lg.solo && !lg.sim && !lg.ground && !lg.completed) return
      const ir = lg.instructor
      const lineRate = rateByName[ir] || course.instructorRate || instrRate(student.base, false)
      const flightIr = lesson.fsc ? FSC_INSTR_RATE : lineRate
      const groundRate = lesson.fsc ? FSC_INSTR_RATE : (course.groundRate || GROUND_RATE)
      const dual = lg.dual || 0
      const solo = lg.solo || 0
      const sim  = lg.sim  || 0
      const ground = lg.ground || 0
      // Per-log aircraft override; falls back to the student's default.
      const aircraftUsed = lg.aircraft || student.aircraft
      const aircraftRate = AIRCRAFT_RATES[aircraftUsed] || defaultAircraftRate
      // Rate discount: prefer the per-course override on the courseHistory
      // entry, else fall back to the student-level field, else no discount.
      const histEntry = student.courseHistory?.find((h) => h.course === activeCourse)
      const effectiveDiscount = (histEntry?.rateDiscount != null)
        ? histEntry.rateDiscount
        : (student.rateDiscount || 0)
      const discMul = 1 - effectiveDiscount
      // Liberty pays aircraft at the "least expensive" rate for the course.
      // Anything extra (S model vs L/P, etc.) is an OOP aircraft surcharge.
      const isLiberty = student.school === 'Liberty University'
      const standardAircraft = isLiberty ? LU_STANDARD_AIRCRAFT[activeCourse] : null
      const standardAircraftRate = standardAircraft ? AIRCRAFT_RATES[standardAircraft] : null
      const luAircraftRate = (standardAircraftRate != null && standardAircraftRate < aircraftRate)
        ? standardAircraftRate
        : aircraftRate
      const flightHours = dual + solo
      // Apply the per-student discount to every line item so the ledger matches
      // what the school actually charges.
      const aircraftCost      = flightHours * luAircraftRate * discMul
      const aircraftSurcharge = flightHours * Math.max(0, aircraftRate - luAircraftRate) * discMul
      const instructorCost = (dual * flightIr + sim * flightIr) * discMul
      const simDeviceCost  = (chargeSimDevice ? sim * SIM_RATE : 0) * discMul
      const groundCost     = ground * groundRate * discMul
      const luLessonCost   = aircraftCost + instructorCost + simDeviceCost + groundCost
      const totalCost      = luLessonCost + aircraftSurcharge
      const totalHours     = dual + solo + sim
      rows.push({
        key,
        lessonId: lesson.id,
        date: lg.date || '',
        instructor: ir || '—',
        aircraft: aircraftUsed || '—',
        repeatIdx,
        isOop: !!isOop,
        dual, solo, sim, ground,
        aircraftCost, aircraftSurcharge, instructorCost, simDeviceCost, groundCost,
        luLessonCost, totalCost,
        totalHours,
        completed: !!lg.completed,
        incomplete: !!lg.incomplete,
        objectives: lesson.o,
      })
    }
    const origLg = sLogs[lesson.id]
    add(lesson.id, origLg, null, !!origLg?.paidOop)
    repeatKeysFor(sLogs, lesson.id).forEach((rk, idx) => {
      const rlg = sLogs[rk]
      add(rk, rlg, idx, !!rlg?.paidOop || repeatIsOop(lesson, idx))
    })
  })
  // Sort chronologically — undated entries float to the bottom.
  rows.sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date.localeCompare(b.date)
  })

  // Surface the course enrollment fee (e.g. Instrument's $1,000 Simulator
  // Package) as its own ledger row at the very top of cost / balance views.
  // Skipped in the hours ledger (no flight time attached). The row is built
  // here — after sorting — so it always renders first regardless of dates.
  if (mode !== 'hours' && course?.enrollmentFee > 0) {
    rows.unshift({
      key: '__enrollment',
      lessonId: course.enrollmentFeeLabel || 'Enrollment fee',
      date: '',
      instructor: '—',
      aircraft: '—',
      repeatIdx: null,
      isOop: false,
      isEnrollment: true,
      dual: 0, solo: 0, sim: 0, ground: 0,
      aircraftCost: 0, aircraftSurcharge: 0, instructorCost: 0, simDeviceCost: 0, groundCost: 0,
      luLessonCost: course.enrollmentFee,
      totalCost:    course.enrollmentFee,
      totalHours: 0,
      completed: false,
      incomplete: false,
      objectives: '',
    })
  }

  const title = {
    hours:   'Hours flown — ledger',
    cost:    'Est. cost — ledger',
    balance: 'LU balance — ledger',
  }[mode] || 'Ledger'

  // Running totals for the cost / balance views. Cost mode starts at 0 — the
  // enrollment fee is now its own ledger row that adds itself. Balance mode
  // starts at the flat rate; the enrollment row then subtracts it, matching
  // how calcProgress derives the dashboard balance.
  let running = 0
  if (mode === 'balance') {
    running = (student.school === 'Liberty University' && course)
      ? (LU_FLAT_RATES[activeCourse] || 0)
      : 0
  }

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 880 }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 500 }}>{title}</h2>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {student.name} · {activeCourse} · {student.aircraft}
              {viewCourse && viewCourse !== student.course && (
                <span style={{ marginLeft: 6, color: '#92400e', fontWeight: 600 }}>· past course</span>
              )}
            </div>
          </div>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 13 }}>
              No flights logged yet.
            </div>
          ) : (
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={th}>Date</th>
                  <th style={th}>Lesson</th>
                  <th style={th}>Aircraft</th>
                  <th style={th}>Instructor</th>
                  {mode === 'hours' && (<>
                    <th style={thRight}>Dual</th>
                    <th style={thRight}>Solo</th>
                    <th style={thRight}>Sim</th>
                    <th style={thRight}>Ground</th>
                    <th style={thRight}>Total</th>
                  </>)}
                  {mode !== 'hours' && (<>
                    <th style={thRight}>Aircraft</th>
                    <th style={thRight}>Instr</th>
                    <th style={thRight}>Sim dev</th>
                    <th style={thRight}>Ground</th>
                    <th style={thRight} title="Out-of-pocket aircraft surcharge (e.g. S model vs L/P)">+OOP</th>
                    <th style={thRight}>Lesson $</th>
                    {mode === 'cost' && <th style={thRight}>Running $</th>}
                    {mode === 'balance' && <th style={thRight}>Balance</th>}
                  </>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  // Running cost and Balance only reflect what LU is billed
                  // (i.e. excluding the OOP aircraft surcharge — that lives in
                  // its own column — AND skipping rows the student paid OOP,
                  // like 2nd+ repeats or stage-check repeats that LU doesn't fund).
                  if (mode === 'cost' && !r.isOop) running += r.luLessonCost
                  if (mode === 'balance' && !r.isOop) running -= r.luLessonCost
                  return (
                    <tr key={r.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={td}>{r.date || '—'}</td>
                      <td style={td}>
                        {r.repeatIdx !== null ? <span style={{ color: '#dc2626' }}>↻ </span> : null}
                        <span style={{ fontStyle: r.isEnrollment ? 'italic' : 'normal', color: r.isEnrollment ? '#6b7280' : undefined }}>
                          {r.lessonId}
                        </span>
                        {r.repeatIdx !== null && <span style={{ color: '#9ca3af', fontSize: 10 }}> (repeat {r.repeatIdx + 1})</span>}
                        {r.isEnrollment && <span className="tag tag-blue" style={{ marginLeft: 6, fontSize: 9 }}>FEE</span>}
                        {r.isOop && <span className="tag tag-amber" style={{ marginLeft: 6, fontSize: 9 }}>OOP</span>}
                      </td>
                      <td style={{ ...td, fontSize: 11, color: r.aircraftSurcharge > 0 ? '#b45309' : '#374151' }}>{r.aircraft}</td>
                      <td style={td}>{r.instructor}</td>
                      {mode === 'hours' && (<>
                        <td style={tdRight}>{r.dual > 0 ? r.dual.toFixed(1) : '—'}</td>
                        <td style={tdRight}>{r.solo > 0 ? r.solo.toFixed(1) : '—'}</td>
                        <td style={tdRight}>{r.sim > 0 ? r.sim.toFixed(1) : '—'}</td>
                        <td style={tdRight}>{r.ground > 0 ? r.ground.toFixed(1) : '—'}</td>
                        <td style={{ ...tdRight, fontWeight: 600 }}>{r.totalHours > 0 ? r.totalHours.toFixed(1) : '—'}</td>
                      </>)}
                      {mode !== 'hours' && (<>
                        <td style={{ ...tdRight, color: r.isOop ? '#9ca3af' : undefined }}>{r.aircraftCost > 0 ? `$${r.aircraftCost.toFixed(0)}` : '—'}</td>
                        <td style={{ ...tdRight, color: r.isOop ? '#9ca3af' : undefined }}>{r.instructorCost > 0 ? `$${r.instructorCost.toFixed(0)}` : '—'}</td>
                        <td style={{ ...tdRight, color: r.isOop ? '#9ca3af' : undefined }}>{r.simDeviceCost > 0 ? `$${r.simDeviceCost.toFixed(0)}` : '—'}</td>
                        <td style={{ ...tdRight, color: r.isOop ? '#9ca3af' : undefined }}>{r.groundCost > 0 ? `$${r.groundCost.toFixed(0)}` : '—'}</td>
                        {(() => {
                          // OOP rows route the whole lesson cost into +OOP; everything else
                          // just shows the aircraft surcharge there. LU-billed Lesson $ then
                          // reflects what LU actually pays (zero for OOP rows).
                          const oopAmt = r.isOop
                            ? r.luLessonCost + r.aircraftSurcharge
                            : r.aircraftSurcharge
                          const lessonAmt = r.isOop ? 0 : r.totalCost
                          return (<>
                            <td style={{ ...tdRight, color: oopAmt > 0 ? '#b45309' : '#d1d5db', fontWeight: oopAmt > 0 ? 600 : 400 }}>
                              {oopAmt > 0 ? `+$${oopAmt.toFixed(0)}` : '—'}
                            </td>
                            <td style={{ ...tdRight, fontWeight: 600, color: r.isOop ? '#9ca3af' : undefined }}>
                              ${lessonAmt.toFixed(0)}
                            </td>
                          </>)
                        })()}
                        {mode === 'cost' && <td style={{ ...tdRight, color: '#1a3a5c', fontWeight: 600 }}>${Math.round(running).toLocaleString()}</td>}
                        {mode === 'balance' && (
                          <td style={{ ...tdRight, color: running >= 0 ? '#15803d' : '#dc2626', fontWeight: 600 }}>
                            ${Math.round(running).toLocaleString()}
                          </td>
                        )}
                      </>)}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

const th = { textAlign: 'left', padding: '6px 8px', fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }
const thRight = { ...th, textAlign: 'right' }
const td = { padding: '6px 8px', color: '#111827' }
const tdRight = { ...td, textAlign: 'right' }
