// One job: the flourish that ends a duel. A win throws up fountains of suit-shaped confetti that
// keep raining; a loss lets grey ash drift down. Its random stream is seeded, so a still frame of it
// can be reproduced for a screenshot.
import { SUITS } from './card-deck.js';
import { drawSuitShape } from './draw-card-face.js';
import { TABLE } from './table-layout.js';

const GRAVITY = 620;
const FOUNTAIN_SECONDS = 2.6;
const WIN_PIECES_PER_SECOND = 90;
const LOSS_PIECES_PER_SECOND = 26;

/** A flourish of `kind` ('win' or 'loss') that has not yet thrown anything. */
export function createFlourish(kind, random) {
  return { kind, random, age: 0, owed: 0, pieces: [] };
}

function throwWinPiece(flourish) {
  const random = flourish.random;
  const fromFountain = flourish.age < FOUNTAIN_SECONDS;
  const side = random() < 0.5 ? -1 : 1;
  flourish.pieces.push({
    x: fromFountain ? TABLE.width / 2 + side * (180 + random() * 380) : random() * TABLE.width,
    y: fromFountain ? TABLE.height + 10 : -20,
    speedX: fromFountain ? -side * (40 + random() * 240) : (random() - 0.5) * 80,
    speedY: fromFountain ? -(620 + random() * 520) : 60 + random() * 120,
    angle: random() * Math.PI * 2,
    spin: (random() - 0.5) * 9,
    size: 9 + random() * 12,
    suit: Math.floor(random() * SUITS.length),
    age: 0,
  });
}

function throwLossPiece(flourish) {
  const random = flourish.random;
  flourish.pieces.push({
    x: random() * TABLE.width,
    y: -20,
    speedX: (random() - 0.5) * 50,
    speedY: 50 + random() * 90,
    angle: random() * Math.PI * 2,
    spin: (random() - 0.5) * 2,
    size: 5 + random() * 9,
    suit: -1,
    age: 0,
  });
}

/** Advances the flourish by `seconds`: throws the pieces now due and moves the ones in the air. */
export function updateFlourish(flourish, seconds) {
  flourish.age += seconds;
  const isWin = flourish.kind === 'win';
  flourish.owed += seconds * (isWin ? WIN_PIECES_PER_SECOND : LOSS_PIECES_PER_SECOND);
  while (flourish.owed >= 1) {
    flourish.owed -= 1;
    if (isWin) throwWinPiece(flourish);
    else throwLossPiece(flourish);
  }
  for (const piece of flourish.pieces) {
    piece.age += seconds;
    if (isWin) piece.speedY += GRAVITY * seconds;
    piece.x += piece.speedX * seconds;
    piece.y += piece.speedY * seconds;
    piece.angle += piece.spin * seconds;
  }
  flourish.pieces = flourish.pieces.filter((piece) => piece.y < TABLE.height + 60 && piece.age < 9);
}

/** Draws every piece in the air: suit shapes in suit colours for a win, grey ash for a loss. */
export function drawFlourish(ctx, flourish) {
  for (const piece of flourish.pieces) {
    ctx.save();
    ctx.translate(piece.x, piece.y);
    ctx.rotate(piece.angle);
    if (piece.suit >= 0) {
      drawSuitShape(ctx, piece.suit, 0, 0, piece.size);
    } else {
      ctx.fillStyle = 'rgba(170, 180, 205, 0.5)';
      ctx.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
    }
    ctx.restore();
  }
}
