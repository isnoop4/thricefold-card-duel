// One job: turn the keyboard and the mouse into moves. Number keys or a click pick a card; Q, W, E,
// a click on a fold, a drag onto it, or the arrow keys and Enter play it there.
import { LANE_COUNT, openLanes } from './duel-rules.js';
import { TABLE, handCardAt, laneAt } from './table-layout.js';

const DRAG_START_DISTANCE = 9;
const LANE_KEYS = { q: 0, w: 1, e: 2 };

/** The table point under a mouse event, whatever size the canvas is shown at. */
function tablePointOfEvent(canvas, event) {
  const box = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - box.left) / box.width) * TABLE.width,
    y: ((event.clientY - box.top) / box.height) * TABLE.height,
  };
}

function canPlayerAct(view) {
  return view.screen === 'duel' && !view.busy;
}

function selectCard(view, handIndex) {
  const count = view.duel.hands.player.length;
  if (count === 0) return;
  view.selectedIndex = ((handIndex % count) + count) % count;
  view.sounds.playCardPick();
  const open = openLanes(view.duel, 'player');
  if (!open.includes(view.cursorLane) && open.length > 0) view.cursorLane = open[0];
}

/** Moves the keyboard's fold cursor to the next open fold in `direction` (-1 left, 1 right). */
function moveLaneCursor(view, direction) {
  const open = openLanes(view.duel, 'player');
  if (open.length === 0) return;
  let lane = view.cursorLane;
  for (let step = 0; step < LANE_COUNT; step += 1) {
    lane = (lane + direction + LANE_COUNT) % LANE_COUNT;
    if (open.includes(lane)) break;
  }
  view.cursorLane = lane;
  view.hoverLane = -1;
}

function handleDuelKey(view, key, actions) {
  if (key === 'escape') {
    if (view.selectedIndex >= 0) view.selectedIndex = -1;
    else actions.goToTitle();
    return;
  }
  if (!canPlayerAct(view)) return;
  if (key >= '1' && key <= '9') selectCard(view, Number(key) - 1);
  else if (key === 'arrowleft') selectCard(view, (view.selectedIndex < 0 ? 0 : view.selectedIndex) - 1);
  else if (key === 'arrowright') selectCard(view, view.selectedIndex + 1);
  else if (key === 'arrowup') moveLaneCursor(view, -1);
  else if (key === 'arrowdown') moveLaneCursor(view, 1);
  else if (key in LANE_KEYS && view.selectedIndex >= 0) actions.playCard(view.selectedIndex, LANE_KEYS[key]);
  else if ((key === 'enter' || key === ' ') && view.selectedIndex >= 0) actions.playCard(view.selectedIndex, view.cursorLane);
}

/** Listens on the window for keys: Enter deals from the title and end screens, M mutes, the rest play. */
export function listenToKeyboard(view, actions) {
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    view.sounds.unlock();
    if (key === 'm') {
      view.sounds.toggleMuted();
      return;
    }
    if (key.startsWith('arrow') || key === ' ') event.preventDefault();
    if (view.screen === 'duel') handleDuelKey(view, key, actions);
    else if (key === 'enter' || key === ' ') actions.startNewDuel();
    else if (key === 'escape') actions.goToTitle();
  });
}

/** Listens on the canvas for the mouse: hover lifts a card, a click selects, a click or drop on a fold plays. */
export function listenToMouse(canvas, view, actions) {
  let pressed = null;

  canvas.addEventListener('mousemove', (event) => {
    const point = tablePointOfEvent(canvas, event);
    if (view.screen !== 'duel') return;
    view.hoverIndex = handCardAt(point, view.duel.hands.player.length);
    view.hoverLane = laneAt(point);
    if (pressed !== null && canPlayerAct(view)) {
      const moved = Math.hypot(point.x - pressed.point.x, point.y - pressed.point.y);
      if (view.dragIndex < 0 && moved > DRAG_START_DISTANCE) {
        view.dragIndex = pressed.handIndex;
        view.selectedIndex = pressed.handIndex;
      }
      if (view.dragIndex >= 0) view.dragPoint = point;
    }
  });

  canvas.addEventListener('mousedown', (event) => {
    view.sounds.unlock();
    view.sounds.startTableMusic();
    const point = tablePointOfEvent(canvas, event);
    if (view.screen !== 'duel') {
      actions.startNewDuel();
      return;
    }
    if (!canPlayerAct(view)) return;
    const handIndex = handCardAt(point, view.duel.hands.player.length);
    if (handIndex >= 0) {
      pressed = { handIndex, point };
      return;
    }
    const laneIndex = laneAt(point);
    if (laneIndex >= 0 && view.selectedIndex >= 0) actions.playCard(view.selectedIndex, laneIndex);
  });

  window.addEventListener('mouseup', (event) => {
    if (pressed === null) return;
    const point = tablePointOfEvent(canvas, event);
    const wasDragging = view.dragIndex >= 0;
    const handIndex = pressed.handIndex;
    pressed = null;
    view.dragIndex = -1;
    view.dragPoint = null;
    if (!canPlayerAct(view)) return;
    if (wasDragging) {
      const laneIndex = laneAt(point);
      if (laneIndex >= 0) actions.playCard(handIndex, laneIndex);
    } else if (view.selectedIndex === handIndex) {
      view.selectedIndex = -1;
    } else {
      selectCard(view, handIndex);
    }
  });
}
