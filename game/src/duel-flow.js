// One job: run a duel in time. The rules decide what happens; this file decides when: it deals the
// hands card by card, takes your play, lets Magpie answer after a beat, shows each fold's verdict
// before the strike lands, and ends the duel on a win or a loss screen.
import { buildDeck } from './card-deck.js';
import { createSeededRandom } from './seeded-random.js';
import { canPlay, createDuel, drawCard, duelWinner, fullLanes, judgeLane, openLanes, playCard, settleLane, otherSide } from './duel-rules.js';
import { chooseOpponentLane, chooseOpponentPlay } from './opponent-ai.js';
import { createCardSprites, staggerDeal } from './card-motion.js';
import { createFlourish } from './win-flourish.js';
import { comboLabel } from './lane-scoring.js';

export const FOLD_NAMES = ['Fold I', 'Fold II', 'Fold III'];
const DEAL_GAP_SECONDS = 0.11;
const SHOWN_LIFE_SPEED = 9;

/** Everything the table shows and the player holds, beside the duel itself. Starts on the title screen. */
export function createTableView(sounds, pace) {
  return {
    screen: 'title',
    duel: null,
    sprites: createCardSprites(buildDeck()),
    seed: 1,
    selectedIndex: -1,
    hoverIndex: -1,
    hoverLane: -1,
    cursorLane: 0,
    dragIndex: -1,
    dragPoint: null,
    eyedLane: null,
    busy: false,
    message: '',
    verdict: null,
    lifeHits: [],
    shownLife: { player: 0, opponent: 0 },
    shake: 0,
    timers: [],
    pace,
    epoch: 0,
    clock: 0,
    flourish: null,
    result: null,
    sounds,
  };
}

/** Resolves after `seconds` of table time (scaled by the view's pace), counted by updateDuelFlow. */
function pause(view, seconds) {
  return new Promise((resolve) => {
    view.timers.push({ left: seconds * view.pace, resolve });
  });
}

/** Deals a new duel from `seed` and hands the first move to the player. */
export function startDuel(view, seed) {
  view.epoch += 1;
  view.seed = seed;
  view.timers = [];
  view.duel = createDuel(createSeededRandom(seed));
  view.sprites = createCardSprites(buildDeck());
  const dealt = [];
  for (let index = 0; index < view.duel.hands.player.length; index += 1) {
    dealt.push(view.duel.hands.player[index], view.duel.hands.opponent[index]);
  }
  staggerDeal(view.sprites, dealt, DEAL_GAP_SECONDS * view.pace);
  view.screen = 'duel';
  view.selectedIndex = -1;
  view.dragIndex = -1;
  view.dragPoint = null;
  view.cursorLane = 0;
  view.verdict = null;
  view.lifeHits = [];
  view.shownLife = { ...view.duel.life };
  view.flourish = null;
  view.result = null;
  view.busy = false;
  view.eyedLane = chooseOpponentLane(view.duel);
  view.message = 'Your move: pick a card, then a fold.';
}

export function returnToTitle(view) {
  view.epoch += 1;
  view.timers = [];
  view.screen = 'title';
  view.flourish = null;
}

function describeVerdict(verdict) {
  const fold = FOLD_NAMES[verdict.laneIndex];
  const score = `${verdict.player.total} to ${verdict.opponent.total}`;
  if (verdict.winner === null) return `${fold} is level at ${score}. No one is struck.`;
  const combo = comboLabel(verdict[verdict.winner].combos);
  const how = combo === '' ? '' : ` with a ${combo}`;
  if (verdict.winner === 'player') return `You take ${fold} ${score}${how}. Magpie loses ${verdict.damage} life.`;
  return `Magpie takes ${fold} ${score}${how}. You lose ${verdict.damage} life.`;
}

/** Ends the duel on the win or the loss screen, with its flourish and its fanfare or toll. */
export function endDuel(view, winner) {
  view.screen = winner === 'player' ? 'won' : 'lost';
  view.result = { winner, life: { ...view.duel.life }, foldsWon: { ...view.duel.foldsWon }, cardsPlayed: view.duel.cardsPlayed };
  view.flourish = createFlourish(winner === 'player' ? 'win' : 'loss', createSeededRandom(view.seed + 77));
  view.message = winner === 'player' ? 'You won the duel.' : 'Magpie won the duel.';
  view.busy = false;
  if (winner === 'player') view.sounds.playVictoryFanfare();
  else view.sounds.playDefeatToll();
}

