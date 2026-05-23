import { useState } from 'react'
import { LOCATIONS, INSTRUCTOR_CERTS } from '../../data/constants'

export default function ManageInstructorsModal({ instructors, onAdd, onDelete, onUpdate, onClose, activeLocation, myName }) {
  // Default the base filter to the LOGGED-IN instructor's own base, falling back
  // to the dashboard's active location, then to 'All'. So when Bob Hepp (KHEF)
  // opens this modal, he immediately sees the KHEF roster.
  const myBaseInit = myName ? instructors.find((i) => i.name === myName)?.base : null
  const defaultBase = myBaseInit
    || (activeLocation && activeLocation !== 'All' ? activeLocation : 'KHEF')

  const [name, setName]   = useState('')
  const [cert, setCert]   = useState('CFI')
  const [base, setBase]   = useState(defaultBase)
  const [filter, setFilter] = useState(myBaseInit || (activeLocation && activeLocation !== 'All' ? activeLocation : 'All'))

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
    onUpdate?.(editing.name, editing.base, {
      name: draftName.trim(),
      cert: draftCert,
      base: draftBase,
      lineRate: draftChief ? 110 : undefined,   // setting to undefined removes the field
      stageCheck: draftStageCheck || undefined,
      phone: draftPhone.trim() || undefined,
      email: draftEmail.trim() || undefined,
    })
    setEditing(null)
  }

  const handleAdd = () => {
    if (!name.trim()) return
    if (instructors.find((i) => i.name === name.trim() && i.base === base)) {
      return alert(`${name.trim()} is already listed at ${base}`)
    }
    onAdd({ name: name.trim(), cert, base })
    setName('')
  }

  const visible = filter === 'All'
    ? instructors
    : instructors.filter((i) => i.base === filter)

  // Float the logged-in instructor's own record(s) to the top of each base group
  // so they see themselves first when opening the modal.
  const meFirst = (a, b) => {
    const aMe = myName && a.name === myName ? 0 : 1
    const bMe = myName && b.name === myName ? 0 : 1
    return aMe - bMe
  }

  // Group by base for display
  const grouped = LOCATIONS.reduce((acc, loc) => {
    const list = visible.filter((i) => i.base === loc || (!i.base && loc === 'KHEF')).sort(meFirst)
    if (list.length) acc[loc] = list
    return acc
  }, {})
  // Reorder the base sections so the logged-in instructor's base appears first.
  const myBase = myName ? instructors.find((i) => i.name === myName)?.base : null
  if (myBase && grouped[myBase]) {
    const { [myBase]: mine, ...rest } = grouped
    Object.keys(rest).forEach((k) => { /* no-op, just enumerate */ })
    const ordered = { [myBase]: mine, ...rest }
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

          {/* Add row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 100px auto', gap: 8, marginBottom: 16, alignItems: 'flex-end' }}>
            <div>
              <label>Full name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Anna Herrington"
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
              No instructors {filter !== 'All' ? `at ${filter}` : ''} yet
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
                      const isMe = myName && ins.name === myName
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
                                <button className="btn btn-sm btn-primary" onClick={saveEdit} title="Save (Enter)">✓</button>
                                <button className="btn btn-sm" onClick={cancelEdit} title="Cancel (Esc)">✕</button>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#374151' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={draftChief}
                                  onChange={(e) => setDraftChief(e.target.checked)}
                                  style={{ width: 'auto' }}
                                />
                                Chief / Asst Chief <span style={{ color: '#9ca3af' }}>($110 line rate)</span>
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={draftStageCheck}
                                  onChange={(e) => setDraftStageCheck(e.target.checked)}
                                  style={{ width: 'auto' }}
                                />
                                Stage Check Instructor
                              </label>
                            </div>
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
                        <div
                          key={`${ins.name}-${ins.base}`}
                          className="instr-pill"
                          style={isMe ? { borderColor: 'var(--aa-red)', background: '#fef2f2' } : undefined}
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
                              {filter === 'All' && ins.base && (
                                <span className="tag tag-gray" style={{ marginLeft: 4 }}>{ins.base}</span>
                              )}
                            </div>
                            {(ins.phone || ins.email) && (
                              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {ins.phone && <span>📞 <a href={`tel:${ins.phone}`} style={{ color: '#6b7280' }}>{ins.phone}</a></span>}
                                {ins.email && <span>✉ <a href={`mailto:${ins.email}`} style={{ color: '#6b7280' }}>{ins.email}</a></span>}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {onUpdate && (
                              <button
                                className="instr-remove-btn"
                                title="Edit"
                                style={{ color: '#6b7280' }}
                                onClick={() => startEdit(ins)}
                              >
                                ✏
                              </button>
                            )}
                            <button
                              className="instr-remove-btn"
                              title="Remove"
                              onClick={() => { if (confirm(`Remove ${ins.name} from ${ins.base}?`)) onDelete(ins.name, ins.base) }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
