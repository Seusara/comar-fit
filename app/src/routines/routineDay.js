export const DEFAULT_ROUTINE_TIMEZONE = 'America/Mexico_City';

function formatInZone(value, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(value);
}

export function routineDayKey(value = new Date(), timeZone = DEFAULT_ROUTINE_TIMEZONE) {
  try {
    return formatInZone(value, timeZone || DEFAULT_ROUTINE_TIMEZONE);
  } catch {
    return formatInZone(value, DEFAULT_ROUTINE_TIMEZONE);
  }
}
