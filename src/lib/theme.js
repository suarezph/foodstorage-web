import { useState } from 'react';

// Light, Dark or System, remembered in this browser only (it is a display preference, not data).
// public/theme.js applies it before the first paint and follows the system live; this module
// stores a new choice and tells that script.

const KEY = 'foodstorage-theme';
export const THEMES = ['system', 'light', 'dark'];

export function readTheme() {
  try {
    const v = localStorage.getItem(KEY);
    return THEMES.includes(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

export function setTheme(choice) {
  try {
    if (choice === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // storage blocked: the choice still applies until the page is reloaded
  }
  window.dispatchEvent(new CustomEvent('foodstorage-theme', { detail: choice }));
}

export function useTheme() {
  const [theme, set] = useState(readTheme);
  return [
    theme,
    (choice) => {
      setTheme(choice);
      set(choice);
    },
  ];
}
