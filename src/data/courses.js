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
    targetTotal: 28.4,
    lessons: [
      { id: '1.1', d: 1.5, g: 1.0, t: 1.5, o: 'Safety practices & procedures, Preflight inspection, Checklist usage, Taxiing, Demo Normal TO & climb, Demo Level off, trim usage, S&L flight, Area fam, Collision avoid, Stability demo (yaw-pitch-roll), Climbs & descents, Medium bank turns, Turn coord, Turn entry/roll out, Demo no power no flap approach & land' },
      { id: '1.2', d: 1.5, g: 0.7, t: 1.5, o: 'Normal TO & climb, Level off, trim usage, S&L flight, Area fam, Climbs & descents, Turns, Turn entry/roll out, Demo no power no flaps approach & land' },
      { id: '1.3', d: 1.8, g: 0.7, t: 1.8, o: 'TO & climb, Left turn tend, Level off, trim use, S&L flight, climbs, descents w/wo flaps, Climbing/Descending turns, Power off descent at Vg, Turn entry/roll out, slow flt, power off stall, radios, Power Off No Flap landing (PONF)' },
      { id: '2.1', d: 1.8, g: 0.7, t: 1.8, o: 'Stall/spin aware, trim, power-off/on stalls, rudder use at high AOA, rudder & power in stall recov, radios, xwind taxi, TO & climb, TP entry/dep, Power off no flap land' },
      { id: '2.2', d: 1.8, g: 0.7, t: 1.8, o: 'Xwind taxi, TO and climb, trim, crabbing, Ground ref, Sideslip, Forward slip, Power-on stall, TP entry/dep, Radios, Power Off No Flap landing' },
      { id: '2.3', d: 1.8, i: 0.3, g: 0.7, t: 1.8, o: 'Xwind taxi, TO & climb, power on/off stalls, crab, sideslip, ADM, steep turns, IR turns, climbs, descents, Radios, Power Off No Flap landing' },
      { id: '2.4', d: 1.8, g: 0.7, t: 1.8, pc: true, o: 'Prog Check: Xwind taxi, TO & climb, slow flt, power on/off stalls, crab, sideslip, trim usage, collision avoid, Radios, Power Off No Flap landing' },
      { id: '3.1', d: 1.8, g: 0.7, t: 1.8, o: 'SA, perf charts, TPs, go around, Radios, crab, sideslip, Power Off No Flap landings (PONF landings until student safely lands unassisted)' },
      { id: '3.2', d: 1.8, g: 0.7, t: 1.8, o: 'TPs, radios, Power Off No Flap landings, go around, crab/sideslip' },
      { id: '3.3', d: 1.8, g: 0.7, t: 1.8, o: 'Slow flt, stalls, TP, Power Off No Flap landings, go around, radios, sim eng out @ alt, at Vy & Vx, emerg descent' },
      { id: '4.1', d: 1.8, i: 0.3, g: 0.7, t: 1.8, o: 'Xwind taxi, radios, trim, IR S&L, IR climb/descend turns, sim eng out, rect course, turn around point, s turns, PONF or normal (if ready) landing, emerg/fail radio, GPS direct to/nrst airport function' },
      { id: '4.2', d: 1.8, g: 0.7, t: 1.8, o: 'Xwind taxi, TO & climb, emer desc, slow flt, power on/off stall, PONF or normal land, wind shear, wake turb, sim engine out to land, go around' },
      { id: '4.3', d: 1.8, i: 0.3, g: 0.7, t: 1.8, o: 'Slow flt, power on/off stall, IR climbing/descending turns, steep turns, system/equip malf, unusual attitudes, emerg descent, sim engine out to land, Forward slip, go around, PONF or normal land' },
      { id: '5.1', d: 2.0, i: 0.1, g: 0.7, t: 2.0, sc: true, o: 'Stage Check: Radios, xwind taxi, TO & climb, trim, slow flt, pwr on/off stall, IR GPS D-to/nrst airport, emerg ops, ground ref, TP entry/dep, go around, PONF or normal landing' },
      { id: '5.2', d: 1.0, s: 0.8, g: 0.7, t: 1.8, o: 'First solo — TO/L to full stop, radios, TP, go around' },
      { id: '5.3', d: 1.0, s: 0.8, g: 0.7, t: 1.8, o: 'Second solo — TO/L to full stop, radios, TP, go around' },
    ],
  },

  'Private 2': {
    avia: 'AVIA225',
    targetTotal: 26.9,
    lessons: [
      { id: '6.1-6.2', d: 1.8, g: 0.7, t: 1.8, o: 'Radios, S turn, turn around a point, steep turn, traffic pattern, normal landing, go around, Short/Soft TO/L intro, ADM' },
      { id: '6.3', d: 1.8, i: 0.5, g: 0.7, t: 1.8, o: 'Slow flt, pwr on/off stalls, CFIT, IR climbing/descending turn, GPS D-to, unusual att, lost' },
      { id: '6.4', s: 1.0, t: 1.0, o: 'Solo to practice area, ground ref man, steep turn, normal landing' },
      { id: '7.1', d: 2.0, x: 2.0, g: 1.5, t: 2.0, o: 'XC flight plan, VFR flt follow, pilotage/dead reck, nav systems (GPS, VOR), track V airway' },
      { id: '7.2', d: 2.0, x: 2.0, g: 0.7, t: 2.0, o: 'XC flight plan, VFR flt follow, pilot/dead reck, nav systems (GPS/VOR), track V airway, emerg comms, lost/divert, equip malf' },
      { id: '7.3', d: 2.0, x: 2.0, g: 0.7, t: 2.0, sc: true, o: 'Stage Check: XC flt plan, VFR flt follow, pilot/dead reck, nav systems (GPS, VOR), track V airway, emerg ops, lost/divert, system/equip malf — must land at 3 points with one >50nm from departure' },
      { id: '7.4', s: 2.5, x: 2.5, t: 2.5, o: 'Solo XC flight plan, VFR flight follow, pilotage/dead reck, nav systems (GPS, VOR), track V airway' },
      { id: '8.1', d: 1.0, n: 1.0, g: 0.7, t: 1.0, combinableWith: '8.2', o: 'Night prep & preflight, airport nav/lighting, required equipment, land w/wo landing light to full stop — need 10 TO/L to a full stop total' },
      { id: '8.2', d: 2.0, x: 2.0, i: 0.5, n: 2.0, g: 0.7, t: 2.0, combinableWith: '8.1', o: 'Night XC, flt plan, VFR flight follow, pilotage/dead reck, nav systems (GPS, VOR), lost/divert, track V airway' },
      { id: '9.1', d: 1.8, i: 0.4, g: 0.7, t: 1.8, o: 'Short/Soft TO/L, slow flt, pwr on/off stalls, steep turn, turn around a point, emerg des, sim eng out, unusual att' },
      { id: '9.2', d: 1.8, g: 0.7, t: 1.8, o: 'Short/Soft TO/L, slow flt, pwr on/off stalls, steep turn, s-turn, emerg des, sim eng out, unusual att' },
      { id: '9.3', d: 1.8, g: 0.7, t: 1.8, o: 'Short/Soft TO/L, slow flt, pwr on/off stalls, steep turn, turn around a point, emerg des, sim eng out, unusual att' },
      { id: '9.4', d: 1.8, g: 3.0, t: 1.8, o: 'Short/Soft TO/L, slow flt, pwr on/off stalls, steep turn, s-turn, emerg des, sim eng out, unusual att, track VOR' },
      { id: '10.1', d: 1.8, i: 0.3, g: 3.0, t: 1.8, sc: true, o: 'Mock Final Stage Check: Short/Soft TO/L, slow flt, power on/off stall, steep turn, ground ref, emerg descent, sim eng out, unusual attitudes, climb/descend turn, track VOR, lost/divert, pilot/dead reck, go around' },
      { id: '10.2', d: 1.8, i: 0.3, g: 3.0, t: 1.8, fsc: true, o: 'Final Stage Check: Short/Soft TO/L, slow flt, pwr on/off stall, steep turn, ground ref, emerg descent, sim eng out, unusual att, climb/descend turn, IR climb/descend turn, track VOR, lost/divert, pilot/dead reck, go around' },
    ],
  },

  Instrument: {
    avia: 'AVIA320',
    targetTotal: 42.5,
    // $1,000 one-time "Simulator Package" at enrollment; covers unlimited
    // Redbird sim time for 3 months (students can practice on their own
    // outside of scheduled lessons).
    enrollmentFee: 1000,
    enrollmentFeeLabel: 'Simulator Package',
    simUnlimited: true,
    lessons: [
      { id: '1.1-1.2', sm: 1.0, g: 1.0, t: 1.0, o: 'Basic instrument flight maneuvers, S&L flight, turns, climbs, descents, climbing turns, descending turns, level-offs' },
      { id: '1.3-1.4', sm: 1.0, g: 1.0, t: 1.0, o: 'S&L flight, turns/climbs/descents, climbing/descending turns, timed/compass turns' },
      { id: '2.1-2.2', sm: 1.0, g: 1.0, t: 1.0, o: 'Filing IFR flt plan, alternates, CRAFT, loss of PFD, basic instrument flight maneuvers, timed/compass, unusual attitudes' },
      { id: '2.3-2.4', sm: 1.0, g: 1.0, t: 1.0, o: 'CRAFT, loss of PFD, basic instrument flight maneuvers, timed/compass, unusual attitudes' },
      { id: '2.5-2.6', sm: 1.0, g: 1.0, t: 1.0, o: 'CRAFT, loss of PFD, basic instrument flight maneuvers, timed/compass, unusual attitudes' },
      { id: '2.7-2A', sm: 1.0, g: 1.0, t: 1.0, sc: true, o: 'Stage Check: CRAFT, loss of PFD, basic instr flt maneuvers, timed/compass, unusual att' },
      { id: '3.1', sm: 1.3, x: 1.3, g: 0.7, t: 1.3, o: 'ADM, fam w avionics, track/intercept GPS courses, navigate to a waypoint/fix' },
      { id: '3.2', sm: 1.3, g: 0.7, t: 1.3, o: 'VOR check, track/intercept VOR courses & Victor airway, unusual attitudes' },
      { id: '3.3', sm: 1.4, g: 0.7, t: 1.4, o: 'CRAFT, Departure Procedures, GPS/VOR nav, Holding entries and procedures' },
      { id: '4.1', sm: 1.4, g: 0.7, t: 1.4, o: 'Dep proc, Holding entries and procedures, loss of PFD, unusual att' },
      { id: '4.2', sm: 1.4, g: 0.7, t: 1.4, o: 'Dep proc, intercept/track DME arcs, non-published holding procedures' },
      { id: '4A', sm: 1.2, g: 0.7, t: 1.2, sc: true, o: 'Stage Check: Dep proc, Holding proc, DME arc, loss of PFD, unusual att, timed/compass' },
      { id: '5.1', d: 2.0, g: 0.7, t: 2.0, o: 'Appr brief, precision app, intercept/track localizer & GS, missed appr, transition to land' },
      { id: '5.2', d: 2.0, g: 0.7, t: 2.0, o: 'RNAV approach w vert guidance, missed appr, transition to land' },
      { id: '5.3', d: 2.0, g: 0.7, t: 2.0, o: 'RNAV appr w/o vert guidance, MDA, missed app' },
      { id: '5.4', d: 2.0, g: 0.7, t: 2.0, o: 'Non precision appr, descend from MDA at VDP, missed appr' },
      { id: '6.1', d: 2.0, g: 0.7, t: 2.0, o: 'VOR approach, loss comms, TAA/course reversal, MDA, missed appr' },
      { id: '6.2', d: 2.0, g: 0.7, t: 2.0, o: 'Circling approach, execute missed from circle, transition to land from circle' },
      { id: '6.3', d: 2.0, g: 0.7, t: 2.0, o: 'Hold proc, precision, non precision, circle, missed, land from straight in/circle, loss comms' },
      { id: '6A', d: 2.0, g: 0.7, t: 2.0, sc: true, o: 'Stage Check: Holding proc, precision, non precision, circling, missed, land straight in/circle, loss comms' },
      { id: '7.1', d: 2.5, x: 2.5, g: 0.7, t: 2.5, o: 'Autopilot, XC plan, dep/enroute/arr procedures, required ATC reports, precision, non precision, land straight in/from circle' },
      { id: '7.2', d: 2.0, g: 0.7, t: 2.0, o: 'Partial Panel Precision, non precision, land from straight in/circle, autopilot' },
      { id: '7.3', d: 4.0, x: 4.0, g: 3.0, t: 4.0, o: 'XC flt plan, autopilot, precision, non precision partial panel, land from straight in/circle — *250nm total with one leg >100nm, three different approaches*' },
      { id: '8.1', d: 2.0, g: 3.0, t: 2.0, o: 'Mock Final Stage Check: Non precision, precision, missed, circling, Partial Panel approach, lost comms proc, holding proc, dep, enroute, arriv proc' },
      { id: '8A', d: 2.0, g: 3.0, t: 2.0, sc: true, fsc: true, o: 'Final Stage Check: Non precision, precision, missed, circling, Partial Panel approach, lost comms proc, holding proc, dep, enroute, arriv proc' },
    ],
  },

  'Commercial 1': {
    avia: 'AVIA325',
    targetTotal: 42.0,
    repeatBufferDual: 1.0,                                 // shorter targeted repeats on the Commercial syllabuses
    lessons: [
      { id: '1.1', d: 3.0, x: 3.0, i: 0.5, g: 0.7, t: 3.0, o: 'Pilotage/Dead reck, track VOR/GPS, Lost/divert, Sim system/engine out, one landing >100nm from departure airport, Normal landing' },
      { id: '1.2', d: 1.0, i: 0.2, n: 1.0, g: 0.7, t: 1.0, o: 'Night TO/L\'s in the pattern with/without landing light' },
      { id: '1.3', s: 4.0, x: 4.0, t: 4.0, o: 'Pilotage/Dead reck, track VOR/GPS, track V airway, one landing >100nm from departure airport, Normal landing' },
      { id: '1.4', d: 4.0, x: 4.0, i: 0.9, n: 4.0, g: 0.7, t: 4.0, o: 'Night Pilotage/Dead reck, VOR/GPS nav, Lost/divert, Sim system/engine out, one landing >100nm from departure airport, Go-around, Normal landing' },
      { id: '1.5', s: 1.5, n: 1.5, t: 1.5, o: 'Solo night TO/L\'s in the pattern' },
      { id: '2.1', s: 4.0, x: 4.0, t: 4.0, o: 'Pilotage/Dead reck, track VOR/GPS, one landing >100nm from departure airport, Normal landing' },
      { id: '2.2', s: 1.5, n: 1.5, t: 1.5, o: 'Solo night TO/L\'s in the pattern' },
      { id: '2.3', s: 4.0, x: 4.0, n: 4.0, t: 4.0, o: 'Pilotage/Dead reck, track VOR/GPS, land at 3 points with one >250nm straight line, Normal TO/L\'s' },
      { id: '2.4', s: 4.0, x: 4.0, t: 4.0, o: 'Pilotage/Dead reck, track VOR/GPS, one landing >100nm from departure airport, po 180 and Normal landing' },
      { id: '2A', d: 3.0, x: 3.0, i: 0.4, g: 0.7, t: 3.0, pc: true, o: 'Prog Check: Pilotage/Dead reck, track VOR/GPS, unusual attitude recovery, Lost/divert, Sim system/engine out, one landing >100nm straight line, Normal landing' },
      { id: '3.1', s: 4.0, x: 4.0, t: 4.0, o: 'Pilotage/Dead reck, track VOR/GPS, one landing >100nm from departure airport, po 180, Short/soft TO/L\'s' },
      { id: '3.4', s: 6.0, x: 6.0, t: 6.0, o: 'Pilotage/Dead reck, track VOR/GPS, one landing >250nm from departure airport (at least 3 points of landing), po 180, Short/soft TO/L\'s' },
      { id: '3A', d: 2.0, x: 2.0, i: 0.5, g: 0.7, t: 2.0, sc: true, pc: true, o: 'Prog Check: Pilotage/Dead reck, track VOR/GPS, unusual att, lost/divert, sim system/engine fail, one landing >50nm, po 180, Short/soft TO/L\'s, go-around' },
    ],
  },

  'Commercial 2': {
    avia: 'AVIA326',
    targetTotal: 42.0,
    repeatBufferDual: 1.0,
    lessons: [
      { id: '3.2', s: 4.0, x: 4.0, t: 4.0, o: 'Pilotage/Dead reck, track VOR/GPS, one landing >100nm from departure arpt, po 180, Short/soft TO/L\'s' },
      { id: '3.3', s: 4.0, x: 4.0, t: 4.0, o: 'Pilotage/Dead reck, track VOR/GPS, one landing >100nm from departure arpt, po 180, Short/soft TO/L\'s' },
      { id: '4.1', d: 2.0, g: 0.7, t: 2.0, o: 'TAA airplane: slow flight, normal TO/L\'s' },
      { id: '4.2', d: 2.0, i: 0.5, g: 0.7, t: 2.0, o: 'TAA airplane: slow flt, power off/on stall, unusual att, sim instr climb/des turns, go-around, normal TO/L\'s' },
      { id: '4A', d: 2.0, i: 0.5, g: 0.7, t: 2.0, pc: true, o: 'Prog Check: TAA airplane: slow flt, power off/on stall, unusual att, sim instr climb/des turns, go-around, normal TO/L\'s' },
      // simInstrFree: this Comm 2 sim lesson does NOT bill instructor time on
      // sim hours (per school policy). Ground target removed too — these sim
      // sessions don't carry a ground component.
      { id: '5.1', sm: 2.0, i: 0.3, t: 2.0, simInstrFree: true, o: 'Slow flt, power off/on & accel stall, steep turns, steep spiral, emerg des, po 180, Short/soft TO/L\'s' },
      { id: '5.2', sm: 2.0, i: 0.3, t: 2.0, simInstrFree: true, o: 'Steep turns, chandelle, steep spiral, emerg des, po 180, Short/soft TO/L\'s' },
      { id: '5.3', d: 3.0, g: 0.7, t: 3.0, o: 'Steep turns/spiral, chandelle, po 180, Short/soft TO/L\'s' },
      { id: '5.4', sm: 3.0, i: 0.5, t: 3.0, simInstrFree: true, o: 'Steep turns, chandelle, accelerated stall, steep spiral, lazy 8\'s, sim instr unusual attitudes & tracking courses' },
      { id: '5.5', d: 3.0, g: 0.7, t: 3.0, o: 'Power off/on & accel stall, steep turns, steep spiral, chandelle, lazy 8\'s, po 180, Short/soft TO/L\'s' },
      { id: '5.6', sm: 3.0, i: 0.6, t: 3.0, simInstrFree: true, o: 'Steep turns/spiral, chandelle, lazy 8\'s, sim instrument climb/descend turns & unusual att, po 180, 8\'s on pylon, Short/Soft TO/L\'s' },
      { id: '5.7', s: 3.0, t: 3.0, o: 'Power off/on stall, steep turns, steep spiral, chandelle, lazy 8\'s, 8\'s on pylon, po 180, Short/Soft TO/L\'s' },
      { id: '5.8', d: 5.0, x: 5.0, g: 0.7, t: 5.0, o: 'Pilotage/Dead reck, track VOR/GPS, one landing >50nm from departure airport, po 180, Short/soft TO/L\'s' },
      { id: '5.9', d: 2.0, i: 0.5, g: 0.7, t: 2.0, o: 'Power off/on stall, steep turns, steep spiral, chandelle, lazy 8\'s, 8\'s on pylon, IR climb/descend turns & unusual att, po 180, Short/Soft TO/L\'s' },
      { id: '5A', d: 2.0, i: 0.5, g: 0.7, t: 2.0, sc: true, o: 'Stage Check: Slow flt, power off/on stall, steep turns, steep spiral, chandelle, lazy 8\'s, 8\'s on pylon, instrument climb/descend turns & unusual att, po 180, Short/Soft TO/L\'s' },
    ],
  },

  'Commercial 3': {
    avia: 'AVIA327',
    targetTotal: 36.0,
    repeatBufferDual: 1.0,
    lessons: [
      { id: '6.1', d: 4.0, i: 0.8, g: 0.7, t: 4.0, splittable: true, o: 'Power off/on & accel stall, steep turns/spiral, chandelle, lazy 8\'s, sim instrument track courses & unusual att, po 180, 8\'s on pylon, Short/Soft TO/L\'s' },
      { id: '6.2', s: 4.0, t: 4.0, splittable: true, o: 'Steep turns, chandelle, steep spiral, lazy 8\'s, 8\'s on pylon, po 180, Short/soft TO/L\'s' },
      { id: '6.3', d: 3.0, x: 3.0, i: 0.7, g: 0.7, t: 3.0, o: 'TAA airplane: Pilotage/Dead reck, track VOR/GPS, power off/on stall, one landing >50nm from departure airport, sim system/engine fail, po 180, go around, Short/soft TO/L\'s' },
      { id: '6.4', s: 6.0, x: 6.0, t: 6.0, splittable: true, o: 'Pilotage/Dead reck, track VOR/GPS, one landing >50nm from departure airport, po 180, Short/soft TO/L\'s' },
      { id: '7.1', d: 3.0, i: 0.3, g: 0.7, t: 3.0, o: 'Steep turns/spiral, chandelle, lazy 8\'s, sim instrument unusual att, po 180, 8\'s on pylon, Short/Soft TO/L\'s' },
      { id: '7.2', d: 5.0, x: 5.0, i: 1.0, g: 0.7, t: 5.0, splittable: true, o: 'XC flight plan, pilotage/dead reck, ILS/GPS app, track nav systems partial panel, one landing >100nm from departure airport' },
      { id: '7.3', s: 5.0, x: 5.0, t: 5.0, splittable: true, o: 'Pilotage/Dead reck, track VOR/GPS, one landing >50nm from departure airport, po 180, go around, Short/soft TO/L\'s' },
      { id: '8.1', d: 4.0, i: 0.5, g: 0.7, t: 4.0, sc: true, splittable: true, o: 'Mock Final Stage Check: Track VOR/GPS, power off/on & accel stall, steep turns/spiral, chandelle, lazy 8\'s, emerg descent, po 180, go around, Short/soft TO/L\'s' },
      { id: '8.2', g: 3.0, t: 0, o: 'Ground lesson: Mock final review all ground material' },
      { id: '8A', d: 2.0, i: 0.7, g: 3.0, t: 2.0, sc: true, fsc: true, o: 'Final Stage Check: Pilotage/Dead reck, sim instr track VOR/GPS and unusual att, divert/lost, slow flt, power off/on & accel stall, steep turns, steep spiral, chandelle, lazy 8\'s, 8\'s on pylon, emergency descent, po 180, go around, Short/soft TO/L\'s' },
    ],
  },

  CFI: {
    avia: 'AVIA420',
    targetTotal: 29.2,
    lessons: [
      { id: '1.1', d: 1.8, g: 0.7, t: 1.8, o: 'Preflight, normal/crosswind takeoff and climb, go around, straight & level, turns, climbs, descents, climbing turns, descending turns, steep turns, slow flight, power on/off stall, PONF landings' },
      { id: '1.2', d: 1.8, g: 0.7, t: 1.8, o: 'Short/soft TO, slip to land, turn around a point, rect course, s turn, equip fail, go around, straight & level, turns, climbs, descents, climbing turns, descending turns, steep turns, slow flight, power on/off stall, equip fail, emerg descent, sim engine out, PONF landings' },
      { id: '1.3', d: 1.8, g: 0.7, t: 1.8, o: 'Steep turns, slow flight, power on/off stall, equip fail, emerg descent, sim engine out, PONF landings' },
      { id: '1.4', d: 1.8, i: 0.3, g: 0.7, t: 1.8, o: 'Short/soft TO/L, turn around a point, Sim Instr: straight & level, turns, climbs, descents, climbing turns, descending turns, unusual attitudes, steep turns, slow flight, emerg descent, sim engine out, po 180, secondary stall, accelerated stall, chandelle' },
      { id: '1.5', d: 1.8, i: 0.3, g: 0.7, t: 1.8, o: 'Short/soft TO/L, Sim Instr: straight & level, turns, climbs, descents, climbing turns, descending turns, unusual attitudes, steep turns, slow flight, sim engine out, po 180, secondary stall, accelerated stall, chandelle, steep spiral' },
      { id: '1A', d: 1.8, g: 0.7, t: 1.8, sc: true, o: 'Stage Check: short/soft TO/L, power on/off stalls, steep turns, chandelle, lazy eights, eights on pylons, cross controlled/elevator trim stalls, steep spiral, emerg descent, sim engine out' },
      { id: '2.1', d: 1.8, g: 0.7, t: 1.8, o: 'Short/soft TO/L, power on/off stalls, lazy eights, eights on pylons, cross controlled/elevator trim stalls, go around, po 180, spin endorsement' },
      { id: '2.2', d: 1.8, g: 0.7, t: 1.8, o: 'Short/soft TO, slip to land, turn around a point, s turn, go around, steep turns, eights on pylons, emerg descent, sim engine out, po 180, steep spiral, chandelle, accelerated stall, power on/off stall, lazy eights' },
      { id: '2.3', d: 1.8, g: 0.7, t: 1.8, o: 'Steep turns, eights on pylons, emerg descent, sim engine out, po 180, steep spiral, chandelle, accelerated stall, power on/off stall, lazy eights' },
      { id: '2A', d: 1.8, g: 0.7, t: 1.8, sc: true, o: 'Stage Check: short/soft TO/L, slip to land, go around, po 180, steep spiral, chandelles, lazy eights, s turns, 8\'s on pylons, cross controlled stall, elevator trim stall, secondary stall, accel stall, sim engine out, equip fail, emerg descent' },
      { id: '3.1', d: 1.8, i: 0.3, g: 0.7, t: 1.8, o: 'Normal TO, slip to land, go around, steep turns, rect course, s turns, turn around point, slow flight, power on/off stall, Sim instr: climbs/turns/descent, climbing/descending turns, unusual attitudes, sim engine out, equip fail, emerg descent' },
      { id: '3.2', d: 1.8, g: 0.7, t: 1.8, o: 'Short/soft TO/L, po 180, steep spiral, chandelle, lazy eights, eights on pylons, slow flight, power on/off stall, accel stall, sim engine out, emergency descent, equip fail' },
      { id: '3A', d: 1.8, g: 0.7, t: 1.8, sc: true, o: 'Stage Check: Short/soft TO/L, po 180, lazy eights, eights on pylons, slow flight, power on/off stall, cross cont stall, elevator trim stall, secondary stall, accel stall, sim engine out, emergency descent' },
      { id: '4.1', d: 2.0, i: 0.3, g: 3.0, t: 2.0, sc: true, o: 'Mock Stage Check: Short/soft TO/L, po 180, steep turns, steep spiral, chandelle, lazy eights, eights on pylons, demo stalls, accel stall, sim engine out, emergency descents, s turn' },
      { id: '4.2', d: 2.0, g: 3.0, t: 2.0, o: 'Short/soft TO/L, slip to land, s turn, turn around a point, power on/off stall, Sim Instr: turns, climbing turns, descending turns, unusual attitudes, steep turns, chandelle, lazy eights, 8\'s on pylons, po 180' },
      { id: '4A', d: 1.8, i: 0.3, g: 3.0, t: 1.8, sc: true, fsc: true, o: 'Final Stage Check: Short/soft TO/L, po 180, steep turns, steep spiral, chandelle, lazy eights, 8\'s on pylons, demo stalls, accel stall, sim engine out, emerg descent, s turn, rect course, turn around point, unusual attitudes, sim instr: climbing turns, descending turn' },
    ],
  },

  CFII: {
    avia: 'AVIA423',
    targetTotal: 18.0,
    lessons: [
      { id: '1.1-1.2', d: 2.0, i: 1.5, g: 0.7, t: 2.0, o: 'CRAFT, ODP/DP, Basic instrument maneuvers — straight and level, level turns, timed turns, compass turns, constant airspeed climbs/descents, level offs, unusual attitudes, intercepting/track courses, navigation system orient, precision approach, DME arc, hold' },
      { id: '1.3-2.1', d: 2.0, i: 1.5, g: 0.7, t: 2.0, o: 'CRAFT, ODP/DP, Precision/nonprecision appr, missed appr, use of autopilot, hold, unusual attitudes' },
      { id: '2.2-2.3', d: 2.0, i: 1.5, g: 0.7, t: 2.0, o: 'CRAFT, ODP/DP, Precision/nonprecision appr, missed appr, use of autopilot, hold, unusual attitudes, dme arc, loss of primary flight instruments, sim lost comms' },
      { id: '2A', d: 2.0, i: 1.5, g: 0.7, t: 2.0, sc: true, o: 'Stage Check: CRAFT, ODP/DP, Precision/nonprecision appr, land from circle, missed appr, use of autopilot for approach, hold, unusual attitudes, sim lost comm' },
      { id: '3.1', d: 2.0, i: 1.5, g: 0.7, t: 2.0, o: 'CRAFT, ODP/DP, Precision/nonprecision appr, land from circle, missed appr, use of autopilot for approach, hold, unusual attitudes, sim lost comm' },
      { id: '3.2', d: 2.0, i: 1.5, g: 3.0, t: 2.0, o: 'CRAFT, ODP/DP, Precision/nonprecision appr (flown by instr & critiqued by student), pp non precision, land from circle, missed appr, use of autopilot for approach, hold, unusual attitudes, sim lost comm' },
      { id: '4.1', d: 2.0, i: 1.5, g: 3.0, t: 2.0, sc: true, o: 'Mock Final Stage Check: CRAFT, ODP/DP, Precision/nonprecision appr, pp non precision, land from circle or straight in, missed appr, use of autopilot for approach, hold, unusual attitudes, sim lost comm, compass/timed turns' },
      { id: '4A', d: 2.0, i: 1.5, g: 3.0, t: 2.0, sc: true, fsc: true, o: 'Final Stage Check: CRAFT, ODP/DP, compass/timed turns, unusual attitudes, precision, non precision, pp non precision, appr with autopilot, circling appr, circle/straight in to land, missed appr, hold, loss comms' },
    ],
  },

  'Multi Engine': {
    avia: 'AVIA440',
    targetTotal: 17.6,
    lessons: [
      { id: '1.1', d: 1.8, g: 0.7, t: 1.8, o: 'Preflight, taxi, checklists, straight and level (VR-IR), climbs/descents/turns (VR-IR), climbing turns, descending turns (VR-IR), traffic patterns, normal/crosswind landings' },
      { id: '2.1', d: 2.0, g: 0.7, t: 2.0, o: 'Short field TO/climb, slow flight, maneuvering with one engine inop (simulated), sim engine out, equip fail, steep turns, emergency descent, short field land, go around' },
      { id: '2A', d: 1.8, g: 0.7, t: 1.8, sc: true, o: 'Stage Check: Engine fail during TO before VMC (sim), after liftoff (sim), land with one engine (sim), power off/on stall w/wout turn, proc for feathering, shutdown & restart, vmc demo, short field TO/climb, slow flight, maneuvering with one engine inop (simulated), sim engine out, equip fail, steep turns, emergency descent, short field land, go around' },
      { id: '3.1', d: 2.0, i: 1.3, g: 0.7, t: 2.0, o: 'S&L, steep turns, slow flight, climb/descents (IR), intercept/track courses, partial panel navigation, unusual attitudes, engine fail during flight (sim) (IR), maneuver w one engine inop (sim) (IR), precision/non-precision approach both engine/single engine, land from straight in or circle, missed appr' },
      { id: '3.2', d: 2.0, i: 1.3, g: 0.7, t: 2.0, o: 'Short TO, engine fail during TO before VMC (sim), after lift off (sim), steep turns, slow flight, power on/off stall w & w/out turns, emerg descent, procedures for shutdown, feather, restart, man with one engine, eng fail during flight (IR), precision/non-precision approach both engine/single engine, land from straight in or circle, missed appr' },
      { id: '3A', d: 2.0, i: 1.3, g: 0.7, t: 2.0, sc: true, o: 'Stage Check: Climb/descents (IR), partial panel nav, unusual attitude, engine fail during flight (sim) (IR), maneuvering with one engine inop (sim) (IR), precision/non-precision approach one-engine inop, land from straight in or circle, missed appr' },
      { id: '4.1', d: 2.0, i: 0.4, x: 2.0, g: 3.0, t: 2.0, o: 'VFR or IFR XC, at least one inst appr and landing 100nm from departure arpt (one engine inop-sim), normal TO, maneuver with one engine inop, engine fail during flight (sim) (IR), normal/crosswind land' },
      { id: '4.2', d: 2.0, i: 0.4, x: 2.0, n: 2.0, g: 3.0, t: 2.0, o: 'Night VFR or IFR XC, at least one inst appr and landing 100nm from departure arpt (one engine inop-sim), normal TO, maneuver with one engine inop, engine fail during flight (sim) (IR), normal/crosswind land' },
      { id: '5.1', d: 2.0, i: 0.3, g: 3.0, t: 2.0, sc: true, fsc: true, o: 'Final Stage Check: Normal & short TO, engine fail during TO before VMC (sim), after lift off (sim), steep turns, slow flight, power on/off stall w & w/out turns, emerg descent, procedures for shutdown, feather, restart, man with one engine, eng fail during flight (IR), equip malf, land with one engine inop (sim), go around with one engine (sim), normal/short field land' },
    ],
  },

  'Multi Engine Instructor': {
    avia: 'AVIA443',
    targetTotal: 24.0,
    // MEI student is already a CFI, so the senior instructor teaching them bills at $110/hr
    // for both flight and ground (vs. $100 line rate on other courses).
    instructorRate: 110,
    groundRate: 110,
    lessons: [
      { id: '1', d: 2.0, g: 0.7, t: 2.0, o: 'Preflight, Engine start, Taxi, Before takeoff, Normal takeoff & climb, Normal approach & land' },
      { id: '2', d: 2.0, g: 0.7, t: 2.0, o: 'Normal takeoff & climb, Slow flight, Steep turns, Power on/off stalls, Accelerated stall, Emergency descent, Normal approach & land' },
      { id: '3', d: 2.0, g: 0.7, t: 2.0, o: 'Emergency descent, Engine restart/shutdown, Maneuver with one engine, Vmc demo, Systems and equip malfunction, normal approach/land' },
      { id: '4', d: 2.0, g: 0.7, t: 2.0, o: 'Short field TO/climb, Short field appr/landing, Go around, Engine fail before VMC, Engine failure after lift off, Approach and landing with one engine' },
      { id: '5', d: 2.0, g: 0.7, t: 2.0, o: 'Short field TO/climb, Short field appr/landing, Go around, Engine fail before VMC, Engine failure after lift off, Approach and landing with one engine, Drag demo' },
      { id: '6', d: 2.0, g: 0.7, t: 2.0, o: 'Short field TO/climb, Slow flight, Steep turns, Power on/off stalls, Accelerated stall, Emergency descent, Normal approach & land, Engine fail before VMC, Engine failure after liftoff, Approach and landing with one engine' },
      { id: '7', d: 2.0, g: 0.7, t: 2.0, sc: true, o: 'Stage Check: Short field TO/climb, Slow flight, Steep turns, Power on/off stalls, Accelerated stall, Emergency descent, Engine restart/shutdown, Maneuver with one engine, Vmc demo, Drag Demo, Systems and equip malfunction, Go around, Engine fail before VMC, Engine failure after liftoff, Approach and landing with one engine, Short approach & land' },
      { id: '8', d: 2.0, x: 2.0, g: 0.7, t: 2.0, o: 'Short field TO/climb, XC flight planning, pilotage/dead reckoning, tracking VOR/GPS courses, Precision/Non-precision approaches, go around' },
      { id: '9', d: 2.0, x: 2.0, g: 0.7, t: 2.0, o: 'Short field TO/climb, XC flight planning, pilotage/dead reckoning, tracking VOR/GPS courses, Precision/Non-precision approaches, go around' },
      { id: '10', d: 2.0, g: 0.7, t: 2.0, o: 'Short field TO/climb, Slow flight, Steep turns, Power on/off stalls, Accelerated stall, Emergency descent, Engine restart/shutdown, Maneuver with one engine, Vmc demo, Drag Demo, Systems and equip malfunction, Go around, Engine fail before VMC, Engine failure after liftoff, Approach and landing with one engine, Short approach & land' },
      { id: '11', d: 2.0, g: 3.0, t: 2.0, sc: true, o: 'Mock Final Stage Check: Short field TO/climb, Slow flight, Steep turns, Power on/off stalls, Accelerated stall, Emergency descent, Engine restart/shutdown, Maneuver with one engine, Vmc demo, Drag Demo, Systems and equip malfunction, Go around, Engine fail before VMC, Engine failure after liftoff, Approach and landing with one engine, Short approach & land' },
      { id: '12', d: 2.0, g: 3.0, t: 2.0, fsc: true, o: 'Final Stage Check: Short field TO/climb, Slow flight, Steep turns, Power on/off stalls, Accelerated stall, Emergency descent, Engine restart/shutdown, Maneuver with one engine, Vmc demo, Drag Demo, Systems and equip malfunction, Go around, Engine fail before VMC, Engine failure after liftoff, Approach and landing with one engine, Short approach & land' },
    ],
  },
}

