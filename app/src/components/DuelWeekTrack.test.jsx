import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DuelWeekTrack from './DuelWeekTrack';

describe('DuelWeekTrack', () => {
  it('renders Monday through Sunday in two accessible participant lanes', () => {
    render(
      <DuelWeekTrack
        nameA="Aaron"
        nameB="Alexandra"
        participantA={{ dayKeys: ['2026-08-03', '2026-08-05'] }}
        participantB={{ dayKeys: ['2026-08-04'] }}
        weekStartKey="2026-08-03"
      />,
    );

    for (const label of ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole('img', { name: 'Aaron, lunes: activo' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Aaron, martes: inactivo' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Alexandra, martes: activo' })).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(14);
  });
});
