/** Pre-loaded roster for KHEF (Manassas) — seeds on first launch if localStorage is empty */

export const SEED_INSTRUCTORS = [
  { name: 'Abdul Khan',        cert: 'CFI' },
  { name: 'Amanda Haney',      cert: 'CFI/CFII' },
  { name: 'Anna Herrington',   cert: 'CFI/CFII' },
  { name: 'Basit Bukhari',     cert: 'CFI/CFII' },
  { name: 'Bob Hepp',          cert: 'CFI/CFII/MEI' },
  { name: 'Conner Radomski',   cert: 'CFI' },
  { name: 'Daniel Wang',       cert: 'CFI/CFII' },
  { name: 'David Pagano',      cert: 'CFI/CFII' },
  { name: 'Grant Luisi',       cert: 'CFI/CFII' },
  { name: 'Julissa Lambert',   cert: 'CFI' },
  { name: 'Mark Witte',        cert: 'CFI/CFII/MEI' },
  { name: 'Matt Bender',       cert: 'CFI/CFII' },
  { name: 'Saboor Khan',       cert: 'CFI/CFII' },
  { name: 'Scott Kelly',       cert: 'CFI/CFII' },
  { name: 'Sean Obrien',       cert: 'CFI' },
  { name: 'Tony Wright',       cert: 'CFI/CFII/MEI' },
  { name: 'Zach Fata',         cert: 'CFI' },
]

export const SEED_STUDENTS = [
  // ── Private 1 ──────────────────────────────────────────────────────
  {
    id: 'seed-01', name: 'John Duggan',
    course: 'Private 1', aircraft: 'C-172-S',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'Amanda Haney', secondaryInstructor: 'Zach Fata',
  },

  // ── Instrument ─────────────────────────────────────────────────────
  {
    id: 'seed-02', name: 'Gus Cabezas',
    course: 'Instrument', aircraft: 'C-172-S',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'Saboor Khan', secondaryInstructor: 'David Pagano',
  },
  {
    id: 'seed-03', name: 'Gwen Pinto',
    course: 'Instrument', aircraft: 'C-172-S',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'Basit Bukhari', secondaryInstructor: 'Daniel Wang',
  },
  {
    id: 'seed-04', name: 'Johnathon Mullen',
    course: 'Instrument', aircraft: 'C-172-S',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'Grant Luisi', secondaryInstructor: 'Matt Bender',
  },

  // ── CFI ────────────────────────────────────────────────────────────
  {
    id: 'seed-05', name: 'Daniel Landers',
    course: 'CFI', aircraft: 'C-172-S',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'Scott Kelly', secondaryInstructor: 'Bob Hepp',
  },

  // ── Commercial 2 ───────────────────────────────────────────────────
  {
    id: 'seed-06', name: 'Nahom Yohannes',
    course: 'Commercial 2', aircraft: 'C-172-L-P',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'Daniel Wang', secondaryInstructor: 'Conner Radomski',
  },
  {
    id: 'seed-07', name: 'Kyle Benson',
    course: 'Commercial 2', aircraft: 'C-172-L-P',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'David Pagano', secondaryInstructor: 'Sean Obrien',
  },
  {
    id: 'seed-08', name: 'Fernando Gonzales Cortez',
    course: 'Commercial 2', aircraft: 'C-172-L-P',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'Matt Bender', secondaryInstructor: 'Abdul Khan',
  },
  {
    id: 'seed-09', name: 'Adam Medina',
    course: 'Commercial 2', aircraft: 'C-172-L-P',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'Anna Herrington', secondaryInstructor: 'Conner Radomski',
  },
  {
    id: 'seed-10', name: 'Trevor Wilkin',
    course: 'Commercial 2', aircraft: 'C-172-L-P',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'Grant Luisi', secondaryInstructor: 'Amanda Haney',
  },
  {
    id: 'seed-11', name: 'Nicholas Lopez',
    course: 'Commercial 2', aircraft: 'C-172-L-P',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'Matt Bender', secondaryInstructor: 'Julissa Lambert',
  },

  // ── Multi Engine ───────────────────────────────────────────────────
  {
    id: 'seed-12', name: 'Nicholas Oney',
    course: 'Multi Engine', aircraft: 'PA-30',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'Mark Witte', secondaryInstructor: 'Tony Wright',
  },
  {
    id: 'seed-13', name: 'Ellie Ashbrook',
    course: 'Multi Engine', aircraft: 'PA-30',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'Tony Wright', secondaryInstructor: 'Mark Witte',
  },
  {
    id: 'seed-14', name: 'David Pagano',
    course: 'Multi Engine', aircraft: 'PA-30',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'Bob Hepp', secondaryInstructor: 'Mark Witte',
  },
]
