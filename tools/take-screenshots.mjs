// Takes the entry's screenshots: `node tools/take-screenshots.mjs`. It serves game/, opens each
// scene of shots.json in headless Chromium at 1280 by 800, waits for the game to say the scene is
// drawn, and saves the page as it is into screenshots/. Nothing is edited afterwards: every pixel
// is the game's own canvas. Playwright is looked up from PLAYWRIGHT_FROM (a directory that has it
// installed) or from this repository, so the entry itself carries no dependency.
import { createRequire } from 'node:module';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { serveGame } from './serve-game.mjs';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const lookupFrom = process.env.PLAYWRIGHT_FROM ? pathToFileURL(join(process.env.PLAYWRIGHT_FROM, 'package.json')).href : import.meta.url;
const { chromium } = createRequire(lookupFrom)('playwright');

const JPEG_QUALITY = 90;
const LARGEST_SCREENSHOT_BYTES = 256 * 1024;

const scenes = JSON.parse(await readFile(join(repositoryRoot, 'shots.json'), 'utf8'));
const server = await serveGame(0);
const origin = `http://127.0.0.1:${server.address().port}`;
// CHROMIUM_PATH names a Chromium binary to use in place of Playwright's own download.
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const problems = [];
page.on('console', (message) => {
  if (message.type() === 'error') problems.push(`console error: ${message.text()}`);
});
page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
page.on('request', (request) => {
  if (!request.url().startsWith(origin)) problems.push(`request left the game: ${request.url()}`);
});

await mkdir(join(repositoryRoot, 'screenshots'), { recursive: true });
for (const scene of scenes) {
  await page.goto(`${origin}/index.html${scene.query}`);
  await page.waitForFunction(() => document.documentElement.dataset.shotReady === 'yes');
  const file = join(repositoryRoot, 'screenshots', scene.name);
  await page.screenshot({ path: file, type: 'jpeg', quality: JPEG_QUALITY });
  const { size } = await stat(file);
  if (size > LARGEST_SCREENSHOT_BYTES) problems.push(`${scene.name} is ${size} bytes, over the 256 KiB cap`);
  console.log(`${scene.name}: ${size} bytes from ${scene.query}`);
}

await browser.close();
server.close();
if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
