import { useState, useMemo } from 'react'
import { LOCATIONS, SCHOOLS, AIRCRAFT_LIST, AIRCRAFT_RATES, LU_FLAT_RATES, instrRate } from '../../data/constants'
import { COURSES, COURSE_NAMES } from '../../data/courses'
import { selectableTerms } from '../../utils/terms'
import { useToast } from '../Toast'

export default function AddStudentModal({ instructors, activeLocation, onAdd, onClose }) {
  const toast = useToast()
  // Default the pace to the soonest A term that hasn't ended yet
  const upcomingTerms = useMemo(() => selectableTerms(new Date()), [])
  const upcomingSemesters = useMemo(
    () => Array.from(new Set(upcomingTerms.map((t) => t.semester))),
    [upcomingTerms]
  )
  const defaultSemester = upcomingSemesters[0] || ''
  const defaultSubterm = upcomingTerms.find((t) => t.semester === defaultSemester && t.subterm === 'A') ? 'A' : 'D'

  const [form, setForm] = useState({
    name: '',
    school: 'Liberty University',
    course: 'Private 1',
    aircraft: 'C-172-L-P',
    primaryInstructor: '',
    secondaryInstructor: '',
    base: activeLocation || 'KHEF',
    pace: { semester: defaultSemester, subterm: defaultSubterm },
    accelerated: false,
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  // Show only instructors at the student's current base
  const baseInstructors = instructors.filter((i) => !i.base || i.base === form.base)

  const submit = () => {
    if (!form.name.trim()) return toast.error('Student name is required')
    if (!form.primaryInstructor) return toast.error('Primary instructor is required')
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
                placeholder="First Last"
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
              />
            </div>

            {/* Secondary instructor */}
            <div>
              <label>Secondary instructor</label>
              <InstructorSelect
                value={form.secondaryInstructor}
                onChange={(v) => set('secondaryInstructor', v)}
                instructors={baseInstructors}
              />
            </div>

            <div className="divider" />

            {/* Pace (semester + A/D + accelerated) */}
            <div>
              <label>Pace</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={form.pace.semester}
                  onChange={(e) => {
                    const sem = e.target.value
                    const sub = upcomingTerms.find((t) => t.semester === sem && t.subterm === form.pace.subterm)
                      ? form.pace.subterm
                      : (upcomingTerms.find((t) => t.semester === sem && t.subterm === 'A') ? 'A' : 'D')
                    setForm((f) => ({
                      ...f,
                      pace: { semester: sem, subterm: sub },
                      accelerated: sub === 'A' ? f.accelerated : false,
                    }))
                  }}
                  style={{ flex: '1 1 auto', minWidth: 160 }}
                >
                  {upcomingSemesters.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {['A', 'D'].map((sub) => {
                  const exists = upcomingTerms.some((t) => t.semester === form.pace.semester && t.subterm === sub)
                  const active = form.pace.subterm === sub
                  return (
                    <button
                      key={sub}
                      type="button"
                      disabled={!exists}
                      className={`btn btn-sm ${active ? 'btn-primary' : ''}`}
                      onClick={() => setForm((f) => ({
                        ...f,
                        pace: { ...f.pace, subterm: sub },
                        accelerated: sub === 'A' ? f.accelerated : false,
                      }))}
                    >
                      {sub} term
                    </button>
                  )
                })}
              </div>
              {form.pace.subterm === 'A' && (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: '#374151', fontWeight: 400, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.accelerated}
                    onChange={(e) => set('accelerated', e.target.checked)}
                    style={{ width: 'auto', margin: 0, padding: 0 }}
                  />
                  Accelerated (finish A in time to start D)
                </label>
              )}
            </div>

            {/* LU info box */}
            {form.school === 'Liberty University' && (
              <div className="info-box">
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

function InstructorSelect({ value, onChange, instructors }) {
  if (instructors.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', padding: '6px 0' }}>
        No instructors at this base yet — add one via "Manage instructors" first.
      </div>
    )
  }
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%' }}>
      <option value="">— select instructor —</option>
      {/* Dedupe by name: instructors at multiple bases appear once. */}
      {Array.from(new Map(instructors.map((i) => [i.name, i])).values()).map((i) => (
        <option key={i.name} value={i.name}>{i.name}  ({i.cert})</option>
      ))}
    </select>
  )
}
