import { useState } from 'react'
import { LOCATIONS } from '../data/constants'
import { COURSES } from '../data/courses'
import AddStudentModal from './modals/AddStudentModal'
import ManageInstructorsModal from './modals/ManageInstructorsModal'

const ALL = 'All'

const PACE_COLOR = { under: '#16a34a', 'on-track': '#d97706', over: '#dc2626' }
const PACE_BG    = { under: '#f0fdf4', 'on-track': '#fffbeb', over: '#fef2f2' }
const PACE_TEXT  = { under: '#15803d', 'on-track': '#92400e', over: '#dc2626' }
const PACE_LABEL = { under: 'Under', 'on-track': 'On Track', over: 'Over' }

/** Given a calcProgress result, return budget pace info or null */
function getBudgetPace(p) {
  if (!p.flatRate) return null
  const remaining   = p.flatRate - p.cost
  const projected   = p.projected   // from calcProgress: actual + expected remaining
  const spendPct    = Math.min((p.cost / p.flatRate) * 100, 100)
  const expectedPct = Math.min(p.pct, 100)
  let status
  if (projected < p.flatRate * 0.95)      status = 'under'
  else if (projected > p.flatRate * 1.05) status = 'over'
  else                                    status = 'on-track'
  return { spendPct, expectedPct, projected, status, remaining }
}

