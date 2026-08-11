import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyTheme,
  DEFAULT_THEME,
  getStoredTheme,
  saveTheme,
  THEME_STORAGE_KEY,
} from './themes';

describe('theme preferences', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    document.documentElement.style.colorScheme = '';
  });

  it('uses Original when there is no valid saved preference', () => {
    expect(getStoredTheme()).toBe(DEFAULT_THEME);

    localStorage.setItem(THEME_STORAGE_KEY, 'unknown');
    expect(getStoredTheme()).toBe(DEFAULT_THEME);
  });

  it('saves and immediately applies a selected theme', () => {
    expect(saveTheme('pink')).toBe('pink');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('pink');
    expect(document.documentElement.dataset.theme).toBe('pink');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('marks the light theme for native browser controls', () => {
    applyTheme('light');

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('supports and persists the light pink theme', () => {
    saveTheme('pink-light');

    expect(getStoredTheme()).toBe('pink-light');
    expect(document.documentElement.dataset.theme).toBe('pink-light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });
});
