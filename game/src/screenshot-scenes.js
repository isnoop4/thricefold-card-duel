// One job: stage the still scenes behind ?shot=table|title|win|loss, for the entry's screenshots.
// Every scene is reached by playing the real rules from the seed with a stand-in player, so the
// frame is a true position of a true duel, and the same seed always gives the same frame.
import { createSeededRandom } from './seeded-random.js';
import { buildDeck } from './card-deck.js';
import { LANE_SIZE, STARTING_LIFE, createDuel } from './duel-rules.js';
import { findCombos, scoreLane } from './lane-scoring.js';
import { playDuelInstantly, STAND_IN_POLICIES } from './autopilot-duel.js';
import { aimSpritesAtDuel, createCardSprites, settleCardsInstantly } from './card-motion.js';
import { endDuel, FOLD_NAMES } from './duel-flow.js';
import { updateFlourish } from './win-flourish.js';

const FLOURISH_SECONDS_SHOWN = 1.9;
const FRAME_SECONDS = 1 / 60;

/** The best play to show selected on the table scene: the hand card and fold that finish a combo. */
export function findComboFinishingPlay(duel) {
  let best = null;
  duel.lanes.forEach((lane, laneIndex) => {
    if (lane.player.length !== LANE_SIZE - 1) return;
    duel.hands.player.forEach((card, handIndex) => {
      const score = scoreLane([...lane.player, card]);
      const made = score.combos.filter((key) => key !== 'pair').length;
      if (made > 0 && (best === null || score.total > best.total)) best = { handIndex, laneIndex, total: score.total };
    });
  });
  return best;
}

/**
 * True when a mid-duel table shows the game at its fullest: many cards down on both sides, both
 * lives already struck, a combo standing in a row, and a combo in the player's reach.
 */
export function isRichTable(duel) {
  let cardsDown = 0;
  let standingCombos = 0;
  let emptyRows = 0;
  for (const lane of duel.lanes) {
    for (const side of ['player', 'opponent']) {
      cardsDown += lane[side].length;
      if (lane[side].length === 0) emptyRows += 1;
      if (findCombos(lane[side]).length > 0) standingCombos += 1;
    }
  }
  const bothStruck = duel.life.player < STARTING_LIFE && duel.life.opponent < STARTING_LIFE;
  return cardsDown >= 12 && emptyRows === 0 && standingCombos >= 1 && bothStruck && findComboFinishingPlay(duel) !== null;
}

function showDuelOnTable(view, duel) {
  view.duel = duel;
  view.sprites = createCardSprites(buildDeck());
  view.shownLife = { ...duel.life };
  view.verdict = null;
  view.lifeHits = [];
  view.busy = false;
  view.dragIndex = -1;
  view.hoverIndex = -1;
  view.hoverLane = -1;
}

function stageTableScene(view, seed) {
  const duel = createDuel(createSeededRandom(seed));
  const report = playDuelInstantly(duel, STAND_IN_POLICIES.keen, isRichTable);
  showDuelOnTable(view, duel);
  view.screen = 'duel';
  view.eyedLane = report.eyedLane;
  const finishing = findComboFinishingPlay(duel);
  view.selectedIndex = finishing === null ? 0 : finishing.handIndex;
  view.cursorLane = finishing === null ? 0 : finishing.laneIndex;
  const eye = view.eyedLane === null ? '' : ` Magpie eyes ${FOLD_NAMES[view.eyedLane]}.`;
  view.message = `Your move.${eye}`;
}

function stageEndScene(view, seed, policy) {
  const duel = createDuel(createSeededRandom(seed));
  const report = playDuelInstantly(duel, policy);
  showDuelOnTable(view, duel);
  view.seed = seed;
  view.selectedIndex = -1;
  view.eyedLane = null;
  endDuel(view, report.winner ?? 'opponent');
  for (let frame = 0; frame < FLOURISH_SECONDS_SHOWN / FRAME_SECONDS; frame += 1) updateFlourish(view.flourish, FRAME_SECONDS);
}

/** Sets `view` to the named scene (table, win, loss; any other name is the title) with every card at rest. */
export function stageScreenshotScene(view, name, seed) {
  view.clock = 2.5;
  if (name === 'table') stageTableScene(view, seed);
  else if (name === 'win') stageEndScene(view, seed, STAND_IN_POLICIES.keen);
  else if (name === 'loss') stageEndScene(view, seed, STAND_IN_POLICIES.hasty);
  else view.screen = 'title';
  if (view.duel !== null) {
    aimSpritesAtDuel(view.sprites, view.duel, view);
    settleCardsInstantly(view.sprites);
  }
}
