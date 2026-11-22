// Thricefold's hand-in program (Node 22.18 or later, standard library only).
//
// Thricefold is a card duel played in a desktop browser: static files under game/, no build step
// and no network request. This program hands the game in. It copies game/ and screenshots/ from
// this repository to the output directory and writes dossier.json there, the summary the judge
// reads, with the kit's own library (vendor/makefun-game.ts, unchanged).
//
// The repository is found from this file's own location, never from the working directory, so the
// program gives the same bytes wherever it is run from:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repositoryRoot = dirname(fileURLToPath(import.meta.url));
const outputRoot = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** The scorer's own caps: only text_max_bytes shapes the dossier; the others refuse what it would refuse. */
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

/** The screenshots handed in, in the order the judge sees them: the first by name is the cover. */
function listScreenshotNames(directory: string): string[] {
  return readdirSync(directory)
    .filter((name) => !name.startsWith('.') && /\.(png|jpe?g)$/i.test(name))
    .sort();
}

/** Stops with a plain message before anything is written, when the repository cannot be handed in. */
function checkRepositoryIsComplete(): void {
  const gameIndex = join(repositoryRoot, 'game', 'index.html');
  if (!existsSync(gameIndex) || !statSync(gameIndex).isFile()) {
    throw new Error(`Thricefold cannot be handed in: ${gameIndex} is missing.`);
  }
  const screenshots = join(repositoryRoot, 'screenshots');
  const names = existsSync(screenshots) ? listScreenshotNames(screenshots) : [];
  if (names.length < 3 || names.length > DOSSIER_LIMITS.screenshots.max) {
    throw new Error(`Thricefold needs 3 or 4 screenshots in ${screenshots}; it holds ${names.length}.`);
  }
}

/** Copies one directory of the repository into the output, replacing whatever an earlier run left. */
function copyIntoOutput(name: string): void {
  const destination = join(outputRoot, name);
  rmSync(destination, { recursive: true, force: true });
  cpSync(join(repositoryRoot, name), destination, { recursive: true });
}

/** Copies only the screenshots the dossier will show, so a stray file beside them is never handed in. */
function copyScreenshotsIntoOutput(): void {
  const source = join(repositoryRoot, 'screenshots');
  const destination = join(outputRoot, 'screenshots');
  rmSync(destination, { recursive: true, force: true });
  mkdirSync(destination, { recursive: true });
  for (const name of listScreenshotNames(source)) cpSync(join(source, name), join(destination, name));
}

checkRepositoryIsComplete();
mkdirSync(outputRoot, { recursive: true });
copyIntoOutput('game');
copyScreenshotsIntoOutput();
const dossier = buildDossier(outputRoot, DOSSIER_LIMITS);
writeFileSync(join(outputRoot, 'dossier.json'), dossier);
console.log(`Thricefold handed in to ${outputRoot}: game/, ${listScreenshotNames(join(outputRoot, 'screenshots')).length} screenshots, dossier.json`);
