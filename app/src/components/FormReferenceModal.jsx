import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'motion/react';
import { getAssetUrl } from '@bryllim/workout-guide';

const SPRITE_FRAME_COUNT = 3;
const SPRITE_FRAME_INTERVAL_MS = 900;

function FormReferenceModal({ isOpen, exerciseName, reference, onClose }) {
  const dialogRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const [frameIndex, setFrameIndex] = useState(0);
  const [autoplayTick, setAutoplayTick] = useState(0);
  const isSprite = reference?.formReferenceType === 'sprite';

  useEffect(() => {
    setFrameIndex(0);
  }, [reference?.spriteSlug]);

  useEffect(() => {
    if (!isOpen || !isSprite || reducedMotion) return undefined;
    const timer = setInterval(() => {
      setFrameIndex((current) => (current + 1) % SPRITE_FRAME_COUNT);
    }, SPRITE_FRAME_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isOpen, isSprite, reducedMotion, reference?.spriteSlug, autoplayTick]);

  function goToFrame(next) {
    setFrameIndex(next);
    setAutoplayTick((value) => value + 1);
  }

  useEffect(() => {
    if (!isOpen) return undefined;

    const previouslyFocusedElement = document.activeElement;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocusedElement instanceof HTMLElement) {
        previouslyFocusedElement.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tips = reference?.tips ?? [];
  const hasVideo = Boolean(reference?.formReferenceUrl);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
      data-testid="form-reference-modal-backdrop"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-reference-modal-title"
        tabIndex={-1}
        className="glass-card w-full max-w-md rounded-xl p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="form-reference-modal-title" className="font-headline-lg text-on-surface">
            {exerciseName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="min-h-[44px] min-w-[44px] rounded-lg text-on-surface-variant focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        {isSprite ? (
          <div className="mt-4">
            <div className="relative mx-auto aspect-square w-48 overflow-hidden rounded-lg bg-surface-container-low">
              <img
                src={getAssetUrl(reference.spriteSlug, frameIndex + 1)}
                alt={`${exerciseName} — postura ${frameIndex + 1} de ${SPRITE_FRAME_COUNT}`}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>
            <div className="mt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => goToFrame((frameIndex - 1 + SPRITE_FRAME_COUNT) % SPRITE_FRAME_COUNT)}
                aria-label="Postura anterior"
                className="min-h-[44px] min-w-[44px] rounded-lg text-on-surface-variant focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim"
              >
                <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
              </button>
              <div className="flex gap-1" role="tablist" aria-label="Postura">
                {Array.from({ length: SPRITE_FRAME_COUNT }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === frameIndex}
                    aria-label={`Postura ${i + 1}`}
                    onClick={() => goToFrame(i)}
                    className={`h-2 w-2 rounded-full ${i === frameIndex ? 'bg-primary-fixed-dim' : 'bg-outline-variant/40'}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => goToFrame((frameIndex + 1) % SPRITE_FRAME_COUNT)}
                aria-label="Siguiente postura"
                className="min-h-[44px] min-w-[44px] rounded-lg text-on-surface-variant focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim"
              >
                <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
              </button>
            </div>
          </div>
        ) : hasVideo ? (
          <iframe
            title={`Video de técnica: ${exerciseName}`}
            src={reference.formReferenceUrl}
            className="mt-4 aspect-video w-full rounded-lg"
            allowFullScreen
            tabIndex={0}
          />
        ) : (
          <p className="mt-4 text-on-surface-variant text-sm">Sin video disponible por ahora — sigue estos consejos:</p>
        )}

        <ul className="mt-4 space-y-2">
          {tips.map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-on-surface text-sm">
              <span className="material-symbols-outlined text-primary-fixed-dim text-base" aria-hidden="true">check_circle</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body
  );
}

export default FormReferenceModal;
