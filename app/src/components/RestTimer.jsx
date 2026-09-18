import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

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
 * Inline countdown embedded in the guided-workout screen — never a
 * fullscreen takeover — so the exercise name, progress and actions above it
 * stay visible and themed. Two modes share the same visuals:
 *  - 'rest' (default): the pause between sets/exercises. Adjustable, skippable.
 *  - 'work': a duration-based (cardio) set timing itself; reaching zero and
 *    tapping "listo" mean the same thing, so onSkip doubles as an early finish.
 */
function RestTimer({ initialSeconds, exerciseName, nextExerciseName, mode = 'rest', onComplete, onSkip }) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const hasFinishedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const total = Math.max(1, initialSeconds);

  useEffect(() => {
    if (isPaused) return undefined;
    if (secondsLeft <= 0) {
      if (!hasFinishedRef.current) {
        hasFinishedRef.current = true;
        playChime();
        vibrate([200, 100, 200]);
        onCompleteRef.current();
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

  const isRest = mode === 'rest';
  const progress = Math.min(1, Math.max(0, (total - secondsLeft) / total));

  return (
    <div
      className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5 text-center"
      role="status"
      aria-label={isRest ? 'Descanso' : exerciseName}
    >
      <p className="text-on-surface-variant text-xs uppercase tracking-widest">
        {isRest ? 'Descanso' : 'En curso'}
      </p>
      {isRest && <p className="text-on-surface text-base mt-1">{exerciseName}</p>}

      <p className="font-headline-lg text-on-surface tabular-nums mt-4" style={{ fontSize: '3.25rem' }} aria-live="polite">
        {formatTime(secondsLeft)}
      </p>

      <div className="mx-auto mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-outline-variant/20">
        <motion.div
          className="h-full rounded-full bg-primary-fixed-dim"
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {isRest && nextExerciseName && (
        <p className="text-on-surface-variant text-sm mt-4">Siguiente: {nextExerciseName}</p>
      )}

      <div className="flex justify-center gap-3 mt-6">
        {isRest && (
          <button
            type="button"
            onClick={() => adjust(-ADJUST_DOWN_SECONDS)}
            className="min-h-[44px] px-4 rounded-lg border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim"
          >
            -15s
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsPaused((current) => !current)}
          className="min-h-[44px] px-4 rounded-lg border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim"
        >
          {isPaused ? 'Reanudar' : 'Pausar'}
        </button>
        {isRest && (
          <button
            type="button"
            onClick={() => adjust(ADJUST_UP_SECONDS)}
            className="min-h-[44px] px-4 rounded-lg border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim"
          >
            +15s
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 mt-6">
        <button
          type="button"
          onClick={onSkip}
          className="min-h-[44px] text-on-surface-variant text-sm underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim rounded"
        >
          {isRest ? 'Saltar descanso' : 'Marcar como completado'}
        </button>
      </div>
    </div>
  );
}

export default RestTimer;
