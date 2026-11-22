// One job: how Magpie, the opponent, thinks. She rates every card in every open fold, announces the
// fold she will play into next (her "eye", shown on the table so you can read and counter it), and
// then picks her best card for that fold once she has seen your answer.
import { FOLD_STRIKE, LANE_SIZE, openLanes, otherSide } from './duel-rules.js';
import { comboStrike, promiseOfLane, scoreLane } from './lane-scoring.js';

/** What an unplayed slot is expected to add: the deck's average card. */
const AVERAGE_CARD = 5;
/** How quickly a lead turns into a likely win in her estimate. */
const MARGIN_SOFTNESS = 4;
/** A small price on spending a high card, so low cards go to folds that are already decided. */
const HIGH_CARD_THRIFT = 0.09;

function expectedStrength(cards) {
  return scoreLane(cards).total + promiseOfLane(cards) + AVERAGE_CARD * (LANE_SIZE - cards.length);
}

/** The life a fold is worth to `side` as it stands: chance of winning it times the strike, less the risk. */
function laneOutlook(mine, theirs) {
  const margin = expectedStrength(mine) - expectedStrength(theirs);
  const decided = mine.length === LANE_SIZE && theirs.length === LANE_SIZE;
  let winChance = 1 / (1 + Math.exp(-margin / MARGIN_SOFTNESS));
  if (decided) winChance = margin > 0 ? 1 : margin < 0 ? 0 : 0.5;
  const myStrike = FOLD_STRIKE + comboStrike(scoreLane(mine).combos) + promiseOfLane(mine) / 3;
  const theirStrike = FOLD_STRIKE + comboStrike(scoreLane(theirs).combos) + promiseOfLane(theirs) / 3;
  return winChance * myStrike - (1 - winChance) * theirStrike;
}

/** How much better `side` stands after playing `card` into the fold at `laneIndex`. */
export function ratePlay(duel, side, card, laneIndex) {
  const lane = duel.lanes[laneIndex];
  const mine = lane[side];
  const theirs = lane[otherSide(side)];
  const gain = laneOutlook([...mine, card], theirs) - laneOutlook(mine, theirs);
  return gain - HIGH_CARD_THRIFT * card.value;
}

/** Every legal play of `side`, best first: { handIndex, laneIndex, rating }. */
export function rankPlays(duel, side) {
  const plays = [];
  const hand = duel.hands[side];
  for (const laneIndex of openLanes(duel, side)) {
    for (let handIndex = 0; handIndex < hand.length; handIndex += 1) {
      plays.push({ handIndex, laneIndex, rating: ratePlay(duel, side, hand[handIndex], laneIndex) });
    }
  }
  plays.sort((a, b) => b.rating - a.rating || a.laneIndex - b.laneIndex || a.handIndex - b.handIndex);
  return plays;
}

/** The fold Magpie eyes for her next play, announced before you move; null when she has no play. */
export function chooseOpponentLane(duel) {
  const plays = rankPlays(duel, 'opponent');
  return plays.length > 0 ? plays[0].laneIndex : null;
}

/** Her play this turn: the best card for the fold she eyed if it is still open, else her best play. */
export function chooseOpponentPlay(duel, eyedLane) {
  const plays = rankPlays(duel, 'opponent');
  if (plays.length === 0) return null;
  const kept = plays.find((play) => play.laneIndex === eyedLane);
  return kept ?? plays[0];
}
