import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const ADJUST_DOWN_SECONDS = 15;
const ADJUST_UP_SECONDS = 15;
const MIN_SECONDS = 0;

/**
 * Plays a short "ding" using the Web Audio API — no audio file needed, and
 * it degrades silently on browsers/contexts that block autoplay (e.g. a
 * background tab) instead of throwing.
 */
function playChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.6);
    oscillator.onended = () => ctx.close();
  } catch {
    // Audio is a nice-to-have, never block the timer on it.
  }
}

function vibrate(pattern) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Vibration API isn't available on every device/browser — ignore.
  }
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Fullscreen rest countdown shown right after an exercise is marked
 * complete. Counts down from `initialSeconds`, lets the user adjust the
 * remaining time or skip outright, and fires `onComplete` once (with a
 * chime + vibration) when it reaches zero.
 */
function RestTimer({ initialSeconds, exerciseName, nextExerciseName, onComplete, onSkip }) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const hasFinishedRef = useRef(false);

  useEffect(() => {
    if (isPaused) return undefined;
    if (secondsLeft <= 0) {
      if (!hasFinishedRef.current) {
        hasFinishedRef.current = true;
        playChime();
        vibrate([200, 100, 200]);
      }
      return undefined;
    }
    const interval = setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, secondsLeft]);

  function adjust(deltaSeconds) {
    setSecondsLeft((current) => Math.max(MIN_SECONDS, current + deltaSeconds));
  }

  const isDone = secondsLeft <= 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[210] flex flex-col items-center justify-center bg-black/85 p-6 text-center"
      role="dialog"
      aria-modal="true"
      aria-label="Descanso"
    >
      <p className="text-on-surface-variant text-sm uppercase tracking-widest">Descanso</p>
      <p className="text-on-surface text-lg mt-1">{exerciseName}</p>

      <p
        className="font-headline-lg text-on-surface tabular-nums mt-6"
        style={{ fontSize: '4rem' }}
        aria-live="polite"
      >
        {formatTime(secondsLeft)}
      </p>

      {nextExerciseName && (
        <p className="text-on-surface-variant text-sm mt-4">Siguiente: {nextExerciseName}</p>
      )}

      {!isDone && (
        <div className="flex gap-3 mt-8">
          <button
            type="button"
            onClick={() => adjust(-ADJUST_DOWN_SECONDS)}
            className="min-h-[44px] px-4 rounded-lg border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim"
          >
            -15s
          </button>
          <button
            type="button"
            onClick={() => setIsPaused((current) => !current)}
            className="min-h-[44px] px-4 rounded-lg border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim"
          >
            {isPaused ? 'Reanudar' : 'Pausar'}
          </button>
          <button
            type="button"
            onClick={() => adjust(ADJUST_UP_SECONDS)}
            className="min-h-[44px] px-4 rounded-lg border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim"
          >
            +15s
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 mt-10 w-full max-w-xs">
        {isDone && (
          <button
            type="button"
            onClick={onComplete}
            className="min-h-[44px] rounded-lg bg-primary-fixed-dim text-on-primary-fixed font-bold px-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim"
          >
            Siguiente ejercicio
          </button>
        )}
        <button
          type="button"
          onClick={onSkip}
          className="min-h-[44px] text-on-surface-variant text-sm underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim rounded"
        >
          Saltar descanso
        </button>
      </div>
    </div>,
    document.body
  );
}

export default RestTimer;
