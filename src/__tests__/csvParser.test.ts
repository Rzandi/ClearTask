import { describe, it, expect } from 'vitest';
import { parseCSVLine, parseCSV } from '../utils/csvParser';

describe('csvParser — Unit Tests', () => {
  it('parses standard unquoted CSV line', () => {
    const line = 'SKU-001,Indomie Goreng,Makanan,Snack,3000,3500,50,5,Pcs';
    const parsed = parseCSVLine(line);
    expect(parsed).toEqual([
      'SKU-001',
      'Indomie Goreng',
      'Makanan',
      'Snack',
      '3000',
      '3500',
      '50',
      '5',
      'Pcs',
    ]);
  });

  it('handles quotes with commas inside (Edge Case #9 / W2-11)', () => {
    const line =
      'SKU-002,"Kecap Manis, Bango Refill 500ml",Bumbu,"Bumbu, Saus",12000,15000,20,5,Pcs';
    const parsed = parseCSVLine(line);
    expect(parsed[1]).toBe('Kecap Manis, Bango Refill 500ml');
    expect(parsed[2]).toBe('Bumbu');
    expect(parsed[3]).toBe('Bumbu, Saus');
    expect(parsed.length).toBe(9);
  });

  it('handles escaped quotes within quoted fields', () => {
    const line = 'SKU-003,"Paket ""Hemat"" Lebaran",Makanan,Paket,50000,60000,10,2,Box';
    const parsed = parseCSVLine(line);
    expect(parsed[1]).toBe('Paket "Hemat" Lebaran');
  });

  it('parses multi-line CSV string with headers', () => {
    const csv = `SKU,Nama Barang,Harga
SKU-1,"Item A, Super",10000
SKU-2,Item B,20000`;
    const rows = parseCSV(csv);
    expect(rows.length).toBe(3);
    expect(rows[1][1]).toBe('Item A, Super');
    expect(rows[2][1]).toBe('Item B');
  });
});
