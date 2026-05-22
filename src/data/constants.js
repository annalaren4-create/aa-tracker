export const LOCATIONS = ['KHEF', 'KRMN', 'KHWY', 'KOKV', 'KJYO']

export const SCHOOLS = [
  'Liberty University',
  'Purdue Global',
  'California Aeronautics University',
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
  'CFI', 'CFII', 'MEI', 'CFI/CFII', 'CFI/CFII/MEI', 'ATP', 'Other',
]
