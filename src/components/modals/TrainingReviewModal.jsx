import { useState } from 'react'
import { COURSES } from '../../data/courses'

/**
 * Training Review form — mirrors the Liberty University FTA Training Review template.
 * Used when a student has out-of-pocket lesson repeats. Per the FTA Student Handbook:
 * "A Training Review is required for any occurrence in which a student pays out of pocket."
 */
export default function TrainingReviewModal({ student, logs, oopLessons, policyViolations = [], onClose }) {
  const today = new Date().toISOString().slice(0, 10)
  const course = COURSES[student.course]
  const courseLabel = `${student.course}${course?.avia ? ` (${course.avia})` : ''}`

  const rationaleParts = []
  if (oopLessons.length > 0) {
    rationaleParts.push(
      `Out-of-pocket repeat lesson(s) (${oopLessons.length}):\n` +
        oopLessons
          .map((l) => `  • Lesson ${l.id}${l.date ? ` (${l.date})` : ''}${l.notes ? ` — ${l.notes}` : ''}`)
          .join('\n')
    )
  }
  if (policyViolations.length > 0) {
    rationaleParts.push(
      `Policy items requiring out-of-pocket reclassification:\n` +
        policyViolations
          .map((l) => `  • Lesson ${l.id}${l.sc ? ' (stage check)' : ''}`)
          .join('\n')
    )
  }
  const defaultRationale = rationaleParts.join('\n\n')

  const [form, setForm] = useState({
    fta:        'Aviation Adventures',
    course:     courseLabel,
    student:    `${student.name} (ID: ${student.id})`,
    date:       today,
    writtenBy:  student.primaryInstructor || '',
    rationale:  defaultRationale,
    outcomes:   '',
    funding:    '',
  })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="overlay">
      <div className="modal tr-modal" style={{ maxWidth: 760 }}>
        <div className="modal-header no-print">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 500 }}>Training Review</h2>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              Signed copy must be e-mailed to flightaffiliate@liberty.edu
            </div>
          </div>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body tr-body">
          <div className="tr-title">
            <h1 style={{ fontSize: 18, margin: 0 }}>TRAINING REVIEW FORM</h1>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              <strong>FTA NAME:</strong>{' '}
              <EditableInline value={form.fta} onChange={(v) => set('fta', v)} />
            </div>
            <p style={{ fontSize: 11, color: '#374151', marginTop: 8, lineHeight: 1.4 }}>
              This form should be completed to document a Training Review, Training Review Board or if a
              student elects to use a training device other than the least expensive. The training review
              document shall be signed by the chief instructor and the student. Upon completion, please
              e-mail the completed Training Review Documentation to flightaffiliate@liberty.edu.
            </p>
          </div>

          <Field label="Course" value={form.course} onChange={(v) => set('course', v)} />
          <Field label="A. Student Name and ID" value={form.student} onChange={(v) => set('student', v)} />
          <Field label="B. Date" type="date" value={form.date} onChange={(v) => set('date', v)} />
          <Field
            label="C. Training Review Written by (Name and Title)"
            value={form.writtenBy}
            onChange={(v) => set('writtenBy', v)}
          />
          <Field
            label="D. Rationale for Training Review"
            value={form.rationale}
            onChange={(v) => set('rationale', v)}
            multiline rows={5}
          />
          <Field
            label="E. Outcomes / Next Steps"
            value={form.outcomes}
            onChange={(v) => set('outcomes', v)}
            multiline rows={4}
          />
          <Field
            label="F. Additional Funding Plan"
            value={form.funding}
            onChange={(v) => set('funding', v)}
            multiline rows={3}
          />

          <div className="tr-signatures">
            <div>
              <div className="sig-line" />
              <div className="sig-label">FTA Designee</div>
            </div>
            <div>
              <div className="sig-line" />
              <div className="sig-label">Student</div>
            </div>
          </div>
        </div>

        <div className="modal-footer no-print">
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', multiline = false, rows = 2 }) {
  return (
    <div className="tr-field">
      <label className="tr-label">{label}:</label>
      {multiline ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="tr-input"
          style={{ resize: 'vertical' }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="tr-input"
        />
      )}
    </div>
  )
}

function EditableInline({ value, onChange }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        display: 'inline-block', width: 'auto', minWidth: 220,
        border: 'none', borderBottom: '1px solid #9ca3af',
        background: 'transparent', fontSize: 13, padding: '2px 4px',
      }}
    />
  )
}
