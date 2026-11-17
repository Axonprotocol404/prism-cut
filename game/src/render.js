// Drawing only: the world's state and the current screen in, pixels out. The 1280x720 playfield
// is scaled to fit the window and centred, the margin filled with the backdrop colour. A dark
// grid, glowing polygons for the shards, a comet trail for the orb and sweep arcs for the
// blades. Text that holds a number is rebuilt only when the number changes, so a frame allocates
// nothing but the trail's few points.
import { BLADE, COMBO, FIELD, FONT, LIVES, ORB, PALETTE, RING } from './config.js';
import { KIND_RING } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 640, top: 150, line: 36, bottom: 74 };
const LIFE_SIZE = 18;
const LIFE_GAP = 10;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const waveLabel = cachedLabel('Wave ');
  const bladesLabel = cachedLabel('Blades ');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');
  // The orb's trail: the last positions, oldest first, redrawn each frame.
  const trail = [];
  const TRAIL_MAX = 14;

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

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

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
    // A vignette: darker toward the bottom, so falling shapes read first.
    const shade = context.createLinearGradient(0, 0, 0, FIELD.height);
    shade.addColorStop(0, 'rgba(5, 6, 12, 0)');
    shade.addColorStop(1, PALETTE.vignette);
    context.fillStyle = shade;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

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
    // The core: the part that hurts the orb, drawn so the danger reads at a glance.
    context.fillStyle = PALETTE.shardEdge;
    context.beginPath();
    context.arc(0, 0, item.r * 0.32, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

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

  function drawOrb(state) {
    const orb = state.orb;
    // The trail: keep the last positions, draw fading dots.
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
    // Blink while invulnerable after a hit.
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
    // The blades: sweep arcs with a bright tip.
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

  const TITLE_LINES = [
    'Steer the orb. Its blades slice falling shards.',
    'Slices score; a shard hitting the orb costs a life.',
    'Catch gold rings to add blades. ← → ↑ ↓ / WASD / pointer.',
    'Pause with P.',
  ];
  const PAUSED_LINES = ['The shards will wait for you.'];
  const OVER_LINES = ['', ''];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawBackdrop();
    const items = state.items;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      if (item.kind === KIND_RING) drawRing(item);
      else drawShard(item);
    }
    if (screen !== SCREEN_TITLE) drawOrb(state);
    if (screen === SCREEN_TITLE) {
      drawPanel('Prism Cut', TITLE_LINES, 'Press Space or click to start');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      drawPanel('Game over', OVER_LINES, 'Press Space or click to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