export default function ChiefDash({
  account, students, instructors, activeLocation, setActiveLocation,
  setView, onSelectStudent, onAddStudent, onDeleteStudent, onDeleteStudentAccount,
  onAddInstructor, onDeleteInstructor, onUpdateInstructor, calcProgress, onSignOut,
}) {
  const [showAdd, setShowAdd]               = useState(false)
  const [showManageInstr, setShowManageInstr] = useState(false)
  const [courseFilter, setCourseFilter]     = useState('All')
  const [search, setSearch]                 = useState('')
  const [sortCol, setSortCol]               = useState('name')
  const [sortDir, setSortDir]               = useState(1)

  const tabs = [ALL, ...LOCATIONS]

  // Aggregate stats
  const totalStudents  = students.length
  const avgProgress    = totalStudents > 0
    ? Math.round(students.reduce((sum, s) => sum + calcProgress(s).pct, 0) / totalStudents)
    : 0
  const activeCourses  = [...new Set(students.map((s) => s.course))].length
  const locationCounts = LOCATIONS.reduce((acc, loc) => {
    acc[loc] = students.filter((s) => s.base === loc).length
    return acc
  }, {})

  // Budget pace summary (all students)
  const allPaces = students.map((s) => getBudgetPace(calcProgress(s)))
  const tracked   = allPaces.filter(Boolean)
  const withStatus = tracked.filter((p) => p.status)
  const underCount   = withStatus.filter((p) => p.status === 'under').length
  const onTrackCount = withStatus.filter((p) => p.status === 'on-track').length
  const overCount    = withStatus.filter((p) => p.status === 'over').length
  const noDataCount  = totalStudents - tracked.length + tracked.filter((p) => !p.status).length
  const maxBarCount  = Math.max(underCount, onTrackCount, overCount, noDataCount, 1)

  // Filtered + sorted student list
  function toggleSort(col) {
    if (sortCol === col) setSortDir((d) => -d)
    else { setSortCol(col); setSortDir(1) }
  }

  const filtered = students
    .filter((s) => activeLocation === ALL || s.base === activeLocation)
    .filter((s) => courseFilter === 'All' || s.course === courseFilter)
    .filter((s) => !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()))

  // If the logged-in chief is also an instructor, float their own primary students
  // to the top of the list, then their secondaries, then everyone else.
  const myName = account?.name
  const myRank = (s) => {
    if (!myName) return 2
    if (s.primaryInstructor === myName) return 0
    if (s.secondaryInstructor === myName) return 1
    return 2
  }
  const visibleStudents = [...filtered].sort((a, b) => {
    const rankDiff = myRank(a) - myRank(b)
    if (rankDiff !== 0) return rankDiff  // my students always first, regardless of sortCol
    const pa = calcProgress(a)
    const pb = calcProgress(b)
    const paceA = getBudgetPace(pa)
    const paceB = getBudgetPace(pb)
    let va, vb
    if (sortCol === 'name')       { va = a.name;        vb = b.name }
    else if (sortCol === 'course'){ va = a.course;      vb = b.course }
    else if (sortCol === 'base')  { va = a.base;        vb = b.base }
    else if (sortCol === 'pct')   { va = pa.pct;        vb = pb.pct }
    else if (sortCol === 'pace')  { va = paceA?.projected ?? 999999; vb = paceB?.projected ?? 999999 }
    else if (sortCol === 'remaining') { va = paceA?.remaining ?? -999999; vb = paceB?.remaining ?? -999999 }
    else { va = a.name; vb = b.name }
    if (typeof va === 'string') return va.localeCompare(vb) * sortDir
    return (va - vb) * sortDir
  })

  const SortBtn = ({ col, children, align = 'flex-start' }) => (
    <span
      onClick={() => toggleSort(col)}
      style={{
        cursor: 'pointer', userSelect: 'none',
        display: 'flex', alignItems: 'center', gap: 2,
        justifyContent: align,
        width: '100%',  // fill the grid cell so justifyContent actually aligns
      }}
    >
      {children}
      <span style={{ fontSize: 8, opacity: sortCol === col ? 1 : 0.3 }}>
        {sortCol === col ? (sortDir === 1 ? '▲' : '▼') : '⬍'}
      </span>
    </span>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img className="logo-badge" src="/aviation-adventures-logo.png" alt="Aviation Adventures" />
          <div>
            <h1>Chief Dashboard</h1>
            <small style={{ opacity: .8 }}>{account?.name} · {account?.roleLabel}</small>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-sm btn-ghost" onClick={() => setShowManageInstr(true)}>👥 Instructors</button>
          <button
            className="btn btn-sm"
            style={{ background: '#2d6ab4', color: '#fff', border: 'none' }}
            onClick={() => setShowAdd(true)}
          >
            + Add student
          </button>
          <button className="btn btn-sm btn-ghost" onClick={onSignOut}>Sign out</button>
        </div>
      </div>

      {/* ── Stats + Budget Pace Chart ─────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 20px' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', gap: 0, alignItems: 'stretch', flexWrap: 'wrap' }}>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', flex: 1, paddingRight: 24, borderRight: '1px solid #e5e7eb' }}>
            <MiniStat label="Total" value={totalStudents} />
            <MiniStat label="Avg Progress" value={`${avgProgress}%`} />
            <MiniStat label="Courses" value={activeCourses} />
            <div style={{ width: 1, height: 32, background: '#e5e7eb', margin: '0 4px' }} />
            {LOCATIONS.map((loc) => (
              <MiniStat key={loc} label={loc} value={locationCounts[loc] || 0} small />
            ))}
          </div>

          {/* Budget Pace Bar Chart */}
          <div style={{ paddingLeft: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 320 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Budget Pace · {withStatus.length} students tracked
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, paddingTop: 16 }}>
              <ChartBar label="Under Budget" count={underCount}   max={maxBarCount} color="#16a34a" />
              <ChartBar label="On Track"     count={onTrackCount} max={maxBarCount} color="#d97706" />
              <ChartBar label="Over Budget"  count={overCount}    max={maxBarCount} color="#dc2626" />
              <ChartBar label="No Data"      count={noDataCount}  max={maxBarCount} color="#9ca3af" />
            </div>
          </div>

        </div>
      </div>

      {/* ── Location tabs ─────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid #e5e7eb', background: '#fff', padding: '0 16px', display: 'flex', gap: 4, overflowX: 'auto' }}>
        {tabs.map((loc) => (
          <button
            key={loc}
            className={`tab ${activeLocation === loc ? 'active' : ''}`}
            onClick={() => setActiveLocation(loc)}
          >
            {loc} ({loc === ALL ? students.length : locationCounts[loc] || 0})
          </button>
        ))}
      </div>

      {/* ── Filters ───────────────────────────────────────────────── */}
      <div style={{ padding: '6px 16px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
            <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 12, pointerEvents: 'none' }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students…"
              style={{ paddingLeft: 28, height: 30, fontSize: 13 }}
            />
          </div>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            style={{ width: 'auto', minWidth: 150, height: 30, fontSize: 13 }}
          >
            <option value="All">All courses</option>
            {Object.keys(COURSES).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>{visibleStudents.length} student{visibleStudents.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── Compact Student Table ─────────────────────────────────── */}
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '6px 16px 32px' }}>
        {visibleStudents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
            <p>{students.length === 0 ? 'No students yet — add the first one!' : 'No students match your filters'}</p>
            {students.length === 0 && (
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowAdd(true)}>
                Add first student
              </button>
            )}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>

            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '28px 1.8fr 1fr 56px 130px 180px 88px 110px',
              gap: 8,
              padding: '6px 12px',
              background: '#f8fafc',
              borderBottom: '2px solid #e5e7eb',
              fontSize: 10,
              fontWeight: 700,
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <div />
              <SortBtn col="name">Student</SortBtn>
              <SortBtn col="course" align="center">Course</SortBtn>
              <SortBtn col="base" align="center">Base</SortBtn>
              <SortBtn col="pct" align="center">Progress</SortBtn>
              <SortBtn col="pace" align="center">Budget Pace</SortBtn>
              <SortBtn col="remaining" align="flex-end">Remaining</SortBtn>
              <div />
            </div>

            {/* Rows */}
            {visibleStudents.map((student, i) => {
              const p    = calcProgress(student)
              const pace = getBudgetPace(p)
              return (
                <StudentRow
                  key={student.id}
                  student={student}
                  progress={p}
                  pace={pace}
                  striped={i % 2 === 1}
                  myName={myName}
                  onView={() => onSelectStudent(student)}
                  onDelete={() => {
                    if (confirm(`Remove ${student.name} from the dashboard?\n\nTheir login account will be kept — they can sign back in or be re-added later.`)) {
                      onDeleteStudent(student.id)
                    }
                  }}
                  onDeleteAccount={() => {
                    if (confirm(`Permanently delete ${student.name}'s account?\n\nThis removes both the student record and the login account. This cannot be undone.`)) {
                      onDeleteStudentAccount(student.id)
                    }
                  }}
                />
              )
            })}

          </div>
        )}
      </div>

      {showAdd && (
        <AddStudentModal
          instructors={instructors}
          activeLocation={activeLocation === ALL ? 'KHEF' : activeLocation}
          onAdd={(data) => { onAddStudent(data); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      )}
      {showManageInstr && (
        <ManageInstructorsModal
          instructors={instructors}
          onAdd={onAddInstructor}
          onDelete={onDeleteInstructor}
          onUpdate={onUpdateInstructor}
          onClose={() => setShowManageInstr(false)}
          activeLocation={activeLocation}
          myName={account?.name}
        />
      )}
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────────── */

function ChartBar({ label, count, max, color }) {
  const BAR_MAX = 64
  const isEmpty = count === 0
  const h = max > 0 && count > 0 ? Math.max((count / max) * BAR_MAX, 8) : 2
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 64 }}>
      {/* Bar with count label above it */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: BAR_MAX + 18, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: isEmpty ? '#d1d5db' : color, marginBottom: 4, lineHeight: 1 }}>
          {count}
        </span>
        <div
          style={{
            width: 36,
            height: h,
            background: isEmpty ? '#e5e7eb' : color,
            borderRadius: '4px 4px 0 0',
            transition: 'height 200ms',
          }}
        />
      </div>
      {/* Baseline */}
      <div style={{ width: 56, height: 1, background: '#e5e7eb' }} />
      {/* Label */}
      <div style={{ fontSize: 10, color: '#6b7280', textAlign: 'center', lineHeight: 1.3, marginTop: 6, maxWidth: 64 }}>
        {label}
      </div>
    </div>
  )
}

