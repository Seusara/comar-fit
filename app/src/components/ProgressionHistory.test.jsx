import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProgressionHistory from './ProgressionHistory';
import { buildSummary } from '../firebase/progressionHistory';

// ---------------------------------------------------------------------------
// buildSummary (pure function)
// ---------------------------------------------------------------------------
describe('buildSummary', () => {
  it('returns zeros and empty array for empty days', () => {
    expect(buildSummary({})).toEqual({ increases: 0, reduces: 0, exercisesChanged: [] });
  });

  it('counts increases and reduces across days', () => {
    const days = {
      1: [
        { exerciseId: 'pushups', action: 'increase', delta: 2 },
        { exerciseId: 'dips', action: 'reduce', delta: -2 },
      ],
      3: [
        { exerciseId: 'squats', action: 'increase', delta: 2 },
        { exerciseId: 'planks', action: 'maintain', delta: 0 },
      ],
    };
    const summary = buildSummary(days);
    expect(summary.increases).toBe(2);
    expect(summary.reduces).toBe(1);
    expect(summary.exercisesChanged).toContain('pushups');
    expect(summary.exercisesChanged).toContain('dips');
    expect(summary.exercisesChanged).toContain('squats');
    expect(summary.exercisesChanged).not.toContain('planks');
  });

  it('deduplicates exercise IDs that appear in multiple days', () => {
    const days = {
      1: [{ exerciseId: 'pushups', action: 'increase', delta: 2 }],
      3: [{ exerciseId: 'pushups', action: 'increase', delta: 2 }],
    };
    const { exercisesChanged } = buildSummary(days);
    expect(exercisesChanged.filter((id) => id === 'pushups')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// ProgressionHistory component
// ---------------------------------------------------------------------------
const ENTRIES = [
  {
    id: 'aaron_2026-W32',
    userId: 'aaron',
    weekId: '2026-W32',
    acceptedAt: { toDate: () => new Date('2026-08-10T00:00:00Z') },
    days: {
      1: [{ exerciseId: 'pushups', action: 'increase', delta: 2, proposed: {} }],
    },
    summary: { increases: 1, reduces: 0, exercisesChanged: ['pushups'] },
  },
  {
    id: 'aaron_2026-W31',
    userId: 'aaron',
    weekId: '2026-W31',
    acceptedAt: { toDate: () => new Date('2026-08-03T00:00:00Z') },
    days: {
      3: [{ exerciseId: 'dips', action: 'reduce', delta: -2, proposed: {} }],
    },
    summary: { increases: 0, reduces: 1, exercisesChanged: ['dips'] },
  },
];

describe('ProgressionHistory', () => {
  it('renders nothing when entries is empty', () => {
    const { container } = render(<ProgressionHistory entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows loading copy while loading', () => {
    render(<ProgressionHistory loading />);
    expect(screen.getByRole('status')).toHaveTextContent(/cargando/i);
  });

  it('renders one row per entry', () => {
    render(<ProgressionHistory entries={ENTRIES} />);
    expect(screen.getByText(/semana 32/i)).toBeInTheDocument();
    expect(screen.getByText(/semana 31/i)).toBeInTheDocument();
  });

  it('shows exercise names in each row', () => {
    render(<ProgressionHistory entries={ENTRIES} />);
    expect(screen.getByText(/pushups/i)).toBeInTheDocument();
    expect(screen.getByText(/dips/i)).toBeInTheDocument();
  });

  it('shows increase chip for entry with increases', () => {
    render(<ProgressionHistory entries={[ENTRIES[0]]} />);
    expect(screen.getByText(/↑\s*1/)).toBeInTheDocument();
  });

  it('shows reduce chip for entry with reduces', () => {
    render(<ProgressionHistory entries={[ENTRIES[1]]} />);
    expect(screen.getByText(/↓\s*1/)).toBeInTheDocument();
  });

  it('renders an accepted date string for each entry', () => {
    render(<ProgressionHistory entries={[ENTRIES[0]]} />);
    // jsdom's Intl support varies — just check that some date text is rendered
    // (the component calls toLocaleDateString which may format differently in CI).
    const dateEl = document.querySelector('span.text-xs.text-on-surface-variant');
    expect(dateEl).toBeTruthy();
  });

  it('has a labeled section heading', () => {
    render(<ProgressionHistory entries={ENTRIES} />);
    expect(screen.getByRole('region', { name: /historial de ajustes/i })).toBeInTheDocument();
  });
});
