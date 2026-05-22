# Aviation Adventures — Student Progress Tracker

## Project overview
A React + Vite web app for Aviation Adventures flight school to track student progress through FAA Part 141 training courses. Affiliated with Liberty University (AVIA courses), Purdue Global, and California Aeronautics University.

## Locations
KHEF (Manassas), KRMN (Stafford), KHWY (Warrenton), KOKV (Winchester), KJYO (Leesburg)

## Courses tracked
Private 1 (AVIA220) · Private 2 (AVIA225) · Instrument (AVIA320) · Commercial 1 (AVIA325) · Commercial 2 (AVIA326) · Commercial 3 (AVIA327) · CFI (AVIA420) · CFII (AVIA423) · Multi Engine (AVIA440) · Multi Engine Instructor (AVIA443)

## Key business rules
- Aircraft rates effective 4/1/2026 (see `src/data/constants.js`)
- Instructor rates: KHEF/KJYO = $100 line / $110 check; KRMN/KHWY/KOKV = $95 line / $105 check
- Liberty University flat rate flight fees are tracked per course; budget = flatRate - estimatedCost
- Cost formula: (dual+solo) × aircraftRate + (dual+solo+sim) × instrRate + ground × instrRate
- Stage checks and progress checks use the check instructor rate (higher)
- Simulator billed at $90/hr flat

## Two user roles
- **Instructor view** — full CRUD: add/remove students, log flight time per lesson, manage instructor roster
- **Student view** — read-only progress view, search by name

## Data persistence
Uses `localStorage` (keys prefixed `aa4-`). See `src/utils/storage.js`.

## Stack
React 18 · Vite · CSS (plain, no framework) · No external dependencies beyond React

## Running
```bash
npm install
npm run dev
```

## Common tasks for Claude Code
- Add a new course: add to `src/data/courses.js` following the existing pattern (fields: id, d=dual, s=solo, x=xc, sm=sim, n=night, g=ground, t=target, o=objectives, sc=stageCheck, pc=progCheck)
- Add a report/export feature: src/utils/calculations.js has all the cost/progress logic
- Add authentication: replace the role-select home screen with a real auth flow
- Add a backend: swap `src/utils/storage.js` for API calls
