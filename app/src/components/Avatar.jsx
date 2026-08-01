import { useEffect, useState } from 'react';

function Avatar({ name = '', src = '', size = 'h-20 w-20', className = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const initial = name.trim().charAt(0).toUpperCase() || 'U';

  return (
    <div className={`${size} rounded-full action-gradient p-[2px] shrink-0 ${className}`}>
      <div className="h-full w-full rounded-full bg-surface-container overflow-hidden flex items-center justify-center text-3xl font-headline-lg">
        {src && !failed ? (
          <img className="h-full w-full object-cover" src={src} alt={`Foto de ${name || 'usuario'}`} onError={() => setFailed(true)} />
        ) : initial}
      </div>
    </div>
  );
}

export default Avatar;
