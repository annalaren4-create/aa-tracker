-- ============================================================
-- Migration 0004 — Chief roster corrections (2026-05-28)
-- ============================================================
-- Correct chief assignments:
--   KHEF -> Bob Hepp, Elias Kontanis
--   KRMN -> Kim Webster
--   KOKV -> Brenda Gillespie
--   KJYO -> Brenda Gillespie
--   KHWY -> John Knapp
-- Changes vs. the imported seed:
--   * Anthony Wright is no longer a chief.
--   * John Knapp is a chief at KHWY only (instructor, not chief, at KRMN).
--   * Bill English has left the company — removed entirely.
--   * Brenda Gillespie is also chief at KJYO (was only listed at KOKV).
--
-- Idempotent + tolerant of stray whitespace / casing in stored names
-- (trim + case-insensitive match), so it can be re-run safely.
-- ============================================================

-- Anthony Wright: demote to regular instructor
update instructors set is_chief = false
  where school_id = (select id from schools where slug='aa')
    and trim(name) ilike 'anthony wright';

-- John Knapp at KRMN: instructor only (his KHWY chief row is untouched)
update instructors set is_chief = false
  where school_id = (select id from schools where slug='aa')
    and trim(name) ilike 'john knapp' and base = 'KRMN';

-- Bill English: no longer an employee — remove
delete from instructors
  where school_id = (select id from schools where slug='aa')
    and trim(name) ilike 'bill english';

-- Brenda Gillespie: add KJYO chief row only if it isn't already there
insert into instructors (school_id, name, cert, base, is_chief, stage_check, phone, email)
  select (select id from schools where slug='aa'),
         'Brenda Gillespie', 'CFI', 'KJYO', true, false,
         '703-727-4975', 'brendygarcia2@outlook.com'
  where not exists (
    select 1 from instructors
    where school_id = (select id from schools where slug='aa')
      and trim(name) ilike 'brenda gillespie' and base = 'KJYO'
  );

-- ============================================================
-- End of migration 0004
-- ============================================================
