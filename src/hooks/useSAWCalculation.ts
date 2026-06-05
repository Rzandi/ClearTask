import { useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../services/db';
import SAWWorker from '../workers/sawWorker?worker';

export interface SAWCriterias {
  c1_weight: number;
  c2_weight: number;
  c3_weight: number;
  c4_weight: number;
}

export interface SAWResultItem {
  rank: number;
  product_name: string;
  score: number;
  urgency_level: 'urgent' | 'perhatian' | 'aman';
  stock_status: string;
  current_stock: number;
  raw_values: {
    c1_volume: number;
    c2_stock: number;
    c3_margin_pct: number;
    c4_frequency: number;
  };
  normalized_values: {
    c1: number;
    c2: number;
    c3: number;
    c4: number;
  };
  weighted_values: {
    c1: number;
    c2: number;
    c3: number;
    c4: number;
  };
}

export interface ExcludedItem {
  product_name: string;
  reason: string;
  transaction_count: number;
}

export function useSAWCalculation() {
  const [period, setPeriod] = useState<string>('last_30_days');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Fetch criteria weights
  const criterias = useLiveQuery(async () => {
    const records = await db.saw_criterias.toArray();
    if (records.length > 0) return records[0] as SAWCriterias;
    return { c1_weight: 0.35, c2_weight: 0.3, c3_weight: 0.2, c4_weight: 0.15 };
  });

  const [results, setResults] = useState<SAWResultItem[]>([]);
  const [excluded, setExcluded] = useState<ExcludedItem[]>([]);

  const calculateSAW = useCallback(async () => {
    setIsCalculating(true);
    try {
      // Determine date range based on period
      let startStr = '';
      let endStr = new Date().toISOString();
      const now = new Date();

      if (period === 'last_7_days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        startStr = d.toISOString();
      } else if (period === 'last_30_days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        startStr = d.toISOString();
      } else if (period === 'last_90_days') {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        startStr = d.toISOString();
      } else if (period === 'this_year') {
        startStr = new Date(now.getFullYear(), 0, 1).toISOString();
      } else if (period === 'custom' && dateRange) {
        startStr = dateRange.start;
        endStr = dateRange.end;
      } else {
        // default 30 days
        const d = new Date();
        d.setDate(d.getDate() - 30);
        startStr = d.toISOString();
      }

      // 1. Fetch transactions within date range
      const txs = await db.transactions
        .where('tanggal')
        .between(startStr.split('T')[0], endStr.split('T')[0] + '\uffff') // simple date match
        .toArray();

      // If no valid filter applied because tanggal is YYYY-MM-DD
      const startDate = startStr.split('T')[0] ?? '';
      const endDate = endStr.split('T')[0] ?? '';
      const txsToProcess =
        txs.length > 0
          ? txs
          : (await db.transactions.toArray()).filter((tx) => {
              const txDate = tx.tanggal || (tx.createdAt ? tx.createdAt.split('T')[0] : '');
              return txDate >= startDate && txDate <= endDate;
            });

      // 2. Fetch all inventory
      const inv = await db.inventory.toArray();

      const weights = criterias || {
        c1_weight: 0.35,
        c2_weight: 0.3,
        c3_weight: 0.2,
        c4_weight: 0.15,
      };

      // Initialize Web Worker
      const worker = new SAWWorker();

      worker.onmessage = (e: MessageEvent) => {
        if (e.data.error) {
          console.error('SAW Worker Error:', e.data.error);
        } else {
          setResults(e.data.results || []);
          setExcluded(e.data.excluded || []);
        }
        setIsCalculating(false);
        worker.terminate();
      };

      worker.onerror = (err) => {
        console.error('SAW Worker Initialization Error:', err);
        setIsCalculating(false);
        worker.terminate();
      };

      // Send data to worker
      worker.postMessage({ txsToProcess, inv, weights });
    } catch (error) {
      console.error('SAW Calculation Error:', error);
      setIsCalculating(false);
    }
  }, [period, dateRange, criterias]);

  const updateWeights = async (newWeights: SAWCriterias) => {
    const records = await db.saw_criterias.toArray();
    if (records.length > 0) {
      await db.saw_criterias.update(records[0].id, {
        ...newWeights,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await db.saw_criterias.add({ ...newWeights, updatedAt: new Date().toISOString() });
    }
  };

  const saveHistory = async () => {
    if (results.length === 0) return;
    await db.saw_history.add({
      period,
      createdAt: new Date().toISOString(),
      weights: criterias,
      results_snapshot: results.slice(0, 10), // top 10
      urgent_count: results.filter((r) => r.urgency_level === 'urgent').length,
    });
  };

  const historyQuery = useLiveQuery(() =>
    db.saw_history.orderBy('createdAt').reverse().limit(20).toArray()
  );

  // Run initial calculation when ready
  useEffect(() => {
    if (criterias) {
      calculateSAW();
    }
  }, [period, dateRange]); // deliberately excluding criterias from dependency array so it doesn't auto calc on weight change unless save & hitung

  return {
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
    history: historyQuery || [],
  };
}
