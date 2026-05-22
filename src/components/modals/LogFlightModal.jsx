import { useState } from 'react'

const FLIGHT_FIELDS = [
  ['dual',  'Dual'],
  ['solo',  'Solo'],
  ['xc',    'XC'],
  ['sim',   'Sim (Redbird)'],
  ['hood',  'Hood / Sim Inst'],
  ['night', 'Night'],
  ['ground','Ground'],
]

export default function LogFlightModal({ lesson, existing = {}, instructors, onSave, onClose }) {
  const [form, setForm] = useState({
    date:        existing.date        || new Date().toISOString().slice(0, 10),
    instructor:  existing.instructor  || '',
    dual:        existing.dual        || '',
    solo:        existing.solo        || '',
    xc:          existing.xc         || '',
    sim:         existing.sim         || '',
    hood:        existing.hood        || '',
    night:       existing.night       || '',
    ground:      existing.ground      || '',
    completed:   existing.completed   || false,
    repeatedLib: existing.repeatedLib || false,
    repeatedOop: existing.repeatedOop || false,
    incomplete:  existing.incomplete  || false,
    notes:       existing.notes       || '',
  })
  const [customInstr, setCustomInstr] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const hasInstructors = instructors.length > 0

  const save = () => {
    const data = { ...form }
    FLIGHT_FIELDS.forEach(([k]) => { data[k] = parseFloat(form[k]) || 0 })
    onSave(data)
  }

  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 500 }}>Log flight — lesson {lesson.id}</h2>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {lesson.o}
              {existing.date && (
                <span style={{ marginLeft: 8, color: '#1a3a5c', fontWeight: 500 }}>
                  · {new Date(existing.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'grid', gap: 12 }}>

            {/* Date + Instructor */}
            <div className="grid2">
              <div>
                <label>Date</label>
                <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
              </div>
              <div>
                <label>Instructor</label>
                {!hasInstructors || customInstr ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      value={form.instructor}
                      onChange={(e) => set('instructor', e.target.value)}
                      placeholder="Printed name"
                      style={{ flex: 1 }}
                    />
                    {hasInstructors && (
                      <button className="btn btn-sm" onClick={() => { setCustomInstr(false); set('instructor', '') }}>☰</button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select value={form.instructor} onChange={(e) => set('instructor', e.target.value)} style={{ flex: 1 }}>
                      <option value="">— select instructor —</option>
                      {instructors.map((i) => (
                        <option key={i.name} value={i.name}>{i.name}  ({i.cert})</option>
                      ))}
                    </select>
                    <button className="btn btn-sm" onClick={() => { setCustomInstr(true); set('instructor', '') }}>✏</button>
                  </div>
                )}
              </div>
            </div>

            {/* Flight time grid */}
            <div>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>
                Flight time (hours)
              </div>
              <div className="grid3">
                {FLIGHT_FIELDS.map(([k, label]) => (
                  <div key={k}>
                    <label>{label}</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form[k]}
                      onChange={(e) => set(k, e.target.value)}
                      placeholder="0.0"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Checkboxes */}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                ['completed',   'Completed ✓'],
                ['repeatedLib', 'Repeated (Lib)'],
                ['repeatedOop', 'Repeated (OOP)'],
                ['incomplete',  'Incomplete'],
              ].map(([k, label]) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={form[k]}
                    onChange={(e) => set(k, e.target.checked)}
                    style={{ width: 'auto' }}
                  />
                  {label}
                </label>
              ))}
            </div>

            {/* Notes */}
            <div>
              <label>Notes</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Optional notes"
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save flight log</button>
        </div>
      </div>
    </div>
  )
}
