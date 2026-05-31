import { supabase } from './supabase'

// ── Supabase data layer ──────────────────────────────────────────────
// Translates between the DB row shape and the localStorage-era "local"
// shape the React components already expect, so the UI doesn't have to
// change. As more entities move to the cloud, their APIs land here too.

const INSTRUCTOR_COLS = 'id, name, cert, base, is_chief, stage_check, phone, email'

// DB row -> local shape. Chiefs are represented in the app by BOTH
// lineRate:110 (used as a billing-rate override + "=== 110" chief check)
// and chief:true (read by Register.jsx). We regenerate both from the
// single is_chief column so the two never drift.
function instructorToLocal(row) {
  return {
    id: row.id,
    name: row.name,
    cert: row.cert,
    base: row.base,
    ...(row.is_chief ? { lineRate: 110, chief: true } : {}),
    ...(row.stage_check ? { stageCheck: true } : {}),
    ...(row.phone ? { phone: row.phone } : {}),
    ...(row.email ? { email: row.email } : {}),
  }
}

// Local shape -> DB columns. lineRate is the chief authority: the roster
// UI toggles chief status by setting lineRate to 110 or undefined, so
// reading it (rather than the stale `chief` flag) lets edits turn chief
// OFF correctly.
function instructorToRow(ins, schoolId) {
  return {
    ...(schoolId ? { school_id: schoolId } : {}),
    name: ins.name,
    cert: ins.cert,
    base: ins.base,
    is_chief: !!ins.lineRate,
    stage_check: !!ins.stageCheck,
    phone: ins.phone || null,
    email: ins.email || null,
  }
}

export async function fetchInstructors() {
  const { data, error } = await supabase
    .from('instructors')
    .select(INSTRUCTOR_COLS)
    .order('name')
  if (error) throw error
  return (data || []).map(instructorToLocal)
}

export async function insertInstructor(ins, schoolId) {
  const { data, error } = await supabase
    .from('instructors')
    .insert(instructorToRow(ins, schoolId))
    .select(INSTRUCTOR_COLS)
    .single()
  if (error) throw error
  return instructorToLocal(data)
}

export async function updateInstructorRow(id, merged, schoolId) {
  const { data, error } = await supabase
    .from('instructors')
    .update(instructorToRow(merged, schoolId))
    .eq('id', id)
    .select(INSTRUCTOR_COLS)
    .single()
  if (error) throw error
  return instructorToLocal(data)
}

export async function deleteInstructorRow(id) {
  const { error } = await supabase.from('instructors').delete().eq('id', id)
  if (error) throw error
}

// ── One-time data migration: localStorage -> Supabase ────────────────
// Pushes students (+ their nested course history & training reviews) and
// the flight-log tree into the cloud. Resolves instructor NAMES (the
// localStorage representation) to instructor IDs (the DB representation)
// using the already-migrated roster. Guarded so it won't run twice and
// create duplicates. Returns a summary for a confirmation toast.

async function buildInstructorIndex() {
  const { data, error } = await supabase.from('instructors').select('id, name, base')
  if (error) throw error
  const byNameBase = new Map()
  const byName = new Map()
  for (const r of data || []) {
    const k = r.name.trim().toLowerCase()
    byNameBase.set(`${k}__${r.base}`, r.id)
    if (!byName.has(k)) byName.set(k, r.id) // first row wins for name-only fallback
  }
  return { byNameBase, byName }
}

