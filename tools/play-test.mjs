// Plays the real game in headless Chromium: `node tools/play-test.mjs`. It deals from the title
// screen, wins one whole duel with the keyboard, restarts, loses one whole duel with the mouse (one
// card of it dragged), and fails on any console error, page error or request that leaves the game.
// The duels run at ?pace=0.05 so the pauses between moves are short; the rules are untouched.
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { serveGame } from './serve-game.mjs';

const lookupFrom = process.env.PLAYWRIGHT_FROM ? pathToFileURL(join(process.env.PLAYWRIGHT_FROM, 'package.json')).href : import.meta.url;
const { chromium } = createRequire(lookupFrom)('playwright');

const server = await serveGame(0);
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const problems = [];
const requests = [];
page.on('console', (message) => {
  if (message.type() === 'error') problems.push(`console error: ${message.text()}`);
});
page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
page.on('request', (request) => {
  requests.push(request.url());
  if (!request.url().startsWith(origin)) problems.push(`request left the game: ${request.url()}`);
});

function expect(condition, what) {
  if (!condition) problems.push(`failed: ${what}`);
  console.log(`${condition ? 'ok  ' : 'FAIL'} ${what}`);
}

const waitForPlayerMove = () => page.waitForFunction(() => window.thricefoldView.screen !== 'duel' || !window.thricefoldView.busy, null, { timeout: 20000 });
const readScreen = () => page.evaluate(() => window.thricefoldView.screen);

/** The stand-in's choice for the position on the page: 'best' rated play, or the first card into the first open fold. */
function choosePlay(kind) {
  return page.evaluate(async (wanted) => {
    const { rankPlays } = await import('./src/opponent-ai.js');
    const { openLanes } = await import('./src/duel-rules.js');
    const { handCardPosition, laneMatRectangle } = await import('./src/table-layout.js');
    const duel = window.thricefoldView.duel;
    const play = wanted === 'best' ? rankPlays(duel, 'player')[0] : { handIndex: 0, laneIndex: openLanes(duel, 'player')[0] };
    const mat = laneMatRectangle(play.laneIndex);
    return {
      ...play,
      card: handCardPosition('player', play.handIndex, duel.hands.player.length),
      fold: { x: mat.x + mat.width / 2, y: mat.y + mat.height - 40 },
    };
  }, kind);
}

// 1. Title screen, then a duel won with the keyboard.
await page.goto(`${origin}/index.html?seed=9&pace=0.05`);
await page.waitForFunction(() => window.thricefoldView !== undefined);
expect((await readScreen()) === 'title', 'the game opens on the title screen');
await page.keyboard.press('Enter');
expect((await readScreen()) === 'duel', 'Enter deals a duel');
let keyboardPlays = 0;
while ((await readScreen()) === 'duel' && keyboardPlays < 80) {
  const play = await choosePlay('best');
  await page.keyboard.press(String(play.handIndex + 1));
  await page.keyboard.press('qwe'[play.laneIndex]);
  keyboardPlays += 1;
  await waitForPlayerMove();
}
const won = await page.evaluate(() => ({ screen: window.thricefoldView.screen, result: window.thricefoldView.result }));
expect(won.screen === 'won', `keyboard duel ends on the win screen after ${keyboardPlays} plays (life ${won.result?.life.player}:${won.result?.life.opponent})`);
await page.waitForTimeout(700);
expect(await page.evaluate(() => window.thricefoldView.flourish.pieces.length > 20), 'the win flourish is throwing confetti');

// 2. Restart from the win screen, then a duel lost with the mouse.
await page.goto(`${origin}/index.html?seed=31&pace=0.05`);
await page.waitForFunction(() => window.thricefoldView !== undefined);
await page.mouse.click(640, 400);
expect((await readScreen()) === 'duel', 'a click deals a duel');
await page.waitForTimeout(900);
let mousePlays = 0;
while ((await readScreen()) === 'duel' && mousePlays < 80) {
  const play = await choosePlay('first');
  if (mousePlays === 0) {
    await page.mouse.move(play.card.x, play.card.y);
    await page.mouse.down();
    await page.mouse.move(play.fold.x, play.fold.y, { steps: 8 });
    await page.mouse.up();
  } else {
    await page.mouse.click(play.card.x, play.card.y);
    await page.mouse.click(play.fold.x, play.fold.y);
  }
  mousePlays += 1;
  await waitForPlayerMove();
}
const lost = await page.evaluate(() => ({ screen: window.thricefoldView.screen, result: window.thricefoldView.result }));
expect(lost.screen === 'lost', `mouse duel ends on the loss screen after ${mousePlays} plays (life ${lost.result?.life.player}:${lost.result?.life.opponent})`);
await page.keyboard.press('Enter');
expect((await readScreen()) === 'duel', 'Enter on the loss screen deals again');
await page.keyboard.press('Escape');
expect((await readScreen()) === 'title', 'Escape returns to the title screen');

expect(requests.every((url) => url.startsWith(origin)), `all ${requests.length} requests stayed inside game/`);
await browser.close();
server.close();
if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('play test passed');
