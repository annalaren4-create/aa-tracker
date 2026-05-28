-- ============================================================
-- Migration 0003 — Import existing instructor roster (one-time)
-- Generated from src/data/seed.js. 49 instructors.
-- Safe to re-run: clears AA instructors first so it stays idempotent.
-- ============================================================

delete from instructors
  where school_id = (select id from schools where slug='aa');

insert into instructors (school_id, name, cert, base, is_chief, stage_check, phone, email) values
  ((select id from schools where slug='aa'), 'Ademola Desalu', 'CFI', 'KHEF', false, false, '408-930-8203', 'abdesalu+cfi@gmail.com'),
  ((select id from schools where slug='aa'), 'Amanda Haney', 'CFI/CFII', 'KHEF', false, false, null, null),
  ((select id from schools where slug='aa'), 'Anna Herrington', 'CFI/CFII', 'KHEF', false, false, '251-802-9070', 'annalaren4@gmail.com'),
  ((select id from schools where slug='aa'), 'Anthony Wright', 'CFI/CFII/MEI', 'KHEF', true, false, '240-298-1424', 'awwsomd@gmail.com'),
  ((select id from schools where slug='aa'), 'Basit Bukhari', 'CFI/CFII', 'KHEF', false, false, '+1 571-619-4128', 'basitbukhari349@gmail.com'),
  ((select id from schools where slug='aa'), 'Bob Hepp', 'CFI/CFII/MEI', 'KHEF', true, false, '703-915-0428', 'nightowl@aviationadventures.com'),
  ((select id from schools where slug='aa'), 'Brandon Hoertsch', 'CFI', 'KHEF', false, false, '916-806-4788', 'Brandonhoertsch@gmail.com'),
  ((select id from schools where slug='aa'), 'Connor Radomski', 'CFI', 'KHEF', false, false, '248-766-1858', null),
  ((select id from schools where slug='aa'), 'Daniel Wang', 'CFI/CFII', 'KHEF', false, false, '571-587-6951', 'swang12@liberty.edu'),
  ((select id from schools where slug='aa'), 'David Pagano', 'CFI/CFII', 'KHEF', false, false, '330-719-3172', null),
  ((select id from schools where slug='aa'), 'Elias Kontanis', 'CFI', 'KHEF', true, false, '540-935-1890', 'kontanis@gmail.com'),
  ((select id from schools where slug='aa'), 'Grant Luisi', 'CFI/CFII', 'KHEF', false, false, null, 'grluisi4@gmail.com'),
  ((select id from schools where slug='aa'), 'Julissa Lambert', 'CFI', 'KHEF', false, false, null, null),
  ((select id from schools where slug='aa'), 'Mark Witte', 'CFI/CFII/MEI', 'KHEF', false, false, '703-599-1782', 'wittem@gmail.com'),
  ((select id from schools where slug='aa'), 'Matthew Bender', 'CFI/CFII', 'KHEF', false, false, '571-340-1318', 'mwbender03@icloud.com'),
  ((select id from schools where slug='aa'), 'Meghan McGilley', 'CFI', 'KHEF', false, false, '503-791-9209', 'mmcgilley20@gmail.com'),
  ((select id from schools where slug='aa'), 'Mike Bristow', 'CFI', 'KHEF', false, false, '757-802-5562', 'michael_b68@yahoo.com'),
  ((select id from schools where slug='aa'), 'Ryan Dlugash', 'CFI', 'KHEF', false, false, '+1 401-486-1116', 'cfi@dlugash.org'),
  ((select id from schools where slug='aa'), 'Saboor Khan', 'CFI/CFII', 'KHEF', false, false, '571-352-0929', 'asksaboor@outlook.com'),
  ((select id from schools where slug='aa'), 'Scott Kelly', 'CFI/CFII', 'KHEF', false, true, '770-828-9400', 'scottwilliamskelly@gmail.com'),
  ((select id from schools where slug='aa'), 'Sean OBrien', 'CFI', 'KHEF', false, false, '703-625-4994', 'sean.kennedy.obrien@gmail.com'),
  ((select id from schools where slug='aa'), 'Zachary Fata', 'CFI', 'KHEF', false, false, '+1 703-909-8634', 'zackfata33@gmail.com'),
  ((select id from schools where slug='aa'), 'John Knapp', 'CFI', 'KRMN', true, false, '540-604-6088', 'jknapp@aviationadventures.com'),
  ((select id from schools where slug='aa'), 'Kevin Boyd', 'CFI', 'KRMN', false, false, '845-270-9264', 'kevinboyd426@icloud.com'),
  ((select id from schools where slug='aa'), 'Kim Webster', 'CFI', 'KRMN', true, false, null, null),
  ((select id from schools where slug='aa'), 'Logan Snellings', 'CFI', 'KRMN', false, false, '540-846-8836', 'LSnellings02@gmail.com'),
  ((select id from schools where slug='aa'), 'Wynn Martin', 'CFI', 'KRMN', false, false, '540-699-9557', 'wyngarmar@gmail.com'),
  ((select id from schools where slug='aa'), 'Jacob Davis', 'CFI', 'KHWY', false, false, '618-560-9627', 'jwdaviswork105@gmail.com'),
  ((select id from schools where slug='aa'), 'John Knapp', 'CFI', 'KHWY', true, false, '540-604-6088', 'jknapp@aviationadventures.com'),
  ((select id from schools where slug='aa'), 'Roger Coffman', 'CFI', 'KHWY', false, false, '571-220-2009', 'talon@aviationadventures.com'),
  ((select id from schools where slug='aa'), 'Andrew Elwood', 'CFI', 'KOKV', false, false, null, 'b44i@yahoo.com'),
  ((select id from schools where slug='aa'), 'Brenda Gillespie', 'CFI', 'KOKV', true, false, '703-727-4975', 'brendygarcia2@outlook.com'),
  ((select id from schools where slug='aa'), 'Cody Crittenden', 'CFI', 'KOKV', false, false, '540-931-3845', 'cdcrittenden03@gmail.com'),
  ((select id from schools where slug='aa'), 'Logan Campbell', 'CFI', 'KOKV', false, false, '304-240-2718', 'logan2212@outlook.com'),
  ((select id from schools where slug='aa'), 'Zahl Azizi', 'CFI', 'KOKV', false, false, null, null),
  ((select id from schools where slug='aa'), 'Bill English', 'CFI', 'KJYO', true, false, '703-447-5598', 'bill_english@verizon.net'),
  ((select id from schools where slug='aa'), 'Bradley Shipley', 'CFI', 'KJYO', false, false, '443-289-6646', null),
  ((select id from schools where slug='aa'), 'Christopher Miller', 'CFI', 'KJYO', false, false, '575-636-4231', 'vjsmedlo@verizon.net'),
  ((select id from schools where slug='aa'), 'Connor Wilson', 'CFI', 'KJYO', false, false, '301-412-1841', 'c.b.wilson1996@gmail.com'),
  ((select id from schools where slug='aa'), 'Declan Hickton', 'CFI', 'KJYO', false, false, '412-807-8258', 'djhickton@gmail.com'),
  ((select id from schools where slug='aa'), 'Kevin Downs', 'CFI', 'KJYO', false, false, '303-885-2757', 'kcdowns@gmail.com'),
  ((select id from schools where slug='aa'), 'Madeline Dutton', 'CFI', 'KJYO', false, false, '571-449-1259', 'mkdutton0@gmail.com'),
  ((select id from schools where slug='aa'), 'Prajna Chakravarty', 'CFI', 'KJYO', false, false, '571-359-7375', 'prajnakc@gmail.com'),
  ((select id from schools where slug='aa'), 'Robert Shepanek', 'CFI', 'KJYO', false, false, '703-861-0148', 'Doc@aviationadventures.com'),
  ((select id from schools where slug='aa'), 'Sasha McFadden', 'CFI', 'KJYO', false, false, '719-243-0680', null),
  ((select id from schools where slug='aa'), 'Seth Garner', 'CFI', 'KJYO', false, false, '206-310-0188', 'sethjgarner@gmail.com'),
  ((select id from schools where slug='aa'), 'Shelby Clark', 'CFI', 'KJYO', false, false, '703-657-9690', 'shelbyaclark14@gmail.com'),
  ((select id from schools where slug='aa'), 'Sophia VandeGeer', 'CFI', 'KJYO', false, false, '240-500-4802', 'vandegeersophia@gmail.com'),
  ((select id from schools where slug='aa'), 'Steven Bucko', 'CFI', 'KJYO', false, false, null, null);

-- ============================================================
-- End of migration 0003
-- ============================================================
