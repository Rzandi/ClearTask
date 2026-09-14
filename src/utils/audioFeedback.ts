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
 * Play a short beep tone (POS scanner style).
 * @param frequency — tone frequency in Hz (default 1800 for a crisp beep)
 * @param duration — length in seconds (default 0.08)
 * @param volume — gain 0..1 (default 0.15)
 */
export function playBeepSound(
  frequency = 1800,
  duration = 0.08,
  volume = 0.15,
): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    // Quick fade-out to avoid click artifacts
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Silently ignore if Web Audio API is unavailable
  }
}

/**
 * Play a "success / checkout complete" double-beep.
 */
export function playCheckoutSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Two ascending tones
    [
      { freq: 1400, start: 0, dur: 0.07 },
      { freq: 2200, start: 0.1, dur: 0.12 },
    ].forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.12, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
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
 * Play a soft "error" tone.
 */
export function playErrorSound(): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
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
