import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

function FormReferenceModal({ isOpen, exerciseName, reference, onClose }) {
  const dialogRef = useRef(null);

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
  const hasVideo = reference?.formReferenceType !== 'text_tips' && Boolean(reference?.formReferenceUrl);

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

        {hasVideo ? (
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
