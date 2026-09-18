/* ═══════════════════════════════════════════════════════════
   SetupWizardModal — ClearTask
   3-Step Onboarding Stepper Wizard for First-Time Store Setup
   ═══════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';

export interface SetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SetupWizardModal({ isOpen, onClose }: SetupWizardModalProps) {
  const { settings, saveSettings } = useSettings();
  const [step, setStep] = useState(1);

  const [tokoName, setTokoName] = useState(settings?.tokoName || 'Toko Saya');
  const [kasirName, setKasirName] = useState(settings?.kasirName || 'Kasir 1');
  const [qrisNsm, setQrisNsm] = useState(settings?.qrisNsm || '');
  const [qrisImageUrl, setQrisImageUrl] = useState(settings?.qrisImageUrl || '');

  // S5.3 — Validasi input
  const [tokoNameError, setTokoNameError] = useState('');
  const [kasirNameError, setKasirNameError] = useState('');

  const TOKO_MAX = 60;
  const KASIR_MAX = 40;

  function validateStep1(): boolean {
    let valid = true;
    const trimmed = tokoName.trim();
    if (!trimmed) {
      setTokoNameError('Nama toko wajib diisi.');
      valid = false;
    } else if (trimmed.length < 2) {
      setTokoNameError('Nama toko minimal 2 karakter.');
      valid = false;
    } else {
      setTokoNameError('');
    }
    const trimmedKasir = kasirName.trim();
    if (!trimmedKasir) {
      setKasirNameError('Nama kasir wajib diisi.');
      valid = false;
    } else {
      setKasirNameError('');
    }
    return valid;
  }

  if (!isOpen) return null;

  function handleComplete() {
    saveSettings({
      ...settings,
      tokoName: tokoName.trim() || 'Toko Saya',
      kasirName: kasirName.trim() || 'Kasir 1',
      qrisNsm: qrisNsm.trim(),
      qrisImageUrl,
    });
    localStorage.setItem('cleartask_setup_completed', 'true');
    onClose();
  }

  function handleQrisUpload(e: any) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setQrisImageUrl(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card w-full max-w-md p-6 space-y-5 animate-slide-up">
        {/* Stepper Header */}
        <div className="flex items-center justify-between border-b border-border-default pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Langkah {step} dari 3
            </span>
            <h2 className="text-base font-bold text-text-primary">
              {step === 1 && '🏬 Profil Toko & Sesi Kasir'}
              {step === 2 && '💳 Pengaturan QRIS & Struk'}
              {step === 3 && '🚀 Pengujian & Siap Digunakan'}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  s === step ? 'bg-primary scale-125' : s < step ? 'bg-primary/50' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Profil Toko */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-text-secondary">Nama Toko / Usaha *</label>
                <span className={`text-[10px] ${tokoName.length > TOKO_MAX - 10 ? 'text-warning' : 'text-text-muted'}`}>
                  {tokoName.length}/{TOKO_MAX}
                </span>
              </div>
              <input
                type="text"
                value={tokoName}
                onChange={(e) => {
                  if (e.target.value.length <= TOKO_MAX) setTokoName(e.target.value);
                  if (tokoNameError) setTokoNameError('');
                }}
                placeholder="Contoh: Toko Kelontong Berkah"
                maxLength={TOKO_MAX}
                className={`w-full px-4 py-2.5 text-sm bg-bg-input border rounded-xl text-text-primary focus:border-primary outline-none ${tokoNameError ? 'border-error' : 'border-border-default'}`}
              />
              {tokoNameError && <p className="mt-1 text-[11px] text-error">{tokoNameError}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-text-secondary">Nama Kasir Utama *</label>
                <span className={`text-[10px] ${kasirName.length > KASIR_MAX - 10 ? 'text-warning' : 'text-text-muted'}`}>
                  {kasirName.length}/{KASIR_MAX}
                </span>
              </div>
              <input
                type="text"
                value={kasirName}
                onChange={(e) => {
                  if (e.target.value.length <= KASIR_MAX) setKasirName(e.target.value);
                  if (kasirNameError) setKasirNameError('');
                }}
                placeholder="Contoh: Budi"
                maxLength={KASIR_MAX}
                className={`w-full px-4 py-2.5 text-sm bg-bg-input border rounded-xl text-text-primary focus:border-primary outline-none ${kasirNameError ? 'border-error' : 'border-border-default'}`}
              />
              {kasirNameError && <p className="mt-1 text-[11px] text-error">{kasirNameError}</p>}
            </div>
            <div className="p-3 bg-white/[0.02] border border-border-subtle rounded-xl text-xs text-text-muted">
              💡 Mata uang aplikasi otomatis diset ke <strong className="text-text-primary">Rupiah (Rp)</strong> dalam mode Offline-First.
            </div>
          </div>
        )}

        {/* Step 2: QRIS & Struk */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">NMID QRIS (Opsional)</label>
              <input
                type="text"
                value={qrisNsm}
                onChange={(e) => setQrisNsm(e.target.value)}
                placeholder="Contoh: ID102938475"
                className="w-full px-4 py-2.5 text-sm bg-bg-input border border-border-default rounded-xl text-text-primary focus:border-primary outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Upload Gambar QRIS Statis Toko</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleQrisUpload}
                className="w-full text-xs text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/15 file:text-primary hover:file:bg-primary/25 cursor-pointer"
              />
              {qrisImageUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={qrisImageUrl} alt="QRIS Preview" className="w-12 h-12 object-contain rounded-lg border border-border-default bg-white p-1" />
                  <span className="text-xs text-primary font-medium">✓ QRIS Berhasil Diunggah</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Ready */}
        {step === 3 && (
          <div className="space-y-4 text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 text-primary mx-auto flex items-center justify-center text-3xl">
              🚀
            </div>
            <h3 className="text-sm font-bold text-text-primary">Penyiapan Selesai!</h3>
            <p className="text-xs text-text-muted">
              ClearTask POS siap digunakan untuk memproses transaksi toko kelontong/retail Anda secara offline & ultra-cepat.
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex gap-3 pt-3 border-t border-border-default">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="py-2.5 px-4 text-xs font-semibold rounded-xl border border-border-default text-text-secondary hover:bg-white/5 transition-colors"
            >
              Kembali
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 1 && !validateStep1()) return;
                setStep((s) => s + 1);
              }}
              className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl bg-primary text-text-inverse hover:bg-primary-hover transition-colors"
            >
              Lanjut Ke Langkah {step + 1} →
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex-1 py-2.5 px-4 text-xs font-bold rounded-xl bg-primary text-text-inverse hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
            >
              Mulai Transaksi Pertama 🚀
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
