import { useState } from 'react'
import { AIRCRAFT_LIST, AIRCRAFT_RATES } from '../../data/constants'
import { eqName } from '../../utils/storage'
import { useToast } from '../Toast'

/**
 * Simplified flight log:
 * - Shows the lesson's REQUIRED hours at the top (read-only reference for the instructor)
 * - Instructor enters just the actual flight time + ground time
 * - Flight time is auto-allocated to dual/solo/sim based on the lesson's mix:
 *     • lesson has only `d`  →  flight time logged as dual
 *     • lesson has only `s`  →  flight time logged as solo
 *     • lesson has only `sm` →  flight time logged as sim
 *     • mixed dual+solo lesson → split proportionally to the targets
 * - XC / Hood / Night are tracked as REQUIREMENTS (shown above) but not entered
 *   per-lesson; they're considered met by completing the lesson per the syllabus.
 */
export default function LogFlightModal({ lesson, siblingLesson, siblingAlreadyCombined = false, existing = {}, instructors, libRepeatUsedElsewhere = false, isRepeatAttempt = false, isLastRepeat = false, defaultInstructor, defaultAircraft, showTrAction = false, trDone = false, onOpenTR, onSave, onClear, onClose }) {
  const toast = useToast()
  const hasExisting = existing && Object.keys(existing).length > 0

  // Targets from the lesson definition. When the user opts to combine with a
  // sibling lesson (e.g. Private 2 8.1 + 8.2), we add the sibling's targets
  // on top so the placeholder & requirements box show ~3.0 hrs instead of ~1.0.
  const [combineChecked, setCombineChecked] = useState(!!siblingAlreadyCombined)
  const [splitChecked, setSplitChecked] = useState(false)
  const sib = combineChecked && siblingLesson ? siblingLesson : null
  const tDual   = (lesson.d  || 0) + (sib?.d  || 0)
  const tSolo   = (lesson.s  || 0) + (sib?.s  || 0)
  const tSim    = (lesson.sm || 0) + (sib?.sm || 0)
  const tXC     = (lesson.x  || 0) + (sib?.x  || 0)
  const tHood   = (lesson.i  || 0) + (sib?.i  || 0)
  const tNight  = (lesson.n  || 0) + (sib?.n  || 0)
  const tGround = (lesson.g  || 0) + (sib?.g  || 0)
  const tTotal  = (lesson.t  || (tDual + tSolo + tSim)) + (sib ? (sib.t || ((sib.d||0)+(sib.s||0)+(sib.sm||0))) : 0)

  // Sim-only lessons render slightly differently (different labels, sim-side
  // billing) — the form itself always collects Dual + Solo + Ground now.
  const isSimOnly = tSim > 0 && tDual === 0 && tSolo === 0

  // If the prefilled instructor matches a roster entry under a different
  // casing/spacing (e.g. logged-in as "anna herrington" but roster says "Anna
  // Herrington"), snap to the canonical roster spelling so the <select>
  // actually highlights the matching <option> instead of falling back to the
  // "— select instructor —" placeholder.
  const rawInitialInstructor = existing.instructor || defaultInstructor || ''
  const canonicalInstructor = rawInitialInstructor
    ? (instructors.find((i) => eqName(i.name, rawInitialInstructor))?.name || rawInitialInstructor)
    : ''

  const [form, setForm] = useState({
    date:        existing.date        || new Date().toISOString().slice(0, 10),
    instructor:  canonicalInstructor,
    // Sim-only lessons (Redbird-only — no dual/solo flight time) ALWAYS open
    // with Redbird FMX, even when re-opening an older log that was previously
    // saved with the student's default airplane — instructors have to actively
    // pick LD/SD (or any other device) to override. Non-sim lessons fall back
    // to the existing saved aircraft, then the student's default.
    aircraft:    isSimOnly ? 'Redbird FMX' : (existing.aircraft || defaultAircraft || ''),
    // For mixed (dual + solo) lessons we collect Dual and Solo separately so the
    // instructor records what actually happened, not a proportional split.
    // EVERY lesson collects Dual + Solo separately now. When editing an
    // older sim log that has lg.sim (legacy field), migrate those hours
    // into the right bucket so they aren't lost on save: into Solo when
    // the lesson is flagged simInstrFree (instructor wasn't being billed),
    // otherwise into Dual (instructor was). The user can adjust either.
    flight:      '',
    dualHrs:     existing.dual
                   ? existing.dual.toString()
                   : (isSimOnly && !lesson.simInstrFree && existing.sim ? existing.sim.toString() : ''),
    soloHrs:     existing.solo
                   ? existing.solo.toString()
                   : (isSimOnly && lesson.simInstrFree && existing.sim ? existing.sim.toString() : ''),
    ground:      existing.ground      || '',
    completed:   existing.completed   || false,
    repeatedLib: existing.repeatedLib || false,
    repeatedOop: existing.repeatedOop || false,
    incomplete:  existing.incomplete  || false,
    paidOop:     existing.paidOop     || false,
    notes:       existing.notes       || '',
  })
  const [repeatAgainChecked, setRepeatAgainChecked] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const hasInstructors = instructors.length > 0

  const save = () => {
    // Status guard only applies to FRESH logs (no existing data). Once a
    // log exists — even if it spawned an OOP repeat underneath — the
    // instructor should be able to update small fields (date, hours)
    // without being forced to re-pick Completed / Incomplete every time.
    if (!hasExisting) {
      const hasStatus = !!(
        form.completed || form.incomplete ||
        form.repeatedLib || form.repeatedOop ||
        (splitChecked && lesson.splittable) ||
        repeatAgainChecked
      )
      if (!hasStatus) {
        setSaveErr('Pick a status (Completed, Incomplete, Repeat, Unsuccessful, or Split) before saving.')
        return
      }
    }
    setSaveErr('')

    const ground = parseFloat(form.ground) || 0

    // Every lesson (plane or sim) collects Dual and Solo as separate
    // inputs so we record what actually happened — even when the syllabus
    // expected one or the other. Dual = instructor billed; Solo = not
    // billed. lg.sim is no longer written for new entries; legacy logs
    // that haven't been edited keep their lg.sim and bill as before.
    const dual = parseFloat(form.dualHrs) || 0
    const solo = parseFloat(form.soloHrs) || 0
    const sim = 0

    // XC / Hood / Night targets carry over as the logged value (they're met by definition
    // when the lesson is flown, since they're sub-categories of the flight time).
    // XC / Sim / Hood / Night are syllabus targets (shown read-only). We don't
    // copy them into the log as concrete logged values — only Actual Flight Time
    // (allocated to dual/solo/sim above) and Ground time are tracked per-attempt.
    // When Split is checked, the session is by definition not finished — auto-
    // mark Incomplete (overriding any conflicting status) and clear Completed.
    // The Incomplete flag triggers the visual "incomplete" pill; the separate
    // _splitContinuing flag drives the __sN continuation row (NOT a __r repeat).
    const isSplit = splitChecked && lesson.splittable
    onSave({
      ...form,
      // Don't persist an empty aircraft string — leave it undefined so the
      // calc layer falls back to the student's default aircraft cleanly.
      aircraft: form.aircraft || undefined,
      dual, solo, sim, ground,
      xc: 0, hood: 0, night: 0,
      completed:  isSplit ? false : form.completed,
      incomplete: isSplit ? true  : form.incomplete,
      _repeatAgain: repeatAgainChecked,
      _combineWith: combineChecked && lesson.combinableWith ? lesson.combinableWith : undefined,
      // Explicitly signal "uncombine" so StudentDetail can clear the sibling's
      // combinedFrom flag when the box was unchecked.
      _uncombineSibling: !combineChecked && siblingAlreadyCombined && lesson.combinableWith ? lesson.combinableWith : undefined,
      _splitContinuing: isSplit || undefined,
    })
  }

  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 500 }}>
              Log flight — lesson {lesson.id}{isRepeatAttempt ? ' (repeat attempt)' : ''}
            </h2>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {lesson.o}
              {existing.date && (
                <span style={{ marginLeft: 8, color: 'var(--aa-navy)', fontWeight: 500 }}>
                  · {new Date(existing.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'grid', gap: 14 }}>

            {/* Training Review action — only shown when this row is the OOP
                repeat attempt of a trigger lesson. Either prompts to fill
                one out (red) or confirms it's already on file (green). */}
            {showTrAction && (
              trDone ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>
                    ✓ Training Review on file for this lesson
                  </div>
                  {onOpenTR && (
                    <button type="button" className="btn btn-sm" onClick={onOpenTR}>
                      View / Update TR
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontSize: 13, color: '#991b1b', fontWeight: 600 }}>
                    ⚠ Out-of-pocket repeat — a Training Review is required
                  </div>
                  {onOpenTR && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={onOpenTR}>
                      Fill out Training Review
                    </button>
                  )}
                </div>
              )
            )}

            {/* Lesson requirements (read-only reference) */}
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#075985', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                {combineChecked && siblingLesson ? `Combined Lesson Requirements (${lesson.id} + ${siblingLesson.id})` : 'Lesson Requirements'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13 }}>
                {tTotal  > 0 && <ReqStat label="Total"  value={tTotal} />}
                {tDual   > 0 && <ReqStat label="Dual"   value={tDual} />}
                {tSolo   > 0 && <ReqStat label="Solo"   value={tSolo} />}
                {tSim    > 0 && <ReqStat label="Sim"    value={tSim} />}
                {tXC     > 0 && <ReqStat label="XC"     value={tXC} />}
                {tHood   > 0 && <ReqStat label="Hood"   value={tHood} />}
                {tNight  > 0 && <ReqStat label="Night"  value={tNight} />}
                {tGround > 0 && <ReqStat label="Ground" value={tGround} />}
              </div>
              {(tXC > 0 || tHood > 0 || tNight > 0) && (
                <div style={{ fontSize: 11, color: '#075985', marginTop: 8, fontStyle: 'italic' }}>
                  XC / Hood / Night are sub-categories of the flight — meeting the lesson plan covers them automatically.
                </div>
              )}
            </div>

            {/* Date + Instructor + Aircraft */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label>Date</label>
                <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
              </div>
              <div>
                <label>Aircraft</label>
                <select value={form.aircraft} onChange={(e) => set('aircraft', e.target.value)}>
                  <option value="">— student default —</option>
                  {AIRCRAFT_LIST.map((a) => (
                    <option key={a} value={a}>{a} — ${AIRCRAFT_RATES[a] || 0}/hr</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Instructor</label>
                {hasInstructors ? (
                  <select
                    value={form.instructor}
                    onChange={(e) => set('instructor', e.target.value)}
                    style={{ width: '100%', textAlign: 'center', textAlignLast: 'center' }}
                  >
                    <option value="">— select instructor —</option>
                    {/* Dedupe by name: instructors at multiple bases appear
                        once (avoids duplicate-key warnings + repeated names). */}
                    {Array.from(new Map(instructors.map((i) => [i.name, i])).values()).map((i) => (
                      <option key={i.name} value={i.name}>{i.name}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', padding: '6px 0' }}>
                    No instructors on the roster yet.
                  </div>
                )}
              </div>
            </div>

            {/* Actual hours flown — EVERY lesson (plane or sim) collects Dual
                and Solo separately. Dual hours = instructor present (billed);
                Solo hours = no instructor (not billed). The lesson type
                determines the aircraft rate (sim = $90/hr, plane = its own
                rate). Slip-ups in either direction get accurate billing. */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label>{isSimOnly ? 'Sim — dual time' : 'Dual time'}</label>
                  <input
                    type="number" step="0.1" min="0"
                    value={form.dualHrs}
                    onChange={(e) => set('dualHrs', e.target.value)}
                    // Show the syllabus target as a hint on whichever field is
                    // this lesson's expected default. Sim lessons hint on Dual
                    // unless flagged simInstrFree (then the default is Solo).
                    placeholder={
                      tDual > 0
                        ? `e.g. ${tDual.toFixed(1)}`
                        : (isSimOnly && !lesson.simInstrFree ? `e.g. ${tSim.toFixed(1)}` : '0.0')
                    }
                    title="Instructor present — billed at the instructor rate"
                  />
                </div>
                <div>
                  <label>{isSimOnly ? 'Sim — solo time' : 'Solo time'}</label>
                  <input
                    type="number" step="0.1" min="0"
                    value={form.soloHrs}
                    onChange={(e) => set('soloHrs', e.target.value)}
                    // Sim lessons flagged simInstrFree are meant to be flown
                    // solo (no instructor), so the hint lands here.
                    placeholder={
                      tSolo > 0
                        ? `e.g. ${tSolo.toFixed(1)}`
                        : (isSimOnly && lesson.simInstrFree ? `e.g. ${tSim.toFixed(1)}` : '0.0')
                    }
                    title="No instructor present — not billed for instructor time"
                  />
                </div>
                <div>
                  <label>Ground time</label>
                  <input
                    type="number" step="0.1" min="0"
                    value={form.ground}
                    onChange={(e) => set('ground', e.target.value)}
                    placeholder={tGround > 0 ? `e.g. ${tGround.toFixed(1)}` : 'e.g. 0.0'}
                  />
                </div>
                {((parseFloat(form.dualHrs) || 0) + (parseFloat(form.soloHrs) || 0)) > 0 && (
                  <div style={{ gridColumn: '1 / -1', fontSize: 11, color: '#6b7280', marginTop: -4 }}>
                    Total flight time entered:{' '}
                    <strong style={{ color: '#374151' }}>
                      {((parseFloat(form.dualHrs) || 0) + (parseFloat(form.soloHrs) || 0)).toFixed(1)} hr
                    </strong>
                    {tTotal > 0 && ` · target ${tTotal.toFixed(1)} hr`}
                  </div>
                )}
              </div>

            {/* Checkboxes — on a repeat attempt, hide the Lib/OOP boxes and offer
                a "Repeat again" affordance instead so the instructor can chain
                additional repeats without leaving the modal flow. */}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              {(() => {
                // Final Stage Checks get BOTH:
                //   • Unsuccessful → bust, spawns an OOP repeat (repeatedOop)
                //   • Incomplete   → weather/illness/etc., spawns a Liberty
                //                    continuation (incomplete)
                // Regular stage / progress checks and other lessons just show
                // "Incomplete" — same Liberty continuation behavior.
                const isFinalStageCheck = !!lesson.fsc
                if (isRepeatAttempt) {
                  if (isFinalStageCheck) {
                    return [
                      ['completed',   'Completed'],
                      ['repeatedOop', 'Unsuccessful'],
                      ['incomplete',  'Incomplete'],
                    ]
                  }
                  return [['completed', 'Completed'], ['incomplete', 'Incomplete']]
                }
                const opts = [
                  ['completed',   'Completed', false],
                  ['repeatedLib', 'Repeat (Lib)',
                    lesson.sc || lesson.fsc || lesson.pc || libRepeatUsedElsewhere],
                ]
                if (isFinalStageCheck) {
                  opts.push(['repeatedOop', 'Unsuccessful', false])
                  opts.push(['incomplete',  'Incomplete',   false])
                } else {
                  opts.push(['repeatedOop', 'Repeat (OOP)', false])
                  opts.push(['incomplete',  'Incomplete',   false])
                }
                return opts
              })().map(([k, label, disabled = false]) => {
                // Why-disabled message, used by the (i) tooltip on greyed-out
                // status checkboxes (e.g. why "Repeat (Lib)" can't be picked).
                // The "no flight time yet" reason is intentionally omitted —
                // it's self-evident from the empty Flight time field above.
                const reason = disabled && k === 'repeatedLib'
                  ? (lesson.sc || lesson.fsc || lesson.pc)
                    ? 'Stage check / progress check repeats must be Out of Pocket'
                    : 'Liberty funds only one repeat per course — this must be OOP'
                  : ''
                return (
                <label
                  key={k}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: 13, opacity: disabled ? 0.45 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form[k]}
                    disabled={disabled}
                    onChange={(e) => {
                      // Status checkboxes (completed / repeatedLib / repeatedOop /
                      // incomplete) are mutually exclusive — picking one clears the
                      // others so a lesson can't be in two contradictory states.
                      // Also clears "Repeat again" on a repeat-attempt modal since
                      // those two are conceptually opposite outcomes.
                      const STATUS = ['completed', 'repeatedLib', 'repeatedOop', 'incomplete']
                      if (e.target.checked) {
                        setForm((f) => {
                          const next = { ...f }
                          STATUS.forEach((s) => { next[s] = false })
                          next[k] = true
                          return next
                        })
                        if (isRepeatAttempt) setRepeatAgainChecked(false)
                      } else {
                        set(k, false)
                      }
                    }}
                    style={{ width: 'auto' }}
                  />
                  {label}
                  {reason && <DisabledReasonHint reason={reason} />}
                </label>
                )
              })}
              {/* On a Final Stage Check repeat, the Unsuccessful checkbox
                  already spawns the next __rN OOP repeat row, so showing a
                  separate "Repeat again" toggle would be redundant. */}
              {isRepeatAttempt && isLastRepeat && !lesson.fsc && (
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}
                  title="When checked, a new repeat row is added after you press Save"
                >
                  <input
                    type="checkbox"
                    checked={repeatAgainChecked}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setRepeatAgainChecked(checked)
                      // "Repeat again" only spawns the next __rN row — it
                      // doesn't conflict with Completed/Incomplete on the
                      // current attempt, so we leave any chosen status alone.
                    }}
                    style={{ width: 'auto' }}
                  />
                  Repeat again
                </label>
              )}
            </div>
            {!isRepeatAttempt && (lesson.sc || lesson.fsc || lesson.pc) && (
              <div style={{ fontSize: 11, color: '#7f1d1d', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '6px 8px' }}>
                {lesson.fsc ? 'Final stage check' : lesson.sc ? 'Stage check' : 'Progress check'}: any repeat must be Out of Pocket and a Training Review is required.
              </div>
            )}

            {/* "Combine with sibling lesson" — for lesson pairs that can be
                flown together as a single flight (e.g. Private 2 8.1 + 8.2). */}
            {lesson.combinableWith && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#075985', borderTop: '1px dashed #e5e7eb', paddingTop: 10 }}>
                <input
                  type="checkbox"
                  checked={combineChecked}
                  onChange={(e) => setCombineChecked(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                Combined with lesson {lesson.combinableWith}
                <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>
                  — marks lesson {lesson.combinableWith} complete with this same flight
                </span>
              </label>
            )}

            {/* "Split — finish later" — for long lessons (Commercial 3) where
                the student does some hours one day and finishes the rest on
                another. Spawns a continuation row that bills as Liberty-funded
                (not a repeat). */}
            {lesson.splittable && !isRepeatAttempt && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#075985', borderTop: '1px dashed #e5e7eb', paddingTop: 10 }}>
                <input
                  type="checkbox"
                  checked={splitChecked}
                  onChange={(e) => setSplitChecked(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                Split — finish later
                <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>
                  — saves this partial session and spawns a continuation row
                </span>
              </label>
            )}

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

        {saveErr && (
          <div style={{ padding: '8px 16px', background: '#fef2f2', color: '#b91c1c', fontSize: 12, fontWeight: 600, borderTop: '1px solid #fecaca' }}>
            {saveErr}
          </div>
        )}
        <div className="modal-footer">
          {/* Latest repeat: always offer a "Remove this repeat" button so the
              instructor can cancel an unwanted repeat row even if it has no data
              yet (e.g. one just seeded by clicking Repeat again). Other lessons
              show the standard "Clear lesson" only when they have data. */}
          {isRepeatAttempt && isLastRepeat && onClear ? (
            <button
              className="btn"
              style={{ color: '#dc2626', marginRight: 'auto' }}
              onClick={async () => {
                if (!hasExisting || await toast.confirm(`Remove this repeat attempt for lesson ${lesson.id}?`)) {
                  onClear()
                }
              }}
            >
              Remove this repeat
            </button>
          ) : (
            hasExisting && onClear && (
              <button
                className="btn"
                style={{ color: '#dc2626', marginRight: 'auto' }}
                onClick={async () => {
                  if (await toast.confirm(`Clear all logged hours for lesson ${lesson.id}? The lesson will reset to "pending".`)) {
                    onClear()
                  }
                }}
              >
                Clear lesson
              </button>
            )
          )}
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => save()}>Save flight log</button>
        </div>
      </div>
    </div>
  )
}

function ReqStat({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 50 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#075985', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <span style={{ fontSize: 15, fontWeight: 700, color: '#0c4a6e', lineHeight: 1.1 }}>
        {value.toFixed(1)}
      </span>
    </div>
  )
}

/**
 * Tiny info icon shown next to a disabled status checkbox. Hovering it
 * pops up a styled tooltip explaining why the checkbox cannot be picked
 * (e.g. "Liberty funds only one repeat per course — this must be OOP").
 * The bubble appears immediately (unlike the native browser title delay)
 * and styles consistently with the legend tooltip elsewhere in the app.
 */
function DisabledReasonHint({ reason }) {
  const [show, setShow] = useState(false)
  return (
    <span
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 2, cursor: 'help' }}
      aria-label={reason}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 14, height: 14, borderRadius: '50%',
        background: '#e5e7eb', color: '#6b7280',
        fontSize: 9, fontWeight: 700,
      }}>i</span>
      {show && (
        <span style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%) translateY(-6px)',
          background: '#1f2937', color: '#fff',
          padding: '6px 10px', borderRadius: 6,
          fontSize: 11, fontWeight: 400, lineHeight: 1.4,
          whiteSpace: 'normal', width: 220, textAlign: 'center',
          zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,.18)',
          pointerEvents: 'none',
        }}>
          {reason}
        </span>
      )}
    </span>
  )
}
