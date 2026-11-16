// Colours of LUMENWAKE. Each island has its own dusk; the UI shares one ink set. High-contrast mode swaps
// in stronger beams, outlines and text so the board stays readable for everyone.

export const ISLAND_PALETTES = {
  verdant: {
    skyTop: '#141a46',
    skyMid: '#3b2f6e',
    horizon: '#f0a27a',
    haze: 'rgba(255, 196, 150, 0.18)',
    farIsland: '#2a2a5c',
    landTop: '#6fb07a',
    landTop2: '#4f9468',
    landEdge: '#9fd6a0',
    cliff: '#6a4d3e',
    cliffDark: '#3c2a2a',
    accent: '#ffd27a',
  },
  mistveil: {
    skyTop: '#1b1840',
    skyMid: '#4b3f78',
    horizon: '#c7a9e0',
    haze: 'rgba(220, 200, 255, 0.2)',
    farIsland: '#352f62',
    landTop: '#7fb2a6',
    landTop2: '#5b8f8a',
    landEdge: '#b8e2d6',
    cliff: '#57506e',
    cliffDark: '#2f2a45',
    accent: '#d8c4ff',
  },
  stormcrown: {
    skyTop: '#0b0f26',
    skyMid: '#262451',
    horizon: '#6b4e86',
    haze: 'rgba(160, 150, 230, 0.16)',
    farIsland: '#1d1d44',
    landTop: '#7b9a84',
    landTop2: '#5a7666',
    landEdge: '#b2cdb8',
    cliff: '#45405e',
    cliffDark: '#211e36',
    accent: '#ffb38a',
  },
};

export const INK = {
  text: '#f6f1ff',
  soft: '#c5c0e6',
  dim: '#8f8ab8',
  gold: '#ffd27a',
  mint: '#8ff0c8',
  rose: '#ff8fa3',
  sky: '#9fd2ff',
  panel: 'rgba(16, 16, 44, 0.86)',
  panelEdge: 'rgba(190, 180, 255, 0.28)',
  panelHi: 'rgba(40, 38, 92, 0.92)',
  beam: '#ffe9a8',
  beamCore: '#fffbea',
  grow: '#7dffb0',
  sustain: '#ffd27a',
  wilt: '#ff7a8a',
};

export const SPECIES_COLORS = {
  dawnpetal: { petal: '#ffc36e', heart: '#ff8a5c', glow: 'rgba(255, 196, 110, 0.55)' },
  moonlily: { petal: '#e8f1ff', heart: '#8fc8ff', glow: 'rgba(170, 210, 255, 0.6)' },
  twinbell: { petal: '#c9a2ff', heart: '#fff0a8', glow: 'rgba(200, 160, 255, 0.55)' },
  shadecap: { petal: '#5b3f8c', heart: '#b7f0ff', glow: 'rgba(120, 220, 255, 0.35)' },
  dawnheart: { petal: '#ffb0a0', heart: '#fff3c4', glow: 'rgba(255, 190, 160, 0.75)' },
};

export const RELAY_COLORS = {
  mirror: '#dfe8ff',
  prism: '#b8f4ff',
  lens: '#ffd88a',
  halo: '#ffe3a3',
};

/** UI ink for the chosen contrast mode. */
export function inkFor(highContrast) {
  if (!highContrast) return INK;
  return { ...INK, soft: '#ffffff', dim: '#e2ddff', panel: 'rgba(4, 4, 18, 0.96)', panelEdge: 'rgba(255, 255, 255, 0.7)' };
}

export const FONT_DISPLAY = 'Georgia, "Times New Roman", serif';
export const FONT_UI = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
