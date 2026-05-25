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
 * Common first-name nickname aliases. Bidirectional: registering as the
 * formal name and being seeded under the nickname (or vice versa) should
 * still match. Keys are the canonical form; values list any spellings
 * considered equivalent. Lowercase throughout.
 *
 * Add entries here as new instructors join — small, focused list beats a
 * giant dictionary that creates false matches.
 */
const NICKNAME_ALIASES = {
  robert:   ['bob', 'bobby', 'rob', 'robbie'],
  william:  ['bill', 'billy', 'will', 'willie'],
  richard:  ['rick', 'ricky', 'dick'],
  michael:  ['mike', 'mikey'],
  james:    ['jim', 'jimmy', 'jamie'],
  thomas:   ['tom', 'tommy'],
  charles:  ['chuck', 'charlie', 'chaz'],
  daniel:   ['dan', 'danny'],
  matthew:  ['matt', 'matty'],
  joseph:   ['joe', 'joey'],
  john:     ['jack', 'johnny'],
  david:    ['dave', 'davey'],
  andrew:   ['andy', 'drew'],
  anthony:  ['tony'],
  nicholas: ['nick'],
  benjamin: ['ben', 'benny'],
  alexander:['alex', 'al'],
  christopher: ['chris', 'kit'],
  jonathan: ['jon', 'jonny'],
  edward:   ['ed', 'eddie', 'ted', 'teddy'],
  steven:   ['steve'], stephen: ['steve'],
  patrick:  ['pat'],
  samuel:   ['sam', 'sammy'],
  kenneth:  ['ken', 'kenny'],
  ronald:   ['ron', 'ronnie'],
  donald:   ['don', 'donnie'],
  // Common female aliases
  elizabeth: ['liz', 'beth', 'lizzie', 'eliza'],
  katherine: ['kate', 'katie', 'kathy', 'kat'], catherine: ['kate', 'katie', 'kathy', 'cat'],
  margaret:  ['maggie', 'meg', 'peggy'],
  jennifer:  ['jen', 'jenny'],
  jessica:   ['jess', 'jessie'],
  nicole:    ['nikki'],
  rebecca:   ['becca', 'becky'],
  deborah:   ['deb', 'debbie'],
  patricia:  ['pat', 'patty', 'trish'],
  cynthia:   ['cindy'],
  victoria:  ['vicki', 'vickie', 'tori'],
  pamela:    ['pam'],
}

// Flatten into a fast lookup: any alias OR canonical name → a Set of all
// equivalent spellings (including itself).
const NAME_EQUIV = (() => {
  const m = new Map()
  const link = (group) => {
    const set = new Set(group)
    for (const n of group) m.set(n, set)
  }
  for (const [canonical, aliases] of Object.entries(NICKNAME_ALIASES)) {
    link([canonical, ...aliases])
  }
  return m
})()

function normFirst(name) {
  return String(name || '').trim().toLowerCase().split(/\s+/)[0] || ''
}
function normLast(name) {
  const parts = String(name || '').trim().toLowerCase().split(/\s+/)
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

/**
 * Case-insensitive, whitespace-trimmed name equality, with nickname
 * awareness for common first-name aliases (Bob ↔ Robert, Liz ↔ Elizabeth,
 * etc.). Use for any "is this the logged-in user?" or roster-match
 * comparison so registration spelling differences don't break "show my
 * profile first" / contact-card / instructor-rate lookups.
 *
 * Matching rules:
 *  1. Full string equal (case-insensitive, trimmed) → match.
 *  2. Otherwise: last name must match AND first name must either match
 *     directly or share a nickname-alias group.
 */
export function eqName(a, b) {
  if (!a || !b) return false
  const aNorm = String(a).trim().toLowerCase()
  const bNorm = String(b).trim().toLowerCase()
  if (aNorm === bNorm) return true

  const aLast = normLast(a)
  const bLast = normLast(b)
  // Need a last name on both sides to risk a nickname match — otherwise
  // "Bob" alone could match every Robert in the system, which is too loose.
  if (!aLast || !bLast || aLast !== bLast) return false

  const aFirst = normFirst(a)
  const bFirst = normFirst(b)
  if (aFirst === bFirst) return true

  const aGroup = NAME_EQUIV.get(aFirst)
  return !!aGroup && aGroup.has(bFirst)
}
