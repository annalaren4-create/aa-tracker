/** Pre-loaded roster for all locations — seeds on first launch if localStorage is empty */

export const SEED_INSTRUCTORS = [
  // ── KHEF (Manassas) ────────────────────────────────────────────────
  { name: 'Ademola Desalu',    cert: 'CFI',          base: 'KHEF', phone: '408-930-8203',  email: 'abdesalu+cfi@gmail.com' },
  { name: 'Amanda Haney',      cert: 'CFI/CFII',     base: 'KHEF' },
  { name: 'Anna Herrington',   cert: 'CFI/CFII',     base: 'KHEF', phone: '251-802-9070',  email: 'annalaren4@gmail.com' },
  { name: 'Anthony Wright',    cert: 'CFI/CFII/MEI', base: 'KHEF', lineRate: 110, chief: true, phone: '240-298-1424', email: 'awwsomd@gmail.com' },
  { name: 'Basit Bukhari',     cert: 'CFI/CFII',     base: 'KHEF', phone: '+1 571-619-4128', email: 'basitbukhari349@gmail.com' },
  { name: 'Bob Hepp',          cert: 'CFI/CFII/MEI', base: 'KHEF', lineRate: 110, chief: true, phone: '703-915-0428', email: 'nightowl@aviationadventures.com' },
  { name: 'Brandon Hoertsch',  cert: 'CFI',          base: 'KHEF', phone: '916-806-4788',  email: 'Brandonhoertsch@gmail.com' },
  { name: 'Connor Radomski',   cert: 'CFI',          base: 'KHEF', phone: '248-766-1858' },
  { name: 'Daniel Wang',       cert: 'CFI/CFII',     base: 'KHEF', phone: '571-587-6951',  email: 'swang12@liberty.edu' },
  { name: 'David Pagano',      cert: 'CFI/CFII',     base: 'KHEF', phone: '330-719-3172' },
  { name: 'Elias Kontanis',    cert: 'CFI',          base: 'KHEF', lineRate: 110, chief: true, phone: '540-935-1890', email: 'kontanis@gmail.com' },
  { name: 'Grant Luisi',       cert: 'CFI/CFII',     base: 'KHEF', email: 'grluisi4@gmail.com' },
  { name: 'Julissa Lambert',   cert: 'CFI',          base: 'KHEF' },
  { name: 'Mark Witte',        cert: 'CFI/CFII/MEI', base: 'KHEF', phone: '703-599-1782',  email: 'wittem@gmail.com' },
  { name: 'Matthew Bender',    cert: 'CFI/CFII',     base: 'KHEF', phone: '571-340-1318',  email: 'mwbender03@icloud.com' },
  { name: 'Meghan McGilley',   cert: 'CFI',          base: 'KHEF', phone: '503-791-9209',  email: 'mmcgilley20@gmail.com' },
  { name: 'Mike Bristow',      cert: 'CFI',          base: 'KHEF', phone: '757-802-5562',  email: 'michael_b68@yahoo.com' },
  { name: 'Ryan Dlugash',      cert: 'CFI',          base: 'KHEF', phone: '+1 401-486-1116', email: 'cfi@dlugash.org' },
  { name: 'Saboor Khan',       cert: 'CFI/CFII',     base: 'KHEF', phone: '571-352-0929',  email: 'asksaboor@outlook.com' },
  { name: 'Scott Kelly',       cert: 'CFI/CFII',     base: 'KHEF', stageCheck: true, phone: '770-828-9400',  email: 'scottwilliamskelly@gmail.com' },
  { name: 'Sean OBrien',       cert: 'CFI',          base: 'KHEF', phone: '703-625-4994',  email: 'sean.kennedy.obrien@gmail.com' },
  { name: 'Zachary Fata',      cert: 'CFI',          base: 'KHEF', phone: '+1 703-909-8634', email: 'zackfata33@gmail.com' },

  // ── KRMN (Stafford) ────────────────────────────────────────────────
  { name: 'John Knapp',        cert: 'CFI',          base: 'KRMN', lineRate: 110, chief: true, phone: '540-604-6088', email: 'jknapp@aviationadventures.com' },
  { name: 'Kevin Boyd',        cert: 'CFI',          base: 'KRMN', phone: '845-270-9264',  email: 'kevinboyd426@icloud.com' },
  { name: 'Kim Webster',       cert: 'CFI',          base: 'KRMN', lineRate: 110, chief: true },
  { name: 'Logan Snellings',   cert: 'CFI',          base: 'KRMN', phone: '540-846-8836',  email: 'LSnellings02@gmail.com' },
  { name: 'Wynn Martin',       cert: 'CFI',          base: 'KRMN', phone: '540-699-9557',  email: 'wyngarmar@gmail.com' },

  // ── KHWY (Warrenton) ───────────────────────────────────────────────
  { name: 'Jacob Davis',       cert: 'CFI',          base: 'KHWY', phone: '618-560-9627',  email: 'jwdaviswork105@gmail.com' },
  { name: 'John Knapp',        cert: 'CFI',          base: 'KHWY', lineRate: 110, chief: true, phone: '540-604-6088', email: 'jknapp@aviationadventures.com' },
  { name: 'Roger Coffman',     cert: 'CFI',          base: 'KHWY', phone: '571-220-2009',  email: 'talon@aviationadventures.com' },

  // ── KOKV (Winchester) ──────────────────────────────────────────────
  { name: 'Andrew Elwood',     cert: 'CFI',          base: 'KOKV', email: 'b44i@yahoo.com' },
  { name: 'Brenda Gillespie',  cert: 'CFI',          base: 'KOKV', lineRate: 110, chief: true, phone: '703-727-4975', email: 'brendygarcia2@outlook.com' },
  { name: 'Cody Crittenden',   cert: 'CFI',          base: 'KOKV', phone: '540-931-3845',  email: 'cdcrittenden03@gmail.com' },
  { name: 'Logan Campbell',    cert: 'CFI',          base: 'KOKV', phone: '304-240-2718',  email: 'logan2212@outlook.com' },
  { name: 'Zahl Azizi',        cert: 'CFI',          base: 'KOKV' },

  // ── KJYO (Leesburg) ────────────────────────────────────────────────
  { name: 'Bill English',      cert: 'CFI',          base: 'KJYO', lineRate: 110, chief: true, phone: '703-447-5598', email: 'bill_english@verizon.net' },
  { name: 'Bradley Shipley',   cert: 'CFI',          base: 'KJYO', phone: '443-289-6646' },
  { name: 'Christopher Miller',cert: 'CFI',          base: 'KJYO', phone: '575-636-4231',  email: 'vjsmedlo@verizon.net' },
  { name: 'Connor Wilson',     cert: 'CFI',          base: 'KJYO', phone: '301-412-1841',  email: 'c.b.wilson1996@gmail.com' },
  { name: 'Declan Hickton',    cert: 'CFI',          base: 'KJYO', phone: '412-807-8258',  email: 'djhickton@gmail.com' },
  { name: 'Kevin Downs',       cert: 'CFI',          base: 'KJYO', phone: '303-885-2757',  email: 'kcdowns@gmail.com' },
  { name: 'Madeline Dutton',   cert: 'CFI',          base: 'KJYO', phone: '571-449-1259',  email: 'mkdutton0@gmail.com' },
  { name: 'Prajna Chakravarty',cert: 'CFI',          base: 'KJYO', phone: '571-359-7375',  email: 'prajnakc@gmail.com' },
  { name: 'Robert Shepanek',   cert: 'CFI',          base: 'KJYO', phone: '703-861-0148',  email: 'Doc@aviationadventures.com' },
  { name: 'Sasha McFadden',    cert: 'CFI',          base: 'KJYO', phone: '719-243-0680' },
  { name: 'Seth Garner',       cert: 'CFI',          base: 'KJYO', phone: '206-310-0188',  email: 'sethjgarner@gmail.com' },
  { name: 'Shelby Clark',      cert: 'CFI',          base: 'KJYO', phone: '703-657-9690',  email: 'shelbyaclark14@gmail.com' },
  { name: 'Sophia VandeGeer',  cert: 'CFI',          base: 'KJYO', phone: '240-500-4802',  email: 'vandegeersophia@gmail.com' },
  { name: 'Steven Bucko',      cert: 'CFI',          base: 'KJYO' },
]

