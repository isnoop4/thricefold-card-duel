// One job: make the cards move. Every card has a sprite that slides toward the place the rules say
// it is (deck, hand, fold or discards), flips as it turns face up, and snaps with a little pop when
// it lands, so the table always shows the duel's true state without a script per move.
import { DECK_SPOT, DISCARD_SPOT, HAND_CARD, LANE_CARD, OPPONENT_HAND_CARD } from './table-layout.js';
import { handCardPosition, handCardTilt, laneSlotPosition } from './table-layout.js';

const SLIDE_RATE = 13;
const FLIP_SPEED = 4.2;
const POP_FADE = 4.5;
const TRAVEL_DISTANCE = 28;
const ARRIVAL_DISTANCE = 1.6;
const SELECTED_LIFT = 30;
const HOVER_LIFT = 10;

/** One sprite per card, all stacked face down on the deck. */
export function createCardSprites(cards) {
  const sprites = new Map();
  for (const card of cards) {
    sprites.set(card.id, {
      card,
      x: DECK_SPOT.x,
      y: DECK_SPOT.y,
      tilt: 0,
      width: LANE_CARD.width,
      height: LANE_CARD.height,
      flip: 0,
      target: { x: DECK_SPOT.x, y: DECK_SPOT.y, tilt: 0, width: LANE_CARD.width, height: LANE_CARD.height, flip: 0 },
      delay: 0,
      pop: 0,
      travelling: false,
      rank: 0,
      place: 'deck',
    });
  }
  return sprites;
}

function aim(sprite, place, rank, x, y, tilt, size, flip) {
  sprite.place = place;
  sprite.rank = rank;
  sprite.target.x = x;
  sprite.target.y = y;
  sprite.target.tilt = tilt;
  sprite.target.width = size.width;
  sprite.target.height = size.height;
  sprite.target.flip = flip;
}

/** A small fixed tilt per card, so the discards look tossed and not stacked by a machine. */
function tossedTilt(card) {
  return (((card.id * 37) % 11) - 5) * 0.035;
}

/**
 * Points every sprite at where its card now is in the duel. `held` says which hand card the player
 * has selected, hovers or drags, so that card lifts or follows the pointer.
 */
export function aimSpritesAtDuel(sprites, duel, held) {
  duel.deck.forEach((card, index) => {
    aim(sprites.get(card.id), 'deck', index, DECK_SPOT.x - index * 0.35, DECK_SPOT.y - index * 0.6, 0, LANE_CARD, 0);
  });
  duel.discard.forEach((card, index) => {
    aim(sprites.get(card.id), 'discard', 100 + index, DISCARD_SPOT.x, DISCARD_SPOT.y, tossedTilt(card), LANE_CARD, 1);
  });
  duel.lanes.forEach((lane, laneIndex) => {
    for (const side of ['opponent', 'player']) {
      lane[side].forEach((card, slotIndex) => {
        const spot = laneSlotPosition(side, laneIndex, slotIndex);
        aim(sprites.get(card.id), 'lane', 200 + laneIndex * 10 + slotIndex, spot.x, spot.y, 0, LANE_CARD, 1);
      });
    }
  });
  duel.hands.opponent.forEach((card, index) => {
    const spot = handCardPosition('opponent', index, duel.hands.opponent.length);
    aim(sprites.get(card.id), 'opponentHand', 300 + index, spot.x, spot.y, handCardTilt('opponent', index, duel.hands.opponent.length), OPPONENT_HAND_CARD, 0);
  });
  duel.hands.player.forEach((card, index) => {
    const count = duel.hands.player.length;
    const spot = handCardPosition('player', index, count);
    const sprite = sprites.get(card.id);
    let lift = 0;
    if (held.selectedIndex === index) lift = SELECTED_LIFT;
    else if (held.hoverIndex === index) lift = HOVER_LIFT;
    aim(sprite, 'playerHand', 400 + index, spot.x, spot.y - lift, lift > 0 ? 0 : handCardTilt('player', index, count), HAND_CARD, 1);
    if (held.dragIndex === index && held.dragPoint) {
      aim(sprite, 'playerHand', 900, held.dragPoint.x, held.dragPoint.y, 0, HAND_CARD, 1);
    }
  });
}

/** Holds each listed card back a little longer than the one before, so a hand is dealt card by card. */
export function staggerDeal(sprites, cards, gapSeconds) {
  cards.forEach((card, index) => {
    sprites.get(card.id).delay = index * gapSeconds;
  });
}

function approach(value, goal, share) {
  return value + (goal - value) * share;
}

/**
 * Advances every sprite by `seconds`. Calls `onLeave(sprite)` when a card sets off on a long slide
 * and `onLand(sprite)` when it snaps into place, which is where the table plays its sounds.
 */
export function updateCardMotion(sprites, seconds, onLeave, onLand) {
  const share = 1 - Math.exp(-SLIDE_RATE * seconds);
  for (const sprite of sprites.values()) {
    const target = sprite.target;
    if (sprite.pop > 0) sprite.pop = Math.max(0, sprite.pop - POP_FADE * seconds);
    const distance = Math.hypot(target.x - sprite.x, target.y - sprite.y);
    if (sprite.delay > 0) {
      sprite.delay -= seconds;
      continue;
    }
    if (!sprite.travelling && distance > TRAVEL_DISTANCE) {
      sprite.travelling = true;
      onLeave(sprite);
    }
    sprite.x = approach(sprite.x, target.x, share);
    sprite.y = approach(sprite.y, target.y, share);
    sprite.tilt = approach(sprite.tilt, target.tilt, share);
    sprite.width = approach(sprite.width, target.width, share);
    sprite.height = approach(sprite.height, target.height, share);
    const turn = Math.max(-FLIP_SPEED * seconds, Math.min(FLIP_SPEED * seconds, target.flip - sprite.flip));
    sprite.flip += turn;
    if (distance <= ARRIVAL_DISTANCE) {
      sprite.x = target.x;
      sprite.y = target.y;
      if (sprite.travelling) {
        sprite.travelling = false;
        sprite.pop = 1;
        onLand(sprite);
      }
    }
  }
}

/** Puts every sprite exactly at its target at once: used for the still screenshot scenes. */
export function settleCardsInstantly(sprites) {
  for (const sprite of sprites.values()) {
    Object.assign(sprite, { x: sprite.target.x, y: sprite.target.y, tilt: sprite.target.tilt });
    Object.assign(sprite, { width: sprite.target.width, height: sprite.target.height, flip: sprite.target.flip });
    sprite.delay = 0;
    sprite.pop = 0;
    sprite.travelling = false;
  }
}

/** The sprites in the order to draw them: resting piles first, cards in flight on top. */
export function spritesInDrawOrder(sprites) {
  return [...sprites.values()].sort((a, b) => (a.travelling ? 1000 : 0) + a.rank - ((b.travelling ? 1000 : 0) + b.rank));
}
