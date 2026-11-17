// Input handling for Prism Cut. Two steering channels share one job: held arrow/WASD
// keys nudge the orb with acceleration, while a held pointer makes the orb seek the
// cursor directly. The pointer wins whenever it is down, which feels like the natural
// expectation on a laptop mixing trackpad and keyboard.
//
// One-shot presses (start/restart, pause) are queued as bit flags rather than consumed
// inline, so a press that lands between two frames is neither lost nor counted twice;
// the game loop drains them with takeActions() exactly once per frame.
//
// Every listener also scrubs state when the window loses focus: a key released while
// the tab is hidden never fires keyup, and a stale pointer would yank the orb.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

// Logical playfield size the pointer coordinates are mapped into.
const FIELD_WIDTH = 1280;
const FIELD_HEIGHT = 720;

// Key-code buckets. Sets keep the membership check obvious and extensible.
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  // Held-key state; each axis is derived from these on demand.
  let left = false;
  let right = false;
  let up = false;
  let down = false;

  // Pending one-shot presses, drained by takeActions().
  let actions = 0;

  // Pointer state: last known position in field coordinates, and whether it is held.
  const pointer = { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2, active: false };

  /** Forget every transient input; called on window blur and page hide. */
  function clearAll() {
    left = false;
    right = false;
    up = false;
    down = false;
    pointer.active = false;
  }

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (CONFIRM.has(event.code)) {
      // Auto-repeat would queue a start press every few frames; ignore repeats.
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    // The game owns these keys; stop the page from scrolling or tabbing away.
    event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
  });

  // Focus loss: alt-tab, app switch, or an OS overlay can swallow the keyup that
  // would have released a held key. Clear everything rather than drift.
  window.addEventListener('blur', clearAll);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearAll();
  });

  // Pointer position, mapped from the element's box into logical field coordinates.
  target.addEventListener('pointermove', (event) => {
    const rect = target.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * FIELD_WIDTH;
    pointer.y = ((event.clientY - rect.top) / rect.height) * FIELD_HEIGHT;
    pointer.active = true;
  });

  // A click on the canvas is also a confirm, so the mouse alone can start a run.
  target.addEventListener('pointerdown', () => {
    actions |= ACTION_CONFIRM;
    pointer.active = true;
  });

  window.addEventListener('pointerup', () => {
    pointer.active = false;
  });

  return {
    /** Current steering: a seek point while the pointer is down, otherwise key axes. */
    steer() {
      if (pointer.active) {
        return { seek: { x: pointer.x, y: pointer.y }, keys: null };
      }
      return {
        keys: {
          x: (right ? 1 : 0) - (left ? 1 : 0),
          y: (down ? 1 : 0) - (up ? 1 : 0),
        },
        seek: null,
      };
    },

    pointer,

    /** Take and clear the one-shot presses accumulated since the previous call. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
