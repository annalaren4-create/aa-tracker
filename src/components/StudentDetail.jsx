import { useState } from 'react'
import { COURSES } from '../data/courses'
import { AIRCRAFT_LIST, AIRCRAFT_RATES, instrRate } from '../data/constants'
import { budgetPct, budgetColor, overUnder } from '../utils/calculations'
import LogFlightModal from './modals/LogFlightModal'

const COLS = '58px 1fr 52px 56px 56px 52px 56px 52px 52px 62px 88px 64px'

export default function StudentDetail({
  student, logs, instructors, isInstructor, onLogFlight, onUpdateStudent, onBack, calcProgress,
}) {
  const [logLesson, setLogLesson] = useState(null)
  const [editingDate, setEditingDate] = useState(null)
  const [editingAircraft, setEditingAircraft] = useState(false)

  const course    = COURSES[student.course]
  const sLogs     = logs[student.id] || {}
  const progress  = calcProgress(student)
  const acRate    = AIRCRAFT_RATES[student.aircraft] || 0
  const ou        = overUnder(student, logs)
  const bp        = budgetPct(progress)
  const remaining = progress.flatRate ? progress.flatRate - progress.cost : null

  // Per-field totals for the totals row
  let totDual = 0, totSolo = 0, totXC = 0, totSim = 0
  let totHood = 0, totNight = 0, totGround = 0, totFlown = 0
  course.lessons.forEach((l) => {
    const lg = sLogs[l.id]
    if (!lg) return
    totDual   += lg.dual   || 0
    totSolo   += lg.solo   || 0
    totXC     += lg.xc     || 0
    totSim    += lg.sim    || 0
    totHood   += lg.hood   || 0
    totNight  += lg.night  || 0
    totGround += lg.ground || 0
    totFlown  += (lg.dual || 0) + (lg.solo || 0) + (lg.sim || 0)
  })

  const fmt = (v) => v > 0 ? `${v.toFixed(1)}` : '—'

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-sm btn-ghost" onClick={onBack}>← Back</button>
          <div>
            <h1>{student.name}</h1>
            <small>
              {student.course} · {COURSES[student.course]?.avia} · {student.base} ·{' '}
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
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.85)' }}>Primary: {student.primaryInstructor}</div>
          {student.secondaryInstructor && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)' }}>Secondary: {student.secondaryInstructor}</div>
          )}
        </div>
      </div>

      <div style={{ padding: 16, maxWidth: 1280, margin: '0 auto' }}>
        {/* Stats */}
        <div className={isInstructor ? 'grid4' : 'grid2'} style={{ marginBottom: 16 }}>
          <StatCard label="Progress" value={`${progress.pct}%`} valueColor="#1a3a5c">
            <div style={{ marginTop: 6 }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress.pct}%`, background: '#1a3a5c' }} />
              </div>
            </div>
          </StatCard>

          <StatCard label="Hours flown" value={`${totFlown.toFixed(1)}h`}>
            <div style={{ fontSize: 12, marginTop: 4, color: ou > 0 ? '#b45309' : ou < 0 ? '#15803d' : '#6b7280' }}>
              {ou >= 0 ? '+' : ''}{ou.toFixed(1)}h vs {parseFloat(course.targetTotal).toFixed(1)}h target
            </div>
          </StatCard>

          {isInstructor && (
            <StatCard label="Est. cost" value={`$${progress.cost.toLocaleString()}`}>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                ${acRate}/hr acft · ${instrRate(student.base)}/hr instr
              </div>
              {progress.projected != null && (
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  proj. <span style={{ fontWeight: 600, color: '#374151' }}>${progress.projected.toLocaleString()}</span> at target hrs
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
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 14, fontWeight: 500 }}>Course syllabus — {student.course}</h2>
            {isInstructor && <span style={{ fontSize: 12, color: '#6b7280' }}>Click a row to log flight time</span>}
          </div>

          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: COLS, gap: 4,
            padding: '7px 10px', fontSize: 11, color: '#6b7280', fontWeight: 500,
            borderBottom: '1px solid #e5e7eb', background: '#f8fafc',
            minWidth: 880,
          }}>
            <span>Lesson</span>
            <span>Objectives</span>
            <span style={{ textAlign: 'right' }}>Flt Tgt</span>
            <span style={{ textAlign: 'right' }}>Dual</span>
            <span style={{ textAlign: 'right' }}>Solo</span>
            <span style={{ textAlign: 'right' }}>XC</span>
            <span style={{ textAlign: 'right' }}>Sim</span>
            <span style={{ textAlign: 'right' }}>Hood</span>
            <span style={{ textAlign: 'right' }}>Night</span>
            <span style={{ textAlign: 'right' }}>Ground</span>
            <span style={{ textAlign: 'center' }}>Date</span>
            <span style={{ textAlign: 'center' }}>Status</span>
          </div>
          {/* Legend: ground column shows recommended hours in blue */}
          <div style={{ padding: '3px 10px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', fontSize: 9, color: '#9ca3af', display: 'flex', gap: 4, alignItems: 'center' }}>
            <span>Ground column:</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>logged</span>
            <span>/</span>
            <span style={{ fontWeight: 600, color: '#2d6ab4' }}>rec. target</span>
            <span>· turns green when met</span>
          </div>

          {course.lessons.map((lesson) => {
            const lg = sLogs[lesson.id] || {}
            const status = lg.completed ? 'done' : Object.keys(lg).length > 0 ? 'partial' : 'pending'

            return (
              <div
                key={lesson.id}
                style={{
                  display: 'grid', gridTemplateColumns: COLS, gap: 4,
                  alignItems: 'center', padding: '6px 10px',
                  borderBottom: '1px solid #f3f4f6', fontSize: 12, cursor: 'pointer',
                  background: lesson.sc ? 'rgba(26,58,92,.05)' : lesson.pc ? 'rgba(245,158,11,.04)' : '',
                  minWidth: 880,
                }}
                onClick={() => isInstructor && setLogLesson(lesson)}
              >
                <div>
                  <span style={{ fontWeight: 500 }}>{lesson.id}</span>
                  {(lesson.sc || lesson.pc) && (
                    <div className={`tag ${lesson.sc ? 'tag-blue' : 'tag-amber'}`} style={{ marginTop: 2, fontSize: 10 }}>
                      {lesson.sc ? 'stage' : 'prog'}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4 }}>{lesson.o}</span>
                <span style={{ textAlign: 'right', fontWeight: 500 }}>{lesson.t > 0 ? parseFloat(lesson.t).toFixed(1) : '—'}</span>

                <span style={{ textAlign: 'right' }}>{fmt(lg.dual   || 0)}</span>
                <span style={{ textAlign: 'right' }}>{fmt(lg.solo   || 0)}</span>
                <span style={{ textAlign: 'right' }}>{fmt(lg.xc     || 0)}</span>
                <span style={{ textAlign: 'right' }}>{fmt(lg.sim    || 0)}</span>
                <span style={{ textAlign: 'right' }}>{fmt(lg.hood   || 0)}</span>
                <span style={{ textAlign: 'right' }}>{fmt(lg.night  || 0)}</span>
                <LogCell logged={lg.ground} rec={lesson.g} />

                {/* Date cell — inline editable for instructors */}
                <span
                  style={{ textAlign: 'center', fontSize: 11, color: '#6b7280', cursor: isInstructor && Object.keys(lg).length > 0 ? 'pointer' : 'default' }}
                  onClick={(e) => {
                    if (isInstructor && Object.keys(lg).length > 0) {
                      e.stopPropagation()
                      setEditingDate(lesson.id)
                    }
                  }}
                >
                  {editingDate === lesson.id ? (
                    <input
                      type="date"
                      defaultValue={lg.date || new Date().toISOString().slice(0, 10)}
                      autoFocus
                      style={{ fontSize: 11, padding: '2px 4px', border: '1px solid #1a3a5c', borderRadius: 4, width: '100%' }}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => { onLogFlight(student.id, lesson.id, { ...lg, date: e.target.value }); setEditingDate(null) }}
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
                  {status === 'done'    && <span className="tag tag-green">done</span>}
                  {status === 'partial' && <span className="tag tag-amber">in prog</span>}
                  {status === 'pending' && <span className="tag tag-gray">pending</span>}
                </span>
              </div>
            )
          })}

          {/* Totals row */}
          <div style={{
            display: 'grid', gridTemplateColumns: COLS, gap: 4,
            padding: '8px 10px', background: '#f8fafc',
            fontSize: 12, fontWeight: 600, borderTop: '2px solid #e5e7eb',
            minWidth: 880,
          }}>
            <span>Totals</span>
            <span />
            <span style={{ textAlign: 'right' }}>{parseFloat(course.targetTotal).toFixed(1)}</span>
            <span style={{ textAlign: 'right' }}>{fmt(totDual)}</span>
            <span style={{ textAlign: 'right' }}>{fmt(totSolo)}</span>
            <span style={{ textAlign: 'right' }}>{fmt(totXC)}</span>
            <span style={{ textAlign: 'right' }}>{fmt(totSim)}</span>
            <span style={{ textAlign: 'right' }}>{fmt(totHood)}</span>
            <span style={{ textAlign: 'right' }}>{fmt(totNight)}</span>
            <TotalCell logged={totGround} rec={course.lessons.reduce((s,l)=>s+(l.g||0),0)} />
            <span />
            <span style={{ textAlign: 'center' }}>{progress.completed}/{progress.total}</span>
          </div>
        </div>
      </div>

      {logLesson && (
        <LogFlightModal
          lesson={logLesson}
          existing={sLogs[logLesson.id] || {}}
          instructors={instructors}
          onSave={(data) => { onLogFlight(student.id, logLesson.id, data); setLogLesson(null) }}
          onClose={() => setLogLesson(null)}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, valueColor, valueSize = 20, children }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-val" style={{ fontSize: valueSize, color: valueColor }}>{value}</div>
      {children}
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
  const met = hasRec && val >= rec
  return (
    <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
      <div style={{ fontSize: 12, color: val > 0 ? '#111827' : '#d1d5db' }}>
        {val > 0 ? val.toFixed(1) : '—'}
      </div>
      {hasRec && (
        <div style={{ fontSize: 9, fontWeight: 600, color: met ? '#16a34a' : '#2d6ab4' }}>
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
