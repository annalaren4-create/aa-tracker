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
