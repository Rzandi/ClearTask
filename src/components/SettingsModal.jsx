/* ═══════════════════════════════════════════════════════════
   SettingsModal — ClearTask
   Modal pengaturan aplikasi (nama kasir, nama toko, tema, accent color)
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useCategories, KATEGORI_DEFAULT } from '../hooks/useCategories';

// ─── Konfigurasi swatch accent color ─────────────────────────────────────────

const ACCENT_SWATCHES = [
  { value: '#00ffa3', label: 'Hijau Neon' },
  { value: '#58a6ff', label: 'Biru' },
  { value: '#bc8cff', label: 'Ungu' },
  { value: '#f0b429', label: 'Oranye' },
];

// ─── Komponen ─────────────────────────────────────────────────────────────────

export default function SettingsModal({ isOpen, onClose }) {
  const { settings, updateSettings, saveSettings, openSettingsSnapshot, rollbackSettings } =
    useSettings();

  const { customCategories, customSubCategoriesFor, deleteCategory, deleteSubCategory } = useCategories();

  const [localKasirName, setLocalKasirName] = useState('');
  const [localTokoName, setLocalTokoName] = useState('');

  // Saat modal dibuka: ambil snapshot dan inisialisasi state lokal dari settings
  useEffect(() => {
    if (isOpen) {
      openSettingsSnapshot();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalKasirName(settings.kasirName);
       
      setLocalTokoName(settings.tokoName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleSave() {
    try {
      saveSettings({ ...settings, kasirName: localKasirName, tokoName: localTokoName });
      onClose();
    } catch (err) {
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

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) handleClose();
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    /* Backdrop */
    <div
      data-testid="settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {/* Modal card */}
      <div className="glass-card w-full max-w-sm mx-4 p-6 animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-text-primary">Pengaturan</h2>
          <button
            onClick={handleClose}
            aria-label="Tutup pengaturan"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="space-y-5">

          {/* Nama Kasir */}
          <div>
            <label
              htmlFor="kasir-name-input"
              className="block text-sm font-medium text-text-secondary mb-1.5"
            >
              Nama Kasir
            </label>
            <input
              id="kasir-name-input"
              type="text"
              value={localKasirName}
              onChange={(e) => setLocalKasirName(e.target.value)}
              placeholder="Masukkan nama kasir"
              className="form-input"
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
            <input
              id="toko-name-input"
              type="text"
              value={localTokoName}
              onChange={(e) => setLocalTokoName(e.target.value)}
              placeholder="Masukkan nama toko/usaha"
              className="form-input"
            />
          </div>

          {/* Mode Tampilan */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Mode Tampilan</p>
            <div className="flex gap-2 p-1 rounded-xl bg-bg-input border border-border-default w-fit">
              {['dark', 'light'].map((themeValue) => (
                <button
                  key={themeValue}
                  onClick={() => updateSettings({ theme: themeValue })}
                  aria-pressed={settings.theme === themeValue}
                  className={[
                    'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize',
                    settings.theme === themeValue
                      ? 'bg-primary text-text-inverse'
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
                    style={{ backgroundColor: value, outline: isActive ? `3px solid ${value}` : 'none', outlineOffset: '2px' }}
                    className={[
                      'w-8 h-8 rounded-full transition-all',
                      isActive
                        ? 'scale-110'
                        : 'opacity-70 hover:opacity-100 hover:scale-105',
                    ].join(' ')}
                  />
                );
              })}
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
                    onClick={() => deleteCategory(name)}
                    aria-label={`Hapus kategori ${name}`}
                    className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-red-400 hover:bg-white/[0.06] transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          deleteSubCategory={deleteSubCategory}
        />

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleCancel}
            className="flex-1 py-2.5 px-4 text-sm font-medium rounded-xl border border-border-default text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 px-4 text-sm font-semibold rounded-xl bg-primary text-text-inverse hover:bg-primary-hover transition-colors"
          >
            Simpan
          </button>
        </div>

      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────── */

const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

function SubKategoriSection({ allCategories, customSubCategoriesFor, deleteSubCategory }) {
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
                      className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-red-400 hover:bg-white/[0.06] transition-colors"
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
