export interface AppSettings {
  kasirName: string;
  tokoName: string;
  appName: string;
  appSubtitle: string;
  theme: string;
  accentColor: string;
  tokoAlamat: string;
  tokoTelepon: string;
  strukFooter: string;
  [key: string]: any;
}

export const defaultSettings: AppSettings = {
  kasirName: 'Admin',
  tokoName: '',
  appName: 'ClearTask',
  appSubtitle: 'Pencatatan Penjualan',
  theme: 'dark',
  accentColor: '#00f0ff',
  tokoAlamat: 'Jl. Contoh Alamat No. 123',
  tokoTelepon: '0812-3456-7890',
  strukFooter: 'Barang yang sudah dibeli tidak dapat ditukar/dikembalikan',
};

export const VALID_ACCENT_COLORS = ['#00f0ff', '#00ff88', '#ff3366', '#bc8cff', '#f0b429'];

export function applyThemeToDOM(theme: string, accentColor: string): void {
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
