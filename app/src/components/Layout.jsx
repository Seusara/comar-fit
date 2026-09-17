import { useNavigate } from 'react-router-dom';
import symbol from '../assets/branding/comar-fit-symbol.png';
import Dock from './Dock';

const NAV_ITEMS = [
  { key: 'inicio', label: 'Inicio', icon: 'home', to: '/dashboard' },
  { key: 'rutina', label: 'Rutina', icon: 'fitness_center', to: '/rutina' },
  { key: 'duelo', label: 'Duelo', icon: 'swords', to: '/duelo' },
  { key: 'pruebas', label: 'Pruebas', icon: 'assignment', to: '/revisar-prueba' },
  { key: 'perfil', label: 'Perfil', icon: 'person', to: '/perfil' },
];

const SYMBOL_SIZE = 256;

function Layout({ children, active = 'inicio' }) {
  const navigate = useNavigate();

  const dockItems = NAV_ITEMS.map((item) => ({
    label: item.label,
    active: item.key === active,
    icon: (
      <span
        className="material-symbols-outlined text-[20px]"
        style={item.key === active ? { fontVariationSettings: "'FILL' 1" } : undefined}
        aria-hidden="true"
      >
        {item.icon}
      </span>
    ),
    onClick: () => navigate(item.to),
  }));

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

      {/* Dock nav — magnification effect on hover */}
      <Dock
        items={dockItems}
        panelHeight={60}
        baseItemSize={44}
        magnification={62}
        distance={140}
      />
    </div>
  );
}

export default Layout;
