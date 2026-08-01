import { useId } from 'react';

const BASE_INPUT_CLASS =
  'w-full min-h-[44px] bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * Accessible text input. Always renders a <label> correctly associated with
 * the <input> via htmlFor/id so it can be found with getByLabelText.
 * If no `id` is passed, a stable one is generated with useId().
 */
function Input({ label, id, name, type = 'text', error, className = '', ...rest }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block font-label-md text-on-surface-variant">
          {label}
        </label>
      )}
      <input
        id={inputId}
        name={name || inputId}
        type={type}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`${BASE_INPUT_CLASS} ${className}`}
        {...rest}
      />
      {error && (
        <p id={errorId} role="alert" className="text-error text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

export default Input;
