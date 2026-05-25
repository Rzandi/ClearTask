import React, { useState, useEffect } from 'react';
import type { SAWCriterias } from '../../hooks/useSAWCalculation';

interface WeightControlProps {
  initialWeights: SAWCriterias;
  onSave: (weights: SAWCriterias) => Promise<void>;
  isCalculating: boolean;
}

export const WeightControl: React.FC<WeightControlProps> = ({ initialWeights, onSave, isCalculating }) => {
  const [weights, setWeights] = useState<SAWCriterias>(initialWeights);
  const [total, setTotal] = useState(100);

  useEffect(() => {
    setWeights(initialWeights);
  }, [initialWeights]);

  useEffect(() => {
    const t = Math.round((weights.c1_weight + weights.c2_weight + weights.c3_weight + weights.c4_weight) * 100);
    setTotal(t);
  }, [weights]);

  const handleChange = (key: keyof SAWCriterias, value: number) => {
    setWeights(prev => ({
      ...prev,
      [key]: value / 100
    }));
  };

  const isTotalValid = total === 100;

  return (
    <div className="glass-card p-4 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-border-subtle pb-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Kontrol Bobot Kriteria</h2>
          <p className="text-sm text-text-muted mt-1">Sesuaikan persentase kepentingan setiap kriteria (Total harus 100%).</p>
        </div>
        <div className={`mt-4 sm:mt-0 px-4 py-1.5 rounded-full text-sm font-bold border ${isTotalValid ? 'bg-primary/10 text-primary border-primary/20 shadow-glow' : 'bg-error/10 text-error border-error/20'}`}>
          Total: {total}% {total !== 100 && `(Sisa: ${100 - total}%)`}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* C1 */}
        <div className="bg-bg-input border border-border-default rounded-xl p-4 shadow-inner">
          <div className="flex justify-between items-center mb-3">
            <span className="font-medium text-text-primary text-sm">C1 - Vol Penjualan</span>
            <span className="text-[10px] px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded font-bold">Benefit</span>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="range" min="0" max="100" 
              className="w-full accent-primary h-1.5 bg-bg-elevated rounded-lg appearance-none cursor-pointer" 
              value={Math.round(weights.c1_weight * 100)} 
              onChange={(e) => handleChange('c1_weight', Number(e.target.value))}
            />
            <input 
              type="number" min="0" max="100" 
              className="w-16 form-input py-1 px-2 text-center"
              value={Math.round(weights.c1_weight * 100)}
              onChange={(e) => handleChange('c1_weight', Number(e.target.value))}
            />
          </div>
        </div>

        {/* C2 */}
        <div className="bg-bg-input border border-border-default rounded-xl p-4 shadow-inner">
          <div className="flex justify-between items-center mb-3">
            <span className="font-medium text-text-primary text-sm">C2 - Sisa Stok</span>
            <span className="text-[10px] px-2 py-1 bg-warning/10 text-warning border border-warning/20 rounded font-bold">Cost</span>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="range" min="0" max="100" 
              className="w-full accent-warning h-1.5 bg-bg-elevated rounded-lg appearance-none cursor-pointer" 
              value={Math.round(weights.c2_weight * 100)} 
              onChange={(e) => handleChange('c2_weight', Number(e.target.value))}
            />
            <input 
              type="number" min="0" max="100" 
              className="w-16 form-input py-1 px-2 text-center"
              value={Math.round(weights.c2_weight * 100)}
              onChange={(e) => handleChange('c2_weight', Number(e.target.value))}
            />
          </div>
        </div>

        {/* C3 */}
        <div className="bg-bg-input border border-border-default rounded-xl p-4 shadow-inner">
          <div className="flex justify-between items-center mb-3">
            <span className="font-medium text-text-primary text-sm">C3 - Profit Margin</span>
            <span className="text-[10px] px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded font-bold">Benefit</span>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="range" min="0" max="100" 
              className="w-full accent-primary h-1.5 bg-bg-elevated rounded-lg appearance-none cursor-pointer" 
              value={Math.round(weights.c3_weight * 100)} 
              onChange={(e) => handleChange('c3_weight', Number(e.target.value))}
            />
            <input 
              type="number" min="0" max="100" 
              className="w-16 form-input py-1 px-2 text-center"
              value={Math.round(weights.c3_weight * 100)}
              onChange={(e) => handleChange('c3_weight', Number(e.target.value))}
            />
          </div>
        </div>

        {/* C4 */}
        <div className="bg-bg-input border border-border-default rounded-xl p-4 shadow-inner">
          <div className="flex justify-between items-center mb-3">
            <span className="font-medium text-text-primary text-sm">C4 - Freq Transaksi</span>
            <span className="text-[10px] px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded font-bold">Benefit</span>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="range" min="0" max="100" 
              className="w-full accent-primary h-1.5 bg-bg-elevated rounded-lg appearance-none cursor-pointer" 
              value={Math.round(weights.c4_weight * 100)} 
              onChange={(e) => handleChange('c4_weight', Number(e.target.value))}
            />
            <input 
              type="number" min="0" max="100" 
              className="w-16 form-input py-1 px-2 text-center"
              value={Math.round(weights.c4_weight * 100)}
              onChange={(e) => handleChange('c4_weight', Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => onSave(weights)}
          disabled={!isTotalValid || isCalculating}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200
            ${!isTotalValid || isCalculating ? 'bg-bg-elevated text-text-muted border border-border-default cursor-not-allowed' : 'bg-primary text-text-inverse hover:bg-primary-hover shadow-glow cursor-pointer'}
          `}
        >
          {isCalculating ? 'Menghitung...' : 'Simpan & Hitung'}
        </button>
      </div>
    </div>
  );
};
