import React, { useState } from 'react';
import type { SAWResultItem } from '../../hooks/useSAWCalculation';

interface PriorityChartProps {
  data: SAWResultItem[];
}

export const PriorityChart: React.FC<PriorityChartProps> = ({ data }) => {
  const [topN, setTopN] = useState<number>(10);

  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center h-64 mb-6">
        <div className="text-text-muted mb-2 opacity-50">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            ></path>
          </svg>
        </div>
        <p className="text-text-secondary font-medium">
          Belum ada data transaksi untuk periode ini.
        </p>
      </div>
    );
  }

  const chartData = data.slice(0, topN);

  return (
    <div className="glass-card p-4 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-border-subtle pb-4">
        <h2 className="text-lg font-semibold text-text-primary">
          Visualisasi Top {topN} Prioritas
        </h2>
        <div className="mt-4 sm:mt-0 flex bg-bg-input border border-border-subtle p-1 rounded-xl">
          <button
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${topN === 5 ? 'bg-primary text-text-inverse shadow-glow' : 'text-text-secondary hover:text-text-primary'}`}
            onClick={() => setTopN(5)}
          >
            Top 5
          </button>
          <button
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${topN === 10 ? 'bg-primary text-text-inverse shadow-glow' : 'text-text-secondary hover:text-text-primary'}`}
            onClick={() => setTopN(10)}
          >
            Top 10
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {chartData.map((item, index) => {
          // Color logic based on urgency level
          let barColor = 'bg-success';
          if (item.urgency_level === 'urgent')
            barColor = 'bg-error shadow-[0_0_15px_rgba(255,51,102,0.5)]';
          else if (item.urgency_level === 'perhatian')
            barColor = 'bg-warning shadow-[0_0_15px_rgba(240,180,41,0.5)]';

          return (
            <div key={item.product_name} className="flex items-center">
              <div className="w-1/3 pr-4 flex items-center justify-end">
                <span
                  className="text-sm font-medium text-text-primary truncate text-right"
                  title={item.product_name}
                >
                  {item.product_name}
                </span>
                <span className="ml-3 w-6 h-6 rounded-full bg-bg-input border border-border-subtle flex items-center justify-center text-xs font-bold text-text-secondary flex-shrink-0">
                  {index + 1}
                </span>
              </div>
              <div className="w-2/3 flex items-center">
                <div className="w-full bg-bg-input rounded-r-md h-6 overflow-hidden relative border border-border-default shadow-inner">
                  <div
                    className={`h-full ${barColor} transition-all duration-1000 ease-out flex items-center px-2`}
                    style={{ width: `${Math.max(item.score * 100, 2)}%` }} // min 2% so the bar is at least visible
                  ></div>
                </div>
                <span className="ml-3 text-sm font-bold text-text-primary w-12 flex-shrink-0">
                  {item.score.toFixed(4)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-5 border-t border-border-subtle flex flex-wrap gap-4 text-xs">
        <div className="flex items-center bg-bg-input border border-border-subtle px-3 py-1.5 rounded-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-error mr-2 shadow-[0_0_5px_rgba(255,51,102,0.8)]"></div>
          <span className="text-text-secondary font-medium">Urgent (≥ 0.80)</span>
        </div>
        <div className="flex items-center bg-bg-input border border-border-subtle px-3 py-1.5 rounded-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-warning mr-2 shadow-[0_0_5px_rgba(240,180,41,0.8)]"></div>
          <span className="text-text-secondary font-medium">Perhatian (0.60 - 0.79)</span>
        </div>
        <div className="flex items-center bg-bg-input border border-border-subtle px-3 py-1.5 rounded-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-success mr-2 shadow-[0_0_5px_rgba(0,255,136,0.8)]"></div>
          <span className="text-text-secondary font-medium">Aman (&lt; 0.60)</span>
        </div>
      </div>
    </div>
  );
};
