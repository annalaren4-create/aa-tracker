import { useState } from 'react'
import { AIRCRAFT_LIST, AIRCRAFT_RATES } from '../../data/constants'
import { eqName } from '../../utils/storage'

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
export default function LogFlightModal({ lesson, siblingLesson, siblingAlreadyCombined = false, existing = {}, instructors, libRepeatUsedElsewhere = false, isRepeatAttempt = false, isLastRepeat = false, defaultInstructor, defaultAircraft, onSave, onClear, onClose }) {
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

  // Determine lesson mode for the flight-time input
  const isMixed = tDual > 0 && tSolo > 0           // both dual & solo (rare — e.g. Private 5.2/5.3)
  const isSimOnly = tSim > 0 && tDual === 0 && tSolo === 0

  // Pre-fill the flight inputs from any existing log
  const existingFlight = (existing.dual || 0) + (existing.solo || 0) + (existing.sim || 0)

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
    flight:      existingFlight > 0 && !isMixed ? existingFlight.toString() : '',
    dualHrs:     isMixed && existing.dual ? existing.dual.toString() : '',
    soloHrs:     isMixed && existing.solo ? existing.solo.toString() : '',
    ground:      existing.ground      || '',
    completed:   existing.completed   || false,
    repeatedLib: existing.repeatedLib || false,
    repeatedOop: existing.repeatedOop || false,
    incomplete:  existing.incomplete  || false,
    paidOop:     existing.paidOop     || false,
    notes:       existing.notes       || '',
  })
  // If the prefilled instructor name doesn't match any roster entry (e.g. the
  // logged-in user registered as a name that isn't on the instructor list yet),
  // start in custom-text mode with their name already typed instead of showing
  // an empty "— select instructor —" dropdown.
  const matchesRoster = instructors.some((i) => eqName(i.name, rawInitialInstructor))
  const [customInstr, setCustomInstr] = useState(!!rawInitialInstructor && !matchesRoster)
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

    const flight = parseFloat(form.flight) || 0
    const ground = parseFloat(form.ground) || 0

    // Allocate flight time into the lesson's billing buckets.
    let dual = 0, solo = 0, sim = 0
    if (isMixed) {
      // Mixed lessons collect Dual and Solo as separate inputs so we record
      // what actually happened rather than guessing a proportional split.
      dual = parseFloat(form.dualHrs) || 0
      solo = parseFloat(form.soloHrs) || 0
    } else if (isSimOnly) {
      sim = flight
    } else if (tDual > 0) {
      dual = flight
    } else if (tSolo > 0) {
      solo = flight
    } else {
      // Lesson has no flight target (e.g. ground-only) — default to dual to preserve old behavior
      dual = flight
    }

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
                    <select
                      value={form.instructor}
                      onChange={(e) => set('instructor', e.target.value)}
                      style={{ flex: 1, textAlign: 'center', textAlignLast: 'center' }}
                    >
                      <option value="">— select instructor —</option>
                      {instructors.map((i) => (
                        <option key={i.name} value={i.name}>{i.name}</option>
                      ))}
                    </select>
                    <button className="btn btn-sm" onClick={() => { setCustomInstr(true); set('instructor', '') }}>✏</button>
                  </div>
                )}
              </div>
            </div>

            {/* Actual hours flown — split into Dual + Solo for mixed lessons so
                the logbook & billing math get accurate per-bucket hours. */}
            {isMixed ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label>Dual time</label>
                  <input
                    type="number" step="0.1" min="0"
                    value={form.dualHrs}
                    onChange={(e) => set('dualHrs', e.target.value)}
                    placeholder={`e.g. ${tDual.toFixed(1)}`}
                  />
                </div>
                <div>
                  <label>Solo time</label>
                  <input
                    type="number" step="0.1" min="0"
                    value={form.soloHrs}
                    onChange={(e) => set('soloHrs', e.target.value)}
                    placeholder={`e.g. ${tSolo.toFixed(1)}`}
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
            ) : (
              <div className="grid2">
                <div>
                  <label>{isSimOnly ? 'Sim time' : tSolo > 0 ? 'Solo flight time' : 'Flight time'}</label>
                  <input
                    type="number" step="0.1" min="0"
                    value={form.flight}
                    onChange={(e) => set('flight', e.target.value)}
                    placeholder={tTotal > 0 ? `e.g. ${tTotal.toFixed(1)}` : 'e.g. 0.0'}
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
              </div>
            )}

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
                      ['completed',   'Completed ✓'],
                      ['repeatedOop', 'Unsuccessful'],
                      ['incomplete',  'Incomplete'],
                    ]
                  }
                  return [['completed', 'Completed ✓'], ['incomplete', 'Incomplete']]
                }
                const opts = [
                  ['completed',   'Completed ✓', false],
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
              })().map(([k, label, disabled = false]) => (
                <label
                  key={k}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: 13, opacity: disabled ? 0.45 : 1,
                  }}
                  title={
                    disabled && (k === 'repeatedLib' || k === 'repeatedOop')
                      ? ((parseFloat(form.flight) || 0) === 0 &&
                         (parseFloat(form.dualHrs) || 0) === 0 &&
                         (parseFloat(form.soloHrs) || 0) === 0 &&
                         !existing.completed && !existing.dual && !existing.solo && !existing.sim && !existing.ground)
                        ? 'Enter flight time first — Repeat is only available after an attempt is recorded'
                        : k === 'repeatedLib'
                          ? (lesson.sc || lesson.fsc || lesson.pc)
                            ? 'Stage check / progress check repeats must be Out of Pocket'
                            : 'Liberty funds only one repeat per course — this must be OOP'
                          : undefined
                      : undefined
                  }
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
                </label>
              ))}
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
            {!isRepeatAttempt && (lesson.sc || lesson.fsc || lesson.pc || libRepeatUsedElsewhere) && (
              <div style={{ fontSize: 11, color: '#7f1d1d', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '6px 8px' }}>
                {(lesson.sc || lesson.fsc || lesson.pc)
                  ? `${lesson.fsc ? 'Final stage check' : lesson.sc ? 'Stage check' : 'Progress check'}: any repeat must be Out of Pocket and a Training Review is required.`
                  : 'A Liberty-funded repeat is already used on another lesson — any further repeats must be Out of Pocket.'}
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
              onClick={() => {
                if (!hasExisting || confirm(`Remove this repeat attempt for lesson ${lesson.id}?`)) {
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
                onClick={() => {
                  if (confirm(`Clear all logged hours for lesson ${lesson.id}? The lesson will reset to "pending".`)) {
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
