// One job: where everything sits on the 1280 by 800 table, and which card or fold a point is over.
import { HAND_SIZE, LANE_COUNT, LANE_SIZE } from './duel-rules.js';

export const TABLE = { width: 1280, height: 800 };

export const LANE_CARD = { width: 96, height: 134 };
export const HAND_CARD = { width: 124, height: 174 };
export const OPPONENT_HAND_CARD = { width: 62, height: 86 };

const LANE_CENTERS = [352, 640, 928];
const LANE_SLOT_STEP = 84;
const LANE_ROW_Y = { opponent: 196, player: 372 };
const PLAYER_HAND_Y = 648;
const PLAYER_HAND_STEP = 136;
const OPPONENT_HAND_Y = 58;
const OPPONENT_HAND_STEP = 52;

export const DECK_SPOT = { x: 1170, y: 206 };
export const DISCARD_SPOT = { x: 1170, y: 366 };
export const SCORE_STRIP_Y = 284;
export const MESSAGE_Y = 508;

/** The mat of one fold: both rows of slots and the score strip between them. */
export function laneMatRectangle(laneIndex) {
  const halfWidth = LANE_SLOT_STEP + LANE_CARD.width / 2 + 12;
  return { x: LANE_CENTERS[laneIndex] - halfWidth, y: 110, width: halfWidth * 2, height: 350 };
}

/** The centre of slot `slotIndex` on `side` of a fold. */
export function laneSlotPosition(side, laneIndex, slotIndex) {
  return { x: LANE_CENTERS[laneIndex] + (slotIndex - (LANE_SIZE - 1) / 2) * LANE_SLOT_STEP, y: LANE_ROW_Y[side] };
}

export function laneCenterX(laneIndex) {
  return LANE_CENTERS[laneIndex];
}

/** The centre of card `handIndex` in a hand of `handCount` cards, fanned about the table's middle. */
export function handCardPosition(side, handIndex, handCount) {
  const middle = (handCount - 1) / 2;
  if (side === 'player') {
    return { x: TABLE.width / 2 + (handIndex - middle) * PLAYER_HAND_STEP, y: PLAYER_HAND_Y };
  }
  return { x: TABLE.width / 2 + (handIndex - middle) * OPPONENT_HAND_STEP, y: OPPONENT_HAND_Y };
}

/** A little tilt for each card of a hand, so the hand reads as held and not as a grid. */
export function handCardTilt(side, handIndex, handCount) {
  const middle = (handCount - 1) / 2;
  const lean = (handIndex - middle) * 0.035;
  return side === 'player' ? lean : -lean;
}

function isInside(point, center, size) {
  return Math.abs(point.x - center.x) <= size.width / 2 && Math.abs(point.y - center.y) <= size.height / 2;
}

/** The index of the player's hand card under `point`, or -1. */
export function handCardAt(point, handCount) {
  for (let handIndex = Math.min(handCount, HAND_SIZE) - 1; handIndex >= 0; handIndex -= 1) {
    const center = handCardPosition('player', handIndex, handCount);
    if (isInside(point, { x: center.x, y: center.y - 13 }, { width: HAND_CARD.width, height: HAND_CARD.height + 26 })) return handIndex;
  }
  return -1;
}

/** The index of the fold whose mat is under `point`, or -1. */
export function laneAt(point) {
  for (let laneIndex = 0; laneIndex < LANE_COUNT; laneIndex += 1) {
    const mat = laneMatRectangle(laneIndex);
    if (point.x >= mat.x && point.x <= mat.x + mat.width && point.y >= mat.y && point.y <= mat.y + mat.height) return laneIndex;
  }
  return -1;
}
