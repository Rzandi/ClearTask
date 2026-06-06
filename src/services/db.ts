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
  saw_criterias!: Table<any, number>;
  saw_history!: Table<any, number>;
  archive_transactions!: Table<any, number>;
  expenses!: Table<any, string>;

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
            txRecord.updatedAt =
              txRecord.updatedAt || txRecord.createdAt || new Date().toISOString();
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

    this.version(4)
      .stores({
        saw_criterias: '++id', // only need one row, but we use auto-increment
        saw_history: '++id, period, createdAt',
      })
      .upgrade(async (tx: DexieTransaction) => {
        // Initialize default criteria weights
        await tx.table('saw_criterias').add({
          c1_weight: 0.35,
          c2_weight: 0.3,
          c3_weight: 0.2,
          c4_weight: 0.15,
          updatedAt: new Date().toISOString(),
        });
      });

    this.version(5).stores({
      archive_transactions:
        '++id, transactionId, tanggal, sessionId, createdAt, kasir, updatedAt, syncStatus',
    });

    this.version(6)
      .stores({
        expenses: '++id, tanggal, kategori, namaKeluaran, jumlah, createdAt, updatedAt, syncStatus',
      })
      .upgrade(async (tx: DexieTransaction) => {
        await tx
          .table('inventory')
          .toCollection()
          .modify((item: any) => {
            item.hargaModal = item.hargaModal || item.hargaDasar || 0;
          });
      });

    this.version(7)
      .stores({
        expenses: null,
        expensesTemp: '++id, tanggal, kategori, namaKeluaran, jumlah, createdAt, updatedAt, syncStatus',
      })
      .upgrade(async (tx: DexieTransaction) => {
        if (tx.db.objectStoreNames.contains('expenses')) {
          const expenses = await tx.table('expenses').toArray();
          const migrated = expenses.map((record: any) => {
            if (typeof record.id === 'number') {
              record.id =
                typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                  ? crypto.randomUUID()
                  : 'ex-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                      const r = (Math.random() * 16) | 0;
                      const v = c === 'x' ? r : (r & 0x3) | 0x8;
                      return v.toString(16);
                    });
            }
            return record;
          });
          await tx.table('expensesTemp').bulkAdd(migrated);
        }
      });

    this.version(8)
      .stores({
        expenses: '&id, tanggal, kategori, namaKeluaran, jumlah, createdAt, updatedAt, syncStatus',
        expensesTemp: null,
      })
      .upgrade(async (tx: DexieTransaction) => {
        if (tx.db.objectStoreNames.contains('expensesTemp')) {
          const expenses = await tx.table('expensesTemp').toArray();
          const migrated = expenses.map((record: any) => {
            if (typeof record.id === 'number') {
              record.id =
                typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                  ? crypto.randomUUID()
                  : 'ex-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                      const r = (Math.random() * 16) | 0;
                      const v = c === 'x' ? r : (r & 0x3) | 0x8;
                      return v.toString(16);
                    });
            }
            return record;
          });
          await tx.table('expenses').bulkAdd(migrated);
        }
      });
  }
}

const db = new ClearTaskDB();
export default db;
