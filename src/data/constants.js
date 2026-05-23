export const LOCATIONS = ['KHEF', 'KRMN', 'KHWY', 'KOKV', 'KJYO']

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
