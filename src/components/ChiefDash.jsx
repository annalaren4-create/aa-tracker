import { useState } from 'react'
import { LOCATIONS } from '../data/constants'
import { COURSES } from '../data/courses'
import AddStudentModal from './modals/AddStudentModal'
import ManageInstructorsModal from './modals/ManageInstructorsModal'
import AccountSettingsModal from './modals/AccountSettingsModal'
import TrainingReviewModal from './modals/TrainingReviewModal'
import { eqName } from '../utils/storage'
import { migrateLocalToCloud } from '../lib/supabaseData'
import { paceStatus, effectiveDeadline, daysToEffectiveDeadline, flightsPerWeek, behindSchedule } from '../utils/terms'
import { useToast } from './Toast'

const ALL = 'All'

// Pace status colors:
//   under      → light blue (Liberty is *under* projected spend — bonus territory)
//   on-track   → green (projected to land at/near flat rate)
//   over       → red (projection exceeds flat rate — needs attention)
const PACE_COLOR = { under: '#3b82f6', 'on-track': '#16a34a', over: '#dc2626' }
const PACE_BG    = { under: '#eff6ff', 'on-track': '#f0fdf4', over: '#fef2f2' }
const PACE_TEXT  = { under: '#1d4ed8', 'on-track': '#15803d', over: '#dc2626' }
const PACE_LABEL = { under: 'Under', 'on-track': 'On Track', over: 'Over' }

/**
 * How many whole days have passed since the student's most recent log
 * entry for the given course's sLogs map? Returns null when no logs
 * exist (treat as "never flown"). Used by the Inactive chip's count
 * and the matching row filter.
 */
function daysSinceLastLog(sLogs, todayMs = Date.now()) {
  const dates = Object.values(sLogs).map((lg) => lg?.date).filter(Boolean)
  if (!dates.length) return null
  const latest = dates.sort().slice(-1)[0]
  return Math.floor((todayMs - new Date(latest + 'T00:00:00').getTime()) / 86400000)
}

/** Given a calcProgress result, return budget pace info or null.
 *  Uses `projectedWithRepeat` (which already adds a typical 1-repeat
 *  buffer when Liberty's funded repeat allowance still has room) so the
 *  pace status reflects what the course is realistically going to cost,
 *  not just the syllabus-minimum projection. Falls back to `projected`
 *  once the repeat allowance is used up. */
function getBudgetPace(p) {
  if (!p.flatRate) return null
  const remaining   = p.flatRate - p.cost
  // Prefer the repeat-buffered projection while repeats are still funded,
  // so the chief sees "over" before a student blows past flat rate. Once
  // the allowance is exhausted, projectedWithRepeat == projected.
  const projected   = (p.projectedWithRepeat != null && p.repeatsRemaining > 0)
    ? p.projectedWithRepeat
    : p.projected
  const spendPct    = Math.min((p.cost / p.flatRate) * 100, 100)
  const expectedPct = Math.min(p.pct, 100)
  let status
  if (projected > p.flatRate)             status = 'over'
  else if (projected < p.flatRate * 0.98) status = 'under'
  else                                    status = 'on-track'
  // "At risk" = burning budget faster than progress. If spend% is more than
  // 20 percentage points ahead of completion% AND >50% of budget used, flag it —
  // these are students chiefs need to spot first when skimming the dashboard.
  const atRisk = spendPct > 50 && (spendPct - expectedPct) > 20
  return { spendPct, expectedPct, projected, status, remaining, flatRate: p.flatRate, atRisk }
}

