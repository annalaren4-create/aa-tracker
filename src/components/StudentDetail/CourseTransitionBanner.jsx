import { useState } from 'react'
import { NEXT_COURSE_OPTIONS } from '../../data/courses'
import { LU_TERMS } from '../../data/constants'
import { flightDeadline, predictNextPace, selectableTerms, todayIso } from '../../utils/terms'

/**
 * Green "course complete" banner that appears under the student header
 * once progress hits 100%. Lets a chief/instructor (or self-serve student
 * in the future) move the student into their next course with a chosen
 * pace (semester + A/D + accelerated flag).
 *
 * All choice state is local — the parent only hears about the final
 * decision through `onMoveToNextCourse({ course, pace, accelerated })`.
 */
export default function CourseTransitionBanner({ student, onMoveToNextCourse }) {
  const [nextCourseChoice,      setNextCourseChoice]      = useState('')
  const [nextSemesterChoice,    setNextSemesterChoice]    = useState('')
  const [nextTermChoice,        setNextTermChoice]        = useState('')
  const [nextAcceleratedChoice, setNextAcceleratedChoice] = useState(null) // null = use predicted

  const options = NEXT_COURSE_OPTIONS[student.course] || []
  const completedSet = new Set((student.courseHistory || []).map((h) => h.course))
  const availableOptions = options.filter((c) => !completedSet.has(c))
  if (availableOptions.length === 0) return null

  const nextCourse = nextCourseChoice || availableOptions[0]
  const predicted = predictNextPace(student)        // null if no upcoming term in LU_TERMS

  // Upcoming semesters the student could enroll in. Pulled from
  // selectableTerms() so the "current + next year" visibility
  // filter is applied consistently — far-future semesters stay hidden.
  const upcomingSemesters = [...new Set(
    selectableTerms()
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((t) => t.semester)
  )]
  // Belt + suspenders: the prediction is already filtered to
  // selectableTerms() inside predictNextPace, but verify the predicted
  // semester is in the visible list before defaulting to it.
  const predictedSemesterVisible = predicted?.pace.semester && upcomingSemesters.includes(predicted.pace.semester)
  const chosenSemester = nextSemesterChoice
    || (predictedSemesterVisible ? predicted.pace.semester : null)
    || upcomingSemesters[0]
    || ''
  const semesterTerms = chosenSemester
    ? LU_TERMS.filter((t) => t.semester === chosenSemester && (t.subterm === 'A' || t.subterm === 'D'))
    : []
  const defaultSubterm = predicted?.pace.subterm || (semesterTerms[0]?.subterm ?? 'A')
  // If the user switched the semester away from the predicted one,
  // ignore the predicted subterm and just default to A.
  const baseSubterm = chosenSemester === predicted?.pace.semester ? defaultSubterm : 'A'
  const chosenSubterm = nextTermChoice || baseSubterm
  const chosenAccelerated = nextAcceleratedChoice ?? (predicted?.accelerated ?? false)

  const wasAccelerated = student.pace?.subterm === 'A' && student.accelerated
  const acceleratedDeadline = wasAccelerated ? flightDeadline(student.pace, true) : null
  const finishedOnTime = wasAccelerated
    ? (!acceleratedDeadline || todayIso() <= acceleratedDeadline)
    : null

  const handleMove = () => {
    const nextPace = chosenSemester
      ? { semester: chosenSemester, subterm: chosenSubterm }
      : null
    // D term is inherently accelerated; no flag stored for D.
    const isAcc = chosenSubterm === 'A' && !!chosenAccelerated
    onMoveToNextCourse({ course: nextCourse, pace: nextPace, accelerated: isAcc })
    setNextCourseChoice('')
    setNextSemesterChoice('')
    setNextTermChoice('')
    setNextAcceleratedChoice(null)
  }

  return (
    <div
      className="no-print"
      style={{
        marginBottom: 16, padding: '12px 16px', borderRadius: 8,
        background: '#f0fdf4', border: '1px solid #bbf7d0',
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>
          ✓ {student.course} complete
        </div>
        <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>
          Pick where {student.name.split(' ')[0]} goes next:
        </div>
        {wasAccelerated && finishedOnTime === false && (
          <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>
            Missed the {acceleratedDeadline} accelerated buffer — defaulting away from same-semester D.
          </div>
        )}
      </div>

      {/* Course picker */}
      <select
        value={nextCourse}
        onChange={(e) => setNextCourseChoice(e.target.value)}
        style={pickerStyle}
      >
        {availableOptions.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {/* Semester picker — every upcoming semester on the Liberty
          calendar is selectable so students can push out a course if
          they need extra time. */}
      {upcomingSemesters.length === 0 && (
        <div style={{ fontSize: 11, color: '#b45309', fontStyle: 'italic' }}>
          No upcoming semesters on the calendar — extend LU_TERMS in src/data/constants.js.
        </div>
      )}
      {upcomingSemesters.length > 0 && (
        <select
          value={chosenSemester}
          onChange={(e) => {
            setNextSemesterChoice(e.target.value)
            setNextTermChoice('')   // reset term + accel when semester changes
            setNextAcceleratedChoice(null)
          }}
          style={pickerStyle}
          title="Semester"
        >
          {upcomingSemesters.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}

      {/* Term picker — A or D within the chosen semester. */}
      {semesterTerms.length > 0 && (
        <select
          value={chosenSubterm}
          onChange={(e) => setNextTermChoice(e.target.value)}
          style={pickerStyle}
          title={`Term within ${chosenSemester}`}
        >
          {semesterTerms.map((t) => (
            <option key={t.subterm} value={t.subterm}>{t.subterm} term</option>
          ))}
        </select>
      )}

      {/* Accelerated toggle — only meaningful for A term picks. */}
      {chosenSubterm === 'A' && (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#15803d', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!chosenAccelerated}
            onChange={(e) => setNextAcceleratedChoice(e.target.checked)}
            style={{ width: 'auto' }}
          />
          Accelerated
        </label>
      )}

      <button className="btn btn-sm btn-primary" onClick={handleMove}>
        Move to {nextCourse}{chosenSemester ? ` · ${chosenSubterm}${chosenSubterm === 'A' && chosenAccelerated ? '*' : ''}` : ''}
      </button>
    </div>
  )
}

const pickerStyle = {
  fontSize: 13, padding: '6px 10px', width: 'auto', borderRadius: 6,
  border: '1px solid #86efac', background: '#fff',
}
