import { lsGet, lsSet, uid } from './storage'

// Simple obfuscation for a local school intranet app — not production-grade auth
const encode = (s) => btoa(s)

const DEFAULT = [{
  id: 'default-admin',
  name: 'Admin',
  username: 'admin',
  hash: encode('aviation2026'),
  role: 'chief',
  roleLabel: 'Chief Instructor',
  studentId: null,
}]

export function getAccounts() {
  return lsGet('accounts') || DEFAULT
}

export function checkLogin(username, password) {
  const accounts = getAccounts()
  const u = (username || '').trim().toLowerCase()
  // Usernames are case-insensitive — registering as "Anna.H" lets you
  // sign in as "anna.h" or "ANNA.H". Passwords stay exact-match.
  return accounts.find(
    (a) => (a.username || '').toLowerCase() === u && a.hash === encode(password)
  ) || null
}

export function registerAccount({ name, username, password, role, roleLabel, studentId = null }) {
  const accounts = getAccounts()
  if (accounts.find((a) => a.username.toLowerCase() === username.toLowerCase())) {
    return { error: 'That username is already taken — try another.' }
  }
  const account = { id: uid(), name, username, hash: encode(password), role, roleLabel, studentId }
  lsSet('accounts', [...accounts, account])
  return { account }
}

export function deleteAccount(username) {
  if (username === 'admin') return false
  lsSet('accounts', getAccounts().filter((a) => a.username !== username))
  return true
}

export function changePassword(username, oldPassword, newPassword) {
  const accounts = getAccounts()
  const idx = accounts.findIndex((a) => a.username === username && a.hash === encode(oldPassword))
  if (idx === -1) return { error: 'Current password is incorrect.' }
  if (!newPassword || newPassword.length < 6) return { error: 'New password must be at least 6 characters.' }
  const updated = [...accounts]
  updated[idx] = { ...updated[idx], hash: encode(newPassword) }
  lsSet('accounts', updated)
  return { account: updated[idx] }
}

/**
 * Rename a user's username. Requires the current password to confirm identity,
 * rejects collisions (case-insensitive), and forbids changing the default
 * `admin` account's username so the seed login keeps working.
 */
export function changeUsername(currentUsername, password, newUsername) {
  const trimmed = (newUsername || '').trim()
  if (!trimmed) return { error: 'Username cannot be empty.' }
  if (currentUsername === 'admin') return { error: 'The admin account username cannot be changed.' }
  const accounts = getAccounts()
  const idx = accounts.findIndex((a) => a.username === currentUsername && a.hash === encode(password))
  if (idx === -1) return { error: 'Current password is incorrect.' }
  if (trimmed.toLowerCase() === currentUsername.toLowerCase()) {
    return { error: 'New username is the same as the current one.' }
  }
  if (accounts.some((a, i) => i !== idx && a.username.toLowerCase() === trimmed.toLowerCase())) {
    return { error: 'That username is already taken — try another.' }
  }
  const updated = [...accounts]
  updated[idx] = { ...updated[idx], username: trimmed }
  lsSet('accounts', updated)
  return { account: updated[idx] }
}