export default function ChiefDash({
  account, students, instructors, activeLocation, setActiveLocation,
  setView, onSelectStudent, onAddStudent, onDeleteStudent, onDeleteStudentAccount,
  onUpdateStudent,
  onAddInstructor, onDeleteInstructor, onUpdateInstructor,
  roleRequests = [], onSubmitRoleRequest, onResolveRoleRequest,
  calcProgress, onSignOut,
  onUpdateAccount,
  logs = {},
}) {
  const toast = useToast()
  const [migrating, setMigrating] = useState(false)
  // TEMPORARY: one-time push of localStorage data (students, course
  // history, training reviews, flight logs) into Supabase. Removed once
  // the migration is complete and verified.
  const handleMigrate = async () => {
    if (migrating) return
    const ok = await toast.confirm(
      `Push ${students.length} students and their logs to the cloud? This runs once and is skipped if the cloud already has students.`
    )
    if (!ok) return
    setMigrating(true)
    try {
      const res = await migrateLocalToCloud({ students, logs }, account?.schoolId)
      if (res.aborted) {
        toast.info(res.message)
      } else {
        toast.success(`Migrated: ${res.studentCount} students, ${res.chCount} course-history, ${res.trCount} training reviews, ${res.logCount} flight logs.`)
        if (res.warnings.length) console.warn('Migration warnings:', res.warnings)
      }
    } catch (e) {
      console.error('Migration failed:', e)
      toast.error('Migration failed — see console. Nothing was switched over; your local data is untouched.')
    } finally {
      setMigrating(false)
    }
  }
  const [showAdd, setShowAdd]               = useState(false)
  const [showManageInstr, setShowManageInstr] = useState(false)
  const [showAcctSettings, setShowAcctSettings] = useState(false)
  const [showBlankTR,      setShowBlankTR]      = useState(false)
  const [chipFilter,       setChipFilter]       = useState(null)   // 'behind' | 'inactive' | 'fscSoon' | null
  const [courseFilter, setCourseFilter]     = useState('All')
  const [search, setSearch]                 = useState('')
  const [sortCol, setSortCol]               = useState('name')
  const [sortDir, setSortDir]               = useState(1)

  const tabs = [ALL, ...LOCATIONS]

  // Aggregate stats. Total is scoped to the active location tab so the
  // header strip reflects whichever base the chief is currently looking
  // at. On the "All" tab it's the school-wide roster size.
  const locationCounts = LOCATIONS.reduce((acc, loc) => {
    acc[loc] = students.filter((s) => s.base === loc).length
    return acc
  }, {})
  const totalStudents  = activeLocation === ALL
    ? students.length
    : (locationCounts[activeLocation] || 0)

  // Actionable signals chiefs want at-a-glance:
  //  • Falling behind — any uncompleted lesson 10+ days past its target
  //  • Inactive       — no logged flight in 10+ days (stalled training)
  //  • FSC soon       — scheduled or backup FSC date in the next 10 days
  // Counts are scoped to the active location tab — switching from "All"
  // to KHEF, for example, narrows the chips to the KHEF roster.
  const todayMs = Date.now()
  const tenDaysMs = 10 * 24 * 60 * 60 * 1000
  let behindCount = 0
  let inactiveCount = 0
  let fscSoonCount = 0
  const locationScoped = activeLocation === ALL
    ? students
    : students.filter((s) => s.base === activeLocation)
  locationScoped.forEach((s) => {
    const courseDef = COURSES[s.course]
    const sLogs = (logs[s.id] || {})[s.course] || {}

    // Falling behind
    if (behindSchedule(s, courseDef, sLogs).behind) behindCount++

    // Inactive — last log > 10 days ago. Skip students whose course is
    // already done (pct 100).
    const p = calcProgress(s)
    if (p.pct < 100) {
      const days = daysSinceLastLog(sLogs, todayMs)
      if (days !== null && days > 10) inactiveCount++
    }

    // FSC scheduled in the next 10 days (scheduled or backup)
    const fscIso = s.scheduledFsc || s.backupFsc
    if (fscIso) {
      const diff = new Date(fscIso + 'T00:00:00').getTime() - todayMs
      if (diff >= 0 && diff <= tenDaysMs) fscSoonCount++
    }
  })

  // Budget pace summary (all students)
  const allPaces = students.map((s) => getBudgetPace(calcProgress(s)))
  const tracked   = allPaces.filter(Boolean)
  const withStatus = tracked.filter((p) => p.status)
  const underCount   = withStatus.filter((p) => p.status === 'under').length
  const onTrackCount = withStatus.filter((p) => p.status === 'on-track').length
  const overCount    = withStatus.filter((p) => p.status === 'over').length
  const maxBarCount  = Math.max(underCount, onTrackCount, overCount, 1)

  // Filtered + sorted student list
  function toggleSort(col) {
    if (sortCol === col) setSortDir((d) => -d)
    else { setSortCol(col); setSortDir(1) }
  }

  // Chip filter — one of null, 'behind', 'inactive', 'fscSoon'. Drives
  // the actionable-stats chip click behavior: clicking a chip restricts
  // the student table to just the matching cohort; clicking the same
  // chip again clears the filter.
  const matchesChip = (s) => {
    if (!chipFilter) return true
    const courseDef = COURSES[s.course]
    const sLogs = (logs[s.id] || {})[s.course] || {}
    if (chipFilter === 'behind') {
      return behindSchedule(s, courseDef, sLogs).behind
    }
    if (chipFilter === 'inactive') {
      const p = calcProgress(s)
      if (p.pct >= 100) return false
      const days = daysSinceLastLog(sLogs, todayMs)
      return days !== null && days > 10
    }
    if (chipFilter === 'fscSoon') {
      const fscIso = s.scheduledFsc || s.backupFsc
      if (!fscIso) return false
      const diff = new Date(fscIso + 'T00:00:00').getTime() - todayMs
      return diff >= 0 && diff <= tenDaysMs
    }
    return true
  }

  const filtered = students
    .filter((s) => activeLocation === ALL || s.base === activeLocation)
    .filter((s) => courseFilter === 'All' || s.course === courseFilter)
    .filter((s) => !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()))
    .filter(matchesChip)

  // If the logged-in chief is also an instructor, float their own primary students
  // to the top of the list, then their secondaries, then everyone else. Their
  // OWN training record (e.g. David Pagano-as-student) sits at rank 0 too
  // so they can jump straight to their own course progress.
  const myName = account?.name
  const myRank = (s) => {
    if (!myName) return 3
    if (eqName(s.name, myName)) return 0                  // student card IS me — strictly first
    if (eqName(s.primaryInstructor, myName)) return 1
    if (eqName(s.secondaryInstructor, myName)) return 2
    return 3
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
    else if (sortCol === 'deadline') {
      // Sort by days-to-effective-deadline (scheduled FSC → backup FSC →
      // term cutoff) so the most urgent sit at the top. Students with
      // no deadline at all sink to the bottom. Course-has-FSC gating
      // here too so FSC-less courses use the term cutoff for sort.
      const aHasFsc = !!COURSES[a.course]?.lessons?.some((l) => l.fsc)
      const bHasFsc = !!COURSES[b.course]?.lessons?.some((l) => l.fsc)
      va = daysToEffectiveDeadline(a, aHasFsc) ?? 99999
      vb = daysToEffectiveDeadline(b, bHasFsc) ?? 99999
    }
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
          {/* Primary action — adding a student is the most common header action */}
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setShowAdd(true)}
          >
            + Add student
          </button>
          {/* Secondary day-to-day actions */}
          <button className="btn btn-sm btn-ghost" onClick={() => setShowManageInstr(true)}>Instructors</button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setShowBlankTR(true)}
            title="Open a fresh Training Review form (no student data pre-filled) in case the original wasn't saved"
          >
            Blank TR
          </button>
          {/* TEMPORARY one-time data migration button (removed after import) */}
          <button
            className="btn btn-sm"
            style={{ background: '#f59e0b', color: '#1a2230', fontWeight: 600 }}
            onClick={handleMigrate}
            disabled={migrating}
            title="One-time: copy your students and logs into the cloud database"
          >
            {migrating ? 'Migrating…' : '☁ Migrate to cloud'}
          </button>
          {/* Visual separator before the low-frequency account actions */}
          <span style={{ width: 1, height: 22, background: 'rgba(255,255,255,.2)' }} />
          {account && (
            <button className="btn btn-sm btn-ghost" onClick={() => setShowAcctSettings(true)}>Account</button>
          )}
          <button className="btn btn-sm btn-ghost" onClick={onSignOut}>Sign out</button>
        </div>
      </div>

      {/* ── Stats + Budget Pace Chart ─────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 20px' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', gap: 0, alignItems: 'stretch', flexWrap: 'wrap' }}>

          {/* Action-oriented signals — the things a chief wants to spot
              in the first 5 seconds. Total stays for context; the three
              alert chips are clickable to filter the student table to
              just the matching cohort. Click the same chip again to
              clear. Chips with a zero count are not clickable. */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', flex: 1, paddingRight: 24, borderRight: '1px solid #e5e7eb' }}>
            <MiniStat label="Total" value={totalStudents} />
            <div style={{ width: 1, height: 32, background: '#e5e7eb', margin: '0 4px' }} />
            <MiniStat
              label="Falling Behind"
              value={behindCount}
              valueColor={behindCount > 0 ? '#b91c1c' : '#9ca3af'}
              active={chipFilter === 'behind'}
              activeColor="#b91c1c"
              onClick={behindCount > 0 ? () => setChipFilter((f) => f === 'behind' ? null : 'behind') : null}
            />
            <MiniStat
              label="Inactive 10+ days"
              value={inactiveCount}
              valueColor={inactiveCount > 0 ? '#b45309' : '#9ca3af'}
              active={chipFilter === 'inactive'}
              activeColor="#b45309"
              onClick={inactiveCount > 0 ? () => setChipFilter((f) => f === 'inactive' ? null : 'inactive') : null}
            />
            <MiniStat
              label="FSC Next 10 days"
              value={fscSoonCount}
              valueColor={fscSoonCount > 0 ? '#1d4ed8' : '#9ca3af'}
              active={chipFilter === 'fscSoon'}
              activeColor="#1d4ed8"
              onClick={fscSoonCount > 0 ? () => setChipFilter((f) => f === 'fscSoon' ? null : 'fscSoon') : null}
            />
          </div>

          {/* Budget Pace Bar Chart */}
          <div style={{ paddingLeft: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 320 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Budget Pace · {withStatus.length} students tracked
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, paddingTop: 16 }}>
              <ChartBar label="Under Budget" count={underCount}   max={maxBarCount} color={PACE_COLOR.under} />
              <ChartBar label="On Track"     count={onTrackCount} max={maxBarCount} color={PACE_COLOR['on-track']} />
              <ChartBar label="Over Budget"  count={overCount}    max={maxBarCount} color={PACE_COLOR.over} />
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
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students…"
              style={{ height: 30, fontSize: 13 }}
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
          <div style={{ textAlign: 'center', padding: '56px 24px', color: '#6b7280' }}>
            {students.length === 0 ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  No students yet
                </div>
                <p style={{ fontSize: 13, marginTop: 0, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>
                  Add your first student to start tracking flight progress, costs, and Liberty funding.
                </p>
                <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setShowAdd(true)}>
                  + Add first student
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  No students match your filters
                </div>
                <p style={{ fontSize: 13, marginTop: 0, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>
                  Try clearing the search box, switching tabs, or clicking an active stat chip to remove its filter.
                </p>
              </>
            )}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>

            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '28px 1.8fr 1fr 56px 130px 180px 110px 88px 110px',
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
              <SortBtn col="deadline" align="center">Deadline</SortBtn>
              <SortBtn col="remaining" align="flex-end">Remaining</SortBtn>
              <div />
            </div>

            {/* Rows */}
            {visibleStudents.map((student, i) => {
              const p    = calcProgress(student)
              const pace = getBudgetPace(p)
              const _course = COURSES[student.course]
              const _sLogs = (logs[student.id] || {})[student.course] || {}
              const behind = behindSchedule(student, _course, _sLogs)
              return (
                <StudentRow
                  key={student.id}
                  student={student}
                  progress={p}
                  pace={pace}
                  behind={behind}
                  striped={i % 2 === 1}
                  myName={myName}
                  instructors={instructors}
                  onUpdateStudent={onUpdateStudent}
                  onView={() => onSelectStudent(student)}
                  onDelete={async () => {
                    if (await toast.confirm(`Remove ${student.name} from the dashboard?\n\nTheir login account will be kept — they can sign back in or be re-added later.`)) {
                      onDeleteStudent(student.id)
                    }
                  }}
                  onDeleteAccount={async () => {
                    if (await toast.confirm(`Permanently delete ${student.name}'s account?\n\nThis removes both the student record and the login account. This cannot be undone.`)) {
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
          isChief={account?.role === 'chief'}
          roleRequests={roleRequests}
          onSubmitRoleRequest={onSubmitRoleRequest}
          onResolveRoleRequest={onResolveRoleRequest}
        />
      )}
      {showAcctSettings && account && (
        <AccountSettingsModal
          account={account}
          onUpdateAccount={onUpdateAccount}
          onClose={() => setShowAcctSettings(false)}
        />
      )}
      {showBlankTR && (
        <TrainingReviewModal
          student={{ id: '—', name: '', base: '', course: '', primaryInstructor: '' }}
          logs={{}}
          instructors={instructors}
          oopLessons={[]}
          policyViolations={[]}
          onClose={() => setShowBlankTR(false)}
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

function MiniStat({ label, value, small, valueColor, onClick, active, activeColor }) {
  const clickable = !!onClick
  return (
    <div
      onClick={onClick || undefined}
      title={clickable
        ? (active ? 'Click to clear filter' : 'Click to filter the table')
        : undefined}
      style={{
        padding: clickable ? '4px 10px' : 0,
        margin: clickable ? '-4px -10px' : 0,
        borderRadius: 6,
        cursor: clickable ? 'pointer' : 'default',
        // Subtle highlight when this chip is the active filter
        background: active ? `${activeColor || '#1a3a5c'}10` : 'transparent',
        outline: active ? `1.5px solid ${activeColor || '#1a3a5c'}` : 'none',
        transition: 'background 0.12s, outline 0.12s',
      }}
    >
      <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}{active && <span style={{ marginLeft: 6, color: activeColor || '#1a3a5c' }}>✕</span>}
      </div>
      <div style={{ fontSize: small ? 16 : 20, fontWeight: 700, color: valueColor || '#1a3a5c', lineHeight: 1.1 }}>{value}</div>
    </div>
  )
}

function StudentRow({ student, progress: p, pace, behind, striped, myName, instructors = [], onUpdateStudent, onView, onDelete, onDeleteAccount }) {
  // 'You' = this student card is the logged-in user's own training record
  // (instructor who's also a student). Otherwise reflect their teaching
  // relationship to the student.
  const myRole = myName
    ? (eqName(student.name, myName) ? 'You'
       : eqName(student.primaryInstructor, myName) ? 'Primary'
       : eqName(student.secondaryInstructor, myName) ? 'Secondary'
       : null)
    : null
  const isMine = !!myRole
  const initials = student.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const courseAbbr = student.course
    .replace('Commercial', 'Comm')
    .replace('Multi Engine Instructor', 'MEI')

  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const reveal = hovered || focused
  const [editingPrimary, setEditingPrimary] = useState(false)

  // Instructors available at this student's base (used for dropdown options).
  const baseInstructors = instructors
    .filter((i) => !i.base || i.base === student.base)
    .map((i) => i.name)
    .sort()

  const stopRowClick = (e) => e.stopPropagation()

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 1.8fr 1fr 56px 130px 180px 110px 88px 110px',
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
      onFocus={() => setFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false) }}
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
              {myRole === 'You' ? '★ You' : myRole === 'Primary' ? '★ Primary' : 'Secondary'}
            </span>
          )}
          {behind?.behind && (
            <span
              className="tag"
              style={{ background: '#b91c1c', color: '#fff', fontSize: 9, padding: '1px 5px', flexShrink: 0, fontWeight: 700 }}
              title={`Lesson ${behind.lessonId}'s target was ${behind.daysBehind} days ago and isn't logged yet.`}
            >
              ⚠ Behind {behind.daysBehind}d
            </span>
          )}
          {pace?.atRisk && (
            <span
              className="tag"
              style={{ background: '#fef2f2', color: '#dc2626', fontSize: 9, padding: '1px 5px', flexShrink: 0, fontWeight: 700 }}
              title={`Burning budget faster than progress: ${Math.round(pace.spendPct)}% spent vs ${Math.round(pace.expectedPct)}% complete`}
            >
              ⚠ At risk
            </span>
          )}
        </div>
        <div style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.3, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Primary instructor — inline edit on click */}
          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Primary:{' '}
            {editingPrimary ? (
              <select
                value={student.primaryInstructor}
                autoFocus
                onClick={stopRowClick}
                onChange={(e) => { stopRowClick(e); onUpdateStudent?.(student.id, { primaryInstructor: e.target.value }); setEditingPrimary(false) }}
                onBlur={() => setEditingPrimary(false)}
                style={{ fontSize: 10, padding: '0 4px', border: '1px solid #9ca3af', borderRadius: 3, height: 18, width: 'auto', display: 'inline-block' }}
              >
                {baseInstructors.map((n) => (<option key={n} value={n}>{n}</option>))}
              </select>
            ) : (
              <span
                onClick={(e) => { stopRowClick(e); setEditingPrimary(true) }}
                style={{ color: '#374151', borderBottom: '1px dashed #d1d5db', cursor: 'pointer' }}
                title="Click to change primary instructor"
              >
                {student.primaryInstructor} <span style={{ fontSize: 14, color: '#6b7280', marginLeft: 4, fontWeight: 700 }}>▾</span>
              </span>
            )}
          </div>
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

      {/* Progress — bar turns red when the student is "at risk" (burning budget
          much faster than completing lessons) so chiefs can spot them at a glance. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${p.pct}%`, borderRadius: 3,
            background: p.pct >= 100 ? '#16a34a' : (pace?.atRisk ? '#dc2626' : '#1a3a5c'),
          }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: pace?.atRisk ? '#dc2626' : '#374151', minWidth: 30, textAlign: 'right' }}>{p.pct}%</span>
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

      {/* Deadline — effective flight-completion deadline (scheduled FSC,
          backup FSC, or term cutoff). FSC dates are only honored for
          courses that include an fsc:true lesson; otherwise the pacer
          falls back to the term cutoff. Color-coded: green on-track,
          amber within 14 days, red overdue. */}
      <div style={{ textAlign: 'center' }}>
        {(() => {
          const courseHasFsc = !!COURSES[student.course]?.lessons?.some((l) => l.fsc)
          const dl = effectiveDeadline(student, courseHasFsc)
          if (!dl) return <span style={{ fontSize: 10, color: '#d1d5db' }}>—</span>
          const status = paceStatus(student, p, courseHasFsc)
          const days = daysToEffectiveDeadline(student, courseHasFsc)
          const fpw = flightsPerWeek(student, p, courseHasFsc)
          const color = status === 'overdue' ? '#dc2626' : status === 'tight' ? '#b45309' : '#15803d'
          const shortDate = new Date(dl + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
          // Source tag: FSC scheduled / backup, otherwise the term subterm.
          // D term is always accelerated by definition; A term gets the
          // accelerated * suffix only when the student toggled it.
          const isAccelPace = student.pace?.subterm === 'D'
            || (student.pace?.subterm === 'A' && !!student.accelerated)
          const src = courseHasFsc && student.scheduledFsc ? 'FSC'
            : courseHasFsc && student.backupFsc ? 'bkup'
            : student.pace?.subterm
              ? `${student.pace.subterm}${isAccelPace ? '*' : ''}`
              : ''
          return (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color, lineHeight: 1.2 }}>{shortDate}</div>
              <div style={{ fontSize: 9, color: '#9ca3af', lineHeight: 1.3 }}>
                {fpw != null ? `${fpw.toFixed(1)}/wk` : '—'}
                {src && ` · ${src}`}
                {days != null && days >= 0 && status !== 'on-track' && ` · ${days}d left`}
                {days != null && days < 0 && ` · ${Math.abs(days)}d over`}
              </div>
            </>
          )
        })()}
      </div>

      {/* Remaining budget shown as "$remaining / $flatRate" so the chief
          sees current LU balance against the total allotted funds at a
          glance. Negative remaining renders red with a minus sign. */}
      <div style={{ textAlign: 'right' }}>
        {pace ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>
              <span style={{ color: pace.remaining >= 0 ? '#15803d' : '#dc2626' }}>
                {pace.remaining >= 0
                  ? `$${Math.round(pace.remaining).toLocaleString()}`
                  : `-$${Math.round(Math.abs(pace.remaining)).toLocaleString()}`}
              </span>
              <span style={{ color: '#9ca3af', fontWeight: 500 }}>
                {' / '}${Math.round(pace.flatRate).toLocaleString()}
              </span>
            </div>
            <div style={{ fontSize: 9, color: '#9ca3af' }}>
              {pace.remaining >= 0 ? 'left of allotted' : 'over allotted'}
            </div>
          </>
        ) : (
          <span style={{ fontSize: 10, color: '#d1d5db' }}>—</span>
        )}
      </div>

      {/* Actions: hidden until the row is hovered so the table reads
          calmly when scanning. Both buttons are destructive — chiefs
          rarely use them — so we keep them out of sight until needed. */}
      <div
        style={{
          textAlign: 'right',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          alignItems: 'flex-end',
          opacity: reveal ? 1 : 0,
          transition: 'opacity .15s',
          pointerEvents: reveal ? 'auto' : 'none',
        }}
      >
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
