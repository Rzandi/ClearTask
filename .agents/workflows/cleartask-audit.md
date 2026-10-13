---
description: audit read-only ClearTask: bug P0, validasi input, integritas data, risiko kehilangan data
---

Aturan: read-only. Jangan edit file. Hanya laporkan yang bisa dibuktikan dari kode.

1. Petakan alur kritis: transaksi/kasir, stok, penyimpanan data, sync/offline.
2. Cek tiap alur: validasi input, kalkulasi dan pembulatan total, stok negatif, transaksi dobel, error yang ditelan diam-diam, migrasi data.
3. Tiap temuan wajib punya: file:baris, skenario yang memicu, dampak, tingkat (P0/P1/P2).
4. Buang temuan yang cuma dugaan. Tandai "belum terbukti" kalau ragu.
5. Tulis laporan ke docs/audit-<tanggal>.md, urut dari P0.
