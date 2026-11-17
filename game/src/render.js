// Renderer for Prism Cut. This module only paints: it takes the world state plus the
// active screen name and turns them into pixels. Nothing here mutates the simulation.
//
// The scene lives on a fixed 1280x720 playfield which is scaled uniformly to the window
// and letterboxed in the backdrop colour, so a shard's radius means the same thing on a
// phone and on a 4K monitor. Labels that show a number are cached and only rebuilt when
// that number actually changes, which keeps steady-state frames nearly allocation free.
//
// Extras beyond the sim: a short-lived spark burst is emitted wherever a shard is cut.
// Spark detection is a pure read of the state, so the world module never learns that it
// is being watched; a pool index that was alive last frame and is dead now, with a slice
// point recorded, is a slice that just happened.
import { BLADE, FIELD, FONT, LIVES, ORB, PALETTE, SPARKS } from './config.js';
import { KIND_RING } from './world.js';

// Screen names are exported so main.js can branch on them without string literals.
export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

// Overlay panel geometry: total height = top padding + one line per message + bottom.
const PANEL = { width: 640, top: 150, line: 36, bottom: 74 };

// Life icons in the HUD strip.
const LIFE_SIZE = 18;
const LIFE_GAP = 10;

// Hard ceiling on live sparks; older ones are dropped so a slice storm cannot pile up.
const SPARK_MAX = 240;

/**
 * Build a formatter that remembers its last input. Returns the same string object until
 * the number changes, so fillText is not handed a freshly built string every frame.
 */
