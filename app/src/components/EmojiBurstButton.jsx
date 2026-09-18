import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Emoji } from 'react-apple-emojis';

// Keep the emoji map tiny — the full react-apple-emojis dataset ships ~380kb of JSON.
export const EMOJI_DATA = {
  baseUrl: 'https://em-content.zobj.net/source/apple/419/',
  emojis: {
    'flexed-biceps': 'flexed-biceps_1f4aa.png',
    'neutral-face': 'neutral-face_1f610.png',
    'anxious-face-with-sweat': 'anxious-face-with-sweat_1f630.png',
  },
};

const BURST_COUNT = 5;
const RISE = 46;
const SPREAD = 22;

const rand = (min, max) => min + Math.random() * (max - min);

/**
 * A fixed-choice button (not a reaction picker) that renders a real Apple
 * emoji and, on tap, launches a few copies of it upward before fading —
 * same visual language as a chat reaction burst, scoped down to one emoji.
 */
function EmojiBurstButton({ emoji, label, active = false, onClick, className = '' }) {
  const [particles, setParticles] = useState([]);
  const seed = useRef(0);
  const reduced = useReducedMotion();

  const handleClick = useCallback(() => {
    if (!reduced) {
      seed.current += BURST_COUNT;
      const next = Array.from({ length: BURST_COUNT }, (_, i) => ({
        id: seed.current + i,
        x: rand(-SPREAD, SPREAD),
        rotate: rand(-20, 20),
        delay: i * 0.04,
      }));
      setParticles((current) => [...current, ...next]);
    }
    onClick?.();
  }, [onClick, reduced]);

  const settle = useCallback((id) => {
    setParticles((current) => current.filter((particle) => particle.id !== id));
  }, []);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      className={`tap-scale relative flex-1 min-h-[44px] rounded-xl border py-2 text-xs font-bold ${active
        ? 'border-primary-fixed-dim bg-primary-fixed/15 text-primary-fixed-dim'
        : 'border-outline-variant/30 bg-surface-container-low text-on-surface'} ${className}`}
    >
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.span
            key={particle.id}
            className="pointer-events-none absolute left-1/2 top-1/2 z-10"
            initial={{ x: '-50%', y: '-50%', scale: 0.7, opacity: 1, rotate: 0 }}
            animate={{ y: -RISE, x: `calc(-50% + ${particle.x}px)`, scale: 1.1, opacity: 0, rotate: particle.rotate }}
            transition={{ duration: 0.7, delay: particle.delay, ease: 'easeOut' }}
            onAnimationComplete={() => settle(particle.id)}
          >
            <Emoji name={emoji} width={20} height={20} draggable={false} className="max-w-none" />
          </motion.span>
        ))}
      </AnimatePresence>
      <span className="flex items-center justify-center gap-1.5">
        <Emoji name={emoji} width={16} height={16} draggable={false} className="max-w-none" />
        {label}
      </span>
    </button>
  );
}

export default EmojiBurstButton;
