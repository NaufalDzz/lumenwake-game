// Board geometry shared by every rule: a 10 x 7 grid of sky-garden cells and the four beam directions.

export const COLS = 10;
export const ROWS = 7;
export const CELL_COUNT = COLS * ROWS;

/** Travel directions, clockwise from north. A beam's `dir` is an index into this list. */
export const DIRS = [
  { name: 'N', dx: 0, dy: -1 },
  { name: 'E', dx: 1, dy: 0 },
  { name: 'S', dx: 0, dy: 1 },
  { name: 'W', dx: -1, dy: 0 },
];

export const cellIndex = (x, y) => y * COLS + x;
export const cellX = (i) => i % COLS;
export const cellY = (i) => Math.floor(i / COLS);
export const inBounds = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
export const turnRight = (d) => (d + 1) % 4;
export const turnLeft = (d) => (d + 3) % 4;
export const opposite = (d) => (d + 2) % 4;
export const manhattan = (a, b) => Math.abs(cellX(a) - cellX(b)) + Math.abs(cellY(a) - cellY(b));

/** Orthogonal neighbours (and diagonals when `withDiagonals`) that lie on the board. */
export function neighbours(i, withDiagonals = false) {
  const x = cellX(i);
  const y = cellY(i);
  const out = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      if (!withDiagonals && dx && dy) continue;
      if (inBounds(x + dx, y + dy)) out.push(cellIndex(x + dx, y + dy));
    }
  }
  return out;
}