function cachedLabel(prefix) {
  let previous = Number.NaN;
  let cached = prefix;
  return function label(next) {
    if (next !== previous) {
      previous = next;
      cached = prefix + next;
    }
    return cached;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');

  // Where the logical playfield sits inside the physical canvas.
  const view = { scale: 1, x: 0, y: 0 };

  // Cached numeric labels used by the in-game HUD and the game-over panel.
  const scoreLabel = cachedLabel('Score ');
  const waveLabel = cachedLabel('Wave ');
  const bladesLabel = cachedLabel('Blades ');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');

  // The orb's comet trail: the last few positions, oldest first.
  const trail = [];
  const TRAIL_MAX = 14;

  // Slice sparks. Each entry carries a position, velocity, life and total life, plus a
  // size hint so big shards throw bigger sparks.
  const sparks = [];
  // Which pool indices were alive at the end of the previous frame.
  const alive = new Uint8Array(256);
  let lastTime = 0;

  /** Match the backing store to the window (device pixel ratio aware) and recentre the field. */
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  // Font strings are cheap to build but not free; keep one per size we use.
  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  /** Backdrop: flat colour, an 80px grid, then a bottom-heavy vignette so shards read first. */
  function drawBackdrop() {
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    context.strokeStyle = PALETTE.grid;
    context.lineWidth = 1;
    context.beginPath();
    for (let x = 80; x < FIELD.width; x += 80) {
      context.moveTo(x, 0);
      context.lineTo(x, FIELD.height);
    }
    for (let y = 80; y < FIELD.height; y += 80) {
      context.moveTo(0, y);
      context.lineTo(FIELD.width, y);
    }
    context.stroke();

    const shade = context.createLinearGradient(0, 0, 0, FIELD.height);
    shade.addColorStop(0, 'rgba(5, 6, 12, 0)');
    shade.addColorStop(1, PALETTE.vignette);
    context.fillStyle = shade;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  /** One falling shard: a translucent neon polygon with a bright core marking the hurt zone. */
  function drawShard(item) {
    context.save();
    context.translate(item.x, item.y);
    context.rotate(item.angle);
    context.beginPath();
    for (let side = 0; side < item.sides; side += 1) {
      const angle = (side / item.sides) * Math.PI * 2;
      const px = Math.cos(angle) * item.r;
      const py = Math.sin(angle) * item.r;
      if (side === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fillStyle = PALETTE.shard;
    context.globalAlpha = 0.92;
    context.fill();
    context.globalAlpha = 1;
    context.strokeStyle = PALETTE.shardEdge;
    context.lineWidth = 2.5;
    context.stroke();

    // The core is what damages the orb, so it is drawn solid and unmissable.
    context.fillStyle = PALETTE.shardEdge;
    context.beginPath();
    context.arc(0, 0, item.r * 0.32, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  /** A catchable ring: glowing gold circle plus a thin hue-shifted halo. */
  function drawRing(item) {
    context.save();
    context.translate(item.x, item.y);
    const hue = (item.y / FIELD.height) * 300;
    context.strokeStyle = PALETTE.ring;
    context.lineWidth = 5;
    context.shadowColor = PALETTE.ring;
    context.shadowBlur = 14;
    context.beginPath();
    context.arc(0, 0, item.r, 0, Math.PI * 2);
    context.stroke();
    context.shadowBlur = 0;
    context.strokeStyle = `hsl(${hue} 90% 65%)`;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, item.r + 5, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  /** Throw a fan of sparks out of a slice point, biased along the cut direction. */
  function emitSparks(x, y, sourceRadius) {
    const count = SPARKS.count;
    for (let index = 0; index < count; index += 1) {
      if (sparks.length >= SPARK_MAX) sparks.shift();
      const angle = Math.random() * Math.PI * 2;
      const speed = SPARKS.speed * (0.35 + Math.random() * 0.8);
      const life = SPARKS.lifetime * (0.6 + Math.random() * 0.6);
      sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        max: life,
        size: 1.5 + Math.random() * 2 + sourceRadius * 0.03,
      });
    }
  }

  /**
   * Compare pool items against last frame's alive flags and emit sparks for anything that
   * disappeared at a recorded slice point. Pure detection: the world is only read here.
   */
  function detectSlices(items) {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (item.active) {
        alive[index] = 1;
        continue;
      }
      if (alive[index] !== 1) continue;
      alive[index] = 0;
      // Rings never record a slice point; shards do. A shard that merely fell off the
      // bottom is below the field, so its y filters that case out.
      if (item.kind === KIND_RING) continue;
      if (item.sliceX === 0 && item.sliceY === 0) continue;
      if (item.y >= FIELD.height) continue;
      emitSparks(item.sliceX, item.sliceY, item.r);
    }
  }

  /** Advance and paint the spark burst. dt is seconds since the previous frame. */
  function drawSparks(dt) {
    if (sparks.length === 0) return;
    context.save();
    for (let index = sparks.length - 1; index >= 0; index -= 1) {
      const spark = sparks[index];
      spark.life -= dt;
      if (spark.life <= 0) {
        sparks.splice(index, 1);
        continue;
      }
      spark.vy += SPARKS.gravity * dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      const fade = spark.life / spark.max;
      context.globalAlpha = fade;
      context.fillStyle = fade > 0.5 ? PALETTE.spark : PALETTE.shardEdge;
      context.beginPath();
      context.arc(spark.x, spark.y, spark.size * fade, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
    context.globalAlpha = 1;
  }

  /** The orb, its trail and its blades. Blinks while invulnerable after a hit. */
  function drawOrb(state) {
    const orb = state.orb;

    // Trail first, so the orb sits on top of its own wake.
    trail.push({ x: orb.x, y: orb.y });
    if (trail.length > TRAIL_MAX) trail.shift();
    for (let index = 0; index < trail.length; index += 1) {
      const point = trail[index];
      const fade = (index / trail.length) * 0.35;
      context.fillStyle = PALETTE.orb;
      context.globalAlpha = fade;
      context.beginPath();
      context.arc(point.x, point.y, ORB.radius * (0.3 + fade), 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;

    const visible = orb.invulnerable === 0 || Math.floor(orb.invulnerable * 10) % 2 === 1;
    if (visible) {
      context.shadowColor = PALETTE.orb;
      context.shadowBlur = 18;
      context.fillStyle = PALETTE.orb;
      context.beginPath();
      context.arc(orb.x, orb.y, ORB.radius, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      context.fillStyle = PALETTE.orbCore;
      context.beginPath();
      context.arc(orb.x, orb.y, ORB.radius * 0.45, 0, Math.PI * 2);
      context.fill();
    }

    // Blades: a faded shaft from the orb's rim to the tip, then a bright tip dot.
    for (let index = 0; index < state.blades; index += 1) {
      const angle = state.bladeAngle + (index * Math.PI * 2) / state.blades;
      const tipX = orb.x + Math.cos(angle) * BLADE.length;
      const tipY = orb.y + Math.sin(angle) * BLADE.length;
      context.strokeStyle = PALETTE.blade;
      context.globalAlpha = 0.4;
      context.lineWidth = BLADE.width;
      context.beginPath();
      context.moveTo(orb.x + Math.cos(angle) * ORB.radius, orb.y + Math.sin(angle) * ORB.radius);
      context.lineTo(tipX, tipY);
      context.stroke();
      context.globalAlpha = 1;
      context.fillStyle = PALETTE.orbCore;
      context.beginPath();
      context.arc(tipX, tipY, BLADE.width * 0.8, 0, Math.PI * 2);
      context.fill();
    }
  }

  /** In-game HUD strip: score, wave, blade count, life pips, combo readout. */
  function drawHud(state) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 20, 30, PALETTE.text, 'left');
    text(waveLabel(state.wave), FIELD.width / 2, 20, 30, PALETTE.text, 'center');
    text(bladesLabel(state.blades), FIELD.width - 24, 20, 30, PALETTE.muted, 'right');
    for (let life = 0; life < LIVES; life += 1) {
      context.fillStyle = life < state.lives ? PALETTE.orb : PALETTE.grid;
      context.beginPath();
      context.arc(FIELD.width - 24 - life * (LIFE_SIZE + LIFE_GAP) - LIFE_SIZE / 2, 56, LIFE_SIZE / 2, 0, Math.PI * 2);
      context.fill();
    }
    if (state.combo > 1.01) {
      text(`Combo x${state.combo.toFixed(1)}`, FIELD.width / 2, 60, 24, PALETTE.combo, 'center');
    }
  }

  /** Centred overlay panel: bordered box, big title, muted lines, accent prompt. */
  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.orb;
    context.lineWidth = 1.5;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 84, 52, PALETTE.orb, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 44, 24, PALETTE.ring, 'center');
  }

  // Static copy for each overlay. The game-over lines are mutated in place each frame.
  const TITLE_LINES = [
    'Steer the orb. Its blades slice falling shards.',
    'Slices score; a shard hitting the orb costs a life.',
    'Catch gold rings to add blades. ← → ↑ ↓ / WASD / pointer.',
    'Pause with P.',
  ];
  const PAUSED_LINES = ['The shards will wait for you.'];
  const OVER_LINES = ['', ''];

  /**
   * Paint one frame. Order: clear, set the field transform, backdrop, shards and rings,
   * sparks, the orb (not on the title screen), then the HUD or an overlay panel.
   */
  function draw(state, screen, best) {
    // Frame delta, clamped so a long stall does not fling sparks across the screen.
    const now = performance.now();
    const dt = lastTime === 0 ? 0 : Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);

    drawBackdrop();

    const items = state.items;
    detectSlices(items);
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      if (item.kind === KIND_RING) drawRing(item);
      else drawShard(item);
    }
    drawSparks(dt);
    if (screen !== SCREEN_TITLE) drawOrb(state);

    if (screen === SCREEN_TITLE) {
      drawPanel('Prism Cut', TITLE_LINES, 'Press Space or click to start');
      return;
    }

    drawHud(state);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      drawPanel('Game over', OVER_LINES, 'Press Space or click to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
