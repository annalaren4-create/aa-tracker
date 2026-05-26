/**
 * Per-school configuration registry.
 *
 * This file is the seed of the multi-tenant data model. Every AA-specific
 * constant the rest of the app uses (locations, aircraft fleet, rates,
 * branding, partner schools, etc.) belongs in a school's entry here.
 * Adding a new flight school becomes:
 *   1. add an entry to `BRANDING`
 *   2. point the school's subdomain at the deployment
 *
 * Today only Aviation Adventures is configured. Once we move to a real
 * backend, this stays as the default-school fallback and a `schools`
 * Postgres table feeds the live config for additional tenants.
 *
 * The structure intentionally mirrors what's currently in
 * `src/data/constants.js` and `src/utils/storage.js` so the eventual
 * import swap is a search-and-replace, not a rewrite.
 */

import {
  LOCATIONS,
  AIRCRAFT_LIST,
  AIRCRAFT_RATES,
  LU_FLAT_RATES,
  LU_STANDARD_AIRCRAFT,
  LU_FUNDED_REPEATS_PER_COURSE,
  LU_TERMS,
  LU_DOUBLEUP_BUFFER_DAYS,
  SCHOOLS,
  SIM_RATE,
  GROUND_RATE,
  FSC_INSTR_RATE,
  INSTRUCTOR_CERTS,
  CHIEF_ACCESS_CODE,
  instrRate,
} from '../data/constants'

/**
 * Master config keyed by `schoolId` (a short slug, used in the
 * subdomain). Add a new tenant by adding a new entry. Each entry must
 * be self-contained — no cross-school references — so a future school
 * can override everything without spilling into another's settings.
 */
export const BRANDING = {
  aa: {
    /* ── Identity ───────────────────────────────────────────────── */
    id:        'aa',
    name:      'Aviation Adventures',
    shortName: 'AA',
    logo:      '/aviation-adventures-logo.png',
    primaryColor: '#1a3a5c',                             // navy
    accentColor:  '#dc2626',                             // brand red
    title:     'Aviation Adventures — Student Tracker',

    /* ── Operations ─────────────────────────────────────────────── */
    locations:        LOCATIONS,
    aircraftList:     AIRCRAFT_LIST,
    aircraftRates:    AIRCRAFT_RATES,
    instrRate:        instrRate,
    fscRate:          FSC_INSTR_RATE,
    simRate:          SIM_RATE,
    groundRate:       GROUND_RATE,
    instructorCerts:  INSTRUCTOR_CERTS,
    chiefAccessCode:  CHIEF_ACCESS_CODE,

    /* ── Affiliated academic schools (for student.school dropdown) ─ */
    affiliatedSchools: SCHOOLS,

    /* ── Liberty University specifics (academic partner) ─────────── */
    luFlatRates:           LU_FLAT_RATES,
    luStandardAircraft:    LU_STANDARD_AIRCRAFT,
    luFundedRepeatsPerCourse: LU_FUNDED_REPEATS_PER_COURSE,
    luTerms:               LU_TERMS,
    luDoubleUpBufferDays:  LU_DOUBLEUP_BUFFER_DAYS,

    /* ── Training Review CC routing (per base) ──────────────────── */
    trainingReviewCcByBase: {
      KHEF: 'Bob Hepp',
      KHWY: 'John Knapp',
      KRMN: 'Kim Webster',
      KJYO: 'Brenda Gillespie',
      KOKV: 'Brenda Gillespie',
    },
    trainingReviewRecipient: 'flightaffiliate@liberty.edu',
  },
}

/**
 * Detect the active school for the current page load.
 *
 * Resolution order:
 *   1. Subdomain — e.g. `aa.tracker.com` → 'aa', `xyz.tracker.com` → 'xyz'.
 *      Skipped on bare `localhost` / 127.0.0.1 / IP-style hosts.
 *   2. `?school=` query param — handy for testing a second tenant locally.
 *   3. Default `'aa'` — single-tenant today.
 */
export function detectSchoolId() {
  if (typeof window === 'undefined') return 'aa'

  // Query-string override always wins (great for local multi-tenant testing).
  const qs = new URLSearchParams(window.location.search)
  const fromQuery = qs.get('school')
  if (fromQuery && BRANDING[fromQuery]) return fromQuery

  // Subdomain detection — only for production-style hosts.
  const host = window.location.hostname
  const parts = host.split('.')
  const isLocal = host === 'localhost'
    || host === '127.0.0.1'
    || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
    || parts.length < 3
  if (!isLocal) {
    const sub = parts[0]
    if (sub && BRANDING[sub]) return sub
  }

  return 'aa'
}

/** Convenience accessor — current school's full branding config. */
export function currentBranding() {
  return BRANDING[detectSchoolId()] || BRANDING.aa
}
