-- ============================================================
-- Aviation Adventures — Initial schema (multi-tenant from day 1)
-- Migration 0001
-- ============================================================
-- Tables: schools, instructors, students, accounts, course_history,
--         flight_logs, training_reviews, role_requests
-- Every domain table carries school_id + RLS so adding new tenants
-- later is a pure data operation, not a schema change.
-- ============================================================

-- ---------- schools (tenants) ----------
create table schools (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,         -- 'aa', 'caa', 'purdue', etc.
  name        text not null,
  config      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Seed Aviation Adventures as the first tenant.
insert into schools (slug, name) values ('aa', 'Aviation Adventures');

-- ---------- instructors ----------
create table instructors (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references schools(id) on delete cascade,
  name         text not null,
  cert         text not null check (cert in ('CFI', 'CFI/CFII', 'CFI/CFII/MEI')),
  base         text not null check (base in ('KHEF','KRMN','KHWY','KOKV','KJYO')),
  is_chief     boolean not null default false,
  stage_check  boolean not null default false,
  phone        text,
  email        text,
  created_at   timestamptz not null default now()
);
create index instructors_school_idx on instructors(school_id);

-- ---------- students ----------
create table students (
  id                       uuid primary key default gen_random_uuid(),
  school_id                uuid not null references schools(id) on delete cascade,
  name                     text not null,
  affiliated_school        text,
  current_course           text,
  aircraft                 text,
  base                     text check (base in ('KHEF','KRMN','KHWY','KOKV','KJYO')),
  primary_instructor_id    uuid references instructors(id) on delete set null,
  secondary_instructor_id  uuid references instructors(id) on delete set null,
  pace_semester            text,
  pace_subterm             text check (pace_subterm in ('A','D')),
  accelerated              boolean not null default false,
  created_at               timestamptz not null default now()
);
create index students_school_idx on students(school_id);

-- ---------- accounts ----------
-- Mirrors auth.users 1:1; holds role + tenant link + roster cross-refs.
create table accounts (
  id             uuid primary key references auth.users(id) on delete cascade,
  school_id      uuid not null references schools(id) on delete cascade,
  display_name   text not null,
  role           text not null check (role in ('chief','instructor','student')),
  instructor_id  uuid references instructors(id) on delete set null,
  student_id     uuid references students(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index accounts_school_idx on accounts(school_id);

-- ---------- course_history ----------
create table course_history (
  id                       uuid primary key default gen_random_uuid(),
  school_id                uuid not null references schools(id) on delete cascade,
  student_id               uuid not null references students(id) on delete cascade,
  course                   text not null,
  completed_date           date,
  primary_instructor_id    uuid references instructors(id) on delete set null,
  secondary_instructor_id  uuid references instructors(id) on delete set null,
  rate_discount            numeric(4,3) not null default 0,
  syllabus_version         text,
  lib_repeats_allowed      int,
  created_at               timestamptz not null default now()
);
create index course_history_student_idx on course_history(student_id);
create index course_history_school_idx  on course_history(school_id);

-- ---------- flight_logs ----------
create table flight_logs (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  student_id    uuid not null references students(id) on delete cascade,
  course        text not null,
  lesson_id     text not null,                  -- '1.1', '1.1__r1', '1.1__s1'
  date          date not null,
  instructor_id uuid references instructors(id) on delete set null,
  aircraft      text,
  dual          numeric(4,1) not null default 0,
  solo          numeric(4,1) not null default 0,
  sim           numeric(4,1) not null default 0,
  ground        numeric(4,1) not null default 0,
  completed     boolean not null default false,
  incomplete    boolean not null default false,
  repeated_lib  boolean not null default false,
  repeated_oop  boolean not null default false,
  paid_oop      boolean not null default false,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (student_id, course, lesson_id)
);
create index flight_logs_student_course_idx on flight_logs(student_id, course);
create index flight_logs_school_idx         on flight_logs(school_id);

-- ---------- training_reviews ----------
create table training_reviews (
  id                  uuid primary key default gen_random_uuid(),
  school_id           uuid not null references schools(id) on delete cascade,
  student_id          uuid not null references students(id) on delete cascade,
  course              text not null,
  course_name         text,
  date                date not null,
  oop_fingerprint     text,
  written_by_id       uuid references instructors(id) on delete set null,
  rationale           text,
  outcomes            text,
  funding             text,
  designee_sig_url    text,
  designee_sig_name   text,
  student_sig_url     text,
  student_sig_name    text,
  created_at          timestamptz not null default now()
);
create index training_reviews_student_idx on training_reviews(student_id);
create index training_reviews_school_idx  on training_reviews(school_id);

-- ---------- role_requests ----------
create table role_requests (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references schools(id) on delete cascade,
  instructor_id   uuid not null references instructors(id) on delete cascade,
  base            text not null,
  field           text not null check (field in ('chief','stage_check')),
  note            text,
  requested_at    timestamptz not null default now(),
  resolved_at     timestamptz,
  resolved_by_id  uuid references accounts(id) on delete set null,
  decision        text check (decision in ('approved','rejected')),
  decision_note   text
);
create index role_requests_school_idx on role_requests(school_id);

-- ============================================================
-- Helper functions used by RLS policies
-- ============================================================
-- Look up the current user's school_id and role from the accounts
-- table. SECURITY DEFINER so the function itself can read accounts
-- even when the caller can't see the full table.
-- ============================================================

create or replace function public.user_school_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select school_id from accounts where id = auth.uid()
$$;

create or replace function public.user_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role from accounts where id = auth.uid()
$$;

-- ============================================================
-- Enable Row Level Security on every table
-- ============================================================
alter table schools           enable row level security;
alter table instructors       enable row level security;
alter table students          enable row level security;
alter table accounts          enable row level security;
alter table course_history    enable row level security;
alter table flight_logs       enable row level security;
alter table training_reviews  enable row level security;
alter table role_requests     enable row level security;

-- ============================================================
-- Policies
-- Pattern: authenticated users see/edit only their own school.
-- Students are read-only on most tables and can only see their
-- own rows. Chiefs get write access to instructor-management
-- tables. Everyone else (anon, other tenants) sees nothing.
-- ============================================================

-- ---------- schools ----------
-- Users can read their own school row only.
create policy "school_read_own"
  on schools for select to authenticated
  using (id = public.user_school_id());

-- ---------- instructors ----------
create policy "instructors_read_same_school"
  on instructors for select to authenticated
  using (school_id = public.user_school_id());

create policy "instructors_write_chief"
  on instructors for all to authenticated
  using (school_id = public.user_school_id() and public.user_role() = 'chief')
  with check (school_id = public.user_school_id() and public.user_role() = 'chief');

-- ---------- students ----------
-- All school members can read students; students see only themselves.
create policy "students_read_staff"
  on students for select to authenticated
  using (
    school_id = public.user_school_id()
    and public.user_role() in ('chief','instructor')
  );

create policy "students_read_self"
  on students for select to authenticated
  using (
    school_id = public.user_school_id()
    and id = (select student_id from accounts where id = auth.uid())
  );

-- Only chiefs+instructors can modify students.
create policy "students_write_staff"
  on students for all to authenticated
  using (
    school_id = public.user_school_id()
    and public.user_role() in ('chief','instructor')
  )
  with check (
    school_id = public.user_school_id()
    and public.user_role() in ('chief','instructor')
  );

-- ---------- accounts ----------
-- Every user can read their own account row. Chiefs can read all
-- accounts in their school.
create policy "accounts_read_self"
  on accounts for select to authenticated
  using (id = auth.uid());

create policy "accounts_read_chief"
  on accounts for select to authenticated
  using (
    school_id = public.user_school_id()
    and public.user_role() = 'chief'
  );

-- Chiefs manage accounts in their school.
create policy "accounts_write_chief"
  on accounts for all to authenticated
  using (school_id = public.user_school_id() and public.user_role() = 'chief')
  with check (school_id = public.user_school_id() and public.user_role() = 'chief');

-- ---------- course_history ----------
create policy "course_history_read_staff"
  on course_history for select to authenticated
  using (
    school_id = public.user_school_id()
    and public.user_role() in ('chief','instructor')
  );

create policy "course_history_read_self"
  on course_history for select to authenticated
  using (
    school_id = public.user_school_id()
    and student_id = (select student_id from accounts where id = auth.uid())
  );

create policy "course_history_write_staff"
  on course_history for all to authenticated
  using (
    school_id = public.user_school_id()
    and public.user_role() in ('chief','instructor')
  )
  with check (
    school_id = public.user_school_id()
    and public.user_role() in ('chief','instructor')
  );

-- ---------- flight_logs ----------
create policy "flight_logs_read_staff"
  on flight_logs for select to authenticated
  using (
    school_id = public.user_school_id()
    and public.user_role() in ('chief','instructor')
  );

create policy "flight_logs_read_self"
  on flight_logs for select to authenticated
  using (
    school_id = public.user_school_id()
    and student_id = (select student_id from accounts where id = auth.uid())
  );

create policy "flight_logs_write_staff"
  on flight_logs for all to authenticated
  using (
    school_id = public.user_school_id()
    and public.user_role() in ('chief','instructor')
  )
  with check (
    school_id = public.user_school_id()
    and public.user_role() in ('chief','instructor')
  );

-- ---------- training_reviews ----------
create policy "training_reviews_read_staff"
  on training_reviews for select to authenticated
  using (
    school_id = public.user_school_id()
    and public.user_role() in ('chief','instructor')
  );

create policy "training_reviews_read_self"
  on training_reviews for select to authenticated
  using (
    school_id = public.user_school_id()
    and student_id = (select student_id from accounts where id = auth.uid())
  );

create policy "training_reviews_write_staff"
  on training_reviews for all to authenticated
  using (
    school_id = public.user_school_id()
    and public.user_role() in ('chief','instructor')
  )
  with check (
    school_id = public.user_school_id()
    and public.user_role() in ('chief','instructor')
  );

-- ---------- role_requests ----------
-- Instructors can create requests for themselves; chiefs can see
-- and resolve everything in their school.
create policy "role_requests_read_chief"
  on role_requests for select to authenticated
  using (
    school_id = public.user_school_id()
    and public.user_role() = 'chief'
  );

create policy "role_requests_read_own"
  on role_requests for select to authenticated
  using (
    school_id = public.user_school_id()
    and instructor_id = (select instructor_id from accounts where id = auth.uid())
  );

create policy "role_requests_insert_instructor"
  on role_requests for insert to authenticated
  with check (
    school_id = public.user_school_id()
    and instructor_id = (select instructor_id from accounts where id = auth.uid())
  );

create policy "role_requests_resolve_chief"
  on role_requests for update to authenticated
  using (
    school_id = public.user_school_id()
    and public.user_role() = 'chief'
  )
  with check (
    school_id = public.user_school_id()
    and public.user_role() = 'chief'
  );

-- ============================================================
-- End of migration 0001
-- ============================================================
