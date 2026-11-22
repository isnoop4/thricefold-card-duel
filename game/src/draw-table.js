// One job: draw the duel table: the night-sky cloth, the three fold mats with their strengths and
// combos, Magpie's eye on the fold she will play next, both life totals, the deck and the discards,
// the message line and the key hints. Cards themselves are drawn by draw-card-face.js.
import { COMBOS, COMBO_ORDER, comboLabel, scoreLane } from './lane-scoring.js';
import { FOLD_STRIKE, LANE_COUNT, LANE_SIZE, STARTING_LIFE } from './duel-rules.js';
import { DECK_SPOT, DISCARD_SPOT, HAND_CARD, LANE_CARD, MESSAGE_Y, SCORE_STRIP_Y, TABLE } from './table-layout.js';
import { handCardPosition, laneCenterX, laneMatRectangle, laneSlotPosition } from './table-layout.js';
import { drawCardSprite, traceRoundedRectangle } from './draw-card-face.js';
import { spritesInDrawOrder } from './card-motion.js';
import { FOLD_NAMES } from './duel-flow.js';

export const UI_FONT = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';
export const SIDE_COLORS = { player: '#5fe0d0', opponent: '#ff8fa8' };
const GOLD = '#f4cf6b';
const CREAM = '#f6efdc';

