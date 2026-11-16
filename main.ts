// LUMENWAKE hand-in program (Node 22, standard library only, run as `node main.ts`).
//
// Copies the playable static game (game/) and its screenshots (screenshots/) into the output directory and
// writes dossier.json with the kit's unchanged vendor/makefun-game.ts, under the bounty scorer's own caps.
// The output directory is /output in the grader; MAKEFUN_OUTPUT_DIR overrides it for local runs:
//
//   MAKEFUN_OUTPUT_DIR=/tmp/lumenwake-out node main.ts
//
// The run is deterministic: stale copies of game/ and screenshots/ in the output are replaced, files are copied
// as-is and the dossier is built from the copied bytes, so the same repository always writes the same output.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier, DossierError } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps (reference/gate.json), exactly as the kit gives them.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

/** Copy one top-level folder into the output, replacing any earlier copy and skipping dotfiles like .gitkeep. */
function copyFolder(name: string): void {
  const from = join(root, name);
  const to = join(outDir, name);
  rmSync(to, { recursive: true, force: true });
  mkdirSync(to, { recursive: true });
  if (existsSync(from)) {
    cpSync(from, to, { recursive: true, filter: (src) => src === from || !basename(src).startsWith('.') });
  }
}

mkdirSync(outDir, { recursive: true });
copyFolder('game');
copyFolder('screenshots');

try {
  const dossier = buildDossier(outDir, CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  console.log(`LUMENWAKE: wrote game/, screenshots/ and dossier.json (${dossier.byteLength} bytes) to ${outDir}`);
} catch (error) {
  if (error instanceof DossierError) {
    console.error(`LUMENWAKE: the dossier was refused: ${error.message}`);
    console.error('Add 3 or 4 real PNG/JPEG screenshots of the game (long side <= 1280 px, <= 256 KiB) to screenshots/.');
    process.exit(1);
  }
  throw error;
}
