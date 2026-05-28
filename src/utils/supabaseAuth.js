import { supabase } from '../lib/supabase'

// ── Supabase-backed authentication ──────────────────────────────────
// Replaces the localStorage username/password flow in utils/auth.js.
// Login is by EMAIL now (Supabase Auth owns credentials + password
// reset). After a successful sign-in we load the matching `accounts`
// row and map it into the shape the rest of the app already expects:
//   { id, name, role, studentId, instructorId, schoolId, email }
// so downstream code (handleLoginSuccess, role routing, etc.) keeps
// working unchanged.

// Pull the profile row for an authed user id. RLS policy
// "accounts_read_self" lets a signed-in user read their own row.
async function fetchAccount(userId, email) {
  const { data, error } = await supabase
    .from('accounts')
    .select('id, role, display_name, student_id, instructor_id, school_id')
    .eq('id', userId)
    .single()
  if (error || !data) return null
  return {
    id: data.id,
    name: data.display_name,
    role: data.role,
    studentId: data.student_id,
    instructorId: data.instructor_id,
    schoolId: data.school_id,
    email: email || null,
  }
}

// Sign in with email + password. Returns { account } on success or
// { error } with a human-readable message on failure.
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: (email || '').trim(),
    password,
  })
  if (error) {
    // Supabase returns "Invalid login credentials" for bad email OR
    // password — keep it vague so we don't leak which was wrong.
    return { error: 'Incorrect email or password.' }
  }
  const account = await fetchAccount(data.user.id, data.user.email)
  if (!account) {
    // Auth succeeded but no profile row — someone created the login
    // without the accounts link. Sign back out so we don't sit in a
    // half-authed state.
    await supabase.auth.signOut()
    return { error: 'This login has no account profile yet. Ask your chief instructor to finish setup.' }
  }
  return { account }
}

// Restore an existing session on page load (Supabase persists the
// session in localStorage automatically). Returns the account or null.
export async function getCurrentAccount() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null
  return fetchAccount(session.user.id, session.user.email)
}

export async function signOutSupabase() {
  await supabase.auth.signOut()
}
