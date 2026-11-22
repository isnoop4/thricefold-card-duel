// One job: the three full screens around a duel: the title screen, the win screen and the loss
// screen. The end screens are laid over the finished table, so the last fold stays in view.
import { COMBOS, COMBO_ORDER } from './lane-scoring.js';
import { FOLD_STRIKE, STARTING_LIFE } from './duel-rules.js';
import { TABLE } from './table-layout.js';
import { drawCardBack, drawCardFace, drawSuitShape } from './draw-card-face.js';
import { SIDE_COLORS, UI_FONT, drawMagpieBadge, drawTableBackdrop, fillPanel, writeText } from './draw-table.js';
import { drawFlourish } from './win-flourish.js';

const TITLE_FONT = 'Georgia, "Times New Roman", serif';
const GOLD = '#f4cf6b';
const CREAM = '#f6efdc';

/** The fan of cards on the title screen: one of each suit, and one card back. */
const TITLE_FAN = [
  { suit: 0, value: 7 },
  { suit: 1, value: 8 },
  { suit: 2, value: 9 },
  { suit: 3, value: 9 },
  null,
];

function drawGlowingWord(ctx, word, x, y, size, color, glow) {
  ctx.save();
  ctx.font = `bold ${size}px ${TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = glow;
  ctx.shadowBlur = 34;
  ctx.fillStyle = color;
  ctx.fillText(word, x, y);
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(40, 22, 0, 0.55)';
  ctx.strokeText(word, x, y);
  ctx.restore();
}

function drawTitleFan(ctx, clock) {
  TITLE_FAN.forEach((card, index) => {
    const offset = index - (TITLE_FAN.length - 1) / 2;
    ctx.save();
    ctx.translate(TABLE.width / 2 + offset * 132, 398 + Math.abs(offset) * 16 + Math.sin(clock * 1.6 + index) * 4);
    ctx.rotate(offset * 0.13);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#131a3d';
    ctx.fillRect(-66, -92, 132, 184);
    ctx.shadowColor = 'transparent';
    if (card === null) drawCardBack(ctx, 150, 210);
    else drawCardFace(ctx, card, 150, 210);
    ctx.restore();
  });
}

function drawRuleChip(ctx, x, y, width, heading, line) {
  fillPanel(ctx, x, y, width, 74, 14, 'rgba(8, 12, 30, 0.74)', 'rgba(244, 207, 107, 0.45)');
  writeText(ctx, heading, x + width / 2, y + 24, 19, GOLD);
  writeText(ctx, line, x + width / 2, y + 52, 14, CREAM, 'center', 'normal');
}

/** The title screen: the name, a fan of the four suits, the rules in four chips and the call to deal. */
export function drawTitleScreen(ctx, clock) {
  drawTableBackdrop(ctx, clock);
  drawGlowingWord(ctx, 'THRICEFOLD', TABLE.width / 2, 118, 124, GOLD, 'rgba(244, 170, 40, 0.75)');
  writeText(ctx, 'A CARD DUEL OF THREE FOLDS, THREE CARDS EACH', TABLE.width / 2, 206, 24, CREAM);
  for (let suit = 0; suit < 4; suit += 1) drawSuitShape(ctx, suit, TABLE.width / 2 - 414 + suit * 24 - 60, 206, 9);
  for (let suit = 0; suit < 4; suit += 1) drawSuitShape(ctx, 3 - suit, TABLE.width / 2 + 414 - suit * 24 + 60, 206, 9);
  drawTitleFan(ctx, clock);
  drawMagpieBadge(ctx, 150, 392, 62);
  writeText(ctx, 'YOUR RIVAL', 150, 478, 14, CREAM);
  writeText(ctx, 'MAGPIE', 150, 502, 26, SIDE_COLORS.opponent);
  writeText(ctx, `LIFE ${STARTING_LIFE} EACH`, 1130, 372, 22, SIDE_COLORS.player);
  writeText(ctx, 'First to strike', 1130, 404, 16, CREAM, 'center', 'normal');
  writeText(ctx, 'the other to 0 wins', 1130, 426, 16, CREAM, 'center', 'normal');
  const combos = COMBO_ORDER.map((key) => `${COMBOS[key].name} +${COMBOS[key].bonus}`).join('   ');
  drawRuleChip(ctx, 60, 574, 270, 'PLAY', 'one card a turn into any fold');
  drawRuleChip(ctx, 350, 574, 270, 'STRIKE', `stronger fold hits for ${FOLD_STRIKE}, combos hit harder`);
  drawRuleChip(ctx, 640, 574, 300, 'COMBINE', combos);
  drawRuleChip(ctx, 960, 574, 260, 'READ', "Magpie's eye shows her next fold");
  const pulse = 0.9 + 0.1 * Math.sin(clock * 4);
  ctx.globalAlpha = pulse;
  fillPanel(ctx, TABLE.width / 2 - 250, 678, 500, 60, 30, GOLD);
  writeText(ctx, 'PRESS ENTER OR CLICK TO DEAL', TABLE.width / 2, 709, 26, '#2c1c00');
  ctx.globalAlpha = 1;
  writeText(ctx, 'Keyboard and mouse  |  M toggles sound and music  |  every card, sound and note is made by the game itself', TABLE.width / 2, 772, 14, 'rgba(246, 239, 220, 0.6)', 'center', 'normal');
}

function drawSunRays(ctx, clock, color) {
  ctx.save();
  ctx.translate(TABLE.width / 2, 300);
  ctx.rotate(clock * 0.25);
  ctx.fillStyle = color;
  for (let ray = 0; ray < 14; ray += 1) {
    ctx.rotate((Math.PI * 2) / 14);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-70, -900);
    ctx.lineTo(70, -900);
    ctx.fill();
  }
  ctx.restore();
}

function drawResultTotals(ctx, result, y) {
  fillPanel(ctx, TABLE.width / 2 - 330, y, 660, 132, 22, 'rgba(8, 12, 30, 0.88)', 'rgba(246, 239, 220, 0.35)');
  writeText(ctx, 'YOU', TABLE.width / 2 - 200, y + 26, 18, SIDE_COLORS.player);
  writeText(ctx, `LIFE ${result.life.player}`, TABLE.width / 2 - 200, y + 68, 44, SIDE_COLORS.player);
  writeText(ctx, `${result.foldsWon.player} folds won`, TABLE.width / 2 - 200, y + 108, 17, CREAM, 'center', 'normal');
  writeText(ctx, 'vs', TABLE.width / 2, y + 66, 26, CREAM);
  writeText(ctx, 'MAGPIE', TABLE.width / 2 + 200, y + 26, 18, SIDE_COLORS.opponent);
  writeText(ctx, `LIFE ${result.life.opponent}`, TABLE.width / 2 + 200, y + 68, 44, SIDE_COLORS.opponent);
  writeText(ctx, `${result.foldsWon.opponent} folds won`, TABLE.width / 2 + 200, y + 108, 17, CREAM, 'center', 'normal');
}

function drawPlayAgainButton(ctx, clock, label, color) {
  ctx.globalAlpha = 0.9 + 0.1 * Math.sin(clock * 4);
  fillPanel(ctx, TABLE.width / 2 - 230, 600, 460, 58, 29, color, '#16110a');
  writeText(ctx, label, TABLE.width / 2, 630, 24, '#16110a');
  ctx.globalAlpha = 1;
}

/** The win screen: turning rays, VICTORY in gold, the final totals and a fountain of suit confetti. */
export function drawWinScreen(ctx, view) {
  ctx.fillStyle = 'rgba(6, 10, 28, 0.74)';
  ctx.fillRect(0, 0, TABLE.width, TABLE.height);
  drawSunRays(ctx, view.clock, 'rgba(244, 207, 107, 0.1)');
  drawFlourish(ctx, view.flourish);
  const grow = Math.min(1, view.flourish.age / 0.35);
  drawGlowingWord(ctx, 'VICTORY', TABLE.width / 2, 210, 110 + 50 * grow, GOLD, 'rgba(255, 190, 60, 0.9)');
  fillPanel(ctx, TABLE.width / 2 - 350, 298, 700, 48, 24, 'rgba(8, 12, 30, 0.88)');
  writeText(ctx, 'YOU WIN THE DUEL: MAGPIE IS OUT OF LIFE', TABLE.width / 2, 323, 28, CREAM);
  drawResultTotals(ctx, view.result, 400);
  drawPlayAgainButton(ctx, view.clock, 'PRESS ENTER OR CLICK TO PLAY AGAIN', GOLD);
}

/** The loss screen: a cold wash, DEFEAT in rose, the final totals and ash drifting down. */
export function drawLossScreen(ctx, view) {
  ctx.fillStyle = 'rgba(14, 10, 26, 0.82)';
  ctx.fillRect(0, 0, TABLE.width, TABLE.height);
  drawFlourish(ctx, view.flourish);
  drawGlowingWord(ctx, 'DEFEAT', TABLE.width / 2, 210, 150, '#ff8fa8', 'rgba(255, 70, 110, 0.7)');
  writeText(ctx, 'YOU LOSE THE DUEL: MAGPIE STRUCK YOUR LIFE TO 0', TABLE.width / 2, 322, 28, CREAM);
  drawMagpieBadge(ctx, TABLE.width / 2 + 470, 210, 54);
  drawResultTotals(ctx, view.result, 400);
  drawPlayAgainButton(ctx, view.clock, 'PRESS ENTER OR CLICK TO TRY AGAIN', '#ff8fa8');
}

export { UI_FONT };