export async function migrateLocalToCloud({ students = [], logs = {} }, schoolId) {
  // Guard: bail if the cloud already has students, to avoid duplicate imports.
  const { count, error: cErr } = await supabase
    .from('students').select('*', { count: 'exact', head: true })
  if (cErr) throw cErr
  if (count && count > 0) {
    return { aborted: true, message: `Cloud already has ${count} students — skipped to avoid duplicates.` }
  }

  const warnings = []
  const idx = await buildInstructorIndex()
  const resolveInstr = (name, base) => {
    if (!name) return null
    const k = String(name).trim().toLowerCase()
    const hit = idx.byNameBase.get(`${k}__${base}`) || idx.byName.get(k) || null
    if (!hit) warnings.push(`No roster match for instructor "${name}" — left unlinked`)
    return hit
  }
  const asText = (v) => (v == null ? null : typeof v === 'string' ? v : JSON.stringify(v))

  // On any mid-migration failure, wipe everything we just inserted so the
  // duplicate-guard above doesn't block a retry. Safe because the guard
  // ensured count was 0 at start — any students present now were inserted
  // by THIS run. FK cascade removes course_history / training_reviews /
  // flight_logs along with the students.
  const rollback = async () => {
    try {
      await supabase.from('students').delete().eq('school_id', schoolId)
    } catch (rb) {
      console.error('Rollback after migration failure ALSO failed:', rb)
    }
  }

  const oldIdToNew = new Map()
  let studentCount = 0, chCount = 0, trCount = 0, logCount = 0

  try {
  // Students (one at a time so we get a reliable old-id -> new-id mapping)
  for (const s of students) {
    const { data: ins, error } = await supabase.from('students').insert({
      school_id: schoolId,
      name: s.name,
      affiliated_school: s.school || null,
      current_course: s.course || null,
      aircraft: s.aircraft || null,
      base: s.base || null,
      primary_instructor_id: resolveInstr(s.primaryInstructor, s.base),
      secondary_instructor_id: resolveInstr(s.secondaryInstructor, s.base),
      pace_semester: s.pace?.semester || null,
      pace_subterm: (s.pace?.subterm === 'A' || s.pace?.subterm === 'D') ? s.pace.subterm : null,
      accelerated: !!s.accelerated,
    }).select('id').single()
    if (error) throw error
    oldIdToNew.set(s.id, ins.id)
    studentCount++

    for (const h of s.courseHistory || []) {
      const { error: e } = await supabase.from('course_history').insert({
        school_id: schoolId,
        student_id: ins.id,
        course: h.course,
        completed_date: h.completedDate || null,
        primary_instructor_id: resolveInstr(h.primaryInstructor, s.base),
        secondary_instructor_id: resolveInstr(h.secondaryInstructor, s.base),
        rate_discount: h.rateDiscount ?? 0,
        syllabus_version: h.syllabusVersion || null,
        lib_repeats_allowed: h.libRepeatsAllowed ?? null,
      })
      if (e) throw e
      chCount++
    }

    for (const tr of s.trainingReviews || []) {
      const { error: e } = await supabase.from('training_reviews').insert({
        school_id: schoolId,
        student_id: ins.id,
        course: tr.course || tr.courseName || '',
        course_name: tr.courseName || null,
        lesson_id: tr.lessonId || null,
        date: tr.date || (tr.createdAt ? String(tr.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10)),
        written_by_id: resolveInstr(tr.writtenBy, s.base),
        rationale: asText(tr.rationale),
        outcomes: asText(tr.outcomes),
        funding: asText(tr.funding),
        designee_sig_url: tr.designeeSig || null,
        designee_sig_name: tr.designeeSigName || null,
        student_sig_url: tr.studentSig || null,
        student_sig_name: tr.studentSigName || null,
      })
      if (e) throw e
      trCount++
    }
  }

  // Flight logs: logs[oldStudentId][course][lessonId] = { ...log }
  const logRows = []
  for (const [oldStudentId, courses] of Object.entries(logs)) {
    const newStudentId = oldIdToNew.get(oldStudentId)
    if (!newStudentId) { warnings.push(`Logs for unknown student id ${oldStudentId} skipped`); continue }
    const student = students.find((s) => s.id === oldStudentId)
    for (const [course, lessons] of Object.entries(courses || {})) {
      for (const [lessonId, log] of Object.entries(lessons || {})) {
        if (!log) continue
        logRows.push({
          school_id: schoolId,
          student_id: newStudentId,
          course,
          lesson_id: lessonId,
          date: log.date || new Date().toISOString().slice(0, 10),
          instructor_id: resolveInstr(log.instructor, student?.base),
          aircraft: log.aircraft || null,
          dual: log.dual || 0,
          solo: log.solo || 0,
          sim: log.sim || 0,
          ground: log.ground || 0,
          completed: !!log.completed,
          incomplete: !!log.incomplete,
          repeated_lib: !!log.repeatedLib,
          repeated_oop: !!log.repeatedOop,
          paid_oop: !!log.paidOop,
          notes: log.notes || null,
        })
      }
    }
  }
  if (logRows.length) {
    const { error: lErr } = await supabase.from('flight_logs').insert(logRows)
    if (lErr) throw lErr
    logCount = logRows.length
  }

  // De-duplicate warnings for a cleaner summary.
  const uniqWarnings = [...new Set(warnings)]
  return { studentCount, chCount, trCount, logCount, warnings: uniqWarnings }
  } catch (e) {
    console.error('Migration failed mid-run; rolling back inserts...', e)
    await rollback()
    throw new Error(`Migration failed and was rolled back — cloud is clean, you can retry. (${e.message || e})`)
  }
}
