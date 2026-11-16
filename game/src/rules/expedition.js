// The expedition: one run of seven nights across three sky islands. This module owns the whole rule state
// and every transaction a keeper can make (place, flip, lift a relay, turn the well, undo, release a pulse,
// take a boon, buy from the waystation, set out). It never touches the DOM, so tests drive it directly.
//
// Flow:  plan (hours of a night) -> dusk (night summary) -> waystation (boon + shop) -> next night ...
//        ... -> won after the seventh night, or lost the moment hearts reach zero.

import { CELL_COUNT, DIRS, cellX, cellY, inBounds, cellIndex, opposite } from './grid.js';
import { RELAYS, RELAY_ORDER } from './relays.js';
import { traceLight } from './light-trace.js';
import { SPECIES, bloomResponse, sproutBloom } from './blooms.js';
import { ISLANDS, NIGHT_COUNT, nightPlan, startsIsland, generateIsland, gardenCells } from './islands.js';
import { forecastStorm } from './storms.js';
import { availableBoons, boonById } from './boons.js';
import { streamFor, normaliseSeed } from './rng.js';

export const DIFFICULTIES = {
  breeze: { id: 'breeze', name: 'Breeze', blurb: '7 hearts, patient blooms. Score ×0.75', hearts: 7, patienceBonus: 1, scoreMult: 0.75 },
  wayfarer: { id: 'wayfarer', name: 'Wayfarer', blurb: '5 hearts. The intended expedition. Score ×1', hearts: 5, patienceBonus: 0, scoreMult: 1 },
  stormcaller: {
    id: 'stormcaller',
    name: 'Stormcaller',
    blurb: '4 hearts, extra sprouts, a storm every pulse. Score ×1.5',
    hearts: 4,
    patienceBonus: 0,
    scoreMult: 1.5,
    extraSprouts: true,
    stormEveryPulse: true,
  },
};
export const DIFFICULTY_ORDER = ['breeze', 'wayfarer', 'stormcaller'];

export const STARTING_SATCHEL = { mirror: 4, prism: 2, lens: 1, halo: 0 };
export const STARTING_DEW = 4;
export const MEND_PRICE = 5;
export const SKIP_BOON_DEW = 3;
export const FOCUS_CARRY = 2; // focus may bank up to focusPerHour + this
export const ISLAND_SETUP_FOCUS = 4; // landfall: extra focus on the first hour of a new island

/** Start a new expedition. */
export function createRun({ seed = 1, difficulty = 'wayfarer' } = {}) {
  const diff = DIFFICULTIES[difficulty] ?? DIFFICULTIES.wayfarer;
  const run = {
    seed: normaliseSeed(seed),
    difficulty: diff.id,
    phase: 'plan',
    night: 0,
    hour: 0,
    hours: 0,
    plan: null,
    board: null,
    wellDir: 1,
    relays: new Array(CELL_COUNT).fill(null),
    satchel: { ...STARTING_SATCHEL },
    blooms: [],
    nextBloomId: 1,
    clouds: [],
    forecast: null,
    focus: 0,
    hearts: diff.hearts,
    maxHearts: diff.hearts,
    dew: STARTING_DEW,
    score: 0,
    mods: {
      wellStrength: 3,
      prismLoss: 1,
      lensGain: 1,
      haloReach: 4,
      focusPerHour: 3,
      harvestDew: 0,
      patienceBonus: diff.patienceBonus,
      stormproof: false,
      twinAperture: false,
      chorusStep: 0.25,
    },
    boons: [],
    history: [],
    stats: { harvested: 0, withered: 0, bySpecies: {}, nightsCleared: 0, bestChorus: 0, pulses: 0, relaysPlaced: 0, storms: 0 },
    nightLog: null,
    waystation: null,
    lastPulse: null,
  };
  startNight(run, 0);
  return run;
}

// ---------------------------------------------------------------- the light field

/** Directions the well shines in. */
export function wellDirections(run) {
  return run.mods.twinAperture ? [run.wellDir, opposite(run.wellDir)] : [run.wellDir];
}

function fieldFor(run, { relays = run.relays, clouds = cloudSet(run), strength = run.mods.wellStrength } = {}) {
  return {
    terrain: run.board.terrain,
    wellIndex: run.board.wellIndex,
    wellDirs: wellDirections(run),
    relays,
    bloomCells: new Set(run.blooms.map((b) => b.cell)),
    clouds,
    mods: { ...run.mods, wellStrength: strength },
  };
}

