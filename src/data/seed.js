/** Pre-loaded roster for all locations — seeds on first launch if localStorage is empty */

export const SEED_INSTRUCTORS = [
  // ── KHEF (Manassas) ────────────────────────────────────────────────
  { name: 'Ademola Desalu',    cert: 'CFI',          base: 'KHEF' },
  { name: 'Amanda Haney',      cert: 'CFI/CFII',     base: 'KHEF' },
  { name: 'Anna Herrington',   cert: 'CFI/CFII',     base: 'KHEF' },
  { name: 'Anthony Wright',    cert: 'CFI/CFII/MEI', base: 'KHEF' },
  { name: 'Basit Bukhari',     cert: 'CFI/CFII',     base: 'KHEF' },
  { name: 'Bob Hepp',          cert: 'CFI/CFII/MEI', base: 'KHEF' },
  { name: 'Brandon Hoertsch',  cert: 'CFI',          base: 'KHEF' },
  { name: 'Connor Radomski',   cert: 'CFI',          base: 'KHEF' },
  { name: 'Daniel Wang',       cert: 'CFI/CFII',     base: 'KHEF' },
  { name: 'David Pagano',      cert: 'CFI/CFII',     base: 'KHEF' },
  { name: 'Elias Kontanis',    cert: 'CFI',          base: 'KHEF' },
  { name: 'Grant Luisi',       cert: 'CFI/CFII',     base: 'KHEF' },
  { name: 'Julissa Lambert',   cert: 'CFI',          base: 'KHEF' },
  { name: 'Mark Witte',        cert: 'CFI/CFII/MEI', base: 'KHEF' },
  { name: 'Matthew Bender',    cert: 'CFI/CFII',     base: 'KHEF' },
  { name: 'Meghan McGilley',   cert: 'CFI',          base: 'KHEF' },
  { name: 'Mike Bristow',      cert: 'CFI',          base: 'KHEF' },
  { name: 'Ryan Dlugash',      cert: 'CFI',          base: 'KHEF' },
  { name: 'Saboor Khan',       cert: 'CFI/CFII',     base: 'KHEF' },
  { name: 'Scott Kelly',       cert: 'CFI/CFII',     base: 'KHEF' },
  { name: 'Sean OBrien',       cert: 'CFI',          base: 'KHEF' },
  { name: 'Zachary Fata',      cert: 'CFI',          base: 'KHEF' },

  // ── KRMN (Stafford) ────────────────────────────────────────────────
  { name: 'John Knapp',        cert: 'CFI',          base: 'KRMN' },
  { name: 'Kevin Boyd',        cert: 'CFI',          base: 'KRMN' },
  { name: 'Kim Webster',       cert: 'CFI',          base: 'KRMN' },
  { name: 'Logan Snellings',   cert: 'CFI',          base: 'KRMN' },
  { name: 'Wynn Martin',       cert: 'CFI',          base: 'KRMN' },

  // ── KHWY (Warrenton) ───────────────────────────────────────────────
  { name: 'Jacob Davis',       cert: 'CFI',          base: 'KHWY' },
  { name: 'John Knapp',        cert: 'CFI',          base: 'KHWY' },
  { name: 'Roger Coffman',     cert: 'CFI',          base: 'KHWY' },

  // ── KOKV (Winchester) ──────────────────────────────────────────────
  { name: 'Andrew Elwood',     cert: 'CFI',          base: 'KOKV' },
  { name: 'Brenda Gillespie',  cert: 'CFI',          base: 'KOKV' },
  { name: 'Cody Crittenden',   cert: 'CFI',          base: 'KOKV' },
  { name: 'Logan Campbell',    cert: 'CFI',          base: 'KOKV' },
  { name: 'Zahl Azizi',        cert: 'CFI',          base: 'KOKV' },

  // ── KJYO (Leesburg) ────────────────────────────────────────────────
  { name: 'Bill English',      cert: 'CFI',          base: 'KJYO' },
  { name: 'Bradley Shipley',   cert: 'CFI',          base: 'KJYO' },
  { name: 'Christopher Miller',cert: 'CFI',          base: 'KJYO' },
  { name: 'Connor Wilson',     cert: 'CFI',          base: 'KJYO' },
  { name: 'Declan Hickton',    cert: 'CFI',          base: 'KJYO' },
  { name: 'Kevin Downs',       cert: 'CFI',          base: 'KJYO' },
  { name: 'Madeline Dutton',   cert: 'CFI',          base: 'KJYO' },
  { name: 'Prajna Chakravarty',cert: 'CFI',          base: 'KJYO' },
  { name: 'Robert Shepanek',   cert: 'CFI',          base: 'KJYO' },
  { name: 'Sasha McFadden',    cert: 'CFI',          base: 'KJYO' },
  { name: 'Seth Garner',       cert: 'CFI',          base: 'KJYO' },
  { name: 'Shelby Clark',      cert: 'CFI',          base: 'KJYO' },
  { name: 'Sophia VandeGeer',  cert: 'CFI',          base: 'KJYO' },
  { name: 'Steven Bucko',      cert: 'CFI',          base: 'KJYO' },
]

export const SEED_STUDENTS = [
  // ── Private 1 ──────────────────────────────────────────────────────
  {
    id: 'seed-01', name: 'John Duggan',
    course: 'Private 1', aircraft: 'C-172-S',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'Amanda Haney', secondaryInstructor: 'Zachary Fata',
  },

  // ── Instrument ─────────────────────────────────────────────────────
  {
    id: 'seed-02', name: 'Gus Cabezas',
    course: 'Instrument', aircraft: 'C-172-S',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'Basit Bukhari', secondaryInstructor: 'David Pagano',
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
    primaryInstructor: 'Grant Luisi', secondaryInstructor: 'Matthew Bender',
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
    primaryInstructor: 'Daniel Wang', secondaryInstructor: 'Connor Radomski',
  },
  {
    id: 'seed-07', name: 'Kyle Benson',
    course: 'Commercial 2', aircraft: 'C-172-L-P',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'David Pagano', secondaryInstructor: 'Sean OBrien',
  },
  {
    id: 'seed-08', name: 'Fernando Gonzales Cortez',
    course: 'Commercial 2', aircraft: 'C-172-L-P',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'Matthew Bender', secondaryInstructor: 'Saboor Khan',
  },
  {
    id: 'seed-09', name: 'Adam Medina',
    course: 'Commercial 2', aircraft: 'C-172-L-P',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'Anna Herrington', secondaryInstructor: 'Connor Radomski',
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
    primaryInstructor: 'Matthew Bender', secondaryInstructor: 'Julissa Lambert',
  },

  // ── Multi Engine ───────────────────────────────────────────────────
  {
    id: 'seed-12', name: 'Nicholas Oney',
    course: 'Multi Engine', aircraft: 'PA-30',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'Mark Witte', secondaryInstructor: 'Anthony Wright',
  },
  {
    id: 'seed-13', name: 'Ellie Ashbrook',
    course: 'Multi Engine', aircraft: 'PA-30',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'Anthony Wright', secondaryInstructor: 'Mark Witte',
  },
  {
    id: 'seed-14', name: 'David Pagano',
    course: 'Multi Engine', aircraft: 'PA-30',
    school: 'Liberty University', base: 'KHEF',
    primaryInstructor: 'Bob Hepp', secondaryInstructor: 'Mark Witte',
  },
]
