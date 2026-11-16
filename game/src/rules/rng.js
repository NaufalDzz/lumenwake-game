// Seeded randomness for LUMENWAKE. Every random choice in a run (island shapes, storm targets, sprout
// spots, boon and shop offers) draws from a stream derived from the run seed plus a purpose label, so the
// same seed always plays out the same way and choices in one hour never shift the dice of another.

/** 32-bit FNV-1a hash of any list of strings/numbers, used to derive independent sub-seeds. */
export function hashSeed(...parts) {
  let h = 0x811c9dc5;
  for (const part of parts) {
    const s = String(part);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    h ^= 0x2f;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Mulberry32 generator wrapped with the few helpers the rules need. */
export function createRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    chance(p) {
      return next() < p;
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    shuffle(list) {
      const out = list.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

/** A stream for one purpose of one run, e.g. streamFor(seed, 'storm', night, hour). */
export function streamFor(seed, ...purpose) {
  return createRng(hashSeed(seed, ...purpose));
}

/** Seeds shown to players are 4-6 digit numbers; normalise anything else into that range. */
export function normaliseSeed(value) {
  const n = Math.abs(Math.floor(Number(value) || 0)) % 1000000;
  return n === 0 ? 1 : n;
}