const cloudSet = (run) => new Set(run.clouds.map((c) => c.cell));

/** Light as the board stands right now, with no storm applied. */
export function currentLight(run) {
  return traceLight(fieldFor(run));
}

/** What the forecast storm will do to relays/clouds/well strength when the pulse is released. */
function stormedField(run) {
  const storm = run.forecast;
  const relays = run.relays.map((r) => (r ? { ...r } : null));
  const clouds = cloudSet(run);
  let strength = run.mods.wellStrength;
  const knocked = [];
  const flipped = [];
  if (storm) {
    if (storm.kind === 'gale' && !run.mods.stormproof) {
      for (const c of storm.cells) {
        if (relays[c]?.type === 'mirror') {
          relays[c].orient ^= 1;
          flipped.push(c);
        }
      }
    }
    if (storm.kind === 'hail' && !run.mods.stormproof) {
      for (const c of storm.cells) {
        if (relays[c]) {
          knocked.push({ cell: c, type: relays[c].type });
          relays[c] = null;
        }
      }
    }
    if (storm.kind === 'cloud') for (const c of storm.cells) clouds.add(c);
    if (storm.kind === 'eclipse') strength = Math.max(1, strength - 1);
  }
  return { relays, clouds, strength, knocked, flipped };
}

/**
 * Exactly what releasing the pulse now would do: storm applied, light traced, each bloom's response.
 * The board view draws this, so the keeper always sees the true outcome before committing.
 */
export function previewPulse(run) {
  const stormed = stormedField(run);
  const trace = traceLight(fieldFor(run, stormed));
  const responses = new Map(run.blooms.map((b) => [b.id, bloomResponse(b, trace)]));
  return { trace, responses, flipped: stormed.flipped, knocked: stormed.knocked };
}

// ---------------------------------------------------------------- nights and hours

function startNight(run, n) {
  const plan = nightPlan(n, DIFFICULTIES[run.difficulty]);
  run.night = n;
  run.plan = plan;
  run.hours = plan.hours;
  run.hour = 0;
  run.blooms = [];
  run.clouds = [];
  run.phase = 'plan';
  run.waystation = null;
  run.nightLog = { harvested: 0, withered: 0, score: 0, dew: 0, chorus: 0, bonus: 0 };
  const newIsland = startsIsland(n);
  if (newIsland) {
    for (let i = 0; i < CELL_COUNT; i++) {
      if (run.relays[i]) run.satchel[run.relays[i].type] += 1;
      run.relays[i] = null;
    }
    run.board = generateIsland(run.seed, plan.island);
    run.wellDir = openestDirection(run.board);
  }
  run.focus = 0;
  beginHour(run, newIsland ? ISLAND_SETUP_FOCUS : 0);
}

/** The well first faces the direction with the longest clear run of cells. */
function openestDirection(board) {
  let best = 1;
  let bestRun = -1;
  const wx = cellX(board.wellIndex);
  const wy = cellY(board.wellIndex);
  for (let d = 0; d < 4; d++) {
    let n = 0;
    let x = wx + DIRS[d].dx;
    let y = wy + DIRS[d].dy;
    while (inBounds(x, y) && board.terrain[cellIndex(x, y)] !== 'rock') {
      n++;
      x += DIRS[d].dx;
      y += DIRS[d].dy;
    }
    if (n > bestRun) {
      bestRun = n;
      best = d;
    }
  }
  return best;
}

function beginHour(run, bonusFocus = 0) {
  const cap = run.mods.focusPerHour + FOCUS_CARRY + bonusFocus;
  run.focus = Math.min(cap, run.focus + run.mods.focusPerHour + bonusFocus);
  run.history = [];
  const sprouted = sproutForHour(run);
  run.forecast = run.plan.storms.includes(run.hour) ? forecastStorm(run.seed, run.night, run.hour, islandStorms(run), run) : null;
  return sprouted;
}

function islandStorms(run) {
  return ISLANDS[run.plan.island].storms;
}

/**
 * Sprouts for the current hour. Spots come from a seeded shuffle; light-loving blooms prefer cells the
 * light does not yet reach (so each one asks for a new route) and shadecaps prefer cells it does (so they
 * force a reroute). Blooms avoid touching each other where possible.
 */
