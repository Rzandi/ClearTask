/* ═══════════════════════════════════════════════════════════
   SettingsModal — ClearTask
   Modal pengaturan aplikasi (nama kasir, nama toko, tema, accent color)
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useCategories, KATEGORI_DEFAULT } from '../hooks/useCategories';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';
import Toast from './Toast';
import db from '../services/db';

// ─── Konfigurasi swatch accent color ─────────────────────────────────────────

const ACCENT_SWATCHES = [
  { value: '#00f0ff', label: 'Cyan Neon' },
  { value: '#00ff88', label: 'Hijau Neon' },
  { value: '#ff3366', label: 'Pink Neon' },
  { value: '#bc8cff', label: 'Ungu' },
  { value: '#f0b429', label: 'Oranye' },
];

// ─── Komponen ─────────────────────────────────────────────────────────────────

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings, saveSettings, openSettingsSnapshot, rollbackSettings } =
    useSettings();

  const { customCategories, customSubCategoriesFor, deleteCategory, deleteSubCategory } =
    useCategories();

  const [localKasirName, setLocalKasirName] = useState('');
  const [localTokoName, setLocalTokoName] = useState('');
  const [localAppName, setLocalAppName] = useState('');
  const [localAppSubtitle, setLocalAppSubtitle] = useState('');
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'|'warning'} | null>(null);
  const [daysSinceBackup, setDaysSinceBackup] = useState<number | null>(null);

  // Cek kapan terakhir backup saat modal dibuka
  useEffect(() => {
    if (!isOpen) return;
    db.meta
      .get({ key: 'lastBackupAt' })
      .then((record) => {
        if (!record?.value) {
          setDaysSinceBackup(null); // belum pernah backup
          return;
        }
        const last = new Date(record.value);
        const diffMs = Date.now() - last.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        setDaysSinceBackup(diffDays);
      })
      .catch(() => setDaysSinceBackup(null));
  }, [isOpen]);

  // Saat modal dibuka: ambil snapshot dan inisialisasi state lokal dari settings
  useEffect(() => {
    if (isOpen) {
      openSettingsSnapshot();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalKasirName(settings.kasirName || '');
      setLocalTokoName(settings.tokoName || '');
      setLocalAppName(settings.appName || 'ClearTask');
      setLocalAppSubtitle(settings.appSubtitle || 'Pencatatan Penjualan');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleSave() {
    try {
      saveSettings({
        ...settings,
        kasirName: localKasirName,
        tokoName: localTokoName,
        appName: localAppName,
        appSubtitle: localAppSubtitle,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pengaturan');
    }
  }

  function handleCancel() {
    rollbackSettings();
    onClose();
  }

  function handleClose() {
    rollbackSettings();
    onClose();
  }

  async function handleDeleteCategory(name: string) {
    const result = await deleteCategory(name);
    if (result && !result.success) {
      setToast({ message: result.error || 'Gagal menghapus kategori', type: 'error' });
    }
  }

  async function handleDeleteSubCategory(kat: string, sub: string) {
    const result = await deleteSubCategory(kat, sub);
    if (result && !result.success) {
      setToast({ message: result.error || 'Gagal menghapus sub kategori', type: 'error' });
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Pengaturan"
      size="sm"
      footer={
        <div className="flex gap-3">
          <Button onClick={handleCancel} variant="outline" className="flex-1">
            Batal
          </Button>
          <Button onClick={handleSave} variant="primary" className="flex-1">
            Simpan
          </Button>
        </div>
      }
    >
      {/* Inline toast for category errors */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div data-testid="settings-modal">
        {/* ── Backup Reminder Banner (W5-2) ─────────────────────── */}
        {(daysSinceBackup === null || daysSinceBackup >= 7) && (
          <div className="mb-5 flex items-start gap-3 rounded-xl bg-warning/8 border border-warning/25 px-4 py-3">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f0b429"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 mt-0.5"
              aria-hidden="true"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-warning">
                {daysSinceBackup === null
                  ? 'Belum pernah backup data'
                  : `Backup terakhir: ${daysSinceBackup} hari lalu`}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Backup rutin via{' '}
                <strong className="text-text-secondary">Database → Export JSON</strong> untuk
                mencegah kehilangan data.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="space-y-6">
          {/* Seksi Profil Usaha */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary border-b border-border-subtle pb-2">
              Profil Usaha
            </h3>

            {/* Nama Kasir */}
            <div>
              <label
                htmlFor="kasir-name-input"
                className="block text-sm font-medium text-text-secondary mb-1.5"
              >
                Nama Kasir
              </label>
              <Input
                id="kasir-name-input"
                type="text"
                value={localKasirName}
                onChange={(e) => setLocalKasirName(e.target.value)}
                placeholder="Masukkan nama kasir"
                maxLength={50}
              />
            </div>

            {/* Nama Toko/Usaha */}
            <div>
              <label
                htmlFor="toko-name-input"
                className="block text-sm font-medium text-text-secondary mb-1.5"
              >
                Nama Toko/Usaha
              </label>
              <Input
                id="toko-name-input"
                type="text"
                value={localTokoName}
                onChange={(e) => setLocalTokoName(e.target.value)}
                placeholder="Masukkan nama toko/usaha"
                maxLength={100}
              />
            </div>
          </div>

          {/* Seksi Personalisasi Aplikasi */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary border-b border-border-subtle pb-2">
              Personalisasi Aplikasi
            </h3>

            {/* Nama Aplikasi */}
            <div>
              <label
                htmlFor="app-name-input"
                className="block text-sm font-medium text-text-secondary mb-1.5"
              >
                Nama Aplikasi
              </label>
              <Input
                id="app-name-input"
                type="text"
                value={localAppName}
                onChange={(e) => setLocalAppName(e.target.value)}
                placeholder="Cth: ClearTask"
                maxLength={30}
              />
            </div>

            {/* Slogan / Deskripsi Pendek */}
            <div>
              <label
                htmlFor="app-subtitle-input"
                className="block text-sm font-medium text-text-secondary mb-1.5"
              >
                Slogan / Deskripsi Pendek
              </label>
              <Input
                id="app-subtitle-input"
                type="text"
                value={localAppSubtitle}
                onChange={(e) => setLocalAppSubtitle(e.target.value)}
                placeholder="Cth: Pencatatan Penjualan"
                maxLength={50}
              />
            </div>

            {/* Mode Tampilan */}
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Mode Tampilan</p>
              <div className="flex gap-2 p-1 rounded-xl bg-bg-input border border-border-default w-fit shadow-inner">
                {['dark', 'light'].map((themeValue) => (
                  <button
                    key={themeValue}
                    onClick={() => updateSettings({ theme: themeValue })}
                    aria-pressed={settings.theme === themeValue}
                    className={[
                      'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize',
                      settings.theme === themeValue
                        ? 'bg-primary text-text-inverse shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.3)]'
                        : 'text-text-secondary hover:text-text-primary',
                    ].join(' ')}
                  >
                    {themeValue === 'dark' ? 'Dark' : 'Light'}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Warna Aksen</p>
              <div className="flex gap-3">
                {ACCENT_SWATCHES.map(({ value, label }) => {
                  const isActive = settings.accentColor === value;
                  return (
                    <button
                      key={value}
                      onClick={() => updateSettings({ accentColor: value })}
                      aria-label={label}
                      aria-pressed={isActive}
                      title={label}
                      style={{
                        backgroundColor: value,
                        outline: isActive ? `3px solid ${value}` : 'none',
                        outlineOffset: '2px',
                      }}
                      className={[
                        'w-8 h-8 rounded-full transition-all',
                        isActive
                          ? 'scale-110 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                          : 'opacity-70 hover:opacity-100 hover:scale-105 shadow-inner',
                      ].join(' ')}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Kelola Kategori */}
        <div className="mt-5 space-y-2">
          <p className="text-sm font-medium text-text-secondary">Kelola Kategori</p>
          {customCategories.length === 0 ? (
            <p className="text-xs text-text-muted">Belum ada kategori kustom.</p>
          ) : (
            <ul className="space-y-1">
              {customCategories.map((name) => (
                <li key={name} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-text-secondary">{name}</span>
                  <button
                    onClick={() => handleDeleteCategory(name)}
                    aria-label={`Hapus kategori ${name}`}
                    className="w-11 h-11 flex items-center justify-center rounded text-text-muted hover:text-red-400 hover:bg-white/[0.06] transition-colors"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Kelola Sub-Kategori */}
        <SubKategoriSection
          allCategories={[...KATEGORI_DEFAULT, ...customCategories]}
          customSubCategoriesFor={customSubCategoriesFor}
          deleteSubCategory={handleDeleteSubCategory}
        />
      </div>
    </Modal>
  );
}

/* ─── Sub-components ──────────────────────────────────────── */

const TrashIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

interface SubKategoriSectionProps {
  allCategories: string[];
  customSubCategoriesFor: (kat: string) => string[];
  deleteSubCategory: (kat: string, sub: string) => void;
}

function SubKategoriSection({ allCategories, customSubCategoriesFor, deleteSubCategory }: SubKategoriSectionProps) {
  const withSubs = allCategories.filter((kat) => customSubCategoriesFor(kat).length > 0);

  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm font-medium text-text-secondary">Kelola Sub-Kategori</p>
      {withSubs.length === 0 ? (
        <p className="text-xs text-text-muted">Belum ada sub-kategori kustom.</p>
      ) : (
        <div className="space-y-3">
          {withSubs.map((kat) => (
            <div key={kat}>
              <p className="text-xs font-medium text-text-muted mb-1">{kat}</p>
              <ul className="space-y-1 pl-2">
                {customSubCategoriesFor(kat).map((sub) => (
                  <li key={sub} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-text-secondary">{sub}</span>
                    <button
                      onClick={() => deleteSubCategory(kat, sub)}
                      aria-label={`Hapus sub-kategori ${sub}`}
                      className="w-11 h-11 flex items-center justify-center rounded text-text-muted hover:text-red-400 hover:bg-white/[0.06] transition-colors"
                    >
                      <TrashIcon />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
