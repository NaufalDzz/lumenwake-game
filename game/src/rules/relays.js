// The four light relays a keeper carries. Each changes a passing beam in its own way; the tracer in
// light-trace.js asks these functions what happens, so the rules for a relay live in one place.

export const RELAYS = {
  mirror: {
    id: 'mirror',
    name: 'Mirror',
    price: 3,
    rotatable: true,
    blurb: 'Bends a beam 90°. Click it again to flip.',
  },
  prism: {
    id: 'prism',
    name: 'Prism',
    price: 5,
    rotatable: false,
    blurb: 'Splits a beam left and right, each 1 weaker.',
  },
  lens: {
    id: 'lens',
    name: 'Lens',
    price: 4,
    rotatable: false,
    blurb: 'Focuses a beam passing through: +1 strength.',
  },
  halo: {
    id: 'halo',
    name: 'Halo Lantern',
    price: 6,
    rotatable: false,
    blurb: 'Catches a beam and glows on the cells around it.',
  },
};

export const RELAY_ORDER = ['mirror', 'prism', 'lens', 'halo'];
export const MAX_STRENGTH = 7;

// Mirror orientation 0 is "/" and 1 is "\". Index = travel direction N, E, S, W.
const SLASH = [1, 0, 3, 2];
const BACKSLASH = [3, 2, 1, 0];

/** New travel direction of a beam reflected by a mirror. */
export function reflect(orient, dir) {
  return orient === 0 ? SLASH[dir] : BACKSLASH[dir];
}

/** Directions and strength of the two halves a prism splits a beam into. */
export function splitBeam(dir, strength, prismLoss) {
  const s = strength - prismLoss;
  return [
    { dir: (dir + 3) % 4, strength: s },
    { dir: (dir + 1) % 4, strength: s },
  ];
}

/** Strength of a beam after a lens. */
export function focusBeam(strength, lensGain) {
  return Math.min(MAX_STRENGTH, strength + lensGain);
}

/** Strength a lit halo lantern sheds on its neighbours. */
export function haloGlow(strength) {
  return Math.max(1, strength - 1);
}
