export const defaultSettings = {
  kasirName: 'Admin',
  tokoName: '',
  appName: 'ClearTask',
  appSubtitle: 'Pencatatan Penjualan',
  theme: 'dark',
  accentColor: '#00f0ff',
};

export const VALID_ACCENT_COLORS = ['#00f0ff', '#00ff88', '#ff3366', '#bc8cff', '#f0b429'];

export function applyThemeToDOM(theme, accentColor) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }
  root.style.setProperty('--color-primary', accentColor);
}
