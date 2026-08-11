import { Link } from 'react-router-dom';
import symbol from '../assets/branding/comar-fit-symbol.png';

// Phase 2.Mín builds the Dashboard and the workout history, so those two
// items route somewhere real (any item with a `to` renders as a Link). The
// Duelo still reuses the live dashboard; every navigation item has a real route.
const NAV_ITEMS = [
  { key: 'inicio', label: 'Inicio', icon: 'home', to: '/dashboard' },
  { key: 'rutina', label: 'Rutina', icon: 'fitness_center', to: '/rutina' },
  { key: 'duelo', label: 'Duelo', icon: 'swords', to: '/duelo' },
  { key: 'pruebas', label: 'Pruebas', icon: 'assignment', to: '/revisar-prueba' },
  { key: 'perfil', label: 'Perfil', icon: 'person', to: '/perfil' },
];

// Intrinsic size of the header logo asset: 2x its 40px (w-10/h-10) display
// size for retina. Declared on the <img> so the header reserves the space
// before the image decodes (no layout shift).
const SYMBOL_SIZE = 256;

const ACTIVE_ITEM_CLASS =
  'flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-full px-4 py-1 min-h-[44px] min-w-[44px] tap-scale';
const INACTIVE_ITEM_CLASS =
  'flex flex-col items-center justify-center text-on-surface-variant p-2 min-h-[44px] min-w-[44px] tap-scale focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim';

/**
 * Common page shell: header (logo + app name) + bottom nav, wrapping page
 * content passed as children. Stands in for Layout/Header/BottomNav from the
 * design spec since the brief's file list only has one Layout.jsx.
 */
function Layout({ children, active = 'inicio' }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md shadow-sm border-b border-outline-variant/10">
        <div className="flex justify-between items-center px-margin_mobile h-16 w-full max-w-7xl mx-auto">
          <div className="flex max-w-[180px] items-center gap-2" aria-label="Comar-Fit">
            <img
              src={symbol}
              alt=""
              width={SYMBOL_SIZE}
              height={SYMBOL_SIZE}
              className="h-11 w-11 shrink-0 object-contain"
              aria-hidden="true"
            />
            <span className="hidden whitespace-nowrap font-headline-lg text-lg font-extrabold italic tracking-tight text-on-surface sm:block">
              Comar-Fit
            </span>
          </div>
        </div>
      </header>

      <main className="flex-grow pt-20 pb-28 px-margin_mobile max-w-2xl mx-auto w-full">{children}</main>

      <nav
        aria-label="Navegación principal"
        className="fixed bottom-0 w-full z-50 rounded-t-xl bg-surface-container shadow-[0_-4px_10px_rgba(0,0,0,0.3)] border-t border-outline-variant/20"
      >
        <div className="flex justify-around items-center w-full h-20 pb-safe px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === active;
            const itemClass = isActive ? ACTIVE_ITEM_CLASS : INACTIVE_ITEM_CLASS;
            const iconStyle = isActive ? { fontVariationSettings: "'FILL' 1" } : undefined;

            // Any nav item that has a destination becomes a real link; the
            // rest stay inert buttons until their screens exist.
            if (item.to) {
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  aria-current={isActive ? 'page' : undefined}
                  className={itemClass}
                >
                  <span className="material-symbols-outlined" style={iconStyle} aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="font-label-md text-label-md">{item.label}</span>
                </Link>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.unavailable ? `${item.label}, Próximamente` : item.label}
                disabled={item.unavailable}
                className={`${itemClass} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <span className="material-symbols-outlined" style={iconStyle} aria-hidden="true">
                  {item.icon}
                </span>
                <span className="font-label-md text-label-md">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default Layout;
