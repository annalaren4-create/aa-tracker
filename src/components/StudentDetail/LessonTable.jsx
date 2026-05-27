import { useState } from 'react'
import { repeatKeysFor, splitKeysFor } from '../../utils/calculations'
import { TargetCell, LogCell, TotalCell } from './cells'

const COLS = '58px 44px 44px 44px 44px 44px 52px 56px 84px 56px 1fr 76px 76px 64px'
const fmt = (v) => v > 0 ? `${v.toFixed(1)}` : '—'

/**
 * The big syllabus table on StudentDetail. Renders one row per lesson
 * (plus extra rows for splits and repeats), then a totals row at the
 * bottom. Click a row to open LogFlightModal (instructors only).
 *
 * State that lives here: only the legend tooltip's hover toggle.
 * Everything else — totals, target dates, billing type — is computed
 * by the parent and passed in, so the table stays a pure renderer.
 */
export default function LessonTable({
  student, course, viewCourse, sLogs, progress,
  isInstructor, targetDates, repeatBillingType,
  totFlown, totGround,
  editingDate, setEditingDate,
  onLogFlight, setLogLesson,
}) {
  const [showLegend, setShowLegend] = useState(false)

  return (
    <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
          Course syllabus — {student.course}
          <span
            onMouseEnter={() => setShowLegend(true)}
            onMouseLeave={() => setShowLegend(false)}
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
          >
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 16, height: 16, borderRadius: '50%',
                background: '#e5e7eb', color: '#6b7280',
                fontSize: 10, fontWeight: 700,
              }}
            >
              i
            </span>
            {showLegend && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 6,
                background: '#1f2937', color: '#fff',
                padding: '8px 12px', borderRadius: 6,
                fontSize: 11, fontWeight: 400, lineHeight: 1.5,
                whiteSpace: 'nowrap', zIndex: 50,
                boxShadow: '0 4px 12px rgba(0,0,0,.18)',
              }}>
                <div><strong>Dual · Solo · XC · Instr · Sim · Target</strong> — syllabus targets (read-only)</div>
                <div><strong>Actual · Ground</strong> — entered per attempt</div>
                <div>Over/Under = actual − target  (amber over, green under)</div>
              </div>
            )}
          </span>
        </h2>
        {isInstructor && <span style={{ fontSize: 12, color: '#6b7280' }}>Click a row to log flight time</span>}
      </div>

      {/* Header row */}
      <div style={{
        display: 'grid', gridTemplateColumns: COLS, gap: 4,
        padding: '7px 10px', fontSize: 11, color: '#6b7280', fontWeight: 500,
        borderBottom: '1px solid #e5e7eb', background: '#f8fafc',
        minWidth: 1080,
      }}>
        <span>Lesson</span>
        <span style={{ textAlign: 'center' }}>Dual</span>
        <span style={{ textAlign: 'center' }}>Solo</span>
        <span style={{ textAlign: 'center' }}>XC</span>
        <span style={{ textAlign: 'center' }} title="Hood / instrument time">Instr</span>
        <span style={{ textAlign: 'center' }} title="Simulator hours">Sim</span>
        <span style={{ textAlign: 'center' }} title="Target total flight time for the lesson">Target</span>
        <span style={{ textAlign: 'center' }} title="Actual flight time logged this attempt">Actual</span>
        <span style={{ textAlign: 'center', paddingLeft: 16 }} title="Actual minus target — amber if over, green if under">Over/Under</span>
        <span style={{ textAlign: 'center' }}>Ground</span>
        <span style={{ textAlign: 'center' }}>Objectives</span>
        <span style={{ textAlign: 'center' }} title="Planned completion date — auto-spread between training start and the effective deadline">Target</span>
        <span style={{ textAlign: 'center' }} title="Actual completion date">Actual</span>
        <span style={{ textAlign: 'center' }}>Status</span>
      </div>

      {course.lessons.flatMap((lesson) => {
        // Build an "expanded" list: the original lesson row, plus a row for every
        // repeat-attempt key in storage. Then, if the LATEST entry (original or
        // newest repeat) was marked Repeat (Lib/OOP) or Incomplete, append an
        // empty placeholder row so the instructor has somewhere to log the next
        // attempt without having to dig through menus.
        //
        // Skip lessons that have been absorbed into a sibling combined flight
        // (e.g. 8.2 when 8.1's log was saved with "Combined with 8.2") — the
        // primary lesson's row will render a merged label for both.
        const myLg = sLogs[lesson.id] || {}
        if (myLg.combinedFrom) return []
        const items = [{ key: lesson.id, isRepeat: false }]
        const splitKeys  = splitKeysFor(sLogs, lesson.id)
        const repeatKeys = repeatKeysFor(sLogs, lesson.id)
        splitKeys.forEach((sk)  => items.push({ key: sk, isSplit: true }))
        repeatKeys.forEach((rk) => items.push({ key: rk, isRepeat: true }))

        // Identify the truly LATEST entry across original + splits + repeats
        // by date (falling back to insertion order if dates are missing).
        const allCandidates = [
          { key: lesson.id, lg: myLg },
          ...splitKeys.map((k) => ({ key: k, lg: sLogs[k] || {} })),
          ...repeatKeys.map((k) => ({ key: k, lg: sLogs[k] || {} })),
        ].filter((c) => c.lg && Object.keys(c.lg).length > 0)
        const latest = allCandidates.reduce((best, c) => {
          if (!best) return c
          const bestD = best.lg.date || ''
          const cD = c.lg.date || ''
          return cD >= bestD ? c : best
        }, null)
        const latestLg = latest?.lg || {}

        if (latestLg.repeatedLib || latestLg.repeatedOop) {
          const usedNums = repeatKeys.map((k) => parseInt(k.split('__r')[1], 10) || 0)
          const nextNum  = (usedNums.length ? Math.max(...usedNums) : 0) + 1
          const placeholderKey = `${lesson.id}__r${nextNum}`
          if (!sLogs[placeholderKey]) {
            items.push({ key: placeholderKey, isRepeat: true, pending: true })
          }
        }
        if (latestLg.splitContinuing || latestLg.incomplete) {
          const usedNums = splitKeys.map((k) => parseInt(k.split('__s')[1], 10) || 0)
          const nextNum  = (usedNums.length ? Math.max(...usedNums) : 0) + 1
          const placeholderKey = `${lesson.id}__s${nextNum}`
          if (!sLogs[placeholderKey]) {
            items.push({ key: placeholderKey, isSplit: true, pending: true })
          }
        }
        return items
      }).map(({ key, isRepeat, isSplit, pending }) => {
        // Resolve the underlying lesson definition (strip __rN or __sN suffixes).
        const baseId = key.split('__r')[0].split('__s')[0]
        const lesson = course.lessons.find((l) => l.id === baseId)
        const lg = sLogs[key] || {}
        const lessonDef = lesson  // alias for clarity
        const fscBusted = lessonDef.fsc && lg.repeatedOop
        const status = lg.completed
          ? 'done'
          : fscBusted
            ? 'unsuccessful'
            : lg.incomplete
              ? 'incomplete'
              : Object.keys(lg).length > 0 ? 'partial' : 'pending'
        const repeatNum = isRepeat ? (parseInt(key.split('__r')[1], 10) || 1) : 0
        const repeatIdx = isRepeat ? repeatNum - 1 : 0
        const repeatBadge = isRepeat ? repeatBillingType(lesson, repeatIdx) : null

        const splitsStorage   = splitKeysFor(sLogs, lesson.id)
        const baseOrigLg      = sLogs[lesson.id] || {}
        const lastStoredKey   = splitsStorage[splitsStorage.length - 1]
        const lastStoredLg    = lastStoredKey ? sLogs[lastStoredKey] : null
        const placeholderPending =
          (!lastStoredKey && (baseOrigLg.splitContinuing || baseOrigLg.incomplete)) ||
          (lastStoredKey  && (lastStoredLg?.splitContinuing || lastStoredLg?.incomplete))
        const effectiveSplitKeys = (() => {
          if (!placeholderPending) return splitsStorage
          const nums = splitsStorage.map((k) => parseInt(k.split('__s')[1], 10) || 0)
          const nextN = (nums.length ? Math.max(...nums) : 0) + 1
          return [...splitsStorage, `${lesson.id}__s${nextN}`]
        })()
        const splitChainKeys = [lesson.id, ...effectiveSplitKeys]
        const inSplitChain   = splitChainKeys.length > 1
        const myChainIdx     = inSplitChain ? splitChainKeys.indexOf(key) : -1
        let splitDisplayTarget = null
        if (inSplitChain && myChainIdx >= 0) {
          const myActual = (lg.dual || 0) + (lg.solo || 0) + (lg.sim || 0)
          if (myChainIdx === 0) {
            splitDisplayTarget = myActual
          } else {
            const priorActual = splitChainKeys.slice(0, myChainIdx).reduce((s, k) => {
              const pl = sLogs[k] || {}
              return s + (pl.dual || 0) + (pl.solo || 0) + (pl.sim || 0)
            }, 0)
            splitDisplayTarget = Math.max(0, (lesson.t || 0) - priorActual)
          }
        }

        const combinedFrom = lg.combinedFrom
        const isCombinedChild = !!combinedFrom
        const siblingId = !isRepeat && lesson.combinableWith
        const siblingLg  = siblingId ? sLogs[siblingId] : null
        const siblingDef = siblingId ? course.lessons.find((l) => l.id === siblingId) : null
        const isCombinedPrimary = !!(siblingLg?.combinedFrom === lesson.id && siblingDef)
        const showLesson = isCombinedPrimary
          ? {
              ...lesson,
              id: `${lesson.id} + ${siblingDef.id}`,
              d:  (lesson.d  || 0) + (siblingDef.d  || 0),
              s:  (lesson.s  || 0) + (siblingDef.s  || 0),
              x:  (lesson.x  || 0) + (siblingDef.x  || 0),
              i:  (lesson.i  || 0) + (siblingDef.i  || 0),
              sm: (lesson.sm || 0) + (siblingDef.sm || 0),
              t:  (lesson.t  || 0) + (siblingDef.t  || 0),
              g:  (lesson.g  || 0) + (siblingDef.g  || 0),
            }
          : lesson
        const openLog = () => {
          if (!isInstructor) return
          if (isCombinedChild) {
            const primaryLesson = course.lessons.find((l) => l.id === combinedFrom)
            if (primaryLesson) setLogLesson({ lesson: primaryLesson, key: combinedFrom })
          } else {
            setLogLesson({ lesson, key })
          }
        }
        return (
          <div
            key={key}
            style={{
              display: 'grid', gridTemplateColumns: COLS, gap: 4,
              alignItems: 'center', padding: '6px 10px',
              borderBottom: '1px solid #f3f4f6', fontSize: 12, cursor: 'pointer',
              background: isCombinedChild
                ? 'rgba(7,89,133,.05)'
                : isSplit
                  ? 'rgba(2,132,199,.04)'
                  : isRepeat
                    ? 'rgba(220,38,38,.04)'
                    : lesson.fsc ? 'rgba(185,28,28,.12)'
                    : lesson.sc  ? 'rgba(26,58,92,.05)'
                    : lesson.pc  ? 'rgba(245,158,11,.04)'
                    : '',
              borderLeft: isCombinedChild
                ? '3px solid #0284c7'
                : isSplit
                  ? '3px solid #0284c7'
                  : isRepeat
                    ? '3px solid #dc2626'
                    : lesson.fsc
                      ? '4px solid #b91c1c'
                      : undefined,
              opacity: isCombinedChild ? 0.85 : 1,
              minWidth: 1080,
            }}
            title={isCombinedChild ? `Logged as combined flight with lesson ${combinedFrom} — click to edit there` : undefined}
            onClick={openLog}
          >
            <div>
              <span style={{ fontWeight: 500 }}>
                {isRepeat
                  ? <span style={{ color: '#dc2626' }}>↻ {lesson.id}</span>
                  : isSplit
                    ? <span style={{ color: '#0284c7' }}>→ {lesson.id}</span>
                    : isCombinedPrimary ? showLesson.id : lesson.id}
              </span>
              {isSplit && (
                <div className="tag tag-blue" style={{ marginTop: 2, fontSize: 10 }}>
                  split {parseInt(key.split('__s')[1], 10) || ''}{pending ? ' — log' : ''}
                </div>
              )}
              {isCombinedPrimary && (
                <div className="tag tag-blue" style={{ marginTop: 2, fontSize: 10 }}>
                  combined
                </div>
              )}
              {isCombinedChild && (
                <div className="tag tag-blue" style={{ marginTop: 2, fontSize: 10 }}>
                  ↔ with {combinedFrom}
                </div>
              )}
              {isRepeat && repeatBadge && (
                <div className={`tag ${repeatBadge === 'Lib' ? 'tag-blue' : 'tag-amber'}`} style={{ marginTop: 2, fontSize: 10 }}>
                  repeat ({repeatBadge}){pending ? ' — log' : ''}
                </div>
              )}
              {!isRepeat && (lesson.sc || lesson.pc) && (
                <div
                  className={`tag ${lesson.fsc ? '' : lesson.sc ? 'tag-blue' : 'tag-amber'}`}
                  style={{
                    marginTop: 2, fontSize: 10,
                    ...(lesson.fsc ? { background: '#b91c1c', color: '#fff', fontWeight: 700 } : null),
                  }}
                >
                  {lesson.fsc ? 'FINAL' : lesson.sc ? 'stage' : 'prog'}
                </div>
              )}
            </div>

            {/* Syllabus targets */}
            {(() => {
              const isLibRepeat = isRepeat && repeatBadge === 'Lib'
              const repeatDual  = course.repeatBufferDual ?? 2.0
              const dualTgt = isSplit ? 0 : isLibRepeat ? repeatDual : (showLesson.d || showLesson.sm)
              const soloTgt = isSplit ? 0 : isLibRepeat ? 0 : showLesson.s
              const xcTgt   = isSplit ? 0 : isLibRepeat ? 0 : showLesson.x
              const iTgt    = isSplit ? 0 : isLibRepeat ? 0 : showLesson.i
              const smTgt   = isSplit ? 0 : isLibRepeat ? 0 : showLesson.sm
              const totTgt  = splitDisplayTarget !== null
                ? splitDisplayTarget
                : isLibRepeat ? repeatDual : (showLesson.t)
              return (
                <>
                  <TargetCell value={dualTgt} />
                  <TargetCell value={soloTgt} />
                  <TargetCell value={xcTgt} />
                  <TargetCell value={iTgt} />
                  <TargetCell value={smTgt} />
                  <TargetCell value={totTgt} bold />
                </>
              )
            })()}

            {/* Actual + over/under */}
            {(() => {
              const isLibRepeat = isRepeat && repeatBadge === 'Lib'
              const repeatDual  = course.repeatBufferDual ?? 2.0
              const actualFlt = (lg.dual || 0) + (lg.solo || 0) + (lg.sim || 0)
              const target    = splitDisplayTarget !== null
                ? splitDisplayTarget
                : isLibRepeat ? repeatDual : (showLesson.t || 0)
              const diff      = actualFlt - target
              const showDiff  = actualFlt > 0 && target > 0
              return (
                <>
                  <div style={{ textAlign: 'center', fontWeight: 500 }}>
                    {actualFlt > 0 ? actualFlt.toFixed(1) : '—'}
                  </div>
                  <div style={{
                    textAlign: 'center', paddingLeft: 16, fontSize: 11, fontWeight: 600,
                    color: !showDiff ? '#d1d5db' : diff > 0 ? '#b45309' : diff < 0 ? '#15803d' : '#6b7280',
                  }}>
                    {showDiff ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}` : '—'}
                  </div>
                </>
              )
            })()}

            {/* Ground */}
            <LogCell logged={lg.ground} rec={(isRepeat && repeatBadge === 'Lib') ? 0.7 : showLesson.g} />

            <span style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.35, wordBreak: 'break-word', whiteSpace: 'normal' }}>
              {isCombinedPrimary ? `${lesson.o} · ${siblingDef.o}` : lesson.o}
            </span>

            {/* Target date */}
            {(() => {
              const baseIdInner = key.split('__r')[0].split('__s')[0]
              const target = targetDates[baseIdInner]
              if (!target) {
                return <span style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db' }}>—</span>
              }
              const shortTarget = new Date(target + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
              let color = '#6b7280'
              if (lg.date) {
                color = lg.date <= target ? '#15803d' : '#b45309'
              }
              return (
                <span style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color }} title={`Target: ${target}`}>
                  {shortTarget}
                </span>
              )
            })()}

            {/* Actual date (inline editable) */}
            <span
              style={{ textAlign: 'center', fontSize: 11, color: '#6b7280', cursor: isInstructor && Object.keys(lg).length > 0 ? 'pointer' : 'default' }}
              onClick={(e) => {
                if (isInstructor && Object.keys(lg).length > 0) {
                  e.stopPropagation()
                  setEditingDate(key)
                }
              }}
            >
              {editingDate === key ? (
                <input
                  type="date"
                  defaultValue={lg.date || new Date().toISOString().slice(0, 10)}
                  autoFocus
                  style={{ fontSize: 11, padding: '2px 4px', border: '1px solid #1a3a5c', borderRadius: 4, width: '100%' }}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => { onLogFlight(student.id, viewCourse, key, { ...lg, date: e.target.value }); setEditingDate(null) }}
                />
              ) : (
                <span>
                  {lg.date
                    ? new Date(lg.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
                    : '—'}
                  {isInstructor && Object.keys(lg).length > 0 && (
                    <span style={{ marginLeft: 3, color: '#9ca3af', fontSize: 11, fontWeight: 700 }}>▾</span>
                  )}
                </span>
              )}
            </span>

            {/* Status pill */}
            <span style={{ textAlign: 'center' }}>
              {status === 'done'         && <span className="tag tag-green">done</span>}
              {status === 'partial'      && <span className="tag tag-amber">in prog</span>}
              {status === 'incomplete'   && <span className="tag tag-amber">incomplete</span>}
              {status === 'unsuccessful' && <span className="tag tag-red">unsuccessful</span>}
              {status === 'pending'      && (
                <span
                  className="tag"
                  style={{
                    background: '#fff', color: '#6b7280',
                    border: '1px solid #d1d5db', fontWeight: 600,
                  }}
                >
                  pending
                </span>
              )}
            </span>
          </div>
        )
      })}

      {/* Totals row */}
      {(() => {
        const targetDual = course.lessons.reduce((s,l) => s + (l.d  || l.sm || 0), 0)
        const targetSolo = course.lessons.reduce((s,l) => s + (l.s  || 0), 0)
        const targetXC   = course.lessons.reduce((s,l) => s + (l.x  || 0), 0)
        const targetInst = course.lessons.reduce((s,l) => s + (l.i  || 0), 0)
        const targetSim  = course.lessons.reduce((s,l) => s + (l.sm || 0), 0)
        const targetGnd  = course.lessons.reduce((s,l) => s + (l.g  || 0), 0)
        let overUnderTot = 0
        let anyDiff = false
        const hours = (lg) => (lg?.dual || 0) + (lg?.solo || 0) + (lg?.sim || 0)
        course.lessons.forEach((lesson) => {
          const origLg = sLogs[lesson.id]
          if (origLg?.combinedFrom) return
          let chainActual = hours(origLg)
          splitKeysFor(sLogs, lesson.id).forEach((sk) => { chainActual += hours(sLogs[sk]) })
          let target = lesson.t || 0
          if (lesson.combinableWith) {
            const sibLg = sLogs[lesson.combinableWith]
            if (sibLg?.combinedFrom === lesson.id) {
              const sibDef = course.lessons.find((l) => l.id === lesson.combinableWith)
              if (sibDef) target += (sibDef.t || 0)
            }
          }
          if (chainActual > 0 && target > 0) {
            overUnderTot += (chainActual - target)
            anyDiff = true
          }
          repeatKeysFor(sLogs, lesson.id).forEach((rk) => {
            const r = hours(sLogs[rk])
            if (r > 0 && (lesson.t || 0) > 0) {
              overUnderTot += (r - (lesson.t || 0))
              anyDiff = true
            }
          })
        })
        return (
          <div style={{
            display: 'grid', gridTemplateColumns: COLS, gap: 4,
            padding: '8px 10px', background: '#f8fafc',
            fontSize: 12, fontWeight: 600, borderTop: '2px solid #e5e7eb',
            minWidth: 1080,
          }}>
            <span>Totals</span>
            <span style={{ textAlign: 'center' }}>{fmt(targetDual)}</span>
            <span style={{ textAlign: 'center' }}>{fmt(targetSolo)}</span>
            <span style={{ textAlign: 'center' }}>{fmt(targetXC)}</span>
            <span style={{ textAlign: 'center' }}>{fmt(targetInst)}</span>
            <span style={{ textAlign: 'center' }}>{fmt(targetSim)}</span>
            <span style={{ textAlign: 'center' }}>{parseFloat(course.targetTotal).toFixed(1)}</span>
            <span style={{ textAlign: 'center' }}>{fmt(totFlown)}</span>
            <span style={{
              textAlign: 'center', paddingLeft: 16,
              color: overUnderTot > 0 ? '#b45309' : overUnderTot < 0 ? '#15803d' : '#6b7280',
            }}>
              {anyDiff ? `${overUnderTot > 0 ? '+' : ''}${overUnderTot.toFixed(1)}` : '—'}
            </span>
            <TotalCell logged={totGround} rec={targetGnd} />
            <span />
            <span />
            <span />
            <span style={{ textAlign: 'center' }}>{progress.completed}/{progress.total}</span>
          </div>
        )
      })()}
    </div>
  )
}
