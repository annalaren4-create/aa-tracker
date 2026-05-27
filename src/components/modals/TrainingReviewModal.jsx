import { useState, useRef, useEffect } from 'react'
import { COURSES } from '../../data/courses'
import { uid, eqName } from '../../utils/storage'
import { currentBranding } from '../../config/branding'
import { useToast } from '../Toast'

/**
 * Training Review form — mirrors the Liberty University FTA Training Review template.
 * Used when a student has out-of-pocket lesson repeats. Per the FTA Student Handbook:
 * "A Training Review is required for any occurrence in which a student pays out of pocket."
 *
 * Adds three things on top of the paper form:
 *   - typeable signature boxes (FTA designee + student)
 *   - one-click Email button (mailto: flightaffiliate@liberty.edu, CC's the
 *     chief(s) at the student's base)
 *   - on Email or Print, the form is saved to student.trainingReviews so
 *     chiefs/instructors/students can see the audit trail later
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO (backend migration): replace the mailto: flow with server-side PDF
 * generation + transactional email. Plan:
 *   1. Render this form to a real PDF on the server. Options:
 *      - @react-pdf/renderer (write the form as RN-PDF components; signatures
 *        embed via the base64 PNG we already capture)
 *      - Puppeteer/Playwright printing the print-stylesheet route headless
 *      - pdf-lib to fill Liberty's official PDF form field-by-field (best
 *        fidelity if Liberty supplies a fillable template)
 *   2. Backend route POST /training-reviews/:id/email hands the PDF to a
 *      transactional email service (Resend / Postmark / SendGrid). To:
 *      flightaffiliate@liberty.edu, CC: assigned base chief from
 *      TR_CC_BY_BASE, attachment: training-review-{student}-{date}.pdf.
 *   3. Persist the PDF to object storage (Supabase Storage / S3) and save
 *      the URL on the trainingReviews record so the audit trail in
 *      StudentDetail can offer "Download PDF" per entry.
 *   4. Front-end: swap window.location.href = mailto with fetch(...) +
 *      success toast, and add a Download link in the TR history list.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function TrainingReviewModal({ student, logs, instructors = [], oopLessons, policyViolations = [], oopFingerprint = '', onSaveReview, onClose }) {
  const toast = useToast()
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
    designeeSig: '',                                       // data URL of mouse-drawn signature image
    designeeSigName: '',                                   // printed name for the email body
    studentSig:  '',
    studentSigName: '',
  })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Per-base CC routing. Each base has ONE designated chief who receives
  // every Training Review email from that location — not all chiefs at the
  // base, just the assigned recipient. Sourced from the active school's
  // branding config so other FTAs can set their own routing later.
  const TR_CC_BY_BASE = currentBranding().trainingReviewCcByBase || {}
  const ccName  = TR_CC_BY_BASE[student.base]
  const ccChief = ccName ? instructors.find((i) => eqName(i.name, ccName) && i.email) : null
  const baseChiefs = ccChief ? [ccChief] : []
  // Did we find the assigned chief in the roster, but they have no email?
  const ccChiefMissingEmail = !!(ccName && !ccChief && instructors.find((i) => eqName(i.name, ccName)))

  // Soft pre-flight check used by Email & Print. Returns true if the user
  // wants to continue despite missing signatures / printed names.
  const confirmIfIncomplete = async () => {
    const missing = []
    if (!form.designeeSig)       missing.push('FTA designee signature')
    if (!form.designeeSigName)   missing.push('FTA designee printed name')
    if (!form.studentSig)        missing.push('student signature')
    if (!form.studentSigName)    missing.push('student printed name')
    if (missing.length === 0) return true
    return await toast.confirm(`Missing: ${missing.join(', ')}.\n\nSend anyway?`)
  }

  // Persist the current state of the form as a training-review record on
  // the student's profile. Used by both Email and Print actions so the
  // history stays in sync regardless of which export path was taken.
  const saveReview = () => {
    if (!onSaveReview) return
    onSaveReview(student.id, {
      id: uid(),
      date: form.date,
      // Display label shown in the TR history list (e.g. "Private 1 (AVIA220)").
      course: form.course,
      // Bare course name used to filter the history per-course so reviews
      // for a finished course only show up while viewing that course in
      // the course-history switcher. Captured at save time so renaming the
      // current course later doesn't orphan old reviews.
      courseName: student.course,
      // Snapshot of the OOP-trigger fingerprint at save time. The
      // "Training Review required" banner stays hidden as long as this
      // matches the current fingerprint; the moment a new OOP repeat is
      // logged the fingerprint changes and the banner returns.
      oopFingerprint,
      writtenBy: form.writtenBy,
      rationale: form.rationale,
      outcomes: form.outcomes,
      funding: form.funding,
      designeeSig: form.designeeSig,                       // data URL of signature image
      designeeSigName: form.designeeSigName,
      studentSig: form.studentSig,
      studentSigName: form.studentSigName,
      createdAt: new Date().toISOString(),
    })
  }

  const handleEmail = async () => {
    if (!(await confirmIfIncomplete())) return
    const ccList = baseChiefs.map((c) => c.email).filter(Boolean).join(',')
    const subject = `Training Review — ${student.name} — ${form.date}`
    const body = [
      `FTA: ${form.fta}`,
      `Course: ${form.course}`,
      `Student: ${form.student}`,
      `Date: ${form.date}`,
      `Written by: ${form.writtenBy}`,
      ``,
      `D. Rationale for Training Review:`,
      form.rationale || '(blank)',
      ``,
      `E. Outcomes / Next Steps:`,
      form.outcomes || '(blank)',
      ``,
      `F. Additional Funding Plan:`,
      form.funding || '(blank)',
      ``,
      `FTA Designee: ${form.designeeSigName || '(printed name not set)'} — signature ${form.designeeSig ? 'captured (image)' : 'NOT signed'}`,
      `Student:      ${form.studentSigName  || '(printed name not set)'} — signature ${form.studentSig  ? 'captured (image)' : 'NOT signed'}`,
      ``,
      `Signature images are saved in the student's profile on the Aviation Adventures tracker; print the form as PDF if Liberty needs a visual signed copy.`,
    ].join('\n')
    const mailto = `mailto:flightaffiliate@liberty.edu`
      + `?cc=${encodeURIComponent(ccList)}`
      + `&subject=${encodeURIComponent(subject)}`
      + `&body=${encodeURIComponent(body)}`
    saveReview()
    window.location.href = mailto
    onClose?.()                                            // close popup once the email client has been kicked off
  }

  const handlePrint = async () => {
    if (!(await confirmIfIncomplete())) return
    saveReview()
    window.print()
    onClose?.()                                            // close popup after print dialog returns
  }

  return (
    <div className="overlay">
      <div className="modal tr-modal" style={{ maxWidth: 760 }}>
        <div className="modal-header no-print">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 500 }}>Training Review</h2>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              To: flightaffiliate@liberty.edu
              {ccChief && (
                <> · CC: <span style={{ color: '#1a3a5c', fontWeight: 600 }}>{ccChief.name}</span></>
              )}
              {ccChiefMissingEmail && (
                <span style={{ color: '#b45309', fontWeight: 600, marginLeft: 6 }}>
                  · {ccName} has no email on file
                </span>
              )}
              {!ccName && (
                <span style={{ color: '#b45309', fontWeight: 600, marginLeft: 6 }}>
                  · no CC chief assigned for {student.base}
                </span>
              )}
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
              <SignaturePad
                value={form.designeeSig}
                onChange={(v) => set('designeeSig', v)}
              />
              <input
                type="text"
                value={form.designeeSigName}
                onChange={(e) => set('designeeSigName', e.target.value)}
                placeholder="Print name"
                style={{ width: '100%', marginTop: 4, padding: '3px 4px', fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 4 }}
              />
              <div className="sig-label">FTA Designee</div>
            </div>
            <div>
              <SignaturePad
                value={form.studentSig}
                onChange={(v) => set('studentSig', v)}
              />
              <input
                type="text"
                value={form.studentSigName}
                onChange={(e) => set('studentSigName', e.target.value)}
                placeholder="Print name"
                style={{ width: '100%', marginTop: 4, padding: '3px 4px', fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 4 }}
              />
              <div className="sig-label">Student</div>
            </div>
          </div>
        </div>

        <div className="modal-footer no-print">
          <button className="btn" onClick={onClose}>Close</button>
          <button
            className="btn"
            onClick={handleEmail}
            title={baseChiefs.length > 0
              ? `Sends to flightaffiliate@liberty.edu, CC: ${baseChiefs.map((c) => c.email).join(', ')}`
              : 'Sends to flightaffiliate@liberty.edu (no chief email on file for this base)'}
          >
            Email to Liberty
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>Print</button>
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

/**
 * Mouse-drawn signature pad. Renders an HTML canvas the user can sign in,
 * and emits the strokes as a base64 PNG `data:image/png;…` URL via
 * `onChange`. Includes a Clear button to start over. Touch events handled
 * too for tablet / phone instructors.
 */
