// apps/web/lib/audio-alerts.ts
'use client';

/**
 * Web Audio API Sound Synthesizer for HPC Jashore
 * 100% offline-ready, zero external audio asset dependencies.
 * Synthesizes crystal-clear clinical sound effects using native oscillators and gain envelopes.
 */

let audioCtx: AudioContext | null = null;
let userInteracted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended' && userInteracted) {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

// Auto-resume AudioContext on first user interaction
if (typeof window !== 'undefined') {
  const enableAudio = () => {
    userInteracted = true;
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    window.removeEventListener('click', enableAudio);
    window.removeEventListener('keydown', enableAudio);
    window.removeEventListener('touchstart', enableAudio);
  };
  window.addEventListener('click', enableAudio, { passive: true });
  window.addEventListener('keydown', enableAudio, { passive: true });
  window.addEventListener('touchstart', enableAudio, { passive: true });
}

const AUDIO_STORAGE_KEY = 'hpc_clinic_audio_alerts_enabled';

export function isAudioAlertsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(AUDIO_STORAGE_KEY);
  return stored !== 'false';
}

export function setAudioAlertsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUDIO_STORAGE_KEY, enabled ? 'true' : 'false');
  // Dispatch custom storage event for instant UI re-renders
  window.dispatchEvent(new Event('hpc-audio-toggle'));
}

/**
 * 1. Patient Called Sound: Distinctive, pleasant two-tone clinic chime (C5 -> E5)
 */
export function playPatientCalledSound(): void {
  if (!isAudioAlertsEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Tone 1: C5 (523.25 Hz)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(523.25, now);
  gain1.gain.setValueAtTime(0.25, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.51);

  // Tone 2: E5 (659.25 Hz)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(659.25, now + 0.14);
  gain2.gain.setValueAtTime(0.28, now + 0.14);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.14);
  osc2.stop(now + 0.71);
}

/**
 * 2. Check-in / Patient Queued Sound: Soft upward chirping beep (440Hz -> 880Hz)
 */
export function playCheckinSound(): void {
  if (!isAudioAlertsEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.16);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.29);
}

/**
 * 3. Cashier Payment / Bill Sound: Digital register chime (587Hz -> 880Hz)
 */
export function playCashierSound(): void {
  if (!isAudioAlertsEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // D5
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(587.33, now);
  gain1.gain.setValueAtTime(0.22, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.26);

  // A5
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(880.0, now + 0.08);
  gain2.gain.setValueAtTime(0.25, now + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.08);
  osc2.stop(now + 0.46);
}

/**
 * 4. Chat Ping Sound: Soft subtle water-drop ping (784Hz)
 */
export function playChatPingSound(): void {
  if (!isAudioAlertsEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(784.0, now);
  osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.12);

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

/**
 * 5. Emergency / Urgent Alert Sound: Urgent double warning pulse
 */
export function playAlertSound(): void {
  if (!isAudioAlertsEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const tones = [880, 1174.66, 880];

  tones.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + idx * 0.11;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.2, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.19);
  });
}