function fillPanel(ctx, x, y, width, height, radius, fill, stroke) {
  traceRoundedRectangle(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function writeText(ctx, text, x, y, size, color, align = 'center', weight = 'bold') {
  ctx.font = `${weight} ${size}px ${UI_FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** The cloth: a deep blue-green night with a fixed scatter of stars that twinkle with the clock. */
export function drawTableBackdrop(ctx, clock) {
  const cloth = ctx.createRadialGradient(TABLE.width / 2, TABLE.height * 0.45, 80, TABLE.width / 2, TABLE.height / 2, 820);
  cloth.addColorStop(0, '#1d4a5c');
  cloth.addColorStop(0.55, '#12283f');
  cloth.addColorStop(1, '#090f1f');
  ctx.fillStyle = cloth;
  ctx.fillRect(0, 0, TABLE.width, TABLE.height);
  for (let star = 0; star < 90; star += 1) {
    const x = (star * 197.3) % TABLE.width;
    const y = (star * 113.7 + (star % 7) * 61) % TABLE.height;
    const twinkle = 0.25 + 0.2 * Math.sin(clock * 1.3 + star);
    ctx.fillStyle = `rgba(255, 244, 210, ${twinkle.toFixed(3)})`;
    ctx.fillRect(x, y, star % 5 === 0 ? 3 : 2, star % 5 === 0 ? 3 : 2);
  }
}

/** Magpie's badge: a black-and-white bird with an orange beak on a gold-ringed disc. */
export function drawMagpieBadge(ctx, x, y, radius) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#2b3a7a';
  ctx.fill();
  ctx.lineWidth = radius * 0.1;
  ctx.strokeStyle = SIDE_COLORS.opponent;
  ctx.stroke();
  ctx.fillStyle = '#0b0e1c';
  ctx.beginPath();
  ctx.ellipse(-radius * 0.08, radius * 0.18, radius * 0.5, radius * 0.4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(radius * 0.22, -radius * 0.26, radius * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-radius * 0.42, radius * 0.2);
  ctx.lineTo(-radius * 0.86, radius * 0.5);
  ctx.lineTo(-radius * 0.4, radius * 0.44);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.32, radius * 0.3, radius * 0.2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(radius * 0.28, -radius * 0.3, radius * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff9d2e';
  ctx.beginPath();
  ctx.moveTo(radius * 0.48, -radius * 0.34);
  ctx.lineTo(radius * 0.84, -radius * 0.2);
  ctx.lineTo(radius * 0.48, -radius * 0.12);
  ctx.fill();
  ctx.restore();
}

/** An eye glyph: the mark of the fold Magpie will play into next. */
function drawEyeGlyph(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.quadraticCurveTo(0, -size * 0.9, size, 0);
  ctx.quadraticCurveTo(0, size * 0.9, -size, 0);
  ctx.fillStyle = '#fff5f7';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.36, 0, Math.PI * 2);
  ctx.fillStyle = '#1b1030';
  ctx.fill();
  ctx.restore();
}

/** One side's life total: a name, a big number and a bar that empties as the folds are lost. */
function drawLifeTotal(ctx, view, side, x, y, width, height) {
  const life = view.duel.life[side];
  const shown = Math.max(0, view.shownLife[side]);
  const color = SIDE_COLORS[side];
  fillPanel(ctx, x, y, width, height, 14, 'rgba(8, 12, 30, 0.72)', color);
  const tall = height > 110;
  if (side === 'opponent') drawMagpieBadge(ctx, x + 42, y + height / 2, 30);
  const textX = side === 'opponent' ? x + 84 : x + 18;
  writeText(ctx, side === 'player' ? 'YOU' : 'MAGPIE', textX, y + (tall ? 24 : 18), tall ? 18 : 15, color, 'left');
  writeText(ctx, 'LIFE', textX, y + (tall ? 50 : 40), 13, CREAM, 'left');
  writeText(ctx, String(Math.round(shown)), x + width - 18, y + (tall ? 62 : 42), tall ? 76 : 50, life <= 5 ? '#ff6b6b' : CREAM, 'right');
  const barX = x + 16;
  const barWidth = width - 32;
  const barY = y + height - (tall ? 30 : 16);
  fillPanel(ctx, barX, barY, barWidth, tall ? 14 : 8, 4, 'rgba(255, 255, 255, 0.14)');
  if (shown > 0) fillPanel(ctx, barX, barY, Math.max(8, (barWidth * shown) / STARTING_LIFE), tall ? 14 : 8, 4, color);
  for (const hit of view.lifeHits) {
    if (hit.side !== side) continue;
    ctx.globalAlpha = Math.max(0, 1 - hit.age / 1.6);
    writeText(ctx, `-${hit.amount}`, x + width + 34, y + height / 2 - hit.age * 34, 44, '#ff5a5a');
    ctx.globalAlpha = 1;
  }
}

/** The tally of folds each duellist has taken so far. */
function drawFoldsWonTally(ctx, view) {
  fillPanel(ctx, 24, 250, 166, 96, 14, 'rgba(8, 12, 30, 0.6)');
  writeText(ctx, 'FOLDS WON', 107, 270, 13, CREAM);
  writeText(ctx, `You ${view.duel.foldsWon.player}`, 107, 298, 20, SIDE_COLORS.player);
  writeText(ctx, `Magpie ${view.duel.foldsWon.opponent}`, 107, 326, 20, SIDE_COLORS.opponent);
}

/** The reminder card: what each combo adds to a fold and what a won fold strikes for. */
function drawComboGuide(ctx) {
  const x = 1040;
  const y = 566;
  fillPanel(ctx, x, y, 220, 184, 14, 'rgba(8, 12, 30, 0.72)', 'rgba(244, 207, 107, 0.5)');
  writeText(ctx, 'COMBOS', x + 110, y + 20, 14, GOLD);
  COMBO_ORDER.forEach((key, index) => {
    const rowY = y + 46 + index * 25;
    writeText(ctx, COMBOS[key].name, x + 14, rowY, 17, CREAM, 'left');
    writeText(ctx, `+${COMBOS[key].bonus}`, x + 208, rowY, 17, GOLD, 'right');
    writeText(ctx, COMBOS[key].rule, x + 76, rowY + 1, 11, 'rgba(246, 239, 220, 0.62)', 'left', 'normal');
  });
  writeText(ctx, `Win a fold: strike ${FOLD_STRIKE}`, x + 110, y + 148, 13, CREAM);
  writeText(ctx, 'Pair +1  Blend +2  Ladder +3  Trio +4', x + 110, y + 166, 11, GOLD);
}

function drawPileLabels(ctx, view) {
  writeText(ctx, `DECK ${view.duel.deck.length}`, DECK_SPOT.x, DECK_SPOT.y + LANE_CARD.height / 2 + 14, 13, CREAM);
  ctx.setLineDash([6, 5]);
  traceRoundedRectangle(ctx, DISCARD_SPOT.x - LANE_CARD.width / 2, DISCARD_SPOT.y - LANE_CARD.height / 2, LANE_CARD.width, LANE_CARD.height, 10);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(246, 239, 220, 0.25)';
  ctx.stroke();
  ctx.setLineDash([]);
  writeText(ctx, `DISCARDS ${view.duel.discard.length}`, DISCARD_SPOT.x, DISCARD_SPOT.y + LANE_CARD.height / 2 + 14, 13, CREAM);
}

function drawEmptySlots(ctx, laneIndex) {
  ctx.setLineDash([6, 5]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(246, 239, 220, 0.2)';
  for (const side of ['opponent', 'player']) {
    for (let slot = 0; slot < LANE_SIZE; slot += 1) {
      const spot = laneSlotPosition(side, laneIndex, slot);
      traceRoundedRectangle(ctx, spot.x - LANE_CARD.width / 2 + 4, spot.y - LANE_CARD.height / 2 + 4, LANE_CARD.width - 8, LANE_CARD.height - 8, 9);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
}

/** A ribbon naming the combo a row has made, in gold, just outside that row. */
function drawComboRibbon(ctx, laneIndex, side, combos) {
  if (combos.length === 0) return;
  const mat = laneMatRectangle(laneIndex);
  const y = side === 'opponent' ? mat.y + 14 : mat.y + mat.height - 13;
  const bonus = combos.reduce((sum, key) => sum + COMBOS[key].bonus, 0);
  fillPanel(ctx, laneCenterX(laneIndex) - 96, y - 13, 192, 26, 13, GOLD, '#3a2500');
  writeText(ctx, `${comboLabel(combos).toUpperCase()} +${bonus}`, laneCenterX(laneIndex), y + 1, 15, '#3a2500');
}

/** The strip between a fold's rows: its name, Magpie's strength, yours, and your selected card's preview. */
function drawScoreStrip(ctx, view, laneIndex) {
  const lane = view.duel.lanes[laneIndex];
  const centerX = laneCenterX(laneIndex);
  const mat = laneMatRectangle(laneIndex);
  const mine = scoreLane(lane.player);
  const hers = scoreLane(lane.opponent);
  writeText(ctx, FOLD_NAMES[laneIndex].toUpperCase(), mat.x + 12, SCORE_STRIP_Y, 13, 'rgba(246, 239, 220, 0.7)', 'left');
  writeText(ctx, String(hers.total), centerX - 16, SCORE_STRIP_Y - 1, 30, SIDE_COLORS.opponent, 'right');
  writeText(ctx, ':', centerX, SCORE_STRIP_Y - 3, 24, CREAM);
  writeText(ctx, String(mine.total), centerX + 16, SCORE_STRIP_Y - 1, 30, SIDE_COLORS.player, 'left');
  if (view.eyedLane === laneIndex && view.verdict === null) {
    const pulse = 0.6 + 0.4 * Math.sin(view.clock * 5);
    const slot = laneSlotPosition('opponent', laneIndex, Math.min(lane.opponent.length, LANE_SIZE - 1));
    traceRoundedRectangle(ctx, slot.x - LANE_CARD.width / 2 + 2, slot.y - LANE_CARD.height / 2 + 2, LANE_CARD.width - 4, LANE_CARD.height - 4, 10);
    ctx.lineWidth = 4;
    ctx.strokeStyle = `rgba(255, 143, 168, ${pulse.toFixed(3)})`;
    ctx.stroke();
    if (lane.opponent.length < LANE_SIZE) drawEyeGlyph(ctx, slot.x, slot.y, 24, SIDE_COLORS.opponent);
    drawEyeGlyph(ctx, mat.x + mat.width - 28, SCORE_STRIP_Y, 14, SIDE_COLORS.opponent);
  }
}

/**
 * The ribbons laid over the cards' outer edges once the cards are drawn: each row's standing combo
 * in gold, and in teal what the selected card would make of each open fold if it were played there.
 */
function drawFoldRibbons(ctx, view) {
  const selected = view.screen === 'duel' ? view.duel.hands.player[view.selectedIndex] : undefined;
  view.duel.lanes.forEach((lane, laneIndex) => {
    const mat = laneMatRectangle(laneIndex);
    const centerX = laneCenterX(laneIndex);
    drawComboRibbon(ctx, laneIndex, 'opponent', scoreLane(lane.opponent).combos);
    if (selected && view.verdict === null && lane.player.length < LANE_SIZE && !view.busy) {
      const preview = scoreLane([...lane.player, selected]);
      const label = preview.combos.length > 0 ? `${comboLabel(preview.combos)}: ${preview.total}` : `plays to ${preview.total}`;
      fillPanel(ctx, centerX - 104, mat.y + mat.height - 26, 208, 26, 13, '#5fe0d0', '#06302b');
      writeText(ctx, label.toUpperCase(), centerX, mat.y + mat.height - 12, 15, '#06302b');
    } else {
      drawComboRibbon(ctx, laneIndex, 'player', scoreLane(lane.player).combos);
    }
  });
}

/** The three fold mats, lit where the player can drop the selected card. */
function drawFoldMats(ctx, view) {
  for (let laneIndex = 0; laneIndex < LANE_COUNT; laneIndex += 1) {
    const mat = laneMatRectangle(laneIndex);
    const open = view.duel.lanes[laneIndex].player.length < LANE_SIZE;
    const aimed = !view.busy && open && (view.selectedIndex >= 0 || view.dragIndex >= 0);
    const pointed = aimed && (view.hoverLane === laneIndex || (view.hoverLane < 0 && view.cursorLane === laneIndex));
    fillPanel(ctx, mat.x, mat.y, mat.width, mat.height, 18, pointed ? 'rgba(95, 224, 208, 0.2)' : 'rgba(6, 14, 34, 0.55)', pointed ? SIDE_COLORS.player : aimed ? 'rgba(95, 224, 208, 0.45)' : 'rgba(246, 239, 220, 0.16)');
    drawEmptySlots(ctx, laneIndex);
    drawScoreStrip(ctx, view, laneIndex);
  }
}

/** The verdict on a full fold: the winning row glows and a banner names the winner and the strike. */
function drawVerdictBanner(ctx, view) {
  const verdict = view.verdict;
  if (verdict === null) return;
  const centerX = laneCenterX(verdict.laneIndex);
  const grow = Math.min(1, verdict.age / 0.22);
  const color = verdict.winner === null ? CREAM : SIDE_COLORS[verdict.winner];
  const text = verdict.winner === null ? 'LEVEL' : verdict.winner === 'player' ? `YOU WIN  -${verdict.damage}` : `MAGPIE WINS  -${verdict.damage}`;
  ctx.save();
  ctx.translate(centerX, SCORE_STRIP_Y);
  ctx.scale(0.6 + 0.4 * grow, 0.6 + 0.4 * grow);
  fillPanel(ctx, -138, -25, 276, 50, 25, 'rgba(8, 12, 30, 0.94)', color);
  writeText(ctx, text, 0, 1, 24, color);
  ctx.restore();
}

function drawMessageLine(ctx, view) {
  ctx.font = `bold 22px ${UI_FONT}`;
  const width = Math.max(320, ctx.measureText(view.message).width + 56);
  fillPanel(ctx, TABLE.width / 2 - width / 2, MESSAGE_Y - 21, width, 42, 21, 'rgba(8, 12, 30, 0.78)', view.busy ? 'rgba(246, 239, 220, 0.25)' : SIDE_COLORS.player);
  writeText(ctx, view.message, TABLE.width / 2, MESSAGE_Y + 1, 22, CREAM);
}

function drawHandKeyBadges(ctx, view) {
  const count = view.duel.hands.player.length;
  for (let index = 0; index < count; index += 1) {
    const spot = handCardPosition('player', index, count);
    writeText(ctx, String(index + 1), spot.x, spot.y + HAND_CARD.height / 2 + 13, 14, view.selectedIndex === index ? GOLD : 'rgba(246, 239, 220, 0.6)');
  }
  writeText(ctx, 'Pick a card: 1-5 or click  |  Play it: Q W E, click or drag to a fold  |  Arrows + Enter  |  M sound  |  Esc title', TABLE.width / 2, TABLE.height - 13, 13, 'rgba(246, 239, 220, 0.62)', 'center', 'normal');
}

function glowForSprite(view, sprite) {
  if (view.verdict !== null && view.verdict.winner !== null) {
    const row = view.duel.lanes[view.verdict.laneIndex][view.verdict.winner];
    if (row.includes(sprite.card)) return SIDE_COLORS[view.verdict.winner];
  }
  if (view.duel.hands.player[view.selectedIndex] === sprite.card) return GOLD;
  return null;
}

/** The whole table for one frame: cloth, mats, piles, every card, life totals, verdict and messages. */
export function drawDuelTable(ctx, view) {
  ctx.save();
  if (view.shake > 0) ctx.translate(Math.sin(view.clock * 70) * 7 * view.shake, Math.cos(view.clock * 53) * 4 * view.shake);
  drawTableBackdrop(ctx, view.clock);
  drawFoldMats(ctx, view);
  drawPileLabels(ctx, view);
  drawFoldsWonTally(ctx, view);
  drawComboGuide(ctx);
  for (const sprite of spritesInDrawOrder(view.sprites)) drawCardSprite(ctx, sprite, glowForSprite(view, sprite));
  drawFoldRibbons(ctx, view);
  writeText(ctx, `MAGPIE'S HAND: ${view.duel.hands.opponent.length} CARDS`, 800, 40, 13, SIDE_COLORS.opponent, 'left');
  writeText(ctx, 'face down until played', 800, 60, 12, 'rgba(246, 239, 220, 0.6)', 'left', 'normal');
  drawLifeTotal(ctx, view, 'opponent', 24, 14, 250, 88);
  drawLifeTotal(ctx, view, 'player', 24, 566, 206, 184);
  drawVerdictBanner(ctx, view);
  drawMessageLine(ctx, view);
  drawHandKeyBadges(ctx, view);
  ctx.restore();
}

export { fillPanel, writeText };
