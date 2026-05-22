import { lsGet, lsSet } from './storage'

// Simple obfuscation for a local school intranet app — not production-grade auth
const encode = (s) => btoa(s)

const DEFAULT = [{ username: 'admin', hash: encode('aviation2026'), role: 'admin' }]

export function getAccounts() {
  return lsGet('accounts') || DEFAULT
}

export function checkLogin(username, password) {
  const accounts = getAccounts()
  return accounts.find((a) => a.username === username && a.hash === encode(password)) || null
}

export function addAccount(username, password) {
  const accounts = getAccounts()
  if (accounts.find((a) => a.username === username)) return false
  lsSet('accounts', [...accounts, { username, hash: encode(password), role: 'instructor' }])
  return true
}

export function deleteAccount(username) {
  if (username === 'admin') return false
  lsSet('accounts', getAccounts().filter((a) => a.username !== username))
  return true
}

export function changePassword(username, oldPassword, newPassword) {
  const accounts = getAccounts()
  const idx = accounts.findIndex((a) => a.username === username && a.hash === encode(oldPassword))
  if (idx === -1) return false
  const updated = [...accounts]
  updated[idx] = { ...updated[idx], hash: encode(newPassword) }
  lsSet('accounts', updated)
  return true
}