function MiniStat({ label, value, small }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: small ? 16 : 20, fontWeight: 700, color: '#1a3a5c', lineHeight: 1.1 }}>{value}</div>
    </div>
  )
}

function StudentRow({ student, progress: p, pace, striped, myName, onView, onDelete, onDeleteAccount }) {
  const myRole = myName
    ? (student.primaryInstructor === myName ? 'Primary'
       : student.secondaryInstructor === myName ? 'Secondary'
       : null)
    : null
  const isMine = !!myRole
  const initials = student.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const courseAbbr = student.course
    .replace('Commercial', 'Comm')
    .replace('Multi Engine Instructor', 'MEI')

  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 1.8fr 1fr 56px 130px 180px 88px 110px',
        gap: 8,
        alignItems: 'center',
        padding: '5px 12px',
        background: hovered ? '#eff6ff' : striped ? '#fafafa' : '#fff',
        borderBottom: '1px solid #f1f5f9',
        borderLeft: isMine ? '3px solid var(--aa-red)' : '3px solid transparent',
        cursor: 'pointer',
        transition: 'background .1s',
        minHeight: 44,
      }}
      onClick={onView}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div style={{
        width: 26, height: 26, borderRadius: '50%', background: '#1a3a5c', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 9, fontWeight: 700,
      }}>
        {initials}
      </div>

      {/* Name + instructor */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.2 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {student.name}
          </span>
          {myRole && (
            <span className="tag" style={{ background: '#fef2f2', color: 'var(--aa-red)', fontSize: 9, padding: '1px 5px', flexShrink: 0 }}>
              {myRole === 'Primary' ? '★ Primary' : 'Secondary'}
            </span>
          )}
        </div>
        <div style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Primary instructor: {student.primaryInstructor}
        </div>
      </div>

      {/* Course + aircraft */}
      <div style={{ minWidth: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{courseAbbr}</div>
        <div style={{ fontSize: 10, color: '#9ca3af' }}>{student.aircraft}</div>
      </div>

      {/* Base */}
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#1a3a5c', background: '#eff6ff', padding: '2px 6px', borderRadius: 4 }}>
          {student.base}
        </span>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${p.pct}%`, borderRadius: 3,
            background: p.pct >= 100 ? '#16a34a' : '#1a3a5c',
          }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', minWidth: 30, textAlign: 'right' }}>{p.pct}%</span>
      </div>

      {/* Budget Pace bar */}
      <div>
        {pace && pace.status ? (
          <>
            {/* Bar: background=budget, fill=actual spend, marker=expected spend */}
            <div style={{ position: 'relative', height: 7, background: '#e5e7eb', borderRadius: 4, marginBottom: 3 }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 4,
                width: `${Math.min(pace.spendPct, 100)}%`,
                background: PACE_COLOR[pace.status],
                opacity: 0.85,
              }} />
              {/* Marker: where they SHOULD be based on course progress */}
              <div style={{
                position: 'absolute', top: -3, height: 13, width: 2, borderRadius: 1,
                left: `${Math.min(pace.expectedPct, 99)}%`,
                background: '#1a3a5c',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                background: PACE_BG[pace.status], color: PACE_TEXT[pace.status],
              }}>
                {PACE_LABEL[pace.status]}
              </span>
              <span style={{ fontSize: 9, color: '#9ca3af' }}>
                proj. ${Math.round(pace.projected).toLocaleString()}
              </span>
            </div>
          </>
        ) : pace ? (
          <span style={{ fontSize: 10, color: '#d1d5db' }}>Not started</span>
        ) : (
          <span style={{ fontSize: 10, color: '#d1d5db' }}>—</span>
        )}
      </div>

      {/* Remaining budget */}
      <div style={{ textAlign: 'right' }}>
        {pace ? (
          <>
            <div style={{
              fontSize: 12, fontWeight: 700,
              color: pace.remaining >= 0 ? '#15803d' : '#dc2626',
            }}>
              {pace.remaining >= 0
                ? `$${Math.round(pace.remaining).toLocaleString()}`
                : `-$${Math.round(Math.abs(pace.remaining)).toLocaleString()}`}
            </div>
            <div style={{ fontSize: 9, color: '#9ca3af' }}>
              {pace.remaining >= 0 ? 'left' : 'over'}
            </div>
          </>
        ) : (
          <span style={{ fontSize: 10, color: '#d1d5db' }}>—</span>
        )}
      </div>

      {/* Actions: remove from dashboard (light) · delete account (hard) */}
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
        <button
          className="btn btn-sm"
          style={{ fontSize: 10, padding: '2px 6px', minWidth: 0, color: '#6b7280', lineHeight: 1.1 }}
          title="Remove from dashboard (keeps login account)"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
        >
          Remove
        </button>
        <button
          className="btn btn-sm btn-danger"
          style={{ fontSize: 10, padding: '2px 6px', minWidth: 0, lineHeight: 1.1 }}
          title="Delete account permanently (removes login too)"
          onClick={(e) => { e.stopPropagation(); onDeleteAccount() }}
        >
          Delete account
        </button>
      </div>
    </div>
  )
}
