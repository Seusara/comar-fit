export const THEME_STORAGE_KEY = 'comar-fit:theme';
export const DEFAULT_THEME = 'original';

export const THEMES = [
  { id: 'original', label: 'Original', swatches: ['#131313', '#00dbe9', '#2563eb', '#ad00fe'] },
  { id: 'dark', label: 'Oscuro', swatches: ['#090b0f', '#172027', '#55c7d8', '#7765a8'] },
  { id: 'light', label: 'Claro', swatches: ['#f4faff', '#ffffff', '#38bdf8', '#3b82f6'] },
  { id: 'pink', label: 'Rosa', swatches: ['#170b16', '#32152d', '#ff4fa3', '#a78bfa'] },
  { id: 'pink-light', label: 'Rosa claro', swatches: ['#fff7fb', '#ffffff', '#e72f87', '#be185d'] },
];

const VALID_THEMES = new Set(THEMES.map((theme) => theme.id));

export function normalizeTheme(value) {
  return VALID_THEMES.has(value) ? value : DEFAULT_THEME;
}

export function getStoredTheme() {
  try {
    return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(value) {
  const theme = normalizeTheme(value);
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = ['light', 'pink-light'].includes(theme) ? 'light' : 'dark';
  return theme;
}

export function saveTheme(value) {
  const theme = applyTheme(value);
  try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* visual preference remains active */ }
  return theme;
}
