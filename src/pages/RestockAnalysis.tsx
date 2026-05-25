import React from 'react';
import { useSAWCalculation } from '../hooks/useSAWCalculation';
import { WeightControl } from '../components/spk/WeightControl';
import { PriorityChart } from '../components/spk/PriorityChart';
import { RankingTable } from '../components/spk/RankingTable';
import { HistoryTable } from '../components/spk/HistoryTable';
import { formatDate } from '../utils/formatters';

export default function RestockAnalysis() {
  const {
    criterias,
    updateWeights,
    period,
    setPeriod,
    dateRange,
    setDateRange,
    isCalculating,
    calculateSAW,
    results,
    excluded,
    saveHistory,
    history
  } = useSAWCalculation();

  const urgentCount = results.filter(r => r.urgency_level === 'urgent').length;

  const handleSaveAndCalculate = async (newWeights: any) => {
    await updateWeights(newWeights);
    await calculateSAW();
    await saveHistory();
  };

  const periodLabelMap: Record<string, string> = {
    last_7_days: '7 Hari Terakhir',
    last_30_days: '30 Hari Terakhir',
    last_90_days: '90 Hari Terakhir',
    this_year: 'Tahun Ini',
    custom: 'Kustom'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            Rekomendasi Prioritas Restock
            {urgentCount > 0 && (
              <span className="animate-pulse bg-error/20 text-error text-xs px-2 py-1 rounded-full font-bold border border-error/30 shadow-[0_0_10px_rgba(255,51,102,0.4)]">
                {urgentCount} URGENT
              </span>
            )}
          </h1>
          <p className="text-text-muted mt-1">Metode Simple Additive Weighting (SAW) - Offline Native</p>
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs text-text-muted mb-1">Dihitung pada: {formatDate(new Date())}</span>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-text-secondary">Periode:</label>
              <select 
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="form-input py-1.5 pl-3 pr-8 text-sm bg-bg-input text-text-primary w-auto cursor-pointer"
              >
                <option value="last_7_days">7 Hari Terakhir</option>
                <option value="last_30_days">30 Hari Terakhir (Default)</option>
                <option value="last_90_days">90 Hari Terakhir</option>
                <option value="this_year">Tahun Ini</option>
                <option value="custom">Kustom</option>
              </select>
            </div>
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <input 
                type="date" 
                className="form-input py-1.5 px-3 text-sm w-auto"
                value={dateRange?.start || ''}
                onChange={(e) => setDateRange(prev => ({ start: e.target.value, end: prev?.end || (new Date().toISOString().split('T')[0] || '') }))}
              />
              <span className="text-text-muted">-</span>
              <input 
                type="date" 
                className="form-input py-1.5 px-3 text-sm w-auto"
                value={dateRange?.end || ''}
                onChange={(e) => setDateRange(prev => ({ start: prev?.start || '', end: e.target.value }))}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {criterias ? (
        <WeightControl 
          initialWeights={criterias} 
          onSave={handleSaveAndCalculate} 
          isCalculating={isCalculating} 
        />
      ) : (
        <div className="animate-pulse bg-bg-surface h-48 rounded-xl border border-border-default mb-6 shadow-card"></div>
      )}

      {isCalculating ? (
        <div className="flex flex-col items-center justify-center h-64 glass-card mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4 shadow-glow"></div>
          <p className="text-text-primary font-medium">Sedang memproses algoritma SAW...</p>
        </div>
      ) : (
        <>
          <PriorityChart data={results} />
          
          <RankingTable 
            results={results} 
            excluded={excluded} 
            criterias={criterias || { c1_weight: 0, c2_weight: 0, c3_weight: 0, c4_weight: 0 }}
            periodLabel={periodLabelMap[period] || period}
          />
          
          <HistoryTable history={history} />
        </>
      )}
    </div>
  );
};
