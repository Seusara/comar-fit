import { useId } from 'react';

const BASE_SELECT_CLASS =
  'w-full min-h-[44px] bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * Native <select>, no custom combobox — out of scope for Phase 2.Mín.
 * Same label association requirement as Input: getByLabelText must find it.
 * Pass either `options` (array of { value, label }) or raw <option> children.
 */
function Select({ label, id, name, options = [], children, className = '', ...rest }) {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={selectId} className="block font-label-md text-on-surface-variant">
          {label}
        </label>
      )}
      <select id={selectId} name={name || selectId} className={`${BASE_SELECT_CLASS} ${className}`} {...rest}>
        {children ||
          options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
      </select>
    </div>
  );
}

export default Select;
