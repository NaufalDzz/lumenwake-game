// Mouse and keyboard wiring: converts pointer positions into the 1280x720 view space and forwards
// clean, high-level events (move, press, key) to the controller.

import { VIEW_W, VIEW_H } from './ui.js';

export function bindInput(canvas, handlers) {
  const toView = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
      y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
    };
  };

  canvas.addEventListener('pointermove', (event) => {
    const p = toView(event);
    handlers.move(p.x, p.y);
  });
  canvas.addEventListener('pointerleave', () => handlers.move(-1, -1));
  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    const p = toView(event);
    // right button or Shift turns counter-clockwise
    const dir = event.button === 2 || event.shiftKey ? -1 : 1;
    if (event.button === 0 || event.button === 2) handlers.press(p.x, p.y, dir);
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  window.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const handled = handlers.key(event.key, event.shiftKey);
    if (handled) event.preventDefault();
  });
}
