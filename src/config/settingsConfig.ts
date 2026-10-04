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
