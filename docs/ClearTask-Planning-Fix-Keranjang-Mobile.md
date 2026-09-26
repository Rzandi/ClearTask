# Planning: Perbaikan Layout Keranjang Mobile — ClearTask

**File terkait:** `src/components/InputPenjualan.tsx`
**Status:** Draft planning, belum diimplementasi
**Tanggal:** 26 September 2026

---

## 1. Masalah

Di tampilan mobile, panel Keranjang saat ini punya **satu wadah scroll tunggal** yang menggabungkan:

1. List barang di keranjang
2. Ringkasan (Sub Total, toggle Kantong Plastik, Total)
3. Form pembayaran (Metode, Uang Diterima, Kembalian, Catatan)
4. Tombol "Bayar & Cetak Struk"

**Dampak:**

- Kalau barang di keranjang banyak (5–10+ item), area buat lihat list-nya ikut kepepet karena harus berbagi ruang scroll dengan seluruh form pembayaran di bawahnya.
- Kasir harus scroll jauh untuk sampai ke tombol Bayar, dan saat itu terjadi, barang-barang di bagian atas list jadi tidak terlihat lagi — sulit mengecek ulang isi keranjang sebelum bayar.
- Di beberapa kondisi (form pembayaran panjang + banyak item), tombol "Bayar & Cetak Struk" juga sempat ketutupan bottom navigation bar karena wadah scroll ini tidak punya padding-bottom yang cukup untuk mengakomodasi tinggi bottom nav.

**Lokasi kode (kondisi sekarang):**

```
<div className="flex-1 overflow-y-auto p-5 space-y-3">
  {cart.map(...)}         <-- list barang
  Sub Total
  Kantong Plastik toggle
  Total
  Metode Pembayaran
  Uang Diterima / Kembalian
  Catatan
  Tombol Bayar & Cetak Struk
</div>
```

Semua elemen di atas ada di dalam **satu** `<div overflow-y-auto>` yang sama.

---

## 2. Root Cause

Layout-nya flat (satu scroll besar), bukan dipisah per fungsi. Ini bekerja cukup baik saat keranjang isinya sedikit (1–2 barang) karena semua muat tanpa scroll signifikan — tapi begitu jumlah barang bertambah, seluruh sisa konten (ringkasan + form bayar + tombol) ikut terdorong makin jauh ke bawah, dan area list barang tidak diberi batas tinggi sendiri.

---

## 3. Rencana Solusi

Pisahkan panel Keranjang jadi **2 wadah scroll independen**, disusun vertikal dalam satu flex column:

```
┌─────────────────────────────┐
│ Tab: Keranjang (n) / Cek Stok│
├─────────────────────────────┤
│ ⏸ Tunda Order (statis)       │
├─────────────────────────────┤
│  KOTAK A — List Barang       │
│  • tinggi terbatas           │
│    (± 30–35% tinggi layar,   │
│    atau max-h tetap)         │
│  • scroll sendiri di          │
│    dalam kotak ini           │
│  • mini info tetap terlihat: │
│    "n item · Rp xxx"         │
├─────────────────────────────┤
│  KOTAK B — Ringkasan & Bayar │
│  • Sub Total                 │
│  • Kantong Plastik           │
│  • Total                     │
│  • Metode Pembayaran         │
│  • Uang Diterima/Kembalian   │
│  • Catatan                   │
│  • scroll sendiri kalau       │
│    kepanjangan               │
├─────────────────────────────┤
│  Tombol Bayar & Cetak Struk  │
│  (selalu terlihat/reachable, │
│  padding-bottom cukup untuk  │
│  clearance bottom nav)       │
└─────────────────────────────┘
```

**Prinsip utama:**

- List barang punya area sendiri dengan tinggi dibatasi → tetap scrollable secara internal kalau item-nya banyak, tapi tidak "memakan" ruang form pembayaran.
- Form pembayaran & tombol Bayar tidak lagi tergeser jauh ke bawah gara-gara panjangnya list barang.
- Tombol Bayar diberi padding-bottom yang cukup (menyamai tinggi bottom nav + sedikit spacing) supaya tidak ketutupan di semua ukuran layar mobile.

---

## 4. Langkah Implementasi (usulan urutan)

1. **Pisah struktur JSX** panel Keranjang di `InputPenjualan.tsx` jadi 2 blok `<div>` terpisah (List Barang & Ringkasan+Bayar), masing-masing dengan `overflow-y-auto` sendiri.
2. **Set tinggi List Barang**, misal `max-h-[32vh]` atau `flex-[0_0_auto] max-h-72` (disesuaikan lagi setelah dicoba di device asli) — tujuannya list tidak "menggelembung" makan seluruh ruang layar saat item banyak.
3. **Tambah mini-summary** di header Kotak A (jumlah item + subtotal) supaya tetap ada konteks walau list-nya di-scroll.
4. **Perbaiki padding-bottom** tombol Bayar (mis. `pb-24 lg:pb-3`) untuk clearance dari bottom nav (`z-50`, tinggi ~64px).
5. **Cek behavior di breakpoint desktop (`lg:`)** — pastikan perubahan ini tidak merusak layout desktop yang sekarang sudah oke (desktop pakai `lg:relative lg:w-[420px]` dst, kemungkinan besar tetap aman karena perubahan difokuskan ke struktur mobile).
6. **Testing manual** dengan skenario:
   - Keranjang isi 1 barang (kondisi normal, pastikan tidak ada regresi)
   - Keranjang isi 10+ barang beda-beda (kondisi utama yang mau diperbaiki)
   - Metode pembayaran Tunai vs QRIS (pastikan form panjang tetap reachable)
   - Berbagai tinggi layar HP (terutama yang battery/status bar-nya besar seperti di screenshot referensi)

---

## 5. Yang Perlu Didiskusikan / Diputuskan

- Tinggi pasti untuk Kotak A (List Barang) — fixed px vs `vh` vs `flex-basis` proporsional. Perlu dicoba langsung di device untuk dapat angka yang pas.
- Apakah mini-summary di Kotak A perlu sticky di dalam kotaknya sendiri, atau cukup di header kotak (tidak ikut scroll).
- Apakah perubahan ini digabung sekalian dengan fix padding-bottom tombol Bayar (bug ketutupan bottom nav), atau dipisah jadi 2 PR/commit berbeda.

---

_Dokumen ini untuk didiskusikan dulu sebelum masuk ke tahap coding._
