import { useState } from 'react'
import { LOCATIONS, INSTRUCTOR_CERTS } from '../../data/constants'
import { eqName } from '../../utils/storage'
import { useToast } from '../Toast'

export default function ManageInstructorsModal({
  instructors, onAdd, onDelete, onUpdate, onClose, activeLocation, myName, isChief = false,
  roleRequests = [], onSubmitRoleRequest, onResolveRoleRequest,
}) {
  const toast = useToast()
  // Default the base filter to the LOGGED-IN instructor's own base, falling back
  // to the dashboard's active location, then to 'All'. So when Bob Hepp (KHEF)
  // opens this modal, he immediately sees the KHEF roster.
  const myBaseInit = myName ? instructors.find((i) => eqName(i.name, myName))?.base : null
  const defaultBase = myBaseInit
    || (activeLocation && activeLocation !== 'All' ? activeLocation : 'KHEF')

  const [name, setName]   = useState('')
  const [cert, setCert]   = useState('CFI')
  const [base, setBase]   = useState(defaultBase)
  const [filter, setFilter] = useState(myBaseInit || (activeLocation && activeLocation !== 'All' ? activeLocation : 'All'))
  const [search, setSearch] = useState('')

  // Inline edit state: { name, base } of the row being edited, plus draft values
  const [editing, setEditing] = useState(null)
  const [draftName, setDraftName] = useState('')
  const [draftCert, setDraftCert] = useState('CFI')
  const [draftBase, setDraftBase] = useState('KHEF')
  const [draftChief, setDraftChief] = useState(false)
  const [draftStageCheck, setDraftStageCheck] = useState(false)
  const [draftPhone, setDraftPhone] = useState('')
  const [draftEmail, setDraftEmail] = useState('')

  const startEdit = (ins) => {
    setEditing({ name: ins.name, base: ins.base })
    setDraftName(ins.name)
    setDraftCert(ins.cert)
    setDraftBase(ins.base)
    setDraftChief(!!ins.lineRate)               // chiefs are identified by lineRate: 110
    setDraftStageCheck(!!ins.stageCheck)        // stage check designation
    setDraftPhone(ins.phone || '')
    setDraftEmail(ins.email || '')
  }
  const cancelEdit = () => setEditing(null)
  const saveEdit = () => {
    if (!draftName.trim()) return
    // Non-chiefs may not change Chief or Stage Check designations on any
    // instructor (including themselves). Preserve the existing flags instead
    // of trusting the draft values from the form.
    const orig = instructors.find((i) => i.name === editing.name && i.base === editing.base)
    const safeChief      = isChief ? draftChief      : !!orig?.lineRate
    const safeStageCheck = isChief ? draftStageCheck : !!orig?.stageCheck
    onUpdate?.(editing.name, editing.base, {
      name: draftName.trim(),
      cert: draftCert,
      base: draftBase,
      lineRate: safeChief ? 110 : undefined,    // undefined removes the field
      stageCheck: safeStageCheck || undefined,
      phone: draftPhone.trim() || undefined,
      email: draftEmail.trim() || undefined,
    })
    setEditing(null)
  }

  const handleAdd = () => {
    if (!name.trim()) return
    if (instructors.find((i) => i.name === name.trim() && i.base === base)) {
      return toast.error(`${name.trim()} is already listed at ${base}`)
    }
    onAdd({ name: name.trim(), cert, base })
    setName('')
  }

  const q = search.trim().toLowerCase()
  const visible = (filter === 'All' ? instructors : instructors.filter((i) => i.base === filter))
    .filter((i) => !q || i.name.toLowerCase().includes(q))

  // Float the logged-in instructor's own record(s) to the top of each base group
  // so they see themselves first when opening the modal.
  const meFirst = (a, b) => {
    const aMe = eqName(a.name, myName) ? 0 : 1
    const bMe = eqName(b.name, myName) ? 0 : 1
    return aMe - bMe
  }

  // Group by base for display
  const grouped = LOCATIONS.reduce((acc, loc) => {
    const list = visible.filter((i) => i.base === loc || (!i.base && loc === 'KHEF')).sort(meFirst)
    if (list.length) acc[loc] = list
    return acc
  }, {})
  // Reorder the base sections so the logged-in instructor's base appears first.
  const myBase = myName ? instructors.find((i) => eqName(i.name, myName))?.base : null
  if (myBase && grouped[myBase]) {
    const { [myBase]: mine, ..._rest } = grouped
    const ordered = { [myBase]: mine, ..._rest }
    Object.keys(grouped).forEach((k) => delete grouped[k])
    Object.assign(grouped, ordered)
  }

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 15, fontWeight: 500 }}>Manage instructors</h2>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* Pending role-change requests — visible to Chiefs only */}
          {isChief && roleRequests.length > 0 && (
            <div style={{ marginBottom: 16, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                Pending designation requests ({roleRequests.length})
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {roleRequests.map((req) => (
                  <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, background: '#fff', padding: '6px 10px', borderRadius: 6, border: '1px solid #fef3c7' }}>
                    <div style={{ flex: 1 }}>
                      <strong>{req.instructorName}</strong>
                      <span style={{ color: '#6b7280' }}> · {req.base} · requests </span>
                      <span style={{ color: '#92400e', fontWeight: 600 }}>
                        {req.field === 'chief' ? 'Chief / Asst Chief' : 'Stage Check Instructor'}
                      </span>
                    </div>
                    <button className="btn btn-sm btn-primary" onClick={() => onResolveRoleRequest?.(req.id, true)}>Approve</button>
                    <button className="btn btn-sm" onClick={() => onResolveRoleRequest?.(req.id, false)}>Deny</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 100px auto', gap: 8, marginBottom: 16, alignItems: 'flex-end' }}>
            <div>
              <label>Full name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First Last"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              />
            </div>
            <div>
              <label>Certificate</label>
              <select value={cert} onChange={(e) => setCert(e.target.value)}>
                {INSTRUCTOR_CERTS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label>Base</label>
              <select value={base} onChange={(e) => setBase(e.target.value)}>
                {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={handleAdd}>+ Add</button>
          </div>

          {/* Search box — handy as the roster grows */}
          <div style={{ marginBottom: 10, position: 'relative' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              style={{ width: '100%', fontSize: 13, padding: '6px 10px', paddingRight: search ? 28 : 10 }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  border: 'none', background: 'transparent', color: '#9ca3af',
                  fontSize: 14, cursor: 'pointer', padding: 2,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12, borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
            {['All', ...LOCATIONS].map((loc) => (
              <button
                key={loc}
                onClick={() => setFilter(loc)}
                style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: filter === loc ? '#1a3a5c' : '#f1f5f9',
                  color: filter === loc ? '#fff' : '#6b7280',
                  fontWeight: filter === loc ? 600 : 400,
                }}
              >
                {loc} ({loc === 'All' ? instructors.length : instructors.filter(i => i.base === loc).length})
              </button>
            ))}
          </div>

          {/* Roster grouped by base */}
          {Object.keys(grouped).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 16, color: '#6b7280', fontSize: 13 }}>
              {q
                ? <>No instructors {filter !== 'All' ? `at ${filter} ` : ''}match "<strong>{search}</strong>"</>
                : <>No instructors {filter !== 'All' ? `at ${filter}` : ''} yet</>}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12, maxHeight: 360, overflowY: 'auto' }}>
              {Object.entries(grouped).map(([loc, list]) => (
                <div key={loc}>
                  {filter === 'All' && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                      {loc}
                    </div>
                  )}
                  <div style={{ display: 'grid', gap: 5 }}>
                    {list.map((ins) => {
                      const isMe = eqName(ins.name, myName)
                      const isEditing = editing && editing.name === ins.name && editing.base === ins.base
                      if (isEditing) {
                        return (
                          <div
                            key={`${ins.name}-${ins.base}`}
                            style={{ background: '#fff', border: '1px solid var(--aa-red)', borderRadius: 8, padding: 10, display: 'grid', gap: 8 }}
                          >
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px auto', gap: 6, alignItems: 'center' }}>
                              <input
                                value={draftName}
                                onChange={(e) => setDraftName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                                autoFocus
                                style={{ fontSize: 13, padding: '4px 8px' }}
                              />
                              <select value={draftCert} onChange={(e) => setDraftCert(e.target.value)} style={{ fontSize: 12, padding: '4px 6px' }}>
                                {INSTRUCTOR_CERTS.map((c) => <option key={c}>{c}</option>)}
                              </select>
                              <select value={draftBase} onChange={(e) => setDraftBase(e.target.value)} style={{ fontSize: 12, padding: '4px 6px' }}>
                                {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                              </select>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn btn-sm btn-primary" onClick={saveEdit} title="Save (Enter)">Save</button>
                                <button className="btn btn-sm" onClick={cancelEdit} title="Cancel (Esc)">✕</button>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#374151', flexWrap: 'wrap' }}>
                              {/* Chief / Stage Check designations can only be set by
                                  a logged-in Chief Instructor — prevents anyone from
                                  promoting themselves. Non-chiefs see them as read-only. */}
                              <label
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 6,
                                  cursor: isChief ? 'pointer' : 'not-allowed',
                                  opacity: isChief ? 1 : 0.55,
                                }}
                                title={isChief ? '' : 'Only a Chief Instructor can change this designation'}
                              >
                                <input
                                  type="checkbox"
                                  checked={draftChief}
                                  disabled={!isChief}
                                  onChange={(e) => setDraftChief(e.target.checked)}
                                  style={{ width: 'auto' }}
                                />
                                Chief / Asst Chief <span style={{ color: '#9ca3af' }}>($110 line rate)</span>
                              </label>
                              <label
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 6,
                                  cursor: isChief ? 'pointer' : 'not-allowed',
                                  opacity: isChief ? 1 : 0.55,
                                }}
                                title={isChief ? '' : 'Only a Chief Instructor can change this designation'}
                              >
                                <input
                                  type="checkbox"
                                  checked={draftStageCheck}
                                  disabled={!isChief}
                                  onChange={(e) => setDraftStageCheck(e.target.checked)}
                                  style={{ width: 'auto' }}
                                />
                                Stage Check Instructor
                              </label>
                            </div>
                            {!isChief && (() => {
                              // Show "Request" buttons only when the instructor is
                              // editing their OWN profile and doesn't already have
                              // that designation or a pending request.
                              const isOwnProfile = myName && editing.name === myName
                              if (!isOwnProfile) {
                                return (
                                  <div style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>
                                    Chief / Stage Check designations are managed by a Chief Instructor.
                                  </div>
                                )
                              }
                              const hasChief        = !!ins.lineRate
                              const hasStage        = !!ins.stageCheck
                              const pendingChief    = roleRequests.some((r) => r.instructorName === ins.name && r.base === ins.base && r.field === 'chief')
                              const pendingStage    = roleRequests.some((r) => r.instructorName === ins.name && r.base === ins.base && r.field === 'stageCheck')
                              const reqDesignation  = (field) => {
                                const ok = onSubmitRoleRequest?.({ instructorName: ins.name, base: ins.base, field })
                                if (ok === false) toast.error('You already have a request pending for that designation.')
                              }
                              return (
                                <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                  Need a designation?
                                  {!hasChief && !pendingChief && (
                                    <button className="btn btn-sm" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => reqDesignation('chief')}>
                                      Request Chief
                                    </button>
                                  )}
                                  {pendingChief && <span style={{ color: '#b45309', fontSize: 10 }}>Chief request pending</span>}
                                  {!hasStage && !pendingStage && (
                                    <button className="btn btn-sm" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => reqDesignation('stageCheck')}>
                                      Request Stage Check
                                    </button>
                                  )}
                                  {pendingStage && <span style={{ color: '#b45309', fontSize: 10 }}>Stage Check request pending</span>}
                                </div>
                              )
                            })()}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 6 }}>
                              <div>
                                <label style={{ fontSize: 11, color: '#6b7280' }}>Phone</label>
                                <input
                                  value={draftPhone}
                                  onChange={(e) => setDraftPhone(e.target.value)}
                                  placeholder="555-123-4567"
                                  style={{ fontSize: 12, padding: '4px 8px' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: 11, color: '#6b7280' }}>Email</label>
                                <input
                                  type="email"
                                  value={draftEmail}
                                  onChange={(e) => setDraftEmail(e.target.value)}
                                  placeholder="name@example.com"
                                  style={{ fontSize: 12, padding: '4px 8px' }}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      }
                      return (
                        <InstructorRow
                          key={`${ins.name}-${ins.base}`}
                          ins={ins}
                          isMe={isMe}
                          isChief={isChief}
                          canEdit={!!onUpdate && (isChief || isMe)}
                          showBaseTag={filter === 'All' && !!ins.base}
                          onEdit={() => startEdit(ins)}
                          onRemove={async () => { if (await toast.confirm(`Remove ${ins.name} from ${ins.base}?`)) onDelete(ins.name, ins.base) }}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
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

/**
 * Single instructor row. Lifts Edit/Remove buttons into a hover state so
 * the list reads calmly when scanning — same pattern as the student
 * rows on ChiefDash. Hovering anywhere on the pill fades the buttons in.
 */
function InstructorRow({ ins, isMe, isChief, canEdit, showBaseTag, onEdit, onRemove }) {
  const [hovered, setHovered] = useState(false)
  // Also reveal when any descendant has keyboard focus (Tab nav) so the
  // action buttons aren't trapped behind opacity:0 / pointer-events:none.
  const [focused, setFocused] = useState(false)
  const reveal = hovered || focused
  return (
    <div
      className="instr-pill"
      style={isMe ? { borderColor: 'var(--aa-red)', background: '#fef2f2' } : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false) }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <span style={{ fontWeight: 500 }}>{ins.name}</span>
          {isMe && <span className="tag" style={{ marginLeft: 6, background: 'var(--aa-red)', color: '#fff' }}>YOU</span>}
          <span className="tag tag-blue" style={{ marginLeft: 8 }}>{ins.cert}</span>
          {ins.lineRate === 110 && (
            <span className="tag" style={{ background: 'var(--aa-red)', color: '#fff', marginLeft: 4 }}>Chief</span>
          )}
          {ins.stageCheck && (
            <span className="tag" style={{ background: '#fef3c7', color: '#92400e', marginLeft: 4 }}>Stage Check</span>
          )}
          {showBaseTag && (
            <span className="tag tag-gray" style={{ marginLeft: 4 }}>{ins.base}</span>
          )}
        </div>
        {(ins.phone || ins.email) && (
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {ins.phone && <span><a href={`tel:${ins.phone}`} style={{ color: '#6b7280' }}>{ins.phone}</a></span>}
            {ins.email && <span><a href={`mailto:${ins.email}`} style={{ color: '#6b7280' }}>{ins.email}</a></span>}
          </div>
        )}
      </div>
      <div
        style={{
          display: 'flex', gap: 4,
          opacity: reveal ? 1 : 0,
          transition: 'opacity .15s',
          pointerEvents: reveal ? 'auto' : 'none',
        }}
      >
        {canEdit && (
          <button
            className="btn btn-sm"
            title={isMe ? 'Edit your info' : 'Edit'}
            style={{ fontSize: 11, padding: '2px 8px', color: '#6b7280' }}
            onClick={onEdit}
          >
            Edit
          </button>
        )}
        {isChief && (
          <button
            className="btn btn-sm"
            title="Remove this instructor"
            style={{ fontSize: 11, padding: '2px 8px', color: '#dc2626', borderColor: '#fecaca' }}
            onClick={onRemove}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