export const COURSE_NAMES = Object.keys(COURSES)

/**
 * Default "what comes next" progression after a student finishes a course.
 * First entry in each array is the most common next step; additional entries
 * are common alternatives surfaced in the dropdown.
 *
 * Typical AA / Liberty track:
 *   Private 1 → Private 2 → Instrument → Commercial 1 → 2 → 3 → CFI → CFII
 * Common variants:
 *   - Some students slot Multi Engine in after Commercial 3 (before CFI)
 *   - Some go MEI after Multi Engine instead of CFII
 */
export const NEXT_COURSE_OPTIONS = {
  'Private 1':                ['Private 2'],
  'Private 2':                ['Instrument'],
  'Instrument':               ['Commercial 1'],
  'Commercial 1':             ['Commercial 2'],
  'Commercial 2':             ['Commercial 3'],
  'Commercial 3':             ['CFI', 'Multi Engine'],
  'CFI':                      ['CFII'],
  'CFII':                     ['Multi Engine', 'Multi Engine Instructor'],
  'Multi Engine':             ['CFI', 'CFII', 'Multi Engine Instructor'],
  'Multi Engine Instructor':  [],
}

/**
 * Older syllabus versions. Keyed by "<course>:<version>".
 * A student's `courseHistory[i].syllabusVersion` field can reference one of
 * these so a historical course renders against the syllabus that was in
 * effect when they took it, even after the current syllabus is changed.
 */
