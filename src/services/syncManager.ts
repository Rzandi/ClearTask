/* ═══════════════════════════════════════════════════════════
   SyncManager (Blueprint) — ClearTask v3.0.0
   Modul dasar untuk menangani Cloud Sync & Conflict Resolution.
   ═══════════════════════════════════════════════════════════ */

import * as db from './databaseManager';

export interface SyncPayload {
  collection: string;
  id: string | number;
  data: any;
  operation: 'insert' | 'update' | 'delete';
  timestamp: string;
}

/**
 * SyncManager
 * Mengatur antrean sinkronisasi, deteksi offline/online, dan resolusi konflik (LWW).
 */
class SyncManager {
  public isOnline: boolean;
  public syncQueue: SyncPayload[];

  constructor() {
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    
    // Listeners for network status
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  public handleOnline(): void {
    this.isOnline = true;
    console.log('[SyncManager] Network is Online. Processing queue...');
    this.processQueue();
  }

  public handleOffline(): void {
    this.isOnline = false;
    console.log('[SyncManager] Network is Offline. Operations will be queued.');
  }

  /**
   * Mendaftarkan perubahan (mutasi) lokal ke dalam antrean sinkronisasi.
   * @param {'transaction' | 'inventory'} collection - Nama tabel.
   * @param {string} id - ID dokumen.
   * @param {object} data - Payload data.
   * @param {'insert' | 'update' | 'delete'} operation - Tipe operasi.
   */
  public async registerLocalMutation(
    collection: string,
    id: string | number,
    data: any,
    operation: 'insert' | 'update' | 'delete'
  ): Promise<void> {
    const payload: SyncPayload = {
      collection,
      id,
      data,
      operation,
      timestamp: new Date().toISOString(),
    };

    if (this.isOnline) {
      await this.pushToCloud(payload);
    } else {
      this.syncQueue.push(payload);
      // TODO: Simpan syncQueue ke IndexedDB (tabel `sync_queue`) agar persisten walau di-refresh
    }
  }

  /**
   * Menjalankan antrean sinkronisasi saat koneksi pulih.
   */
  public async processQueue(): Promise<void> {
    if (this.syncQueue.length === 0) return;

    // Duplikasi antrean untuk diproses dan kosongkan memori lokal
    const queueToProcess = [...this.syncQueue];
    this.syncQueue = [];

    for (const job of queueToProcess) {
      try {
        await this.pushToCloud(job);
      } catch (error) {
        console.error('[SyncManager] Failed to process job in queue', job, error);
        // Masukkan kembali ke antrean jika gagal karena network error
        this.syncQueue.push(job);
      }
    }
  }

  /**
   * Mengirim data ke Cloud Provider (Firebase/Supabase).
   * Menerapkan Conflict Resolution: Last-Write-Wins (LWW) berdasarkan `updatedAt`.
   */
  public async pushToCloud(payload: SyncPayload): Promise<void> {
    // ---------------------------------------------------------
    // TODO: Implementasi Adapter Cloud spesifik diletakkan di sini.
    // ---------------------------------------------------------
    // Contoh Logika LWW (Last-Write-Wins):
    // 1. Fetch dokumen remote berdasarkan `payload.id`.
    // 2. Jika dokumen remote ada:
    //    - Bandingkan `remote.updatedAt` vs `payload.data.updatedAt`.
    //    - Jika `remote.updatedAt` > `payload.data.updatedAt`, abaikan payload (Cloud lebih baru).
    //    - Jika sebaliknya, timpa data Cloud dengan payload lokal.
    // 3. Jika dokumen remote tidak ada:
    //    - Buat dokumen baru di Cloud.
    
    console.log('[SyncManager] Simulating push to cloud...', payload);
    return Promise.resolve();
  }
}

export const syncManager = new SyncManager();
export default syncManager;
