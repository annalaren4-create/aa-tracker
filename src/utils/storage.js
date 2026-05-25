const PREFIX = 'aa4-'

export function lsGet(key) {
  try {
    const v = localStorage.getItem(PREFIX + key)
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}

export function lsSet(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (e) {
    console.error('Storage write failed:', e)
  }
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/**
 * Case-insensitive, whitespace-trimmed name equality.
 * Use for any "is this the logged-in user?" comparison so registration
 * casing/spacing differences don't break "show my profile first" logic.
 */
export function eqName(a, b) {
  if (!a || !b) return false
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase()
}
