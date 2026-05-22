/**
 * Course lesson data for all 10 Part 141 courses.
 *
 * Lesson fields:
 *   id  — lesson identifier (string)
 *   d   — target dual hours
 *   s   — target solo hours
 *   x   — target XC hours (subset of dual or solo)
 *   sm  — target sim/hood hours
 *   n   — target night hours (subset of dual or solo)
 *   i   — target simulated instrument hours (subset of dual)
 *   g   — target ground instruction hours
 *   t   — target total flight time for this lesson
 *   o   — objectives (string)
 *   sc  — true if this is a Stage Check lesson
 *   pc  — true if this is a Progress Check lesson
 */

export const COURSES = {
  'Private 1': {
    avia: 'AVIA220',
    targetTotal: 30.2,
    lessons: [
      { id: '1.1', d: 1.5, g: 1.0, t: 1.5, o: 'Safety, preflight, normal TO&L, S&L, climbs, descents, turns' },
      { id: '1.2', d: 1.5, g: 1.0, t: 1.5, o: 'Normal TO, S&L, climbs, descents, turns, PONF landing' },
      { id: '1.3', d: 1.8, g: 0.7, t: 1.8, o: 'TO, S&L, slow flt, power off stall, radios, PONF landing' },
      { id: '2.1', d: 1.8, g: 0.7, t: 1.8, o: 'Stall/spin aware, power off/on stalls, TO & climb, PONF' },
      { id: '2.2', d: 1.8, g: 0.7, t: 1.8, o: 'Xwind, crabbing, ground ref, sideslip, power-on stall, PONF' },
      { id: '2.3', d: 1.8, i: 0.3, g: 0.7, t: 1.8, o: 'Stalls, crab, sideslip, ADM, steep turns, IR turns, PONF' },
      { id: '2.4', d: 1.8, g: 0.7, t: 1.8, o: 'SA, TPs, go around, PONF landings' },
      { id: '3.1', d: 1.8, g: 0.7, t: 1.8, o: 'SA, perf charts, TPs, go around, PONF' },
      { id: '3.2', d: 1.8, g: 0.7, t: 1.8, o: 'TPs, PONF landings, go around, crab/sideslip' },
      { id: '3.3', d: 1.8, g: 0.7, t: 1.8, o: 'Slow flt, stalls, TP, PONF, sim eng out, emerg descent' },
      { id: '4.1', d: 1.8, i: 0.3, g: 0.7, t: 1.8, o: 'IR S&L, IR turns, sim eng out, rect course, turn around point, s turns' },
      { id: '4.2', d: 1.8, g: 0.7, t: 1.8, o: 'Emerg desc, slow flt, stalls, wind shear, sim engine out' },
      { id: '4.3', d: 1.8, i: 0.3, g: 0.7, t: 1.8, o: 'Slow flt, stalls, IR turns, steep turns, unusual att, emerg descent' },
      { id: '5.1', d: 2.0, i: 0.1, g: 0.7, t: 2.0, pc: true, o: 'Prog Check: Xwind, TO, slow flt, stalls, crab, sideslip, PONF' },
      { id: '5.2', s: 0.8, g: 0.7, t: 1.8, o: 'First solo — TO/L to full stop, radios, TP, go around' },
      { id: '5.3', s: 0.8, g: 0.7, t: 1.8, o: 'Second solo — TO/L to full stop, radios, TP, go around' },
      { id: 'SC', d: 1.8, g: 0.7, t: 1.8, sc: true, o: 'Stage Check: Xwind, TO, slow flt, stall, IR GPS, emerg ops, PONF' },
    ],
  },

  'Private 2': {
    avia: 'AVIA225',
    targetTotal: 28.7,
    lessons: [
      { id: '6.1-6.2', d: 1.8, g: 0.7, t: 1.8, o: 'Radios, S turn, turn around point, steep turn, traffic pattern, Short/Soft TO/L intro' },
      { id: '6.3', d: 1.8, i: 0.5, g: 0.7, t: 1.8, o: 'Slow flt, stalls, CFIT, IR climbing/descending turn, GPS, unusual att, lost' },
      { id: '6.4', s: 1.0, t: 1.0, o: 'Solo to practice area, ground ref, steep turn, normal landing' },
      { id: '7.1', d: 2.0, x: 2.0, g: 1.5, t: 2.0, o: 'XC flight plan, VFR flt follow, pilotage/dead reck, nav systems' },
      { id: '7.2', d: 2.0, x: 2.0, g: 0.7, t: 2.0, o: 'XC plan, pilot/dead reck, nav systems, emerg comms, lost/divert' },
      { id: '7.3', d: 2.0, x: 2.0, g: 0.7, t: 2.0, o: 'XC plan, nav systems, emerg ops, lost/divert, system malf' },
      { id: '7.4', s: 2.5, x: 2.5, t: 2.5, o: 'Solo XC flight plan, VFR follow, pilotage/dead reck, nav systems' },
      { id: '8.1', d: 1.0, n: 1.0, g: 0.7, t: 1.0, o: 'Night prep, airport nav/lighting, land w/wo landing light' },
      { id: '8.2', d: 2.0, x: 0.5, n: 2.0, g: 0.7, t: 2.0, o: 'Night XC, flt plan, VFR follow, pilotage/dead reck, nav systems' },
      { id: '9.1', d: 1.8, i: 0.4, g: 0.7, t: 1.8, o: 'Short/Soft TO/L, slow flt, stalls, steep turn, turn around point, emerg des' },
      { id: '9.2', d: 1.8, g: 0.7, t: 1.8, o: 'Short/Soft TO/L, slow flt, stalls, steep turn, s-turn, emerg des' },
      { id: '9.3', d: 1.8, g: 0.7, t: 1.8, o: 'Short/Soft TO/L, slow flt, stalls, steep turn, emerg des' },
      { id: '9.4', d: 1.8, g: 3.0, t: 1.8, o: 'Short/Soft TO/L, slow flt, stalls, steep turn, emerg des, track VOR' },
      { id: '10.1', d: 1.8, i: 0.3, g: 3.0, t: 1.8, pc: true, o: 'Mock Final Stage Check' },
      { id: '10.2', d: 1.8, i: 0.3, g: 3.0, t: 1.8, sc: true, o: 'Final Stage Check' },
    ],
  },

  Instrument: {
    avia: 'AVIA320',
    targetTotal: 44.5,
    lessons: [
      { id: '1.1-1.2', d: 1.0, sm: 1.0, g: 1.0, t: 1.0, o: 'Basic instrument maneuvers, S&L, turns, climbs, descents' },
      { id: '1.3-1.4', d: 1.0, sm: 1.0, g: 1.0, t: 1.0, o: 'S&L, turns/climbs/descents, timed/compass turns' },
      { id: '2.1-2.2', d: 1.0, sm: 1.0, g: 1.0, t: 1.0, o: 'IFR flt plan, CRAFT, loss of PFD, basic instr maneuvers' },
      { id: '2.3-2.4', d: 1.0, sm: 1.0, g: 1.0, t: 1.0, o: 'CRAFT, loss of PFD, basic instr maneuvers, timed/compass, unusual att' },
      { id: '2.5-2.6', d: 1.0, sm: 1.0, g: 1.0, t: 1.0, o: 'CRAFT, loss of PFD, basic instr maneuvers, unusual att' },
      { id: '2.7-2A', d: 1.0, sm: 1.0, g: 1.0, t: 1.0, sc: true, o: 'Stage Check: CRAFT, loss of PFD, basic instr, unusual att' },
      { id: '3.1', d: 1.3, g: 0.7, t: 1.3, o: 'ADM, avionics, track/intercept GPS courses' },
      { id: '3.2', d: 1.3, g: 0.7, t: 1.3, o: 'VOR check, track/intercept VOR courses & Victor airway, unusual att' },
      { id: '3.3', d: 1.4, g: 0.7, t: 1.4, o: 'CRAFT, Departure Procedures, GPS/VOR nav, Holding entries' },
      { id: '4.1', d: 1.4, g: 0.7, t: 1.4, o: 'Dep proc, Holding entries and procedures, loss of PFD, unusual att' },
      { id: '4.2', d: 1.4, g: 0.7, t: 1.4, o: 'Dep proc, intercept/track DME arcs, non-published holding procedures' },
      { id: '4A', d: 1.2, g: 0.7, t: 1.2, sc: true, o: 'Stage Check: Dep proc, Holding, DME arc, loss of PFD, unusual att' },
      { id: '5.1', d: 2.0, g: 0.7, t: 2.0, o: 'Precision approach, intercept/track localizer & GS, missed appr' },
      { id: '5.2', d: 2.0, g: 0.7, t: 2.0, o: 'RNAV approach w vert guidance, missed appr, transition to land' },
      { id: '5.3', d: 2.0, g: 0.7, t: 2.0, o: 'RNAV appr w/o vert guidance, MDA, missed app' },
      { id: '5.4', d: 2.0, g: 0.7, t: 2.0, o: 'Non precision appr, descend from MDA at VDP, missed appr' },
      { id: '6.1', d: 2.0, g: 0.7, t: 2.0, o: 'VOR approach, loss comms, TAA/course reversal, MDA, missed' },
      { id: '6.2', d: 2.0, g: 0.7, t: 2.0, o: 'Circling approach, execute missed from circle' },
      { id: '6.3', d: 2.0, g: 0.7, t: 2.0, o: 'Hold proc, precision, non precision, circle, missed, loss comms' },
      { id: '6A', d: 2.0, g: 0.7, t: 2.0, sc: true, o: 'Stage Check: Holding, precision, non precision, circling, missed, loss comms' },
      { id: '7.1', d: 2.5, x: 2.5, g: 0.7, t: 2.5, o: 'Autopilot, XC plan, dep/enroute/arr procedures, precision, non precision' },
      { id: '7.2', d: 2.0, g: 0.7, t: 2.0, o: 'Partial Panel Precision, non precision, autopilot' },
      { id: '7.3', d: 4.0, x: 4.0, g: 3.0, t: 4.0, o: 'XC flt plan, autopilot, partial panel *250nm total, one leg >100nm*' },
      { id: '8.1', d: 2.0, g: 3.0, t: 2.0, pc: true, o: 'Mock Final Stage Check' },
      { id: '8A', d: 2.0, g: 3.0, t: 2.0, sc: true, o: 'FINAL Stage Check' },
    ],
  },

  'Commercial 1': {
    avia: 'AVIA325',
    targetTotal: 42.0,
    lessons: [
      { id: '1.1', d: 3.0, x: 3.0, i: 0.5, g: 0.7, t: 3.0, o: 'Pilotage/Dead reck, VOR/GPS, one landing >100nm, Normal landing' },
      { id: '1.2', d: 1.0, n: 1.0, g: 0.7, t: 1.0, o: 'Night TO/L\'s in pattern with/without landing light' },
      { id: '1.3', s: 4.0, x: 4.0, t: 4.0, o: 'Pilotage/Dead reck, VOR/GPS, track V airway, one landing >100nm' },
      { id: '1.4', d: 4.0, x: 4.0, i: 0.9, n: 4.0, g: 0.7, t: 4.0, o: 'Night Pilotage/Dead reck, VOR/GPS, one landing >100nm, Go-around' },
      { id: '1.5', s: 1.5, n: 1.5, t: 1.5, o: 'Solo night TO/L\'s in the pattern' },
      { id: '2.1', s: 4.0, x: 4.0, t: 4.0, o: 'Pilotage/Dead reck, VOR/GPS, one landing >100nm, Normal' },
      { id: '2.2', s: 1.5, n: 1.5, t: 1.5, o: 'Solo night TO/L\'s in the pattern' },
      { id: '2.3', s: 4.0, x: 4.0, t: 4.0, o: 'Pilotage/Dead reck, VOR/GPS, land at 3 points with one >250nm straight line' },
      { id: '2.4', s: 4.0, x: 4.0, t: 4.0, o: 'Pilotage/Dead reck, VOR/GPS, one landing >100nm, po 180, Normal' },
      { id: '2A', d: 3.0, x: 3.0, i: 0.4, g: 0.7, t: 3.0, pc: true, o: 'Prog Check: Pilotage/Dead reck, VOR/GPS, unusual att, lost/divert, >100nm' },
      { id: '3.1', s: 4.0, x: 4.0, t: 4.0, o: 'Pilotage/Dead reck, VOR/GPS, one landing >100nm, po 180, Short/soft' },
      { id: '3.4', s: 6.0, x: 6.0, t: 6.0, o: 'Pilotage/Dead reck, VOR/GPS, one landing >250nm (at least 3 points), Short/soft' },
      { id: '3A', d: 2.0, x: 2.0, i: 0.5, g: 0.7, t: 2.0, sc: true, pc: true, o: 'Prog Check: Pilotage/Dead reck, VOR/GPS, unusual att, lost/divert, >50nm, Short/soft' },
    ],
  },

  'Commercial 2': {
    avia: 'AVIA326',
    targetTotal: 42.0,
    lessons: [
      { id: '3.2', s: 4.0, x: 4.0, t: 4.0, o: 'Pilotage/Dead reck, VOR/GPS, one landing >100nm, po 180, Short/soft' },
      { id: '3.3', s: 4.0, x: 4.0, t: 4.0, o: 'Pilotage/Dead reck, VOR/GPS, one landing >100nm, po 180, Short/soft' },
      { id: '4.1', d: 2.0, g: 0.7, t: 2.0, o: 'TAA airplane: slow flight, normal TO/L\'s' },
      { id: '4.2', d: 2.0, i: 0.5, g: 0.7, t: 2.0, o: 'TAA airplane: slow flt, stalls, unusual att, sim instr, go-around' },
      { id: '4A', d: 2.0, i: 0.5, g: 0.7, t: 2.0, pc: true, o: 'Prog Check: TAA airplane maneuvers' },
      { id: '5.1', d: 2.0, sm: 2.0, i: 0.3, g: 0.7, t: 2.0, o: 'Slow flt, stalls, steep turns, steep spiral, emerg des, po 180, Short/soft' },
      { id: '5.2', d: 2.0, sm: 2.0, i: 0.3, g: 0.7, t: 2.0, o: 'Steep turns, chandelle, steep spiral, emerg des, po 180, Short/soft' },
      { id: '5.3', d: 3.0, g: 0.7, t: 3.0, o: 'Steep turns/spiral, chandelle, po 180, Short/soft (PIC duties)' },
      { id: '5.4', d: 3.0, sm: 3.0, i: 0.5, g: 0.7, t: 3.0, o: 'Steep turns, chandelle, accel stall, lazy 8\'s, sim instr' },
      { id: '5.5', d: 3.0, g: 0.7, t: 3.0, o: 'Stalls, steep turns, chandelle, lazy 8\'s, po 180 (PIC duties)' },
      { id: '5.6', d: 3.0, sm: 3.0, i: 0.6, g: 0.7, t: 3.0, o: 'Steep turns/spiral, chandelle, lazy 8\'s, sim instr, po 180, 8\'s on pylon' },
      { id: '5.7', s: 3.0, t: 3.0, o: 'Stalls, steep turns, chandelle, lazy 8\'s, 8\'s on pylon, po 180' },
      { id: '5.8', s: 5.0, x: 5.0, t: 5.0, o: 'Pilotage/Dead reck, VOR/GPS, one landing >50nm, po 180, Short/soft' },
      { id: '5.9', d: 2.0, i: 0.5, g: 0.7, t: 2.0, o: 'Stalls, steep turns, chandelle, lazy 8\'s, 8\'s on pylon, IR climb/descend' },
      { id: '5A', d: 2.0, i: 0.5, g: 0.7, t: 2.0, sc: true, o: 'Stage Check: Slow flt, stalls, steep turns, chandelle, lazy 8\'s, 8\'s on pylon' },
    ],
  },

  'Commercial 3': {
    avia: 'AVIA327',
    targetTotal: 36.0,
    lessons: [
      { id: '6.1', d: 4.0, i: 0.8, g: 0.7, t: 4.0, o: 'Stalls, steep turns/spiral, chandelle, lazy 8\'s, sim instr, po 180, 8\'s on pylon' },
      { id: '6.2', s: 4.0, t: 4.0, o: 'Steep turns, chandelle, steep spiral, lazy 8\'s, 8\'s on pylon, po 180' },
      { id: '6.3', d: 3.0, x: 3.0, i: 0.7, g: 0.7, t: 3.0, o: 'TAA airplane: Pilotage/Dead reck, stall, >50nm, sim engine fail, go around' },
      { id: '6.4', s: 6.0, x: 6.0, t: 6.0, o: 'Pilotage/Dead reck, VOR/GPS, one landing >50nm, po 180, Short/soft' },
      { id: '7.1', d: 3.0, i: 0.3, g: 0.7, t: 3.0, o: 'Steep turns/spiral, chandelle, lazy 8\'s, sim instr unusual att, 8\'s on pylon' },
      { id: '7.2', s: 5.0, x: 5.0, t: 5.0, o: 'XC plan, pilotage/dead reck, ILS/GPS app, track nav partial panel, >100nm' },
      { id: '7.3', s: 5.0, x: 5.0, i: 1.0, g: 0.7, t: 5.0, o: 'Pilotage/Dead reck, VOR/GPS, one landing >50nm, po 180, go around' },
      { id: '8.1', d: 4.0, i: 0.5, g: 0.7, t: 4.0, pc: true, o: 'Mock Final Stage Check' },
      { id: '8.2', g: 3.0, t: 0, o: 'Ground lesson: Mock final review all ground material' },
      { id: '8A', d: 2.0, i: 0.7, g: 3.0, t: 2.0, sc: true, o: 'Final Stage Check' },
    ],
  },

  CFI: {
    avia: 'AVIA420',
    targetTotal: 31.0,
    lessons: [
      { id: '1.1', d: 1.8, g: 0.7, t: 1.8, o: 'Preflight, normal/crosswind TO/L, steep turns, slow flt, stalls, PONF' },
      { id: '1.2', d: 1.8, g: 0.7, t: 1.8, o: 'Short/soft TO, slip, ground ref, s turn, go around, slow flt, stalls, PONF' },
      { id: '1.3', d: 1.8, g: 0.7, t: 1.8, o: 'Steep turns, slow flt, stalls, equip fail, emerg descent, sim engine out' },
      { id: '1.4', d: 1.8, i: 0.3, g: 0.7, t: 1.8, o: 'Short/soft TO/L, turn around point, Sim Instr, stalls, chandelle' },
      { id: '1.5', d: 1.8, i: 0.3, g: 0.7, t: 1.8, o: 'Short/soft TO/L, Sim Instr, po 180, secondary stall, chandelle, steep spiral' },
      { id: '1A', d: 1.8, g: 0.7, t: 1.8, sc: true, o: 'Stage Check 1: Stalls, steep turns, chandelle, lazy eights, cross controlled stalls' },
      { id: '2.1', d: 1.8, g: 0.7, t: 1.8, o: 'Short/soft TO/L, stalls, lazy eights, 8\'s on pylons, cross controlled stalls, po 180' },
      { id: '2.2', d: 1.8, g: 0.7, t: 1.8, o: 'Short/soft TO, slip, ground ref, s turn, steep turns, 8\'s on pylons, emerg desc' },
      { id: '2.3', d: 1.8, g: 0.7, t: 1.8, o: 'Steep turns, 8\'s on pylons, emerg desc, chandelle, accel stall, lazy eights' },
      { id: '2A', d: 1.8, g: 0.7, t: 1.8, sc: true, o: 'Stage Check 2: Short/soft, slip, go around, po 180, steep spiral, chandelles' },
      { id: '3.1', d: 1.8, i: 0.3, g: 0.7, t: 1.8, o: 'Normal TO, slip, go around, steep turns, ground ref, slow flt, stalls, Sim instr' },
      { id: '3.2', d: 1.8, g: 0.7, t: 1.8, o: 'Short/soft TO/L, po 180, steep spiral, chandelle, lazy eights, 8\'s on pylons' },
      { id: '3A', d: 1.8, g: 0.7, t: 1.8, sc: true, o: 'Stage Check 3: Short/soft, po 180, lazy eights, 8\'s on pylons, slow flt, stalls' },
      { id: '4.1', d: 2.0, i: 0.3, g: 3.0, t: 2.0, o: 'Short/soft to/l, slip, s turn, turn around point, stalls, Sim Instr' },
      { id: '4.2', d: 2.0, g: 3.0, t: 2.0, pc: true, o: 'Mock Final Stage Check' },
      { id: '4A', d: 1.8, i: 0.3, g: 3.0, t: 1.8, sc: true, o: 'Final Stage Check' },
    ],
  },

  CFII: {
    avia: 'AVIA423',
    targetTotal: 18.0,
    lessons: [
      { id: '1.1-1.2', d: 2.0, sm: 1.5, g: 0.7, t: 2.0, o: 'CRAFT, ODP/DP, Basic instr maneuvers, precision approach, DME arc, hold' },
      { id: '1.3-2.1', d: 2.0, sm: 1.5, g: 0.7, t: 2.0, o: 'CRAFT, ODP/DP, Precision/nonprecision appr, missed, autopilot, hold, unusual att' },
      { id: '2.2-2.3', d: 2.0, sm: 1.5, g: 0.7, t: 2.0, o: 'CRAFT, ODP/DP, Precision/nonprecision appr, missed, autopilot, loss of primary flight instruments' },
      { id: '2A', d: 2.0, sm: 1.5, g: 0.7, t: 2.0, sc: true, o: 'Stage Check: CRAFT, Precision/nonprecision appr, circle, missed, autopilot, hold' },
      { id: '3.1', d: 2.0, sm: 1.5, g: 0.7, t: 2.0, o: 'CRAFT, Precision/nonprecision appr, circle, missed, autopilot, hold, unusual att' },
      { id: '3.2', d: 2.0, sm: 1.5, g: 3.0, t: 2.0, o: 'CRAFT, Precision/nonprecision appr (instr flies, student critiques), pp non precision' },
      { id: '4.1', d: 2.0, sm: 1.5, g: 3.0, t: 2.0, pc: true, o: 'Mock Final Stage Check' },
      { id: '4A', d: 2.0, sm: 1.5, g: 3.0, t: 2.0, sc: true, o: 'Final Stage Check: Full IFR proficiency demonstration' },
    ],
  },

  'Multi Engine': {
    avia: 'AVIA440',
    targetTotal: 19.6,
    lessons: [
      { id: '1.1', d: 1.8, g: 0.7, t: 1.8, o: 'Preflight, normal TO/L, S&L, climbs/descents, traffic patterns, normal/crosswind landings' },
      { id: '2.1', d: 2.0, g: 0.7, t: 2.0, o: 'Short field TO, slow flight, one engine inop sim, steep turns, emerg descent, go around' },
      { id: '2A', d: 1.8, g: 0.7, t: 1.8, o: 'Engine fail before/after VMC (sim), land with one engine, stalls, vmc demo' },
      { id: '3.1', d: 2.0, sm: 1.3, g: 0.7, t: 2.0, o: 'S&L, steep turns, slow flight, partial panel nav, unusual att, single engine IFR' },
      { id: '3.2', d: 2.0, sm: 1.3, g: 0.7, t: 2.0, o: 'Short TO, engine fail VMC/after liftoff (sim), steep turns, stalls, precision/non-precision' },
      { id: '3A', d: 2.0, sm: 1.3, g: 0.7, t: 2.0, o: 'Climb/descents IR, partial panel nav, unusual att, one engine inop approaches' },
      { id: '4.1', d: 2.0, sm: 0.4, x: 2.0, g: 3.0, t: 2.0, o: 'VFR or IFR XC, inst appr/landing 100nm, one engine inop (sim)' },
      { id: '4.2', d: 2.0, sm: 0.4, x: 2.0, n: 2.0, g: 3.0, t: 2.0, o: 'Night VFR or IFR XC, inst appr/landing 100nm, one engine inop (sim)' },
      { id: '5.1', d: 2.0, sm: 0.3, g: 3.0, t: 2.0, sc: true, o: 'Final Stage Check: Normal & short TO, engine fail, stalls, emerg descent, feather/restart' },
    ],
  },

  'Multi Engine Instructor': {
    avia: 'AVIA443',
    targetTotal: 26.0,
    lessons: [
      { id: '1', d: 2.0, g: 0.7, t: 2.0, o: 'Preflight, Engine start, Taxi, Normal TO & climb, Normal approach & land' },
      { id: '2', d: 2.0, g: 0.7, t: 2.0, o: 'Normal TO, Slow flight, Steep turns, Stalls, Emergency descent, Normal approach & land' },
      { id: '3', d: 2.0, g: 0.7, t: 2.0, o: 'Emergency descent, Engine restart/shutdown, Maneuver with one engine, Vmc demo' },
      { id: '4', d: 2.0, g: 0.7, t: 2.0, o: 'Short field TO/L, Go around, Engine fail before VMC, Engine fail after liftoff' },
      { id: '5', d: 2.0, g: 0.7, t: 2.0, o: 'Short field TO/L, Go around, Engine fail, Approach and landing with one engine, Drag demo' },
      { id: '6', d: 2.0, g: 0.7, t: 2.0, o: 'Short field TO, Slow flight, Steep turns, Stalls, Emergency descent, Engine fail' },
      { id: '7', d: 2.0, g: 0.7, t: 2.0, o: 'Short field TO, Slow flight, Steep turns, Stalls, Engine restart, Vmc demo, Drag Demo' },
      { id: '8', d: 2.0, x: 2.0, g: 0.7, t: 2.0, o: 'Short field TO, XC planning, pilotage/dead reckoning, VOR/GPS, Precision/Non-precision' },
      { id: '9', d: 2.0, x: 2.0, g: 0.7, t: 2.0, o: 'Short field TO, XC planning, VOR/GPS, Precision/Non-precision approaches, go around' },
      { id: '10', d: 2.0, g: 0.7, t: 2.0, o: 'Short field TO, Slow flight, Stalls, Emergency descent, Engine restart, Vmc demo' },
      { id: '11', d: 2.0, g: 3.0, t: 2.0, o: 'Short field TO, Stalls, Emergency descent, Vmc demo, approach with one engine' },
      { id: '12', d: 2.0, g: 3.0, t: 2.0, sc: true, o: 'Final Stage Check: Full multi-engine instructor demonstration' },
    ],
  },
}

export const COURSE_NAMES = Object.keys(COURSES)
