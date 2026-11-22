// One job: the rules of a Thricefold duel as plain data and pure steps, with no drawing and no timing.
// Two duellists each hold five cards and play one a turn into any of three folds. A fold takes three
// cards a side; when both sides are full the stronger side strikes the other duellist's life.
import { buildDeck, shuffleDeck } from './card-deck.js';
import { comboStrike, scoreLane } from './lane-scoring.js';

export const LANE_COUNT = 3;
export const LANE_SIZE = 3;
export const HAND_SIZE = 5;
export const STARTING_LIFE = 20;
/** Life the winner of a fold strikes away; the winning side's combos add their own strike to it. */
export const FOLD_STRIKE = 4;

export const SIDES = ['player', 'opponent'];

export function otherSide(side) {
  return side === 'player' ? 'opponent' : 'player';
}

/** A fresh duel: a shuffled deck, five cards dealt to each duellist in turn, three empty folds. */
export function createDuel(random) {
  const duel = {
    random,
    deck: shuffleDeck(buildDeck(), random),
    discard: [],
    hands: { player: [], opponent: [] },
    lanes: [],
    life: { player: STARTING_LIFE, opponent: STARTING_LIFE },
    foldsWon: { player: 0, opponent: 0 },
    cardsPlayed: 0,
  };
  for (let lane = 0; lane < LANE_COUNT; lane += 1) duel.lanes.push({ player: [], opponent: [] });
  for (let round = 0; round < HAND_SIZE; round += 1) {
    for (const side of SIDES) drawCard(duel, side);
  }
  return duel;
}

/** Moves the deck's top card to a hand; an empty deck is first rebuilt from the shuffled discards. */
export function drawCard(duel, side) {
  if (duel.deck.length === 0) {
    if (duel.discard.length === 0) return null;
    duel.deck = shuffleDeck(duel.discard, duel.random);
    duel.discard = [];
  }
  const card = duel.deck.pop();
  duel.hands[side].push(card);
  return card;
}

/** The folds in which `side` still has an empty slot. */
export function openLanes(duel, side) {
  const open = [];
  for (let lane = 0; lane < LANE_COUNT; lane += 1) {
    if (duel.lanes[lane][side].length < LANE_SIZE) open.push(lane);
  }
  return open;
}

export function canPlay(duel, side) {
  return duel.hands[side].length > 0 && openLanes(duel, side).length > 0;
}

/** Plays one card from a hand into a fold; returns the card, or null when the play is not legal. */
export function playCard(duel, side, handIndex, laneIndex) {
  const hand = duel.hands[side];
  const lane = duel.lanes[laneIndex];
  if (!lane || handIndex < 0 || handIndex >= hand.length || lane[side].length >= LANE_SIZE) return null;
  const [card] = hand.splice(handIndex, 1);
  lane[side].push(card);
  duel.cardsPlayed += 1;
  return card;
}

/** The folds with three cards on both sides, ready to be judged. */
export function fullLanes(duel) {
  const full = [];
  for (let lane = 0; lane < LANE_COUNT; lane += 1) {
    if (duel.lanes[lane].player.length === LANE_SIZE && duel.lanes[lane].opponent.length === LANE_SIZE) full.push(lane);
  }
  return full;
}

/** Who wins a full fold and how hard they strike; changes nothing. A level fold strikes no one. */
export function judgeLane(duel, laneIndex) {
  const player = scoreLane(duel.lanes[laneIndex].player);
  const opponent = scoreLane(duel.lanes[laneIndex].opponent);
  let winner = null;
  if (player.total > opponent.total) winner = 'player';
  if (opponent.total > player.total) winner = 'opponent';
  const winning = winner === 'player' ? player : opponent;
  const damage = winner === null ? 0 : FOLD_STRIKE + comboStrike(winning.combos);
  return { laneIndex, player, opponent, winner, damage };
}

/** Carries a verdict out: the loser's life drops, the fold's six cards go to the discards. */
export function settleLane(duel, verdict) {
  const lane = duel.lanes[verdict.laneIndex];
  if (verdict.winner !== null) {
    const loser = otherSide(verdict.winner);
    duel.life[loser] = Math.max(0, duel.life[loser] - verdict.damage);
    duel.foldsWon[verdict.winner] += 1;
  }
  duel.discard.push(...lane.player, ...lane.opponent);
  lane.player = [];
  lane.opponent = [];
}

/** The side still standing once the other's life is gone; null while the duel goes on. */
export function duelWinner(duel) {
  if (duel.life.opponent <= 0) return 'player';
  if (duel.life.player <= 0) return 'opponent';
  return null;
}
