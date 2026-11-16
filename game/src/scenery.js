// Backdrop art: a blue-hour sky over a floating archipelago, a calm indigo sea and drifting fireflies.
// Static layers are painted once into offscreen canvases; only gentle bobbing and particles animate.

import { VIEW_W, VIEW_H, glowSprite } from './ui.js';
import { seededRandom as seededNoise } from './puzzle.js';

const HORIZON = 330;

function makeLayer(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function paintSky() {
  const [c, g] = makeLayer(VIEW_W, VIEW_H);
  const sky = g.createLinearGradient(0, 0, 0, HORIZON + 20);
  sky.addColorStop(0, '#080b26');
  sky.addColorStop(0.45, '#1c2160');
  sky.addColorStop(0.78, '#4b3f88');
  sky.addColorStop(0.93, '#b0708f');
  sky.addColorStop(1, '#f2a37f');
  g.fillStyle = sky;
  g.fillRect(0, 0, VIEW_W, HORIZON + 20);
  // a warm afterglow pooled low on the horizon, right of centre
  const glow = g.createRadialGradient(860, HORIZON, 10, 860, HORIZON, 520);
  glow.addColorStop(0, 'rgba(255,190,140,0.55)');
  glow.addColorStop(0.4, 'rgba(240,140,140,0.18)');
  glow.addColorStop(1, 'rgba(120,80,160,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, VIEW_W, HORIZON + 20);
  // long thin clouds lit from below
  const rand = seededNoise(5);
  for (let i = 0; i < 9; i++) {
    const y = 120 + rand() * 170;
    const x = rand() * VIEW_W;
    const w = 180 + rand() * 320;
    const cg = g.createLinearGradient(0, y - 6, 0, y + 8);
    cg.addColorStop(0, 'rgba(120,110,190,0)');
    cg.addColorStop(0.6, `rgba(255,${150 + Math.floor(rand() * 50)},150,${0.12 + (y / HORIZON) * 0.18})`);
    cg.addColorStop(1, 'rgba(120,110,190,0)');
    g.fillStyle = cg;
    g.beginPath();
    g.ellipse(x, y, w, 5 + rand() * 6, 0, 0, Math.PI * 2);
    g.fill();
  }
  // sea
  const sea = g.createLinearGradient(0, HORIZON, 0, VIEW_H);
  sea.addColorStop(0, '#3a3577');
  sea.addColorStop(0.08, '#1d2160');
  sea.addColorStop(0.5, '#121644');
  sea.addColorStop(1, '#090c2a');
  g.fillStyle = sea;
  g.fillRect(0, HORIZON, VIEW_W, VIEW_H - HORIZON);
  // reflected afterglow column
  const refl = g.createLinearGradient(0, HORIZON, 0, VIEW_H);
  refl.addColorStop(0, 'rgba(255,180,140,0.35)');
  refl.addColorStop(1, 'rgba(255,180,140,0)');
  g.fillStyle = refl;
  for (let i = 0; i < 60; i++) {
    const y = HORIZON + Math.pow(i / 60, 1.6) * (VIEW_H - HORIZON);
    const w = 60 + i * 7 + rand() * 80;
    g.globalAlpha = 0.5 * (1 - i / 60);
    g.fillRect(860 - w / 2 + (rand() - 0.5) * 60, y, w, 1.5 + i * 0.05);
  }
  g.globalAlpha = 1;
  return c;
}

/** One floating island: grassy cap, layered rock underside, hanging roots and a few warm windows. */
function paintIsland(w, seed, tone) {
  const h = Math.round(w * 0.9);
  const [c, g] = makeLayer(w + 20, h + 20);
  const rand = seededNoise(seed);
  const cx = (w + 20) / 2;
  const top = 26;
  // underside cone
  g.beginPath();
  g.moveTo(10, top + 8);
  const steps = 9;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = 10 + t * w;
    const depth = Math.sin(t * Math.PI) * (h * 0.62) * (0.75 + rand() * 0.35);
    g.lineTo(x, top + 8 + depth);
  }
  g.lineTo(w + 10, top + 8);
  g.closePath();
  const rock = g.createLinearGradient(0, top, 0, top + h * 0.7);
  rock.addColorStop(0, tone.rockTop);
  rock.addColorStop(1, tone.rockBottom);
  g.fillStyle = rock;
  g.fill();
  // strata lines
  g.strokeStyle = tone.strata;
  g.lineWidth = 1.2;
  for (let i = 1; i < 4; i++) {
    g.beginPath();
    g.moveTo(16 + i * 6, top + 10 + i * h * 0.1);
    g.quadraticCurveTo(cx, top + 16 + i * h * 0.12, w + 4 - i * 6, top + 10 + i * h * 0.1);
    g.stroke();
  }
  // roots
  g.strokeStyle = tone.root;
  g.lineWidth = 1.4;
  for (let i = 0; i < 7; i++) {
    const x = cx + (rand() - 0.5) * w * 0.6;
    const len = 20 + rand() * h * 0.35;
    g.beginPath();
    g.moveTo(x, top + h * 0.35);
    g.bezierCurveTo(x + 6, top + h * 0.35 + len * 0.4, x - 6, top + h * 0.35 + len * 0.7, x + 2, top + h * 0.35 + len);
    g.stroke();
  }
  // grass cap
  g.beginPath();
  g.ellipse(cx, top + 8, w / 2, 14, 0, 0, Math.PI * 2);
  const grass = g.createLinearGradient(0, top - 6, 0, top + 22);
  grass.addColorStop(0, tone.grassTop);
  grass.addColorStop(1, tone.grassBottom);
  g.fillStyle = grass;
  g.fill();
  // tiny trees and a cottage with lit windows
  for (let i = 0; i < 4; i++) {
    const x = cx + (rand() - 0.5) * w * 0.7;
    const th = 10 + rand() * 18;
    g.fillStyle = tone.tree;
    g.beginPath();
    g.moveTo(x - th * 0.35, top + 6);
    g.lineTo(x, top + 6 - th);
    g.lineTo(x + th * 0.35, top + 6);
    g.fill();
  }
  if (tone.house) {
    const hx = cx + (rand() - 0.3) * w * 0.3;
    g.fillStyle = tone.tree;
    g.fillRect(hx - 9, top - 6, 18, 12);
    g.beginPath();
    g.moveTo(hx - 12, top - 6);
    g.lineTo(hx, top - 15);
    g.lineTo(hx + 12, top - 6);
    g.fill();
    g.fillStyle = '#ffd890';
    g.fillRect(hx - 5, top - 3, 3, 4);
    g.fillRect(hx + 2, top - 3, 3, 4);
  }
  return c;
}

export function createScenery({ reducedMotion = false } = {}) {
  const sky = paintSky();
  const far = { rockTop: '#3a3a7c', rockBottom: '#262760', strata: 'rgba(160,150,220,0.12)', root: 'rgba(80,80,150,0.5)', grassTop: '#4f5aa0', grassBottom: '#3a4488', tree: '#2c3270', house: true };
  const mid = { rockTop: '#2d2c66', rockBottom: '#15153f', strata: 'rgba(255,190,150,0.12)', root: 'rgba(60,60,120,0.6)', grassTop: '#3f7f86', grassBottom: '#2a4e6c', tree: '#1c2a52', house: true };
  const islands = [
    { img: paintIsland(110, 3, far), x: 120, y: 150, scale: 1, bob: 4, speed: 0.4, alpha: 0.75 },
    { img: paintIsland(80, 7, far), x: 1010, y: 112, scale: 1, bob: 3, speed: 0.5, alpha: 0.7 },
    { img: paintIsland(150, 13, far), x: 640, y: 175, scale: 1, bob: 5, speed: 0.33, alpha: 0.65 },
    { img: paintIsland(190, 17, mid), x: 1150, y: 230, scale: 1, bob: 6, speed: 0.28, alpha: 0.95 },
    { img: paintIsland(130, 19, mid), x: 330, y: 238, scale: 1, bob: 5, speed: 0.36, alpha: 0.9 },
  ];
  const rand = seededNoise(42);
  const stars = Array.from({ length: 90 }, () => ({ x: rand() * VIEW_W, y: rand() * 220, r: 0.4 + rand() * 1.2, p: rand() * 6 }));
  const fireflies = Array.from({ length: reducedMotion ? 14 : 38 }, () => ({
    x: rand() * VIEW_W,
    y: 200 + rand() * 500,
    p: rand() * 100,
    s: 0.3 + rand() * 0.7,
    r: 2 + rand() * 4,
    color: rand() < 0.7 ? 'rgba(255,214,140,1)' : 'rgba(150,245,205,1)',
  }));

  function drawBackground(ctx, time) {
    ctx.drawImage(sky, 0, 0);
    for (const s of stars) {
      const tw = reducedMotion ? 0.7 : 0.5 + 0.5 * Math.sin(time * 1.3 + s.p);
      ctx.fillStyle = `rgba(240,235,255,${0.15 + tw * 0.55 * (1 - s.y / 260)})`;
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    // a pale crescent moon high in the blue
    ctx.save();
    ctx.fillStyle = 'rgba(255,244,220,0.9)';
    ctx.shadowColor = 'rgba(255,230,200,0.8)';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(218, 78, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#121853';
    ctx.beginPath();
    ctx.arc(226, 72, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    for (const isl of islands) {
      const dy = reducedMotion ? 0 : Math.sin(time * isl.speed + isl.x) * isl.bob;
      ctx.globalAlpha = isl.alpha;
      ctx.drawImage(isl.img, isl.x - isl.img.width / 2, isl.y - isl.img.height / 2 + dy);
    }
    ctx.globalAlpha = 1;
    // horizon shimmer lines
    if (!reducedMotion) {
      ctx.strokeStyle = 'rgba(255,200,170,0.10)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const y = HORIZON + 14 + i * 22 + Math.sin(time * 0.6 + i) * 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= VIEW_W; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.02 + time + i) * 1.5);
        ctx.stroke();
      }
    }
  }

  function drawFireflies(ctx, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of fireflies) {
      const t = reducedMotion ? f.p : time * f.s + f.p;
      const x = (f.x + Math.sin(t * 0.7) * 40 + t * 6) % (VIEW_W + 40) - 20;
      const y = f.y + Math.sin(t * 1.1) * 26 + Math.cos(t * 0.37) * 18;
      const pulse = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.3), 2);
      const size = f.r * 6 * pulse + 4;
      ctx.globalAlpha = 0.55 * pulse + 0.1;
      ctx.drawImage(glowSprite(f.color), x - size / 2, y - size / 2, size, size);
    }
    ctx.restore();
  }

  return { drawBackground, drawFireflies };
}