function sproutForHour(run) {
  const species = run.plan.sprouts[run.hour] ?? [];
  if (!species.length) return [];
  const lit = currentLight(run).crossed;
  const clouds = cloudSet(run);
  const sprouted = [];
  species.forEach((sp, k) => {
    const rng = streamFor(run.seed, 'sprout', run.night, run.hour, k);
    const taken = new Set(run.blooms.map((b) => b.cell));
    const open = rng.shuffle(gardenCells(run.board)).filter((c) => !run.relays[c] && !taken.has(c) && !clouds.has(c));
    if (!open.length) return;
    const lonely = (c) => !run.blooms.some((b) => Math.abs(cellX(b.cell) - cellX(c)) + Math.abs(cellY(b.cell) - cellY(c)) < 2);
    const wantsLight = SPECIES[sp].shade;
    const preferred = open.filter((c) => lit.has(c) === !!wantsLight && lonely(c));
    const cell = preferred[0] ?? open.find(lonely) ?? open[0];
    const bloom = sproutBloom(run.nextBloomId++, sp, cell, run.mods.patienceBonus);
    run.blooms.push(bloom);
    sprouted.push(bloom);
  });
  return sprouted;
}

// ---------------------------------------------------------------- keeper actions (cost focus, undoable)

function snapshot(run) {
  return { relays: run.relays.map((r) => (r ? { ...r } : null)), satchel: { ...run.satchel }, focus: run.focus, wellDir: run.wellDir, placed: run.stats.relaysPlaced };
}

function spendFocus(run) {
  if (run.phase !== 'plan') return 'The night is not in play.';
  if (run.focus < 1) return 'No focus left this hour. Release the pulse (Space).';
  return null;
}

/** Why a relay cannot go on a cell, or null when it can. */
export function placementBlocker(run, cell, type) {
  if (run.phase !== 'plan') return 'The night is not in play.';
  if (!RELAYS[type]) return 'Unknown relay.';
  if ((run.satchel[type] ?? 0) < 1) return `No ${RELAYS[type].name} left in your satchel.`;
  const t = run.board.terrain[cell];
  if (t === 'void') return 'Relays cannot float over a sky rift.';
  if (t === 'rock') return 'A standing stone is in the way.';
  if (t === 'well') return 'That is the Lumen Well.';
  if (run.relays[cell]) return 'A relay already stands there.';
  if (run.blooms.some((b) => b.cell === cell)) return 'A bloom grows there.';
  if (run.focus < 1) return 'No focus left this hour. Release the pulse (Space).';
  return null;
}

export function placeRelay(run, cell, type, orient = 0) {
  const blocked = placementBlocker(run, cell, type);
  if (blocked) return { ok: false, reason: blocked };
  run.history.push(snapshot(run));
  run.satchel[type] -= 1;
  run.relays[cell] = { type, orient: RELAYS[type].rotatable ? orient & 1 : 0 };
  run.focus -= 1;
  run.stats.relaysPlaced += 1;
  return { ok: true, action: 'place', cell, type };
}

export function flipMirror(run, cell) {
  const relay = run.relays[cell];
  if (!relay || !RELAYS[relay.type].rotatable) return { ok: false, reason: 'Only mirrors can be flipped.' };
  const blocked = spendFocus(run);
  if (blocked) return { ok: false, reason: blocked };
  run.history.push(snapshot(run));
  relay.orient ^= 1;
  run.focus -= 1;
  return { ok: true, action: 'flip', cell };
}

/** Lifting a relay back into the satchel is free; placing it again costs the usual focus. */
export function liftRelay(run, cell) {
  if (run.phase !== 'plan') return { ok: false, reason: 'The night is not in play.' };
  const relay = run.relays[cell];
  if (!relay) return { ok: false, reason: 'No relay there.' };
  run.history.push(snapshot(run));
  run.relays[cell] = null;
  run.satchel[relay.type] += 1;
  return { ok: true, action: 'lift', cell, type: relay.type };
}

export function turnWell(run) {
  const blocked = spendFocus(run);
  if (blocked) return { ok: false, reason: blocked };
  run.history.push(snapshot(run));
  run.wellDir = (run.wellDir + 1) % 4;
  run.focus -= 1;
  return { ok: true, action: 'well', dir: run.wellDir };
}