function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null)
  const drawing   = useRef(false)
  const lastPt    = useRef(null)

  // Re-render existing signature when value changes (e.g. on modal re-open).
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, c.width, c.height)
    if (value) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height)
      img.src = value
    }
  }, [value])

  const pointAt = (e) => {
    const c = canvasRef.current
    const rect = c.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    // Scale for device pixel ratio if canvas width/height differ from CSS size.
    return { x: x * (c.width / rect.width), y: y * (c.height / rect.height) }
  }

  const start = (e) => { e.preventDefault(); drawing.current = true; lastPt.current = pointAt(e) }
  const move  = (e) => {
    if (!drawing.current) return
    e.preventDefault()
    const c = canvasRef.current
    const ctx = c.getContext('2d')
    const pt = pointAt(e)
    ctx.lineCap = 'round'
    ctx.lineWidth = 2
    ctx.strokeStyle = '#111827'
    ctx.beginPath()
    ctx.moveTo(lastPt.current.x, lastPt.current.y)
    ctx.lineTo(pt.x, pt.y)
    ctx.stroke()
    lastPt.current = pt
  }
  const end   = () => {
    if (!drawing.current) return
    drawing.current = false
    onChange(canvasRef.current.toDataURL('image/png'))
  }

  const clear = () => {
    const c = canvasRef.current
    c.getContext('2d').clearRect(0, 0, c.width, c.height)
    onChange('')
  }

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={360}
        height={80}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        style={{ width: '100%', height: 80, border: '1px solid #d1d5db', borderRadius: 4, background: '#fafafa', touchAction: 'none', cursor: 'crosshair' }}
      />
      <button
        type="button"
        onClick={clear}
        style={{ position: 'absolute', top: 4, right: 4, fontSize: 10, padding: '2px 6px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 4, cursor: 'pointer', color: '#6b7280' }}
      >
        Clear
      </button>
      {!value && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', fontSize: 11, color: '#d1d5db', fontStyle: 'italic' }}>
          Sign with mouse / finger
        </div>
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