export const SEED_STUDENTS = [
  // ── Private 1 ──────────────────────────────────────────────────────
  {
    id: 'seed-01', name: 'John Duggan',
    course: 'Private 1', aircraft: 'C-172-L-P',
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
    courseHistory: [
      { course: 'Private 2', completedDate: '2026-04-24', primaryInstructor: 'Anna Herrington', syllabusVersion: 'pre-2026-spring', libRepeatsAllowed: 2 },
    ],
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
    course: 'CFI', aircraft: 'C-172-L-P',
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
    primaryInstructor: 'Anna Herrington', secondaryInstructor: 'Daniel Wang',
    courseHistory: [
      // 15% rate discount on Commercial 1 (spouse / family rate — verified
      // against Aviation Adventures audit). Doesn't apply to current course.
      { course: 'Commercial 1', completedDate: '2026-05-12', primaryInstructor: 'Anna Herrington', secondaryInstructor: 'Daniel Wang', rateDiscount: 0.15, syllabusVersion: 'pre-2026-spring' },
    ],
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

  // ── KJYO (Leesburg) roster ─────────────────────────────────────────
  // Aircraft default to C-172-S; chief can change per-student via the detail page.
  {
    id: 'seed-kjyo-01', name: 'Veronica Everington',
    course: 'Instrument', aircraft: 'C-172-S',
    school: 'Liberty University', base: 'KJYO',
    primaryInstructor: 'Madeline Dutton', secondaryInstructor: 'Sasha McFadden',
  },
  {
    id: 'seed-kjyo-02', name: 'Shane Morin',
    course: 'Instrument', aircraft: 'C-172-S',
    school: 'Liberty University', base: 'KJYO',
    primaryInstructor: 'Prajna Chakravarty', secondaryInstructor: 'Madeline Dutton',
  },
  {
    id: 'seed-kjyo-03', name: 'Gavin Russo',
    course: 'Instrument', aircraft: 'C-172-S',
    school: 'Liberty University', base: 'KJYO',
    primaryInstructor: 'Sasha McFadden', secondaryInstructor: 'Madeline Dutton',
  },
  {
    id: 'seed-kjyo-04', name: 'Paola Rivas',
    course: 'Instrument', aircraft: 'C-172-S',
    school: 'Liberty University', base: 'KJYO',
    primaryInstructor: 'Prajna Chakravarty', secondaryInstructor: 'Madeline Dutton',
  },
  {
    id: 'seed-kjyo-05', name: 'Brian Leonardo',
    course: 'Instrument', aircraft: 'C-172-S',   // AVIA 320/325 — currently in 320
    school: 'Liberty University', base: 'KJYO',
    primaryInstructor: 'Sophia VandeGeer', secondaryInstructor: 'Connor Wilson',
  },
  {
    id: 'seed-kjyo-06', name: 'Michael Wynn',
    course: 'Commercial 1', aircraft: 'C-172-L-P',
    school: 'Liberty University', base: 'KJYO',
    primaryInstructor: 'Sophia VandeGeer', secondaryInstructor: 'Prajna Chakravarty',
  },
  {
    id: 'seed-kjyo-07', name: 'Ammie Cook',
    course: 'Commercial 1', aircraft: 'C-172-L-P',
    school: 'Liberty University', base: 'KJYO',
    primaryInstructor: 'Sophia VandeGeer', secondaryInstructor: 'Shelby Clark',
  },
  {
    id: 'seed-kjyo-08', name: 'Scott Julich',
    course: 'Commercial 2', aircraft: 'C-172-L-P',
    school: 'Liberty University', base: 'KJYO',
    primaryInstructor: 'Sophia VandeGeer', secondaryInstructor: 'Connor Wilson',
  },
  {
    id: 'seed-kjyo-09', name: 'James Carrawell',
    course: 'Commercial 3', aircraft: 'C-172-L-P',
    school: 'Liberty University', base: 'KJYO',
    primaryInstructor: 'Declan Hickton', secondaryInstructor: 'Bradley Shipley',
  },
  {
    id: 'seed-kjyo-10', name: 'Alexandra Sund',
    course: 'Commercial 3', aircraft: 'C-172-L-P',
    school: 'Liberty University', base: 'KJYO',
    primaryInstructor: 'Declan Hickton', secondaryInstructor: 'Bradley Shipley',
  },

  // ── KOKV (Winchester) roster ───────────────────────────────────────
  {
    id: 'seed-kokv-01', name: 'Hunter Burgess',
    course: 'Private 1', aircraft: 'C-172-L-P',
    school: 'Liberty University', base: 'KOKV',
    primaryInstructor: 'Zahl Azizi', secondaryInstructor: 'Logan Campbell',
  },
  {
    id: 'seed-kokv-02', name: 'Alex Austin',
    course: 'Instrument', aircraft: 'C-172-S',
    school: 'Liberty University', base: 'KOKV',
    primaryInstructor: 'Logan Campbell', secondaryInstructor: 'Zahl Azizi',
  },
  {
    id: 'seed-kokv-03', name: 'Christian Crum',
    course: 'Instrument', aircraft: 'C-172-S',
    school: 'Liberty University', base: 'KOKV',
    primaryInstructor: 'Zahl Azizi', secondaryInstructor: 'Logan Campbell',
  },
  {
    id: 'seed-kokv-04', name: 'Ryan Clupp',
    course: 'Commercial 3', aircraft: 'C-172-L-P',
    school: 'Liberty University', base: 'KOKV',
    primaryInstructor: 'Cody Crittenden', secondaryInstructor: 'Logan Campbell',
  },
]
