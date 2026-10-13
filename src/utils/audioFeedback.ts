/* ═══════════════════════════════════════════════════════════
   audioFeedback.ts — ClearTask Audio & Haptic Feedback
   Generates POS-style beep tones using Web Audio API.
   No external audio file dependencies.
   ═══════════════════════════════════════════════════════════ */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume on user gesture if suspended (auto-play policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a warm, high-frequency harmonic chime (Square/Apple Pay style).
 * Dual-sine harmonic chime (1200Hz + 1600Hz) for rounded, crisp acoustic feedback.
 */
export function playBeepSound(_frequency = 1200, duration = 0.065, volume = 0.12): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    [1200, 1600].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const toneVolume = idx === 0 ? volume : volume * 0.6;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(toneVolume, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    });
  } catch {
    // Silently ignore if Web Audio API is unavailable
  }
}

/**
 * Play a satisfying ascending harmonic chord when checkout finishes.
 */
export function playCheckoutSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Ascending major chord (C6: 1046Hz, E6: 1318Hz, G6: 1568Hz, C7: 2093Hz)
    [
      { freq: 1046, start: 0, dur: 0.07 },
      { freq: 1318, start: 0.06, dur: 0.07 },
      { freq: 1568, start: 0.12, dur: 0.08 },
      { freq: 2093, start: 0.18, dur: 0.18 },
    ].forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.linearRampToValueAtTime(0.12, now + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  } catch {
    // Silently ignore
  }
}

/**
 * Play a soft non-jarring low tone for errors/warnings.
 */
export function playErrorSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    [260, 220].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.09);
      gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.09 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.08);
    });
  } catch {
    // Silently ignore
  }
}

/**
 * Trigger haptic vibration feedback (mobile devices only).
 * @param pattern — vibration duration in ms or pattern array
 */
export function triggerHaptic(pattern: number | number[] = 30): void {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Silently ignore
  }
}

/**
 * Combined beep + haptic for item add events.
 */
export function feedbackItemAdded(): void {
  playBeepSound();
  triggerHaptic(25);
}

/**
 * Combined checkout sound + haptic.
 */
export function feedbackCheckout(): void {
  playCheckoutSound();
  triggerHaptic([30, 50, 60]);
}