/** After a play: draw back up, then judge and settle every full fold. True when the duel has ended. */
async function finishPlay(view, side, epoch) {
  drawCard(view.duel, side);
  await pause(view, 0.45);
  if (epoch !== view.epoch) return true;
  for (const laneIndex of fullLanes(view.duel)) {
    const verdict = judgeLane(view.duel, laneIndex);
    view.verdict = { ...verdict, age: 0 };
    view.message = describeVerdict(verdict);
    if (verdict.winner === 'player') view.sounds.playFoldWon(verdict.player.combos.length > 0);
    else if (verdict.winner === 'opponent') view.sounds.playFoldLost();
    else view.sounds.playFoldLevel();
    await pause(view, 1.7);
    if (epoch !== view.epoch) return true;
    settleLane(view.duel, verdict);
    view.verdict = null;
    if (verdict.winner !== null) {
      view.lifeHits.push({ side: otherSide(verdict.winner), amount: verdict.damage, age: 0 });
      view.shake = 1;
    }
    await pause(view, 0.7);
    if (epoch !== view.epoch) return true;
    const winner = duelWinner(view.duel);
    if (winner !== null) {
      endDuel(view, winner);
      return true;
    }
  }
  return false;
}

async function takeOpponentTurn(view, epoch) {
  view.message = 'Magpie is choosing a card...';
  await pause(view, 0.8);
  if (epoch !== view.epoch) return true;
  const play = chooseOpponentPlay(view.duel, view.eyedLane);
  playCard(view.duel, 'opponent', play.handIndex, play.laneIndex);
  view.message = `Magpie plays into ${FOLD_NAMES[play.laneIndex]}.`;
  view.eyedLane = null;
  await pause(view, 0.55);
  if (epoch !== view.epoch) return true;
  return finishPlay(view, 'opponent', epoch);
}

/** Lets Magpie play until it is the player's move again (she plays twice if you have no open slot). */
async function runUntilPlayerMustAct(view, epoch) {
  for (let guard = 0; guard < 12; guard += 1) {
    if (canPlay(view.duel, 'opponent')) {
      if (await takeOpponentTurn(view, epoch)) return;
    }
    view.eyedLane = chooseOpponentLane(view.duel);
    if (canPlay(view.duel, 'player')) break;
  }
  view.busy = false;
  const open = openLanes(view.duel, 'player');
  if (!open.includes(view.cursorLane) && open.length > 0) view.cursorLane = open[0];
  const eye = view.eyedLane === null ? '' : ` Magpie eyes ${FOLD_NAMES[view.eyedLane]}.`;
  view.message = `Your move.${eye}`;
}

/** The player's turn: play hand card `handIndex` into fold `laneIndex`, then let the duel run on. */
export async function playerPlaysCard(view, handIndex, laneIndex) {
  if (view.screen !== 'duel' || view.busy) return false;
  const epoch = view.epoch;
  if (playCard(view.duel, 'player', handIndex, laneIndex) === null) return false;
  view.busy = true;
  view.selectedIndex = -1;
  view.dragIndex = -1;
  view.dragPoint = null;
  view.message = `You play into ${FOLD_NAMES[laneIndex]}.`;
  await pause(view, 0.4);
  if (epoch !== view.epoch) return true;
  if (await finishPlay(view, 'player', epoch)) return true;
  await runUntilPlayerMustAct(view, epoch);
  return true;
}

/** Advances the pauses, the verdict banner, the floating strike numbers and the counting life totals. */
export function updateDuelFlow(view, seconds) {
  view.clock += seconds;
  const due = [];
  for (const timer of view.timers) {
    timer.left -= seconds;
    if (timer.left <= 0) due.push(timer);
  }
  if (due.length > 0) {
    view.timers = view.timers.filter((timer) => timer.left > 0);
    for (const timer of due) timer.resolve();
  }
  if (view.verdict !== null) view.verdict.age += seconds;
  for (const hit of view.lifeHits) hit.age += seconds;
  view.lifeHits = view.lifeHits.filter((hit) => hit.age < 1.6);
  view.shake = Math.max(0, view.shake - seconds * 3);
  if (view.duel !== null) {
    for (const side of ['player', 'opponent']) {
      const gap = view.duel.life[side] - view.shownLife[side];
      const step = Math.sign(gap) * Math.min(Math.abs(gap), SHOWN_LIFE_SPEED * seconds);
      view.shownLife[side] += step;
    }
  }
}
