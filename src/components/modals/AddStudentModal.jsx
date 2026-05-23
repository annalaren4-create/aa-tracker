import { useState } from 'react'
import { LOCATIONS, SCHOOLS, AIRCRAFT_LIST, AIRCRAFT_RATES, LU_FLAT_RATES, instrRate } from '../../data/constants'
import { COURSES, COURSE_NAMES } from '../../data/courses'

export default function AddStudentModal({ instructors, activeLocation, onAdd, onClose }) {
  const [form, setForm] = useState({
    name: '',
    school: 'Liberty University',
    course: 'Private 1',
    aircraft: 'C-172-L-P',
    primaryInstructor: '',
    secondaryInstructor: '',
    base: activeLocation || 'KHEF',
  })
  const [customPrimary, setCustomPrimary] = useState(false)
  const [customSecondary, setCustomSecondary] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  // Show only instructors at the student's current base
  const baseInstructors = instructors.filter((i) => !i.base || i.base === form.base)
  const hasInstructors = baseInstructors.length > 0

  const submit = () => {
    if (!form.name.trim()) return alert('Student name is required')
    if (!form.primaryInstructor) return alert('Primary instructor is required')
    onAdd({ ...form, name: form.name.trim() })
  }

  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 style={{ fontSize: 15, fontWeight: 500 }}>Add new student</h2>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'grid', gap: 14 }}>

            {/* Name */}
            <div>
              <label>Student full name ✱</label>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Adam Medina"
              />
            </div>

            {/* School + Base */}
            <div className="grid2">
              <div>
                <label>Affiliated school</label>
                <select value={form.school} onChange={(e) => set('school', e.target.value)}>
                  {SCHOOLS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label>Base location</label>
                <select value={form.base} onChange={(e) => {
                  set('base', e.target.value)
                  set('primaryInstructor', '')
                  set('secondaryInstructor', '')
                }}>
                  {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Course + Aircraft */}
            <div className="grid2">
              <div>
                <label>Course</label>
                <select value={form.course} onChange={(e) => {
                  const c = e.target.value
                  const cflp = ['Private 1', 'Private 2', 'Commercial 1', 'Commercial 2', 'Commercial 3', 'CFI']
                  const twin = ['Multi Engine', 'Multi Engine Instructor']
                  const ac = twin.includes(c) ? 'PA-30' : (cflp.includes(c) ? 'C-172-L-P' : 'C-172-S')
                  setForm((f) => ({ ...f, course: c, aircraft: ac }))
                }}>
                  {COURSE_NAMES.map((c) => (
                    <option key={c} value={c}>{c}  ({COURSES[c].avia})</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Aircraft</label>
                <select value={form.aircraft} onChange={(e) => set('aircraft', e.target.value)}>
                  {AIRCRAFT_LIST.map((a) => (
                    <option key={a} value={a}>{a}  —  ${AIRCRAFT_RATES[a] || 0}/hr</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="divider" />

            {/* Primary instructor */}
            <div>
              <label>Primary instructor ✱</label>
              <InstructorSelect
                value={form.primaryInstructor}
                onChange={(v) => set('primaryInstructor', v)}
                instructors={baseInstructors}
                custom={customPrimary}
                setCustom={setCustomPrimary}
              />
            </div>

            {/* Secondary instructor */}
            <div>
              <label>Secondary instructor</label>
              <InstructorSelect
                value={form.secondaryInstructor}
                onChange={(v) => set('secondaryInstructor', v)}
                instructors={baseInstructors}
                custom={customSecondary}
                setCustom={setCustomSecondary}
              />
            </div>

            {/* LU info box */}
            {form.school === 'Liberty University' && (
              <div className="info-box">
                💵&nbsp;
                <b>LU flat rate: ${(LU_FLAT_RATES[form.course] || 0).toLocaleString()}</b>
                {' · '}{COURSES[form.course]?.avia}
                {' · '}Aircraft ${AIRCRAFT_RATES[form.aircraft] || 0}/hr
                {' · '}Instr ${instrRate(form.base)}/hr
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Add student</button>
        </div>
      </div>
    </div>
  )
}

function InstructorSelect({ value, onChange, instructors, custom, setCustom }) {
  const hasInstructors = instructors.length > 0

  if (!hasInstructors || custom) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type full name"
          style={{ flex: 1 }}
        />
        {hasInstructors && (
          <button className="btn btn-sm" title="Use dropdown" onClick={() => { setCustom(false); onChange('') }}>
            ☰
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }}>
        <option value="">— select instructor —</option>
        {instructors.map((i) => (
          <option key={i.name} value={i.name}>{i.name}  ({i.cert})</option>
        ))}
      </select>
      <button className="btn btn-sm" title="Type instead" onClick={() => { setCustom(true); onChange('') }}>
        ✏
      </button>
    </div>
  )
}
