// One-off generator: emits SQL to import the seed instructor roster
// into Supabase, mapping the localStorage shape to the DB schema.
//   chief / lineRate  -> is_chief
//   stageCheck        -> stage_check
// Run: node scripts/gen-instructor-import.mjs > supabase/migrations/0003_seed_instructors.sql
import { SEED_INSTRUCTORS } from '../src/data/seed.js'

const esc = (s) => s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`

const rows = SEED_INSTRUCTORS.map((i) => {
  const isChief = !!(i.chief || i.lineRate)
  const stageCheck = !!i.stageCheck
  return `  ((select id from schools where slug='aa'), ${esc(i.name)}, ${esc(i.cert)}, ${esc(i.base)}, ${isChief}, ${stageCheck}, ${esc(i.phone)}, ${esc(i.email)})`
})

const sql = `-- ============================================================
-- Migration 0003 — Import existing instructor roster (one-time)
-- Generated from src/data/seed.js. ${SEED_INSTRUCTORS.length} instructors.
-- Safe to re-run: clears AA instructors first so it stays idempotent.
-- ============================================================

delete from instructors
  where school_id = (select id from schools where slug='aa');

insert into instructors (school_id, name, cert, base, is_chief, stage_check, phone, email) values
${rows.join(',\n')};

-- ============================================================
-- End of migration 0003
-- ============================================================
`

process.stdout.write(sql)
