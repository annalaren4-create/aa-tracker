export const LOCATIONS = ['KHEF', 'KRMN', 'KHWY', 'KOKV', 'KJYO']

/**
 * Invite code required at registration to pick the Chief / Assistant Chief
 * Instructor role. Without this gate, anyone who registers as "Chief" gets
 * full management access (delete students, set instructor rates, etc.).
 * Share this code privately with new chiefs / asst chiefs. Change it in code
 * any time the school wants to rotate it.
 */
export const CHIEF_ACCESS_CODE = 'aa-chief-2026'

export const SCHOOLS = [
  'Liberty University',
  'Purdue Global',
  'California Aeronautics University',
  'Aviation Adventures (independent)',
]

export const AIRCRAFT_LIST = [
  '7AC', 'SR-22', 'C-152', 'C-162', 'C-172-R', 'C-172-L-P', 'C-172-S',
  'C-182', 'C-182T', 'DA-20', 'DA-40', 'GA-7', 'PA-30', 'PA-39',
  'PA-32 (260)', 'PA-32 (270)', 'PA-28', 'PA-28R', 'Redbird FMX', 'LD/SD',
]

/** Aircraft hourly rates effective 4/1/2026 */
export const AIRCRAFT_RATES = {
  '7AC': 160, 'SR-22': 360, 'C-152': 175, 'C-162': 155,
  'C-172-R': 225, 'C-172-L-P': 215, 'C-172-S': 235,
  'C-182': 265, 'C-182T': 265, 'DA-20': 215, 'DA-40': 240,
  'GA-7': 375, 'PA-30': 375, 'PA-39': 375,
  'PA-32 (260)': 260, 'PA-32 (270)': 270,
  'PA-28': 215, 'PA-28R': 245,
  'Redbird FMX': 90, 'LD/SD': 75,
}

/** Liberty University flat rate flight fees per course */
export const LU_FLAT_RATES = {
  'Private 1': 10800,
  'Private 2': 10800,
  'Instrument': 15800,
  'Commercial 1': 11500,
  'Commercial 2': 11500,
  'Commercial 3': 11500,
  'CFI': 12800,
  'CFII': 8300,
  'Multi Engine': 11800,
  'Multi Engine Instructor': 14800,
}

/** Simulator flat rate (all locations) */
export const SIM_RATE = 90

/** Ground instruction rate — flat $100/hr all locations */
export const GROUND_RATE = 100

/** Final Stage Check instructor rate — flat $145/hr all locations */
export const FSC_INSTR_RATE = 145

/**
 * Instructor hourly rate by location and check type (flight & sim only)
 * KHEF / KJYO: line $100, check $110
 * KRMN / KHWY / KOKV: line $95, check $105
 * Final Stage Check lessons use FSC_INSTR_RATE ($145) instead — see calculations.js
 */
export const instrRate = (base, isCheck = false) => {
  const isHefJyo = ['KHEF', 'KJYO'].includes(base)
  return isCheck ? (isHefJyo ? 110 : 105) : (isHefJyo ? 100 : 95)
}

export const INSTRUCTOR_CERTS = [
  'CFI', 'CFI/CFII', 'CFI/CFII/MEI',
]

/**
 * Liberty's number of funded lesson repeats per course (current policy).
 * Past courses may have allowed more — store an override per courseHistory entry
 * (`libRepeatsAllowed: 2`) so historical billing stays accurate.
 */
export const LU_FUNDED_REPEATS_PER_COURSE = 1

/**
 * Liberty's "least expensive approved aircraft" for each course. LU covers the
 * aircraft cost at this rate; if a student flies a more expensive aircraft, the
 * per-hour difference is charged out of pocket (see calcProgress).
 */
export const LU_STANDARD_AIRCRAFT = {
  'Private 1':                'C-172-L-P',
  'Private 2':                'C-172-L-P',
  'Instrument':               'C-172-S',
  'Commercial 1':             'C-172-L-P',
  'Commercial 2':             'C-172-L-P',
  'Commercial 3':             'C-172-L-P',
  'CFI':                      'C-172-L-P',
  'CFII':                     'C-172-S',
  'Multi Engine':             'PA-30',
  'Multi Engine Instructor':  'PA-30',
}

/**
 * Liberty University Online academic calendar — relevant subterms only.
 *   • J term is never used by AA students (skipped here)
 *   • C term is skipped (also not used by AA)
 *   • A term = full ~17-week semester pace
 *   • B term = first ~8 weeks (students doubling up enroll for D next)
 *   • D term = second ~8 weeks
 *
 * Hard deadline rule: B-term students must have ALL flight lessons for
 * their course complete by 2 weeks before D term starts, so the next
 * course's training has time to begin. See LU_DOUBLEUP_BUFFER_DAYS.
 *
 * Dates are ISO yyyy-mm-dd. Update this list each academic year.
 */
export const LU_TERMS = [
  // Fall 2025 (historical — kept for past-course views and any
  // courseHistory entries still pointing here)
  { semester: 'Fall 2025',   subterm: 'A', start: '2025-08-18', end: '2025-12-12' },
  { semester: 'Fall 2025',   subterm: 'D', start: '2025-10-20', end: '2025-12-12' },

  // Spring 2026
  { semester: 'Spring 2026', subterm: 'A', start: '2026-01-12', end: '2026-05-15' },
  { semester: 'Spring 2026', subterm: 'D', start: '2026-03-16', end: '2026-05-15' },

  // Summer 2026
  { semester: 'Summer 2026', subterm: 'A', start: '2026-05-18', end: '2026-08-21' },
  { semester: 'Summer 2026', subterm: 'D', start: '2026-06-29', end: '2026-08-21' },

  // Fall 2026
  { semester: 'Fall 2026',   subterm: 'A', start: '2026-08-24', end: '2026-12-18' },
  { semester: 'Fall 2026',   subterm: 'D', start: '2026-10-26', end: '2026-12-18' },

  // Spring 2027
  { semester: 'Spring 2027', subterm: 'A', start: '2027-01-18', end: '2027-05-14' },
  { semester: 'Spring 2027', subterm: 'D', start: '2027-03-22', end: '2027-05-14' },

  // Summer 2027
  { semester: 'Summer 2027', subterm: 'A', start: '2027-05-17', end: '2027-08-20' },
  { semester: 'Summer 2027', subterm: 'D', start: '2027-06-28', end: '2027-08-20' },
]

/** Buffer (in days) before the D-term start date that B-term flight
 *  lessons must wrap up by. Per AA policy: 2 weeks. */
export const LU_DOUBLEUP_BUFFER_DAYS = 14
