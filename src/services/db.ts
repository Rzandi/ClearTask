/* ═══════════════════════════════════════════════════════════
   Dexie Database — ClearTask
   IndexedDB database definition using Dexie.js
   Replaces localStorage as the primary data store.
   ═══════════════════════════════════════════════════════════ */

import { Dexie, type Table, type Transaction as DexieTransaction } from 'dexie';

export class ClearTaskDB extends Dexie {
  transactions!: Table<any, number>;
  sessions!: Table<any, number>;
  inventory!: Table<any, number>;
  categories!: Table<any, number>;
  settings!: Table<any, number>;
  meta!: Table<any, number>;

  constructor() {
    super('ClearTaskDB');

    this.version(1).stores({
      transactions: '++id, transactionId, tanggal, sessionId, createdAt, namaBarang, kasir',
      sessions: '&id, status, tanggalMulai',
      inventory: '&id, nama, kategori, createdAt',
      categories: '++id, &key',
      settings: '++id, &key',
      meta: '++id, &key',
    });

    this.version(2)
      .stores({
        // Add index for updatedAt and syncStatus for sync querying
        transactions:
          '++id, transactionId, tanggal, sessionId, createdAt, namaBarang, kasir, updatedAt, syncStatus',
        sessions: '&id, status, tanggalMulai, updatedAt, syncStatus',
        inventory: '&id, nama, kategori, createdAt, updatedAt, syncStatus',
        categories: '++id, &key',
        settings: '++id, &key',
        meta: '++id, &key',
      })
      .upgrade(async (tx: DexieTransaction) => {
        // Populate existing data with default values
        await tx
          .table('transactions')
          .toCollection()
          .modify((txRecord: any) => {
            txRecord.updatedAt = txRecord.updatedAt || txRecord.createdAt || new Date().toISOString();
            txRecord.syncStatus = txRecord.syncStatus || 'local';
          });

        await tx
          .table('sessions')
          .toCollection()
          .modify((sessionRecord: any) => {
            sessionRecord.updatedAt =
              sessionRecord.updatedAt ||
              sessionRecord.waktuMulai ||
              sessionRecord.tanggalMulai ||
              new Date().toISOString();
            sessionRecord.syncStatus = sessionRecord.syncStatus || 'local';
          });

        await tx
          .table('inventory')
          .toCollection()
          .modify((itemRecord: any) => {
            itemRecord.updatedAt =
              itemRecord.updatedAt || itemRecord.createdAt || new Date().toISOString();
            itemRecord.syncStatus = itemRecord.syncStatus || 'local';
          });
      });

    this.version(3)
      .stores({
        // namaBarang dihilangkan dari index karena sekarang menjadi bagian dari array items[]
        transactions:
          '++id, transactionId, tanggal, sessionId, createdAt, kasir, updatedAt, syncStatus',
      })
      .upgrade(async (tx: DexieTransaction) => {
        // Migrasi Single Item -> Order Document (Cart Array)
        await tx
          .table('transactions')
          .toCollection()
          .modify((record: any) => {
            if (!record.items) {
              record.items = [
                {
                  namaBarang: record.namaBarang || 'Item Tidak Diketahui',
                  qty: record.qty || 1,
                  hargaSatuan: record.hargaSatuan || record.total || 0,
                  total: record.total || 0,
                  kategori: record.kategori || '',
                  subKategori: record.subKategori || '',
                },
              ];
              record.uangDiterima = record.total || 0;
              record.kembalian = 0;
              // Root `total` tetap dipertahankan sebagai Grand Total struk

              delete record.namaBarang;
              delete record.qty;
              delete record.hargaSatuan;
              delete record.kategori;
              delete record.subKategori;
            }
          });
      });
  }
}

const db = new ClearTaskDB();
export default db;