/** Undo the last action of this hour and refund its focus. Released pulses cannot be undone. */
export function undoAction(run) {
  if (run.phase !== 'plan' || !run.history.length) return { ok: false, reason: 'Nothing to undo this hour.' };
  const s = run.history.pop();
  run.relays = s.relays;
  run.satchel = s.satchel;
  run.focus = s.focus;
  run.wellDir = s.wellDir;
  run.stats.relaysPlaced = s.placed;
  return { ok: true, action: 'undo' };
}

// ---------------------------------------------------------------- the pulse

/** Release the pulse: storm strikes, light flows, blooms grow, wilt, are harvested or wither. */
export function releasePulse(run) {
  if (run.phase !== 'plan') return { ok: false, reason: 'The night is not in play.' };
  const diff = DIFFICULTIES[run.difficulty];
  const storm = run.forecast;
  const stormed = stormedField(run);
  for (const k of stormed.knocked) run.satchel[k.type] += 1;
  run.relays = stormed.relays;
  if (storm?.kind === 'cloud') for (const c of storm.cells) run.clouds.push({ cell: c, pulses: 2 });
  if (storm) run.stats.storms += 1;
  const trace = traceLight(fieldFor(run, { strength: stormed.strength }));

  const harvests = [];
  const withers = [];
  const responses = {};
  for (const bloom of run.blooms) {
    const response = bloomResponse(bloom, trace);
    responses[bloom.id] = response;
    bloom.age += 1;
    if (response === 'grow') bloom.growth += 1;
    if (response === 'wilt') bloom.patience -= 1;
    const sp = SPECIES[bloom.species];
    if (bloom.growth >= sp.growth) harvests.push(bloom);
    else if (bloom.patience <= 0) withers.push(bloom);
  }

  const chorus = 1 + run.mods.chorusStep * Math.max(0, harvests.length - 1);
  const harvested = harvests.map((b) => {
    const sp = SPECIES[b.species];
    const points = Math.round(sp.value * chorus * diff.scoreMult);
    const dew = sp.dew + run.mods.harvestDew;
    run.score += points;
    run.dew += dew;
    run.nightLog.score += points;
    run.nightLog.dew += dew;
    run.nightLog.harvested += 1;
    run.stats.harvested += 1;
    run.stats.bySpecies[b.species] = (run.stats.bySpecies[b.species] ?? 0) + 1;
    return { id: b.id, cell: b.cell, species: b.species, points, dew };
  });
  if (harvests.length > 1) {
    run.stats.bestChorus = Math.max(run.stats.bestChorus, harvests.length);
    run.nightLog.chorus = Math.max(run.nightLog.chorus, harvests.length);
  }
  for (const b of withers) {
    run.hearts -= 1;
    run.nightLog.withered += 1;
    run.stats.withered += 1;
  }
  const gone = new Set([...harvests, ...withers].map((b) => b.id));
  run.blooms = run.blooms.filter((b) => !gone.has(b.id));
  run.clouds = run.clouds.map((c) => ({ ...c, pulses: c.pulses - 1 })).filter((c) => c.pulses > 0);
  run.stats.pulses += 1;

  const event = {
    ok: true,
    action: 'pulse',
    night: run.night,
    hour: run.hour,
    storm,
    knocked: stormed.knocked,
    flipped: stormed.flipped,
    trace,
    responses,
    harvested,
    withered: withers.map((b) => ({ id: b.id, cell: b.cell, species: b.species })),
    chorus: harvests.length,
    sprouted: [],
    nightEnded: false,
  };

  if (run.hearts <= 0) {
    run.hearts = 0;
    run.phase = 'lost';
    run.history = [];
    run.lastPulse = event;
    return event;
  }
  run.hour += 1;
  if (run.hour >= run.hours) {
    endNight(run);
    event.nightEnded = true;
  } else {
    event.sprouted = beginHour(run);
  }
  run.lastPulse = event;
  return event;
}

