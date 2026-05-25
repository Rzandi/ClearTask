import type { SAWResultItem, ExcludedItem, SAWCriterias } from '../hooks/useSAWCalculation';

self.onmessage = (e: MessageEvent) => {
  const { txsToProcess, inv, weights } = e.data as {
    txsToProcess: any[];
    inv: any[];
    weights: SAWCriterias;
  };

  try {
    // 3. Aggregate data per product
    const aggregated: Record<string, { c1_vol: number, c4_freq: number, unique_txs: Set<string> }> = {};
    
    txsToProcess.forEach(tx => {
      if (tx.items && Array.isArray(tx.items)) {
        tx.items.forEach((item: any) => {
          const name = item.namaBarang;
          if (!aggregated[name]) {
            aggregated[name] = { c1_vol: 0, c4_freq: 0, unique_txs: new Set() };
          }
          aggregated[name].c1_vol += Number(item.qty) || 0;
          aggregated[name].unique_txs.add(tx.transactionId || String(tx.id));
        });
      }
    });

    // 4. Match with inventory & Evaluate exclusion rules
    const validProducts: any[] = [];
    const excludedProducts: ExcludedItem[] = [];

    inv.forEach(item => {
      const name = item.nama;
      const stats = aggregated[name];
      
      const c1_vol = stats ? stats.c1_vol : 0;
      const c4_freq = stats ? stats.unique_txs.size : 0;

      if (c1_vol === 0 && c4_freq === 0) {
        excludedProducts.push({ product_name: name, reason: 'Produk Baru', transaction_count: 0 });
        return;
      }

      if (c4_freq < 3) {
        excludedProducts.push({ product_name: name, reason: 'Data Tidak Cukup', transaction_count: c4_freq });
        return;
      }

      const hargaBeli = Number(item.hargaDasar) || 0;
      const hargaJual = Number(item.hargaJual) || 0;

      if (hargaBeli <= 0) {
        excludedProducts.push({ product_name: name, reason: 'Data Tidak Lengkap (Harga Beli 0)', transaction_count: c4_freq });
        return;
      }

      const c2_stock = Number(item.stok) || 0;
      const c3_margin_pct = ((hargaJual - hargaBeli) / hargaBeli) * 100;

      validProducts.push({
        name,
        c1: c1_vol,
        c2: c2_stock,
        c3: c3_margin_pct,
        c4: c4_freq,
      });
    });

    if (validProducts.length === 0) {
      self.postMessage({ results: [], excluded: excludedProducts });
      return;
    }

    // 5. Normalization (Find Max/Min)
    const maxC1 = Math.max(...validProducts.map(p => p.c1));
    const validStocks = validProducts.map(p => p.c2).filter(s => s > 0);
    const minC2 = validStocks.length > 0 ? Math.min(...validStocks) : 0;
    
    const maxC3 = Math.max(...validProducts.map(p => p.c3));
    const maxC4 = Math.max(...validProducts.map(p => p.c4));

    const scoredProducts = validProducts.map(p => {
      // Benefit
      const normC1 = maxC1 > 0 ? p.c1 / maxC1 : 0;
      // Cost (if stock is 0, give max normalized cost value of 1.0)
      const normC2 = p.c2 === 0 ? 1.0 : (minC2 / p.c2);
      // Benefit
      const normC3 = maxC3 > 0 ? p.c3 / maxC3 : 0;
      // Benefit
      const normC4 = maxC4 > 0 ? p.c4 / maxC4 : 0;

      const wC1 = normC1 * weights.c1_weight;
      const wC2 = normC2 * weights.c2_weight;
      const wC3 = normC3 * weights.c3_weight;
      const wC4 = normC4 * weights.c4_weight;

      const score = wC1 + wC2 + wC3 + wC4;

      let urgency_level: 'urgent' | 'perhatian' | 'aman' = 'aman';
      if (score >= 0.80) urgency_level = 'urgent';
      else if (score >= 0.60) urgency_level = 'perhatian';

      return {
        product_name: p.name,
        score,
        urgency_level,
        stock_status: p.c2 <= 5 ? 'Menipis' : 'Aman',
        current_stock: p.c2,
        raw_values: { c1_volume: p.c1, c2_stock: p.c2, c3_margin_pct: p.c3, c4_frequency: p.c4 },
        normalized_values: { c1: normC1, c2: normC2, c3: normC3, c4: normC4 },
        weighted_values: { c1: wC1, c2: wC2, c3: wC3, c4: wC4 },
      } as SAWResultItem;
    });

    // Sort by score DESC
    scoredProducts.sort((a, b) => b.score - a.score);

    // Add rank
    scoredProducts.forEach((p, idx) => { p.rank = idx + 1; });

    self.postMessage({ results: scoredProducts, excluded: excludedProducts });

  } catch (error: any) {
    self.postMessage({ error: error.message || 'Worker Error' });
  }
};
