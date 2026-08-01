const VARIANT_CLASS = {
  success: 'border-primary-fixed-dim',
  error: 'border-error text-error',
  info: 'border-outline-variant',
};

/**
 * Confirmation/error notification. role="status" so screen readers announce
 * it automatically (implies aria-live="polite"). Renders nothing without a
 * message, so callers can conditionally mount it without an extra guard.
 */
function Toast({ message, variant = 'info', onClose }) {
  if (!message) return null;

  const variantClass = VARIANT_CLASS[variant] || VARIANT_CLASS.info;

  return (
    <div
      role="status"
      className={`glass-card rounded-xl px-4 py-3 flex items-center justify-between gap-3 border ${variantClass}`}
    >
      <span className="font-body-md text-sm">{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar notificación"
          className="tap-scale min-h-[44px] min-w-[44px] flex items-center justify-center text-on-surface-variant focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            close
          </span>
        </button>
      )}
    </div>
  );
}

export default Toast;
