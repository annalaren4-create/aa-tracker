import { useState } from 'react'
import { LOCATIONS, INSTRUCTOR_CERTS } from '../../data/constants'

export default function ManageInstructorsModal({ instructors, onAdd, onDelete, onClose, activeLocation }) {
  const [name, setName]   = useState('')
  const [cert, setCert]   = useState('CFI')
  const [base, setBase]   = useState(activeLocation && activeLocation !== 'All' ? activeLocation : 'KHEF')
  const [filter, setFilter] = useState(activeLocation && activeLocation !== 'All' ? activeLocation : 'All')

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

  // Group by base for display
  const grouped = LOCATIONS.reduce((acc, loc) => {
    const list = visible.filter((i) => i.base === loc || (!i.base && loc === 'KHEF'))
    if (list.length) acc[loc] = list
    return acc
  }, {})

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
                    {list.map((ins) => (
                      <div key={`${ins.name}-${ins.base}`} className="instr-pill">
                        <div>
                          <span style={{ fontWeight: 500 }}>{ins.name}</span>
                          <span className="tag tag-blue" style={{ marginLeft: 8 }}>{ins.cert}</span>
                          {filter === 'All' && ins.base && (
                            <span className="tag tag-gray" style={{ marginLeft: 4 }}>{ins.base}</span>
                          )}
                        </div>
                        <button
                          className="instr-remove-btn"
                          onClick={() => { if (confirm(`Remove ${ins.name} from ${ins.base}?`)) onDelete(ins.name, ins.base) }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
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
