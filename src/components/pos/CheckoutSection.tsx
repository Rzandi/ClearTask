/* ═══════════════════════════════════════════════════════════
   CheckoutSection — ClearTask (W3-12 Component Decomposition)
   Payment method selector, quick cash buttons, change display & checkout CTA
   ═══════════════════════════════════════════════════════════ */

import React, { memo } from 'react';
import FieldGroup from '../ui/FieldGroup';
import Button from '../ui/Button';
import Input from '../ui/Input';
import type { CashDenomination } from '../../utils/inlineSyntaxParser';
import type { AppSettings } from '../../config/settingsConfig';

const METODE_OPTIONS = ['Tunai', 'QRIS', 'Kartu Debit', 'Transfer'];

export interface CheckoutSectionProps {
  subTotal: number;
  grandTotal: number;
  plasticBagEnabled: boolean;
  setPlasticBagEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  plasticBagPrice: number;
  plasticBagCharge: number;
  metode: string;
  setMetode: (metode: string) => void;
  uangDiterima: string;
  setUangDiterima: (val: string) => void;
  kembalian: number;
  received: number;
  cashBreakdown: CashDenomination[];
  catatan: string;
  setCatatan: (val: string) => void;
  formError: string;
  cartLength: number;
  onCheckout: () => void;
  settings?: AppSettings;
}

export default memo(function CheckoutSection({
  subTotal,
  grandTotal,
  plasticBagEnabled,
  setPlasticBagEnabled,
  plasticBagPrice,
  plasticBagCharge,
  metode,
  setMetode,
  uangDiterima,
  setUangDiterima,
  kembalian,
  received,
  cashBreakdown,
  catatan,
  setCatatan,
  formError,
  cartLength,
  onCheckout,
  settings,
}: CheckoutSectionProps) {
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-bg-surface/50 rounded-b-2xl">
      {/* Sub Total row */}
      <div className="flex justify-between items-end pb-2 border-b border-border-subtle">
        <span className="text-sm font-semibold text-text-muted">Sub Total</span>
        <span className="text-base font-bold text-text-primary">
          Rp {subTotal.toLocaleString('id-ID')}
        </span>
      </div>

      {/* Plastik bag toggle */}
      {settings?.plasticBagEnabled !== false && (
        <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-bg-elevated/60 border border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="text-sm">🛍️</span>
            <span className="text-xs font-medium text-text-secondary">Kantong Plastik</span>
            <span className="text-[10px] text-text-muted">
              +Rp {plasticBagPrice.toLocaleString('id-ID')}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={plasticBagEnabled}
            onClick={() => setPlasticBagEnabled((v) => !v)}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none ${plasticBagEnabled ? 'bg-primary' : 'bg-white/10'}`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform ${plasticBagEnabled ? 'translate-x-4' : 'translate-x-0'}`}
            />
          </button>
        </div>
      )}

      {/* Grand Total */}
      <div className="flex justify-between items-end mb-2 pb-3 border-b border-border-subtle">
        <span className="text-sm font-semibold text-text-muted">
          {plasticBagCharge > 0 ? 'Total (+ Plastik)' : 'Total'}
        </span>
        <span className="text-xl font-black text-primary">
          Rp {grandTotal.toLocaleString('id-ID')}
        </span>
      </div>

      <div className="space-y-3">
        <div className="mb-0">
          <FieldGroup label="Metode Pembayaran">
            <select
              aria-label="Metode Pembayaran"
              value={metode}
              onChange={(e) => setMetode(e.target.value)}
              className="form-input w-full text-sm"
            >
              {METODE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </FieldGroup>
        </div>

        {metode === 'Tunai' && (
          <div className="space-y-3">
            <div className="flex gap-4">
              <div className="flex-1">
                <FieldGroup label="Uang Diterima">
                  <Input
                    type="number"
                    value={uangDiterima}
                    onChange={(e) => setUangDiterima(e.target.value)}
                    placeholder="0"
                  />
                </FieldGroup>
              </div>
              <div className="flex-1">
                <FieldGroup label="Kembalian">
                  <div
                    className={`p-[11px] rounded-xl text-sm font-semibold border flex items-center ${kembalian > 0 ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-bg-elevated border-border-default text-text-secondary'}`}
                  >
                    Rp {kembalian.toLocaleString('id-ID')}
                  </div>
                </FieldGroup>
              </div>
            </div>

            {/* Retail Spec: Hero Change Display */}
            {received > 0 && (
              <div
                className={`p-4 rounded-2xl border text-center transition-all ${
                  received >= grandTotal
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
                  {received >= grandTotal ? 'Uang Kembalian' : 'Uang Kurang'}
                </p>
                <p className="text-3xl sm:text-[40px] font-black leading-tight mt-1">
                  Rp {Math.abs(kembalian).toLocaleString('id-ID')}
                </p>
              </div>
            )}

            {/* Quick Cash Nominal Buttons */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setUangDiterima(grandTotal.toString())}
                className="flex-1 min-w-[60px] py-2 text-[11px] font-bold rounded-lg border border-green-500/30 text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-all cursor-pointer"
              >
                Uang Pas
              </button>
              {[10000, 20000, 50000, 100000].map((nominal) => (
                <button
                  key={nominal}
                  type="button"
                  onClick={() => setUangDiterima(nominal.toString())}
                  className="flex-1 min-w-[50px] py-2 text-[11px] font-semibold rounded-lg border border-border-default text-text-secondary bg-bg-elevated hover:text-primary hover:border-primary/40 hover:bg-primary/10 transition-all cursor-pointer"
                >
                  {nominal >= 1000 ? `${nominal / 1000}k` : nominal}
                </button>
              ))}
            </div>

            {/* Cash Change Breakdown */}
            {cashBreakdown.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-green-500/5 border border-green-500/15 rounded-xl">
                <span className="w-full text-[10px] font-medium text-green-400/70 mb-0.5">
                  💵 Rincian Kembalian:
                </span>
                {cashBreakdown.map((d) => (
                  <span
                    key={d.value}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 text-[11px] font-semibold rounded-md border border-green-500/20"
                  >
                    {d.count}× {d.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <FieldGroup label="Catatan (Opsional)">
          <Input
            type="text"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Misal: Bawa pulang"
          />
        </FieldGroup>
      </div>

      {formError && (
        <p className="text-xs text-red-400 font-medium text-center bg-red-400/10 py-2 rounded-lg">
          {formError}
        </p>
      )}

      <div className="sticky bottom-0 pt-3 pb-20 lg:pb-3 -mx-5 px-5 bg-bg-surface/95 backdrop-blur-sm border-t border-border-subtle mt-2">
        <Button
          onClick={onCheckout}
          variant="primary"
          className="w-full py-4 text-base shadow-glow"
          disabled={cartLength === 0}
        >
          Bayar & Cetak Struk
        </Button>
      </div>
    </div>
  );
});
