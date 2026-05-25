import { useState } from 'react'
import { LOCATIONS } from '../data/constants'
import { COURSES } from '../data/courses'
import { budgetPct } from '../utils/calculations'
import { eqName } from '../utils/storage'
import AddStudentModal from './modals/AddStudentModal'
import ManageInstructorsModal from './modals/ManageInstructorsModal'
import AccountSettingsModal from './modals/AccountSettingsModal'

export default function InstructorDash({
  students, instructors, activeLocation, setActiveLocation,
  setView, onSelectStudent, onAddStudent, onDeleteStudent,
  onAddInstructor, onDeleteInstructor, onUpdateInstructor,
  roleRequests = [], onSubmitRoleRequest, onResolveRoleRequest,
  calcProgress, account, onSignOut, onUpdateAccount,
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [showManageInstr, setShowManageInstr] = useState(false)
  const [showAcctSettings, setShowAcctSettings] = useState(false)

  const locationStudents = students.filter((s) => s.base === activeLocation)

  // Split into "mine" (this instructor is primary or secondary) vs. others
  const myName = account?.name
  const isMine = (s) => myName && (eqName(s.primaryInstructor, myName) || eqName(s.secondaryInstructor, myName))
  const myStudents = myName ? locationStudents.filter(isMine) : []
  const otherStudents = myName ? locationStudents.filter((s) => !isMine(s)) : locationStudents

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img className="logo-badge" src="/aviation-adventures-logo.png" alt="Aviation Adventures" />
          <div>
            <h1>Instructor Dashboard</h1>
            {account && <small style={{ opacity: .8 }}>{account.name} · {account.roleLabel}</small>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-sm btn-ghost" onClick={() => setShowManageInstr(true)}>
            Instructors
          </button>
          <button
            className="btn btn-sm"
            style={{ background: '#2d6ab4', color: '#fff', border: 'none' }}
            onClick={() => setShowAdd(true)}
          >
            + Add student
          </button>
          {account && (
            <button className="btn btn-sm btn-ghost" onClick={() => setShowAcctSettings(true)}>
              Account
            </button>
          )}
          {onSignOut && (
            <button className="btn btn-sm btn-ghost" onClick={onSignOut}>
              Sign out
            </button>
          )}
        </div>
      </div>

      {/* Location tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', background: '#fff', padding: '0 16px', display: 'flex', gap: 4, overflowX: 'auto' }}>
        {LOCATIONS.map((loc) => (
          <button
            key={loc}
            className={`tab ${activeLocation === loc ? 'active' : ''}`}
            onClick={() => setActiveLocation(loc)}
          >
            {loc} ({students.filter((s) => s.base === loc).length})
          </button>
        ))}
      </div>

      {/* Student list */}
      <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
        {locationStudents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            <p>No students at {activeLocation} yet</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowAdd(true)}>
              Add first student
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {/* My students */}
            {myStudents.length > 0 && (
              <section>
                <SectionHeader
                  label={`My Students (${myStudents.length})`}
                  hint="Primary or secondary instructor"
                  accent
                />
                <div style={{ display: 'grid', gap: 10 }}>
                  {myStudents.map((student) => (
                    <StudentCard
                      key={student.id}
                      student={student}
                      progress={calcProgress(student)}
                      isMine
                      myName={myName}
                      onView={() => onSelectStudent(student)}
                      onDelete={() => { if (confirm(`Remove ${student.name}?`)) onDeleteStudent(student.id) }}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Other students at this location */}
            {otherStudents.length > 0 && (
              <section>
                {myStudents.length > 0 && (
                  <SectionHeader
                    label={`Other Students at ${activeLocation} (${otherStudents.length})`}
                  />
                )}
                <div style={{ display: 'grid', gap: 10 }}>
                  {otherStudents.map((student) => (
                    <StudentCard
                      key={student.id}
                      student={student}
                      progress={calcProgress(student)}
                      onView={() => onSelectStudent(student)}
                      onDelete={() => { if (confirm(`Remove ${student.name}?`)) onDeleteStudent(student.id) }}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {showAdd && (
        <AddStudentModal
          instructors={instructors}
          activeLocation={activeLocation}
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
    </div>
  )
}

function SectionHeader({ label, hint, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${accent ? 'var(--aa-red)' : '#e5e7eb'}` }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: accent ? 'var(--aa-red)' : '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </h3>
      {hint && <span style={{ fontSize: 11, color: '#9ca3af' }}>{hint}</span>}
    </div>
  )
}

function StudentCard({ student, progress: p, isMine, myName, onView, onDelete }) {
  const bp = budgetPct(p)
  const schoolShort = student.school === 'Liberty University' ? 'Liberty'
    : student.school === 'Purdue Global' ? 'Purdue'
    : student.school === 'California Aeronautics University' ? 'Cal Aero'
    : 'Independent'
  const schoolTag = student.school === 'Liberty University' ? 'tag-blue'
    : student.school === 'Purdue Global' ? 'tag-amber'
    : student.school === 'California Aeronautics University' ? 'tag-green'
    : 'tag-gray'

  // Indicate whether this instructor is primary or secondary
  const myRole = isMine && myName
    ? (eqName(student.primaryInstructor, myName) ? 'Primary' : 'Secondary')
    : null

  return (
    <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start', borderLeft: isMine ? '3px solid var(--aa-red)' : undefined }}>
      <div style={{ cursor: 'pointer' }} onClick={onView}>
        {/* Name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1a3a5c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 500, flexShrink: 0 }}>
            {student.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>{student.name}</div>
            <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              <span>{student.course} · {COURSES[student.course]?.avia}</span>
              <span>·</span>
              <span>{student.aircraft}</span>
              <span>·</span>
              <span>{student.primaryInstructor}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div className="progress-bar" style={{ flex: 1 }}>
            <div className="progress-fill" style={{ width: `${p.pct}%`, background: p.pct >= 100 ? '#16a34a' : '#1a3a5c' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, minWidth: 32 }}>{p.pct}%</span>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className="tag tag-blue">{p.completed}/{p.total} lessons</span>
          <span className="tag tag-gray">{p.flown.toFixed(1)}h flown</span>
          {p.flatRate && (
            <span className="tag" style={{ background: bp < 90 ? '#f0fdf4' : '#fef2f2', color: bp < 90 ? '#15803d' : '#dc2626' }}>
              ${p.cost.toLocaleString()} / ${p.flatRate.toLocaleString()}
            </span>
          )}
          <span className={`tag ${schoolTag}`}>{schoolShort}</span>
          {myRole && (
            <span className="tag" style={{ background: '#fef2f2', color: 'var(--aa-red)' }}>
              {myRole === 'Primary' ? '★ Primary' : 'Secondary'}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn btn-sm" onClick={onView}>View</button>
        <button className="btn btn-sm btn-danger" onClick={onDelete}>Delete</button>
      </div>
    </div>
  )
}
