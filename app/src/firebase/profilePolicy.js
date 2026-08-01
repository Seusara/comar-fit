const PHYSICAL_UPDATE_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

function timestampToDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
}

export function nextPhysicalProfileUpdateAt(profile) {
  const lastUpdate = timestampToDate(profile?.physicalProfileUpdatedAt);
  if (!lastUpdate || Number.isNaN(lastUpdate.getTime())) return null;
  return new Date(lastUpdate.getTime() + PHYSICAL_UPDATE_INTERVAL_MS);
}

export function canUpdatePhysicalProfile(profile, now = new Date()) {
  const nextUpdate = nextPhysicalProfileUpdateAt(profile);
  return !nextUpdate || now.getTime() >= nextUpdate.getTime();
}