export const COURSE_VERSIONS = {
  // Private 2 before Spring 2026 merge of 6.1 and 6.2 into a single lesson.
  // Last-semester students (e.g. Gwen Pinto) trained against this version.
  // Commercial 1 before Spring 2026 — lesson 3.4 was 5.0 hr (now 6.0).
  // Adam Medina's historical Commercial 1 trained against this version.
  'Commercial 1:pre-2026-spring': {
    avia: 'AVIA325',
    targetTotal: 41.0,
    lessons: [
      { id: '1.1', d: 3.0, x: 3.0, i: 0.5, g: 0.7, t: 3.0, o: 'Pilotage/Dead reck, VOR/GPS, one landing >100nm, Normal landing' },
      { id: '1.2', d: 1.0, i: 0.2, n: 1.0, g: 0.7, t: 1.0, o: 'Night TO/L\'s in pattern with/without landing light' },
      { id: '1.3', s: 4.0, x: 4.0, t: 4.0, o: 'Pilotage/Dead reck, VOR/GPS, track V airway, one landing >100nm' },
      { id: '1.4', d: 4.0, x: 4.0, i: 0.7, n: 4.0, g: 0.7, t: 4.0, o: 'Night Pilotage/Dead reck, VOR/GPS, one landing >100nm, Go-around' },
      { id: '1.5', s: 1.5, n: 1.5, t: 1.5, o: 'Solo night TO/L\'s in the pattern' },
      { id: '2.1', s: 4.0, x: 4.0, t: 4.0, o: 'Pilotage/Dead reck, VOR/GPS, one landing >100nm, Normal' },
      { id: '2.2', s: 1.5, n: 1.5, t: 1.5, o: 'Solo night TO/L\'s in the pattern' },
      { id: '2.3', s: 4.0, x: 4.0, n: 4.0, t: 4.0, o: 'Pilotage/Dead reck, VOR/GPS, land at 3 points with one >250nm straight line' },
      { id: '2.4', s: 4.0, x: 4.0, t: 4.0, o: 'Pilotage/Dead reck, VOR/GPS, one landing >100nm, po 180, Normal' },
      { id: '2A', d: 3.0, x: 3.0, i: 0.4, g: 0.7, t: 3.0, pc: true, o: 'Prog Check: Pilotage/Dead reck, VOR/GPS, unusual att, lost/divert, >100nm' },
      { id: '3.1', s: 4.0, x: 4.0, t: 4.0, o: 'Pilotage/Dead reck, VOR/GPS, one landing >100nm, po 180, Short/soft' },
      { id: '3.4', s: 5.0, x: 5.0, t: 5.0, o: 'Pilotage/Dead reck, VOR/GPS, one landing >250nm (at least 3 points), Short/soft' },
      { id: '3A', d: 2.0, x: 2.0, i: 0.5, g: 0.7, t: 2.0, sc: true, pc: true, o: 'Prog Check: Pilotage/Dead reck, VOR/GPS, unusual att, lost/divert, >50nm, Short/soft' },
    ],
  },
  'Private 2:pre-2026-spring': {
    avia: 'AVIA225',
    targetTotal: 28.7,
    lessons: [
      { id: '6.1', d: 1.8, g: 0.7, t: 1.8, o: 'Radios, S turn, turn around point, steep turn, traffic pattern' },
      { id: '6.2', d: 1.8, g: 0.7, t: 1.8, o: 'Short/Soft TO/L intro, ADM, traffic pattern' },
      { id: '6.3', d: 1.8, i: 0.5, g: 0.7, t: 1.8, o: 'Slow flt, stalls, CFIT, IR climbing/descending turn, GPS, unusual att, lost' },
      { id: '6.4', s: 1.0, t: 1.0, o: 'Solo to practice area, ground ref, steep turn, normal landing' },
      { id: '7.1', d: 2.0, x: 2.0, g: 1.5, t: 2.0, o: 'XC flight plan, VFR flt follow, pilotage/dead reck, nav systems' },
      { id: '7.2', d: 2.0, x: 2.0, g: 0.7, t: 2.0, o: 'XC plan, pilot/dead reck, nav systems, emerg comms, lost/divert' },
      { id: '7.3', d: 2.0, x: 2.0, g: 0.7, t: 2.0, sc: true, o: 'Stage Check: XC plan, nav systems, emerg ops, lost/divert, system malf' },
      { id: '7.4', s: 2.5, x: 2.5, t: 2.5, o: 'Solo XC flight plan, VFR follow, pilotage/dead reck, nav systems' },
      { id: '8.1', d: 1.0, n: 1.0, g: 0.7, t: 1.0, combinableWith: '8.2', o: 'Night prep, airport nav/lighting, land w/wo landing light' },
      { id: '8.2', d: 2.0, x: 2.0, i: 0.5, n: 2.0, g: 0.7, t: 2.0, combinableWith: '8.1', o: 'Night XC, flt plan, VFR follow, pilotage/dead reck, nav systems' },
      { id: '9.1', d: 1.8, i: 0.4, g: 0.7, t: 1.8, o: 'Short/Soft TO/L, slow flt, stalls, steep turn, turn around point, emerg des' },
      { id: '9.2', d: 1.8, g: 0.7, t: 1.8, o: 'Short/Soft TO/L, slow flt, stalls, steep turn, s-turn, emerg des' },
      { id: '9.3', d: 1.8, g: 0.7, t: 1.8, o: 'Short/Soft TO/L, slow flt, stalls, steep turn, emerg des' },
      { id: '9.4', d: 1.8, g: 3.0, t: 1.8, o: 'Short/Soft TO/L, slow flt, stalls, steep turn, emerg des, track VOR' },
      { id: '10.1', d: 1.8, i: 0.3, g: 3.0, t: 1.8, sc: true, o: 'Stage Check' },
      { id: '10.2', d: 1.8, i: 0.3, g: 3.0, t: 1.8, fsc: true, o: 'Final Stage Check' },
    ],
  },
}

/**
 * Resolve a course definition for a (course, optional version) pair. Falls
 * back to the current syllabus when no version is given.
 */
export function getCourseDef(courseName, version) {
  if (version) {
    const versioned = COURSE_VERSIONS[`${courseName}:${version}`]
    if (versioned) return versioned
  }
  return COURSES[courseName]
}

/**
 * Find a student's syllabus version for a given course by checking their
 * courseHistory. Returns undefined for the current course (uses default).
 */
export function syllabusVersionFor(student, courseName) {
  return student?.courseHistory?.find((h) => h.course === courseName)?.syllabusVersion
}
