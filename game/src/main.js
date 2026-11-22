// One job: start the game. It sizes the canvas to the window, builds the table view, wires the
// keyboard and the mouse to the duel, and runs the frame loop that moves and draws everything.
// With ?shot=table|title|win|loss it shows one still scene instead, for the entry's screenshots.
import { seedFromAddress, seedFromClock } from './seeded-random.js';
import { describeCard } from './card-deck.js';
import { createTableView, playerPlaysCard, returnToTitle, startDuel, updateDuelFlow } from './duel-flow.js';
import { aimSpritesAtDuel, updateCardMotion } from './card-motion.js';
import { TABLE } from './table-layout.js';
import { drawDuelTable } from './draw-table.js';
import { drawLossScreen, drawTitleScreen, drawWinScreen } from './draw-screens.js';
import { updateFlourish } from './win-flourish.js';
import { createSoundEffects } from './sound-effects.js';
import { listenToKeyboard, listenToMouse } from './player-input.js';
import { stageScreenshotScene } from './screenshot-scenes.js';

const LONGEST_FRAME_SECONDS = 0.05;

const canvas = document.getElementById('duel-table');
const statusLine = document.getElementById('screen-reader-status');
const ctx = canvas.getContext('2d');
const address = new URLSearchParams(window.location.search);
const shotName = address.get('shot');
const addressSeed = seedFromAddress(window.location.search);
const pace = Number(address.get('pace') ?? 1) > 0 ? Number(address.get('pace') ?? 1) : 1;

const sounds = createSoundEffects();
const view = createTableView(sounds, pace);
let nextSeed = addressSeed;
let lastStatus = '';

/** Fits the 1280 by 800 table inside the window, keeping its shape, sharp on dense screens. */
function fitCanvasToWindow() {
  const scale = Math.min(window.innerWidth / TABLE.width, window.innerHeight / TABLE.height);
  const density = window.devicePixelRatio || 1;
  canvas.style.width = `${Math.floor(TABLE.width * scale)}px`;
  canvas.style.height = `${Math.floor(TABLE.height * scale)}px`;
  canvas.width = Math.floor(TABLE.width * scale * density);
  canvas.height = Math.floor(TABLE.height * scale * density);
  ctx.setTransform(canvas.width / TABLE.width, 0, 0, canvas.height / TABLE.height, 0, 0);
}

const actions = {
  startNewDuel() {
    sounds.unlock();
    sounds.startTableMusic();
    startDuel(view, nextSeed ?? seedFromClock());
    nextSeed = null;
  },
  playCard(handIndex, laneIndex) {
    playerPlaysCard(view, handIndex, laneIndex);
  },
  goToTitle() {
    returnToTitle(view);
  },
};

/** Tells screen readers what just happened, once per change of the message line. */
function announceStatus() {
  let status = view.screen === 'title' ? 'Thricefold. Press Enter to deal.' : view.message;
  if (view.screen === 'duel' && view.selectedIndex >= 0 && view.duel.hands.player[view.selectedIndex]) {
    status += ` Selected: ${describeCard(view.duel.hands.player[view.selectedIndex])}.`;
  }
  if (status !== lastStatus) {
    lastStatus = status;
    statusLine.textContent = status;
  }
}

function updateFrame(seconds) {
  updateDuelFlow(view, seconds);
  if (view.duel !== null) {
    aimSpritesAtDuel(view.sprites, view.duel, view);
    updateCardMotion(view.sprites, seconds, () => sounds.playDealTick(), () => sounds.playCardSnap());
  }
  if (view.flourish !== null) updateFlourish(view.flourish, seconds);
}

function drawFrame() {
  if (view.screen === 'title') {
    drawTitleScreen(ctx, view.clock);
    return;
  }
  drawDuelTable(ctx, view);
  if (view.screen === 'won') drawWinScreen(ctx, view);
  if (view.screen === 'lost') drawLossScreen(ctx, view);
}

let lastFrameTime = null;
function runFrame(time) {
  const seconds = lastFrameTime === null ? 0 : Math.min(LONGEST_FRAME_SECONDS, (time - lastFrameTime) / 1000);
  lastFrameTime = time;
  updateFrame(seconds);
  drawFrame();
  announceStatus();
  window.requestAnimationFrame(runFrame);
}

fitCanvasToWindow();
window.addEventListener('resize', fitCanvasToWindow);
window.thricefoldView = view;

if (shotName !== null) {
  stageScreenshotScene(view, shotName, addressSeed ?? 1);
  drawFrame();
  announceStatus();
  window.addEventListener('resize', drawFrame);
  document.documentElement.dataset.shotReady = 'yes';
} else {
  listenToKeyboard(view, actions);
  listenToMouse(canvas, view, actions);
  window.requestAnimationFrame(runFrame);
}