function endNight(run) {
  const diff = DIFFICULTIES[run.difficulty];
  const log = run.nightLog;
  log.unfinished = run.blooms.length;
  log.bonus = Math.round(15 * (run.night + 1) * diff.scoreMult) + (log.withered === 0 ? Math.round(30 * diff.scoreMult) : 0);
  log.flawless = log.withered === 0;
  run.score += log.bonus;
  run.dew += 2;
  log.dew += 2;
  run.blooms = [];
  run.forecast = null;
  run.history = [];
  run.stats.nightsCleared += 1;
  if (run.night === NIGHT_COUNT - 1) {
    log.heartBonus = Math.round(run.hearts * 50 * diff.scoreMult);
    run.score += log.heartBonus;
    run.phase = 'won';
  } else {
    run.phase = 'dusk';
  }
}

// ---------------------------------------------------------------- the waystation between nights

/** Leave the night summary and arrive at the waystation with seeded boon and shop offers. */
export function enterWaystation(run) {
  if (run.phase !== 'dusk') return { ok: false, reason: 'No waystation now.' };
  const rngB = streamFor(run.seed, 'boons', run.night);
  const boonOffers = rngB.shuffle(availableBoons(run.boons)).slice(0, 3).map((b) => b.id);
  const rngS = streamFor(run.seed, 'shop', run.night);
  const pool = ['mirror', 'mirror', 'prism', 'prism', 'lens', 'lens', 'halo'];
  const shop = [];
  while (shop.length < 3) {
    const type = rngS.pick(pool);
    if (shop.filter((o) => o.type === type).length < 2) shop.push({ type, price: RELAYS[type].price, sold: false });
  }
  run.waystation = { boonOffers, boonTaken: null, shop, mended: false };
  run.phase = 'waystation';
  return { ok: true, action: 'waystation' };
}

export function chooseBoon(run, index) {
  const w = run.waystation;
  if (run.phase !== 'waystation' || !w) return { ok: false, reason: 'No waystation now.' };
  if (w.boonTaken) return { ok: false, reason: 'You already chose a boon here.' };
  const id = w.boonOffers[index];
  if (!id) return { ok: false, reason: 'No such boon.' };
  boonById(id).apply(run);
  run.boons.push(id);
  w.boonTaken = id;
  return { ok: true, action: 'boon', id };
}

/** Pass on the boons for a handful of dew. */
export function skipBoon(run) {
  const w = run.waystation;
  if (run.phase !== 'waystation' || !w || w.boonTaken) return { ok: false, reason: 'Nothing to skip.' };
  w.boonTaken = 'skip';
  run.dew += SKIP_BOON_DEW;
  return { ok: true, action: 'skip', dew: SKIP_BOON_DEW };
}

export function buyRelay(run, index) {
  const w = run.waystation;
  if (run.phase !== 'waystation' || !w) return { ok: false, reason: 'No waystation now.' };
  const offer = w.shop[index];
  if (!offer || offer.sold) return { ok: false, reason: 'Already sold.' };
  if (run.dew < offer.price) return { ok: false, reason: `Needs ${offer.price} dew.` };
  run.dew -= offer.price;
  run.satchel[offer.type] += 1;
  offer.sold = true;
  return { ok: true, action: 'buy', type: offer.type };
}

export function mendHeart(run) {
  const w = run.waystation;
  if (run.phase !== 'waystation' || !w) return { ok: false, reason: 'No waystation now.' };
  if (w.mended) return { ok: false, reason: 'The healer rests until the next waystation.' };
  if (run.hearts >= run.maxHearts) return { ok: false, reason: 'Hearts are already full.' };
  if (run.dew < MEND_PRICE) return { ok: false, reason: `Needs ${MEND_PRICE} dew.` };
  run.dew -= MEND_PRICE;
  run.hearts += 1;
  w.mended = true;
  return { ok: true, action: 'mend' };
}

/** Leave the waystation for the next night. An unchosen boon is skipped for dew. */
export function setOut(run) {
  if (run.phase !== 'waystation') return { ok: false, reason: 'No waystation now.' };
  if (!run.waystation.boonTaken) skipBoon(run);
  startNight(run, run.night + 1);
  return { ok: true, action: 'set-out', night: run.night };
}

// ---------------------------------------------------------------- small read helpers

export const isFinalNight = (run) => run.night === NIGHT_COUNT - 1;
export const relayCount = (run) => RELAY_ORDER.reduce((n, t) => n + run.satchel[t], 0) + run.relays.filter(Boolean).length;
export const bloomAt = (run, cell) => run.blooms.find((b) => b.cell === cell) ?? null;
export { NIGHT_COUNT };
