import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import Button from './Button';
import Card from './Card';
import Input from './Input';
import Select from './Select';
import Layout from './Layout';
import ProgressRing from './ProgressRing';
import StreakBadge from './StreakBadge';
import VSDisplay from './VSDisplay';
import CountdownTimer from './CountdownTimer';
import Toast from './Toast';

describe('Button', () => {
  it('renders children and defaults to the primary variant', () => {
    render(<Button>Comenzar rutina</Button>);
    const button = screen.getByRole('button', { name: /comenzar rutina/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('disables the element and reflects it visually when disabled', () => {
    render(<Button disabled>Enviar</Button>);
    const button = screen.getByRole('button', { name: /enviar/i });
    expect(button).toBeDisabled();
    expect(button.className).toMatch(/disabled:opacity-50/);
  });

  it('meets the minimum 44x44px touch target via sizing classes', () => {
    render(<Button>Tap</Button>);
    const button = screen.getByRole('button', { name: /tap/i });
    expect(button.className).toMatch(/min-h-\[44px\]/);
    expect(button.className).toMatch(/min-w-\[44px\]/);
  });

  it('supports a secondary variant', () => {
    render(<Button variant="secondary">Cancelar</Button>);
    const button = screen.getByRole('button', { name: /cancelar/i });
    expect(button.className).toMatch(/surface-container-high/);
  });
});

describe('Card', () => {
  it('wraps children using the shared glass-card utility class', () => {
    render(<Card>Contenido</Card>);
    const content = screen.getByText('Contenido');
    expect(content.className).toMatch(/glass-card/);
  });

  it('passes through a custom className', () => {
    render(<Card className="extra-class">Contenido</Card>);
    const content = screen.getByText('Contenido');
    expect(content.className).toMatch(/extra-class/);
  });
});

describe('Input', () => {
  it('associates the label with the input via htmlFor/id', () => {
    render(<Input label="Email" id="email" onChange={() => {}} value="" />);
    const input = screen.getByLabelText('Email');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('supports a disabled state', () => {
    render(<Input label="Email" id="email" disabled onChange={() => {}} value="" />);
    expect(screen.getByLabelText('Email')).toBeDisabled();
  });
});

describe('Select', () => {
  it('associates the label with the select via htmlFor/id', () => {
    render(
      <Select label="Género" id="gender" onChange={() => {}} value="M" options={[{ value: 'M', label: 'Masculino' }]} />
    );
    const select = screen.getByLabelText('Género');
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe('SELECT');
  });

  it('supports a disabled state', () => {
    render(
      <Select label="Género" id="gender" disabled onChange={() => {}} value="M" options={[{ value: 'M', label: 'Masculino' }]} />
    );
    expect(screen.getByLabelText('Género')).toBeDisabled();
  });
});

describe('Layout', () => {
  it('marks the active bottom nav item with aria-current="page"', () => {
    render(
      <MemoryRouter>
        <Layout active="inicio">
          <p>Contenido de página</p>
        </Layout>
      </MemoryRouter>
    );
    const activeItem = screen.getByRole('link', { name: /inicio/i });
    expect(activeItem).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark inactive nav items as current', () => {
    render(
      <MemoryRouter>
        <Layout active="inicio">
          <p>Contenido de página</p>
        </Layout>
      </MemoryRouter>
    );
    const inactiveItem = screen.getByRole('link', { name: /rutina/i });
    expect(inactiveItem).not.toHaveAttribute('aria-current');
  });

  it('links Rutina and Duelo to their dedicated screens', () => {
    render(
      <MemoryRouter>
        <Layout active="inicio"><p>Contenido</p></Layout>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /rutina/i })).toHaveAttribute('href', '/rutina');
    expect(screen.getByRole('link', { name: /duelo/i })).toHaveAttribute('href', '/duelo');
  });

  it('links Perfil to the functional profile screen', () => {
    render(
      <MemoryRouter>
        <Layout active="inicio"><p>Contenido</p></Layout>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /perfil/i })).toHaveAttribute('href', '/perfil');
  });

  it('renders the page content passed as children', () => {
    render(
      <MemoryRouter>
        <Layout active="inicio">
          <p>Contenido de página</p>
        </Layout>
      </MemoryRouter>
    );
    expect(screen.getByText('Contenido de página')).toBeInTheDocument();
  });

  it('links "Pruebas" to the workout history route', () => {
    render(
      <MemoryRouter>
        <Layout active="inicio">
          <p>Contenido</p>
        </Layout>
      </MemoryRouter>
    );
    const pruebas = screen.getByRole('link', { name: /pruebas/i });
    expect(pruebas).toHaveAttribute('href', '/revisar-prueba');
    expect(pruebas).not.toHaveAttribute('aria-current');
  });

  it('marks "Pruebas" as the current page when it is the active item', () => {
    render(
      <MemoryRouter>
        <Layout active="pruebas">
          <p>Contenido</p>
        </Layout>
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /pruebas/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /inicio/i })).not.toHaveAttribute('aria-current');
  });

  it('declares explicit width/height on the header logo to avoid layout shift', () => {
    render(
      <MemoryRouter>
        <Layout active="inicio">
          <p>Contenido</p>
        </Layout>
      </MemoryRouter>
    );
    const logo = screen.getByRole('img', { name: /comar-fit/i });
    expect(logo).toHaveAttribute('width', '192');
    expect(logo).toHaveAttribute('height', '84');
    expect(logo.className).toMatch(/w-32/);
    expect(logo.className).toMatch(/h-14/);
    expect(screen.queryByText('Comar-Fit')).not.toBeInTheDocument();
  });

  it('renders all five nav items', () => {
    render(
      <MemoryRouter>
        <Layout active="inicio">
          <p>Contenido</p>
        </Layout>
      </MemoryRouter>
    );
    ['Inicio', 'Rutina', 'Duelo', 'Pruebas', 'Perfil'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});

describe('ProgressRing', () => {
  it('exposes aria-valuenow/min/max on a progressbar role', () => {
    render(<ProgressRing percentage={28} />);
    const ring = screen.getByRole('progressbar');
    expect(ring).toHaveAttribute('aria-valuenow', '28');
    expect(ring).toHaveAttribute('aria-valuemin', '0');
    expect(ring).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps values above 100', () => {
    render(<ProgressRing percentage={150} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('clamps values below 0', () => {
    render(<ProgressRing percentage={-10} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });
});

describe('StreakBadge', () => {
  it('shows the streak count', () => {
    render(<StreakBadge streak={7} />);
    expect(screen.getByText(/7/)).toBeInTheDocument();
    expect(screen.getByText(/días/)).toBeInTheDocument();
  });
});

describe('VSDisplay', () => {
  it('renders both participants and a VS divider', () => {
    render(
      <VSDisplay
        participantA={{ name: 'Aaron', score: 36 }}
        participantB={{ name: 'Alexandra', score: 50 }}
      />
    );
    expect(screen.getByText('Aaron')).toBeInTheDocument();
    expect(screen.getByText('Alexandra')).toBeInTheDocument();
    expect(screen.getByText('36')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('VS')).toBeInTheDocument();
  });
});

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders remaining time based on the provided target', () => {
    const target = Date.now() + 2 * 60 * 60 * 1000; // 2 hours from now
    render(<CountdownTimer targetTime={target} />);
    expect(screen.getByText(/1h 59m|2h 0m/)).toBeInTheDocument();
  });

  it('cleans up its interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const target = Date.now() + 60 * 1000;
    const { unmount } = render(<CountdownTimer targetTime={target} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();

    // Advancing timers after unmount must not throw or trigger further updates.
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(5000);
      });
    }).not.toThrow();
    clearIntervalSpy.mockRestore();
  });
});

describe('Toast', () => {
  it('has role="status" so screen readers announce it', () => {
    render(<Toast message="Guardado correctamente" />);
    expect(screen.getByRole('status')).toHaveTextContent('Guardado correctamente');
  });

  it('renders nothing when there is no message', () => {
    const { container } = render(<Toast message="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
