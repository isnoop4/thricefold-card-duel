// One job: draw one card. Faces show a big value and the suit's own shape in the suit's own colour;
// backs show the three-fold knot. Everything is drawn with canvas paths: the game ships no image.
import { SUITS } from './card-deck.js';

const FACE_FONT = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';

function traceRoundedRectangle(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawSunCircle(ctx, radius, suit) {
  ctx.fillStyle = suit.color;
  for (let ray = 0; ray < 8; ray += 1) {
    const angle = (ray * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle - 0.2) * radius * 0.66, Math.sin(angle - 0.2) * radius * 0.66);
    ctx.lineTo(Math.cos(angle) * radius * 1.06, Math.sin(angle) * radius * 1.06);
    ctx.lineTo(Math.cos(angle + 0.2) * radius * 0.66, Math.sin(angle + 0.2) * radius * 0.66);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = suit.ink;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.26, 0, Math.PI * 2);
  ctx.fill();
}

function drawMoonCrescent(ctx, radius, suit) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.rect(-radius * 2, -radius * 2, radius * 4, radius * 4);
  ctx.arc(radius * 0.46, -radius * 0.16, radius * 0.84, 0, Math.PI * 2);
  ctx.fillStyle = suit.color;
  ctx.fill('evenodd');
  ctx.restore();
}

function drawPeakTriangle(ctx, radius, suit) {
  ctx.fillStyle = suit.color;
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.lineTo(radius, radius * 0.82);
  ctx.lineTo(-radius, radius * 0.82);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = suit.pale;
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.lineTo(radius * 0.36, -radius * 0.34);
  ctx.lineTo(radius * 0.12, -radius * 0.48);
  ctx.lineTo(0, -radius * 0.26);
  ctx.lineTo(-radius * 0.14, -radius * 0.48);
  ctx.lineTo(-radius * 0.36, -radius * 0.34);
  ctx.closePath();
  ctx.fill();
}

function drawGemDiamond(ctx, radius, suit) {
  ctx.fillStyle = suit.color;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.05);
  ctx.lineTo(radius * 0.8, 0);
  ctx.lineTo(0, radius * 1.05);
  ctx.lineTo(-radius * 0.8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = suit.ink;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.05);
  ctx.lineTo(radius * 0.8, 0);
  ctx.lineTo(0, radius * 0.16);
  ctx.closePath();
  ctx.globalAlpha *= 0.45;
  ctx.fill();
  ctx.globalAlpha /= 0.45;
}

const SUIT_SHAPE_PAINTERS = { circle: drawSunCircle, crescent: drawMoonCrescent, triangle: drawPeakTriangle, diamond: drawGemDiamond };

/** Draws the shape of suit `suitIndex` centred on (x, y): a circle, a crescent, a triangle or a diamond. */
export function drawSuitShape(ctx, suitIndex, x, y, radius) {
  const suit = SUITS[suitIndex];
  ctx.save();
  ctx.translate(x, y);
  SUIT_SHAPE_PAINTERS[suit.shape](ctx, radius, suit);
  ctx.restore();
}

/** A card's face, centred on the origin: big value top left, small suit top right, large suit below. */
export function drawCardFace(ctx, card, width, height) {
  const suit = SUITS[card.suit];
  traceRoundedRectangle(ctx, -width / 2, -height / 2, width, height, width * 0.11);
  const paper = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
  paper.addColorStop(0, '#fffdf6');
  paper.addColorStop(1, suit.pale);
  ctx.fillStyle = paper;
  ctx.fill();
  ctx.lineWidth = Math.max(3, width * 0.045);
  ctx.strokeStyle = suit.color;
  ctx.stroke();
  ctx.fillStyle = suit.ink;
  ctx.font = `bold ${Math.round(height * 0.36)}px ${FACE_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(card.value), -width / 2 + width * 0.1, -height / 2 + height * 0.34);
  drawSuitShape(ctx, card.suit, width / 2 - width * 0.22, -height / 2 + height * 0.19, width * 0.12);
  drawSuitShape(ctx, card.suit, 0, height * 0.17, width * 0.27);
}

/** A card's back, centred on the origin: midnight blue with the gold three-fold knot. */
export function drawCardBack(ctx, width, height) {
  traceRoundedRectangle(ctx, -width / 2, -height / 2, width, height, width * 0.11);
  const cloth = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
  cloth.addColorStop(0, '#27356f');
  cloth.addColorStop(1, '#131a3d');
  ctx.fillStyle = cloth;
  ctx.fill();
  ctx.lineWidth = Math.max(2, width * 0.04);
  ctx.strokeStyle = '#e8c36a';
  ctx.stroke();
  ctx.lineWidth = Math.max(1.5, width * 0.028);
  for (let fold = -1; fold <= 1; fold += 1) {
    const reach = width * 0.2;
    ctx.beginPath();
    ctx.moveTo(fold * reach * 0.8, -reach * 1.3);
    ctx.lineTo(fold * reach * 0.8 + reach, 0);
    ctx.lineTo(fold * reach * 0.8, reach * 1.3);
    ctx.lineTo(fold * reach * 0.8 - reach, 0);
    ctx.closePath();
    ctx.stroke();
  }
}

/** Draws a moving card: its slide position, its tilt, its landing pop, and its flip from back to face. */
export function drawCardSprite(ctx, sprite, glowColor) {
  const pop = 1 + 0.12 * Math.sin(sprite.pop * Math.PI);
  const turn = Math.abs(Math.cos(sprite.flip * Math.PI));
  ctx.save();
  ctx.translate(sprite.x, sprite.y);
  ctx.rotate(sprite.tilt);
  ctx.scale(Math.max(0.04, turn) * pop, pop);
  ctx.shadowColor = glowColor ?? 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = glowColor ? 26 : sprite.travelling ? 18 : 8;
  ctx.shadowOffsetY = glowColor ? 0 : sprite.travelling ? 10 : 3;
  traceRoundedRectangle(ctx, -sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height, sprite.width * 0.11);
  ctx.fillStyle = '#131a3d';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  if (sprite.flip > 0.5) drawCardFace(ctx, sprite.card, sprite.width, sprite.height);
  else drawCardBack(ctx, sprite.width, sprite.height);
  ctx.restore();
}

export { traceRoundedRectangle };
