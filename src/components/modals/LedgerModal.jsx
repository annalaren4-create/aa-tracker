import { COURSES } from '../../data/courses'
import { AIRCRAFT_RATES, SIM_RATE, GROUND_RATE, FSC_INSTR_RATE, LU_FLAT_RATES, instrRate } from '../../data/constants'
import { repeatKeysFor } from '../../utils/calculations'

/**
 * Drill-down view for any of the student-detail stat tiles. Shows a chronological
 * ledger of every logged flight with the math behind each entry so a chief or
 * instructor can answer "where did that hour come from" or "what added up to $X".
 */
export default function LedgerModal({ student, logs, instructors, mode = 'hours', onClose }) {
  const course = COURSES[student.course]
  const sLogs  = logs[student.id] || {}
  const aircraftRate = AIRCRAFT_RATES[student.aircraft] || 0
  const chargeSimDevice = !course?.simUnlimited
  const rateByName = {}
  instructors.forEach((i) => { if (i.lineRate) rateByName[i.name] = i.lineRate })

  // Flatten every log entry (original + repeats) into a sortable list.
  const rows = []
  course?.lessons.forEach((lesson) => {
    const add = (key, lg, repeatIdx) => {
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
      const aircraftCost   = (dual + solo) * aircraftRate
      const instructorCost = dual * flightIr + sim * flightIr
      const simDeviceCost  = chargeSimDevice ? sim * SIM_RATE : 0
      const groundCost     = ground * groundRate
      const totalCost      = aircraftCost + instructorCost + simDeviceCost + groundCost
      const totalHours     = dual + solo + sim
      rows.push({
        key,
        lessonId: lesson.id,
        date: lg.date || '',
        instructor: ir || '—',
        repeatIdx,
        dual, solo, sim, ground,
        aircraftCost, instructorCost, simDeviceCost, groundCost, totalCost,
        totalHours,
        completed: !!lg.completed,
        incomplete: !!lg.incomplete,
        objectives: lesson.o,
      })
    }
    add(lesson.id, sLogs[lesson.id], null)
    repeatKeysFor(sLogs, lesson.id).forEach((rk, idx) => add(rk, sLogs[rk], idx))
  })
  // Sort chronologically — undated entries float to the bottom.
  rows.sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date.localeCompare(b.date)
  })

  const title = {
    hours:   'Hours flown — ledger',
    cost:    'Est. cost — ledger',
    balance: 'LU balance — ledger',
  }[mode] || 'Ledger'

  // Running totals for the cost / balance views
  let running = 0
  if (mode === 'cost') {
    // running starts at enrollment fee
    running = course?.enrollmentFee || 0
  } else if (mode === 'balance') {
    running = (student.school === 'Liberty University' && course)
      ? (LU_FLAT_RATES[student.course] || 0)
      : 0
  }

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 880 }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 500 }}>{title}</h2>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {student.name} · {student.course} · {student.aircraft}
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
                    <th style={thRight}>Lesson $</th>
                    {mode === 'cost' && <th style={thRight}>Running $</th>}
                    {mode === 'balance' && <th style={thRight}>Balance</th>}
                  </>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  if (mode === 'cost') running += r.totalCost
                  if (mode === 'balance') running -= r.totalCost
                  return (
                    <tr key={r.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={td}>{r.date || '—'}</td>
                      <td style={td}>
                        {r.repeatIdx !== null ? <span style={{ color: '#dc2626' }}>↻ </span> : null}
                        {r.lessonId}
                        {r.repeatIdx !== null && <span style={{ color: '#9ca3af', fontSize: 10 }}> (repeat {r.repeatIdx + 1})</span>}
                      </td>
                      <td style={td}>{r.instructor}</td>
                      {mode === 'hours' && (<>
                        <td style={tdRight}>{r.dual > 0 ? r.dual.toFixed(1) : '—'}</td>
                        <td style={tdRight}>{r.solo > 0 ? r.solo.toFixed(1) : '—'}</td>
                        <td style={tdRight}>{r.sim > 0 ? r.sim.toFixed(1) : '—'}</td>
                        <td style={tdRight}>{r.ground > 0 ? r.ground.toFixed(1) : '—'}</td>
                        <td style={{ ...tdRight, fontWeight: 600 }}>{r.totalHours > 0 ? r.totalHours.toFixed(1) : '—'}</td>
                      </>)}
                      {mode !== 'hours' && (<>
                        <td style={tdRight}>{r.aircraftCost > 0 ? `$${r.aircraftCost.toFixed(0)}` : '—'}</td>
                        <td style={tdRight}>{r.instructorCost > 0 ? `$${r.instructorCost.toFixed(0)}` : '—'}</td>
                        <td style={tdRight}>{r.simDeviceCost > 0 ? `$${r.simDeviceCost.toFixed(0)}` : '—'}</td>
                        <td style={tdRight}>{r.groundCost > 0 ? `$${r.groundCost.toFixed(0)}` : '—'}</td>
                        <td style={{ ...tdRight, fontWeight: 600 }}>${r.totalCost.toFixed(0)}</td>
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
          {mode === 'cost' && course?.enrollmentFee > 0 && (
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>
              Running starts at ${course.enrollmentFee.toLocaleString()} one-time enrollment fee.
            </div>
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
