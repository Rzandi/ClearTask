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
  soundEnabled: boolean;
  hapticEnabled: boolean;
  qrisImageUrl?: string;
  qrisNsm?: string;
  /** Biaya kantong plastik: aktif/nonaktif */
  plasticBagEnabled?: boolean;
  /** Mode outdoor kontras tinggi: aktif/nonaktif */
  outdoorMode?: boolean;
  /** Ukuran kertas struk thermal: 58mm atau 80mm (W3-08) */
  receiptPaperSize?: '58mm' | '80mm';
  [key: string]: unknown;
}

export const defaultSettings: AppSettings = {
  kasirName: 'Admin',
  tokoName: '',
  appName: 'ClearTask',
  appSubtitle: 'Pencatatan Penjualan',
  theme: 'dark',
  accentColor: '#00f0ff',
  tokoAlamat: '',
  tokoTelepon: '',
  strukFooter: 'Barang yang sudah dibeli tidak dapat ditukar/dikembalikan',
  soundEnabled: true,
  hapticEnabled: true,
  plasticBagEnabled: false,
  plasticBagPrice: 500,
  outdoorMode: false,
  receiptPaperSize: '58mm',
};

export interface ThemePreset {
  id: string;
  label: string;
  value: string;
  hover: string;
  subtle: string;
  glow: string;
}

export const THEME_COLOR_PRESETS: ThemePreset[] = [
  {
    id: 'cobalt',
    label: 'Cobalt Pro (Default)',
    value: '#2563eb',
    hover: '#1d4ed8',
    subtle: 'rgba(37, 99, 235, 0.15)',
    glow: 'rgba(37, 99, 235, 0.35)',
  },
  {
    id: 'emerald',
    label: 'Emerald Merchant',
    value: '#10b981',
    hover: '#059669',
    subtle: 'rgba(16, 185, 129, 0.15)',
    glow: 'rgba(16, 185, 129, 0.35)',
  },
  {
    id: 'amber',
    label: 'Amber Warm',
    value: '#f59e0b',
    hover: '#d97706',
    subtle: 'rgba(245, 158, 11, 0.15)',
    glow: 'rgba(245, 158, 11, 0.35)',
  },
  {
    id: 'iris',
    label: 'Iris Modern',
    value: '#8b5cf6',
    hover: '#7c3aed',
    subtle: 'rgba(139, 92, 246, 0.15)',
    glow: 'rgba(139, 92, 246, 0.35)',
  },
  {
    id: 'cyan',
    label: 'Cyber Cyan',
    value: '#06b6d4',
    hover: '#0891b2',
    subtle: 'rgba(6, 182, 212, 0.15)',
    glow: 'rgba(6, 182, 212, 0.35)',
  },
  {
    id: 'monochrome',
    label: 'Monochrome',
    value: '#71717a',
    hover: '#52525b',
    subtle: 'rgba(113, 113, 122, 0.15)',
    glow: 'rgba(113, 113, 122, 0.35)',
  },
];

export const VALID_ACCENT_COLORS = [
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#71717a',
  '#00f0ff',
  '#00ff88',
  '#ff3366',
  '#bc8cff',
  '#f0b429',
];

export function applyThemeToDOM(theme: string, accentColor: string): void {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }

  const preset = THEME_COLOR_PRESETS.find(
    (p) => p.value.toLowerCase() === accentColor.toLowerCase()
  );
  root.style.setProperty('--color-primary', accentColor);
  if (preset) {
    root.style.setProperty('--color-primary-hover', preset.hover);
    root.style.setProperty('--color-primary-subtle', preset.subtle);
    root.style.setProperty('--color-primary-glow', preset.glow);
  } else {
    root.style.setProperty('--color-primary-hover', accentColor);
    root.style.setProperty('--color-primary-subtle', `${accentColor}25`);
    root.style.setProperty('--color-primary-glow', `${accentColor}40`);
  }
}
