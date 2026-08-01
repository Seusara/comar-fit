export function serializeRoutineHistory(dayKey, exerciseIds) {
  return JSON.stringify({ dayKey, exerciseIds });
}

export function parseRoutineHistory(raw, currentDayKey) {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || value.dayKey === currentDayKey || typeof value.dayKey !== 'string') return [];
    if (!Array.isArray(value.exerciseIds) || !value.exerciseIds.every((id) => typeof id === 'string')) return [];
    return value.exerciseIds;
  } catch {
    return [];
  }
}
