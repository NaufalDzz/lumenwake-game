// Mouse and keyboard wiring. Converts client pixels to the 1280 x 720 world through the canvas's current
// on-screen rectangle, so clicks land correctly at any window size or zoom.

import { WORLD } from '../render/layout.js';

export function toWorld(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * WORLD.w,
    y: ((clientY - rect.top) / rect.height) * WORLD.h,
  };
}

/**
 * handlers: { pointerMove(p), pointerDown(p, button), pointerLeave(), wheel(p, delta), key(event), gesture() }
 */
export function bindInput(canvas, handlers) {
  canvas.addEventListener('mousemove', (e) => handlers.pointerMove(toWorld(canvas, e.clientX, e.clientY)));
  canvas.addEventListener('mouseleave', () => handlers.pointerLeave());
  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault?.();
    canvas.focus?.();
    handlers.gesture();
    handlers.pointerDown(toWorld(canvas, e.clientX, e.clientY), e.button === 2 || e.shiftKey ? 'secondary' : 'primary');
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault?.());
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault?.();
    handlers.wheel(toWorld(canvas, e.clientX, e.clientY), Math.sign(e.deltaY));
  }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    handlers.gesture();
    if (handlers.key(e)) e.preventDefault?.();
  });
}
