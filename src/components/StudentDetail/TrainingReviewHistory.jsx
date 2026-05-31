import { fmtShortDate } from '../../utils/terms'
import { useToast } from '../Toast'

/**
 * Audit-trail list of Training Reviews saved on a student, scoped to the
 * currently-viewed course. Each row is collapsible (<details>) showing
 * the captured signature images, printed names, rationale, outcomes, and
 * funding plan.
 *
 * Reviews are filtered by the `courseName` field saved on each review at
 * the time of creation. Older reviews predating that field fall back to a
 * substring match against the display `course` label so historical data
 * still surfaces correctly.
 */
export default function TrainingReviewHistory({ student, viewCourse, courseLabel, canDelete = false, onDelete }) {
  const toast = useToast()
  const all = student.trainingReviews || []
  const reviews = viewCourse
    ? all.filter((tr) => (
        tr.courseName === viewCourse ||
        // Back-compat for pre-courseName saves: display label often starts
        // with the bare course name (e.g. "Private 1 (AVIA220)").
        (!tr.courseName && typeof tr.course === 'string' && tr.course.startsWith(viewCourse))
      ))
    : all
  if (reviews.length === 0) return null
  const sorted = [...reviews].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  return (
    <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
          Training Reviews{courseLabel ? ` — ${courseLabel}` : ''} ({reviews.length})
        </h3>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>Saved when a review is e-mailed or printed</span>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {sorted.map((tr) => (
          <details key={tr.id} style={{ border: '1px solid #f1f5f9', borderRadius: 6, padding: '6px 10px', background: '#fafafa' }}>
            <summary style={{ cursor: 'pointer', fontSize: 12, color: '#374151', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', listStyle: 'none' }}>
              <span className="tr-chevron" style={{ color: '#1a3a5c', fontSize: 12, fontWeight: 700, lineHeight: 1, transition: 'transform .15s', display: 'inline-block', width: 12, textAlign: 'center' }}>▼</span>
              <strong>{tr.date ? fmtShortDate(tr.date) : '—'}</strong>
              <span style={{ color: '#6b7280' }}>{tr.course}</span>
              <span style={{ color: '#9ca3af' }}>· written by {tr.writtenBy || '—'}</span>
              {tr.designeeSig && tr.studentSig && (
                <span className="tag tag-green" style={{ fontSize: 10 }}>signed</span>
              )}
              {canDelete && onDelete && (
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const ok = await toast.confirm(
                      `Delete this Training Review (${tr.date ? fmtShortDate(tr.date) : 'no date'} · ${tr.course || ''})?\n\n` +
                      `This removes it from the student's audit trail. If it was the most recent TR for this course, the "Training Review required" banner may reappear.`
                    )
                    if (ok) onDelete(tr.id)
                  }}
                  title="Delete this Training Review"
                  style={{
                    marginLeft: 'auto', border: 'none', background: 'transparent',
                    color: '#9ca3af', fontSize: 14, cursor: 'pointer', padding: '2px 6px',
                    borderRadius: 4,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = '#fef2f2' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'transparent' }}
                >
                  ✕
                </button>
              )}
            </summary>
            <div style={{ marginTop: 8, fontSize: 11, color: '#374151', display: 'grid', gap: 6 }}>
              {tr.rationale && (
                <div><strong style={{ color: '#6b7280' }}>Rationale:</strong>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: '2px 0 0', fontFamily: 'inherit', fontSize: 11 }}>{tr.rationale}</pre>
                </div>
              )}
              {tr.outcomes && (
                <div><strong style={{ color: '#6b7280' }}>Outcomes / Next Steps:</strong>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: '2px 0 0', fontFamily: 'inherit', fontSize: 11 }}>{tr.outcomes}</pre>
                </div>
              )}
              {tr.funding && (
                <div><strong style={{ color: '#6b7280' }}>Funding Plan:</strong>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: '2px 0 0', fontFamily: 'inherit', fontSize: 11 }}>{tr.funding}</pre>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 4, color: '#6b7280' }}>
                <SignatureBlock label="FTA Designee" name={tr.designeeSigName} sig={tr.designeeSig} />
                <SignatureBlock label="Student" name={tr.studentSigName} sig={tr.studentSig} />
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}

function SignatureBlock({ label, name, sig }) {
  return (
    <div>
      <strong>{label}:</strong>{' '}
      {name || <span style={{ color: '#9ca3af' }}>(no printed name)</span>}
      <div style={{ marginTop: 4 }}>
        {sig
          ? <img src={sig} alt={`${label} signature`} style={{ maxWidth: '100%', height: 50, border: '1px solid #e5e7eb', borderRadius: 4, background: '#fff' }} />
          : <span style={{ color: '#dc2626', fontStyle: 'italic' }}>— unsigned —</span>}
      </div>
    </div>
  )
}
