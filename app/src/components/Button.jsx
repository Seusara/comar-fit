const VARIANT_CLASS = {
  primary: 'action-gradient text-on-primary-fixed shadow-lg shadow-primary-container/20',
  secondary: 'bg-surface-container-high text-on-surface border border-outline-variant/30',
};

/**
 * Primary/secondary action button.
 * - Minimum 44x44px touch target (accessibility requirement, not decorative).
 * - Visible focus ring via focus-visible (doesn't rely on the browser default alone).
 * - Tap feedback uses the `.tap-scale` utility, which itself respects
 *   `prefers-reduced-motion` (see index.css).
 */
function Button({ variant = 'primary', disabled = false, className = '', children, type = 'button', ...rest }) {
  const variantClass = VARIANT_CLASS[variant] || VARIANT_CLASS.primary;

  return (
    <button
      type={type}
      disabled={disabled}
      className={`tap-scale min-h-[44px] min-w-[44px] px-6 rounded-xl font-label-md font-bold flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed ${variantClass} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export default Button;
