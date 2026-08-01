import { useMemo } from 'react';

const MET = {
  Flexiones: 6,
  Sentadillas: 5,
  Abdominales: 3.8,
  Burpees: 8,
  'Mountain Climbers': 8,
  Fondos: 6,
  'Sentadillas con Pistol': 6,
  'Lagartijas con Palmadas': 8,
  'Sentadillas Búlgaras': 6,
  Planchas: 3,
  'Planchas Laterales': 3,
};

export function useCalorieEstimate(exercises, weightKg) {
  return useMemo(() => Math.round((exercises ?? []).reduce((total, exercise) => (
    total + (MET[exercise.name] ?? 0) * (Number(weightKg) || 0) * ((Number(exercise.durationMinutes) || 0) / 60)
  ), 0)), [exercises, weightKg]);
}
