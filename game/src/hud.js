// Canvas HUD and overlay screens for Prism Cut: score, wave, lives as icons, the combo bar across
// the top of the 1280x720 playfield, plus the title and game-over overlays. Draws only — no state
// mutation. All colours and fonts come from config.js so the HUD stays on-palette.

import { FIELD, PALETTE, FONT, LIVES, COMBO } from './config.js';

/** The HUD strip's height: everything lives in this band above the play. */
const HUD_H = 64;

/** Round a value for display. */
const fmt = (n) => Math.round(n).toString();

/** Draw the top HUD: score (left), wave (centre), lives as orb icons, combo bar. */
export function drawHud(ctx, state) {
  const { score = 0, wave = 1, lives = LIVES, combo = 0 } = state;

  ctx.save();
  ctx.font = `600 22px ${FONT}`;
  ctx.textBaseline = 'middle';

  // Score, left aligned with a small label.
  ctx.fillStyle = PALETTE.muted;
  ctx.textAlign = 'left';
  ctx.fillText('SCORE', 24, HUD_H / 2 - 12);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText(fmt(score), 24, HUD_H / 2 + 14);

  // Wave counter, centred.
  ctx.textAlign = 'center';
  ctx.font = `600 22px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('WAVE', FIELD.width / 2, HUD_H / 2 - 12);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText(fmt(wave), FIELD.width / 2, HUD_H / 2 + 14);

  // Lives: one filled orb icon per remaining life, hollow for lost ones.
  const iconR = 9;
  for (let i = 0; i < LIVES; i++) {
    const x = FIELD.width - 24 - (LIVES - 1 - i) * (iconR * 2 + 10);
    const y = HUD_H / 2;
    ctx.beginPath();
    ctx.arc(x, y, iconR, 0, Math.PI * 2);
    if (i < lives) {
      ctx.fillStyle = PALETTE.orb;
      ctx.fill();
      ctx.fillStyle = PALETTE.orbCore;
      ctx.beginPath();
      ctx.arc(x, y, iconR * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = PALETTE.muted;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Combo bar: fills left-to-right across the strip as the multiplier climbs to max.
  const barX = 24;
  const barW = FIELD.width - 48;
  const barY = HUD_H - 6;
  const frac = Math.min(combo / COMBO.max, 1);
  ctx.fillStyle = PALETTE.grid;
  ctx.fillRect(barX, barY, barW, 4);
  if (frac > 0) {
    ctx.fillStyle = PALETTE.combo;
    ctx.fillRect(barX, barY, barW * frac, 4);
  }
  if (combo > 1) {
    ctx.textAlign = 'right';
    ctx.font = `700 18px ${FONT}`;
    ctx.fillStyle = PALETTE.combo;
    ctx.fillText(`x${combo.toFixed(1)}`, FIELD.width - 24, HUD_H / 2);
  }
  ctx.restore();
}

/** Shared overlay helper: dim the field and centre a panel for the title / game-over screens. */
function panel(ctx) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

/** Title or game-over overlay, chosen by state.screen ('title' | 'gameover' | anything else = none). */
export function drawOverlay(ctx, state) {
  const { screen = '', score = 0, best = 0 } = state;
  if (screen !== 'title' && screen !== 'gameover') return;

  ctx.save();
  panel(ctx);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Big heading, then a divider line in the accent colour.
  ctx.font = `800 64px ${FONT}`;
  ctx.fillStyle = PALETTE.orb;
  ctx.fillText(screen === 'title' ? 'PRISM CUT' : 'GAME OVER', FIELD.width / 2, 250);
  ctx.fillStyle = PALETTE.combo;
  ctx.fillRect(FIELD.width / 2 - 120, 300, 240, 4);

  // Subtitle and score line.
  ctx.font = `400 22px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  if (screen === 'title') {
    ctx.fillText('Steer the orb, slice the shards, catch the rings.', FIELD.width / 2, 350);
  } else {
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 30px ${FONT}`;
    ctx.fillText(`Score ${fmt(score)}   Best ${fmt(best)}`, FIELD.width / 2, 350);
  }

  // Button instructions.
  ctx.font = `500 20px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(
    screen === 'title'
      ? 'Move: WASD / arrows / mouse    Pause: P'
      : 'Press Enter or click to play again',
    FIELD.width / 2,
    430,
  );
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(
    screen === 'title' ? 'Press Enter or click to start' : 'Press Esc for the title screen',
    FIELD.width / 2,
    470,
  );
  ctx.restore();
}
