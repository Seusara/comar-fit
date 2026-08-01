/**
 * Thin wrapper around the shared `.glass-card` utility (defined in index.css).
 * Accepts children and an optional className passthrough for layout tweaks.
 */
function Card({ children, className = '', ...rest }) {
  return (
    <div className={`glass-card rounded-xl p-6 ${className}`} {...rest}>
      {children}
    </div>
  );
}

export default Card;
