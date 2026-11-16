// Short-lived feedback: sparkle bursts on harvests, petals on growth, ash on withering, floating score
// and dew numbers, screen shake on heart loss. Effects live in world pixels and expire on their own.

import { glow } from './canvas-kit.js';

export function createEffects() {
  let parts = [];
  let floats = [];
  let shake = 0;
  let seed = 1;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  return {
    burst(x, y, color, count = 18, speed = 90) {
      for (let i = 0; i < count; i++) {
        const a = rand() * Math.PI * 2;
        const v = speed * (0.4 + rand() * 0.8);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.9 + rand() * 0.5, age: 0, color, size: 2 + rand() * 2.5, fall: 60 });
      }
    },
    ash(x, y) {
      for (let i = 0; i < 14; i++) {
        parts.push({ x: x + (rand() - 0.5) * 30, y, vx: (rand() - 0.5) * 30, vy: -20 - rand() * 30, life: 1.2, age: 0, color: '#8a7f99', size: 2 + rand() * 2, fall: -10 });
      }
    },
    float(x, y, text, color, size = 20) {
      floats.push({ x, y, text, color, size, age: 0, life: 1.4 });
    },
    shake(amount) {
      shake = Math.max(shake, amount);
    },
    get shakeOffset() {
      return shake > 0.2 ? { x: (rand() - 0.5) * shake, y: (rand() - 0.5) * shake } : { x: 0, y: 0 };
    },
    get busy() {
      return parts.length + floats.length;
    },
    update(dt) {
      for (const p of parts) {
        p.age += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.fall * dt;
        p.vx *= 0.98;
      }
      parts = parts.filter((p) => p.age < p.life);
      for (const f of floats) f.age += dt;
      floats = floats.filter((f) => f.age < f.life);
      shake *= Math.pow(0.02, dt);
    },
    draw(ctx) {
      for (const p of parts) {
        const a = 1 - p.age / p.life;
        if (p.fall >= 0) glow(ctx, p.x, p.y, p.size * 3, p.color, a * 0.6);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const f of floats) {
        const u = f.age / f.life;
        ctx.save();
        ctx.globalAlpha = Math.min(1, (1 - u) * 2);
        ctx.font = `800 ${f.size}px "Trebuchet MS", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(10, 8, 30, 0.7)';
        ctx.fillText(f.text, f.x, f.y - u * 40 + 2);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y - u * 40);
        ctx.restore();
      }
    },
    clear() {
      parts = [];
      floats = [];
      shake = 0;
    },
  };
}
