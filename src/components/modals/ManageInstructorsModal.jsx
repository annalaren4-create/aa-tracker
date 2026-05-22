import { useState } from 'react'
import { INSTRUCTOR_CERTS } from '../../data/constants'

export default function ManageInstructorsModal({ instructors, onAdd, onDelete, onClose }) {
  const [name, setName] = useState('')
  const [cert, setCert] = useState('CFI')

  const handleAdd = () => {
    if (!name.trim()) return
    if (instructors.find((i) => i.name === name.trim())) return alert('Instructor already exists')
    onAdd({ name: name.trim(), cert })
    setName('')
  }

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 15, fontWeight: 500 }}>Manage instructors</h2>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
            Add instructors here to populate the dropdowns when creating students or logging flights.
          </p>

          {/* Add row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label>Full name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Anna Herrington"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              />
            </div>
            <div style={{ width: 130 }}>
              <label>Certificate</label>
              <select value={cert} onChange={(e) => setCert(e.target.value)}>
                {INSTRUCTOR_CERTS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleAdd}>+ Add</button>
            </div>
          </div>

          {/* Roster */}
          {instructors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 16, color: '#6b7280', fontSize: 13 }}>
              No instructors added yet
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {instructors.map((ins) => (
                <div key={ins.name} className="instr-pill">
                  <div>
                    <span style={{ fontWeight: 500 }}>{ins.name}</span>
                    <span className="tag tag-blue" style={{ marginLeft: 8 }}>{ins.cert}</span>
                  </div>
                  <button
                    className="instr-remove-btn"
                    onClick={() => { if (confirm(`Remove ${ins.name}?`)) onDelete(ins.name) }}
                  >
                    ✕
                  </button>
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
