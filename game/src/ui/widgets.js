// Interactive widgets drawn on the canvas. Every button registers a hitbox while it is drawn, so mouse
// clicks, keyboard focus (Tab / arrows + Enter) and the read-only test snapshot all use the same list.

import { fillRound, text, glow, measure } from '../render/canvas-kit.js';
import { FONT_UI } from '../render/palette.js';

export function createHitboxes() {
  let list = [];
  return {
    begin() {
      list = [];
    },
    add(box) {
      list.push(box);
      return box;
    },
    at(x, y) {
      for (let i = list.length - 1; i >= 0; i--) {
        const b = list[i];
        if (x >= b.x && y >= b.y && x <= b.x + b.w && y <= b.y + b.h) return b;
      }
      return null;
    },
    get list() {
      return list;
    },
    focusable() {
      return list.filter((b) => b.focusable !== false && b.enabled !== false);
    },
    byId(id) {
      return list.find((b) => b.id === id) ?? null;
    },
  };
}

/**
 * Draw a button and register its hitbox.
 * opts: { id, x, y, w, h, label, sub, hint, onClick, enabled = true, primary, selected, tone }
 */
export function button(ui, opts) {
  const { ctx, hit, ink } = ui;
  const { id, x, y, w, h, label, sub, hint, enabled = true, primary = false, selected = false, size = 17 } = opts;
  const hovered = ui.pointer && ui.pointer.x >= x && ui.pointer.x <= x + w && ui.pointer.y >= y && ui.pointer.y <= y + h;
  const focused = ui.focusId === id;
  const lift = hovered && enabled ? -2 : 0;
  if (primary && enabled) glow(ctx, x + w / 2, y + h / 2, w * 0.6, 'rgba(255, 210, 122, 0.22)');
  const fill = !enabled
    ? 'rgba(40, 38, 70, 0.6)'
    : primary
      ? hovered ? '#ffe09a' : '#ffd27a'
      : selected
        ? 'rgba(90, 80, 170, 0.95)'
        : hovered ? 'rgba(70, 64, 140, 0.95)' : 'rgba(44, 40, 96, 0.92)';
  fillRound(ctx, x, y + lift + 3, w, h, 12, 'rgba(5, 4, 20, 0.45)');
  fillRound(ctx, x, y + lift, w, h, 12, fill, focused ? '#8ff0c8' : selected ? '#ffd27a' : ink.panelEdge, focused || selected ? 3 : 1.5);
  const color = !enabled ? '#7d79a0' : primary ? '#2a1c08' : ink.text;
  // Lay out label and keycap so they never overlap: the label stays centred while it clears the keycap,
  // otherwise it centres in the space left of the keycap, shrinking if needed. Buttons too narrow for both
  // drop the keycap (the key still works; the guide and pause menu list every key).
  const pad = 12;
  const capW = hint ? keycapWidth(ctx, hint) : 0;
  const showCap = hint && w >= 96;
  const labelW = measure(ctx, label, size, 700);
  let lx = x + w / 2;
  let room = w - pad * 2;
  if (showCap && x + w / 2 + labelW / 2 > x + w - pad - capW - 6) {
    room = w - pad * 2 - capW - 6;
    lx = x + pad + room / 2;
  }
  const labelSize = fitSize(ctx, label, room, size, 700, 11);
  const cy = y + lift + h / 2 + (sub ? -4 : 6);
  text(ctx, label, lx, cy, { size: labelSize, weight: 700, color, align: 'center', shadow: !primary });
  // the sub-line sits below the keycap, so it may use the full width
  if (sub) text(ctx, sub, x + w / 2, cy + 18, { size: fitSize(ctx, sub, w - pad * 2, 12, 600, 9), weight: 600, color: primary ? '#5a3f12' : ink.dim, align: 'center', shadow: false });
  if (showCap) keycap(ctx, hint, x + w - 8, y + lift + 7, primary);
  return hit.add({ id, x, y, w, h, label, enabled, onClick: opts.onClick, focusable: opts.focusable });
}

/** Largest font size (down to `min`) at which `str` fits in `maxW`. */
export function fitSize(ctx, str, maxW, size, weight = 600, min = 10) {
  let s = size;
  while (s > min && measure(ctx, str, s, weight) > maxW) s -= 1;
  return s;
}

function keycapWidth(ctx, key) {
  return Math.max(18, measure(ctx, key, 11, 700) + 10);
}

/** Small key label drawn at the top-right of a button (right-aligned at x). */
export function keycap(ctx, key, x, y, dark = false) {
  ctx.save();
  const w = keycapWidth(ctx, key);
  ctx.font = `700 11px ${FONT_UI}`;
  fillRound(ctx, x - w, y, w, 17, 5, dark ? 'rgba(60, 40, 10, 0.25)' : 'rgba(255,255,255,0.12)', dark ? 'rgba(60,40,10,0.4)' : 'rgba(255,255,255,0.3)');
  ctx.fillStyle = dark ? '#3a2808' : '#e8e4ff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(key, x - w / 2, y + 9);
  ctx.restore();
}

/** A rounded translucent panel with an optional small caps heading. */
export function panel(ui, x, y, w, h, heading) {
  fillRound(ui.ctx, x, y, w, h, 16, ui.ink.panel, ui.ink.panelEdge, 1.5);
  if (heading) text(ui.ctx, heading.toUpperCase(), x + 18, y + 26, { size: 12, weight: 800, color: '#ffb38a', shadow: false });
}

/** Register a non-button clickable region (board cells, cards drawn by hand). */
export function region(ui, box) {
  return ui.hit.add({ focusable: false, enabled: true, ...box });
}
