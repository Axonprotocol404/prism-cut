// Pure WebAudio sound effects for Prism Cut: no audio assets, everything is synthesised with
// OscillatorNode and GainNode at play time. Every effect is short and self-contained; the AudioContext
// is created lazily and resumed on the first user gesture via unlock() (browsers refuse to play
// sound before the page has been interacted with).

/** Convert a note offset in semitones from A4 (440 Hz) into a frequency in Hz. */
function noteHz(semitones) {
  return 440 * Math.pow(2, semitones / 12);
}

/** One enveloped oscillator blip: freq, start offset, duration, type, peak gain. */
function blip(ctx, dest, { freq, at = 0, dur = 0.08, type = 'square', peak = 0.15, slideTo = null }) {
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  // Fast attack, exponential decay: reads as a crisp arcade blip instead of a beep.
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(dest);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Create the sound module; safe to call before any user interaction. */
export function createAudio() {
  let ctx = null;
  let master = null;

  /** Lazily build the AudioContext and a master volume node. */
  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return; // very old browser: silently stay silent
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }

  return {
    /** Call from a pointer/key handler: resumes a suspended context (autoplay policy). */
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },

    /** Short blip rising with the combo multiplier: each slice sounds a step higher. */
    cut(combo) {
      ensure();
      if (!ctx || ctx.state !== 'running') return;
      const step = Math.min(combo ?? 1, 12); // cap the pitch so it stays musical
      blip(ctx, master, {
        freq: noteHz(3 + step * 2),
        dur: 0.09,
        type: 'square',
        peak: 0.12,
        slideTo: noteHz(3 + step * 2 + 4),
      });
    },

    /** Catching a ring: two-note rising arpeggio (A then C#) as a reward chime. */
    ring() {
      ensure();
      if (!ctx || ctx.state !== 'running') return;
      blip(ctx, master, { freq: noteHz(0), dur: 0.12, type: 'triangle', peak: 0.16 });
      blip(ctx, master, { freq: noteHz(4), at: 0.09, dur: 0.16, type: 'triangle', peak: 0.16 });
    },

    /** Losing a life: a downward sweep plus a low thud, unmistakably bad news. */
    death() {
      ensure();
      if (!ctx || ctx.state !== 'running') return;
      blip(ctx, master, {
        freq: 420,
        slideTo: 60,
        dur: 0.5,
        type: 'sawtooth',
        peak: 0.2,
      });
      blip(ctx, master, { freq: 90, at: 0.05, dur: 0.3, type: 'sine', peak: 0.18 });
    },
  };
}
