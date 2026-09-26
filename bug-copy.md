Nice, peran itu emang pas banget buat ngungkap masalah yang gak keliatan dari sisi developer doang. Dari sudut pandang **Admin** & **CS**, ini beberapa hal yang worth dicek:

**Dari sisi Admin (yang ngelola data & laporan):**

- **Audit trail siapa ngedit apa** — modal edit transaksi nyimpen `updatedBy`, tapi coba cek: apakah ada tampilan histori perubahan (misal "harga diubah dari Rp15.000 → Rp20.000 oleh Kasir A, 25/09")? Kalau nggak ada, admin gak bisa investigasi kalau ada kecurangan/selisih laporan.
- **Rekonsiliasi tutup sesi** — pas "Tutup Session", apakah ada validasi kalau uang fisik di laci beda sama sistem? Ini penting banget buat admin cross-check harian.
- **Export laporan per-periode** — sekarang bisa filter per tanggal, tapi gimana kalau admin butuh laporan per rentang tanggal (misal 1 bulan) buat rekap bulanan? Perlu dicek apakah filter-nya cuma per-hari atau bisa custom range.
- **Multi-device/multi-kasir** — karena ini local-first (IndexedDB, gak ada server), berarti laporan di HP kasir A gak nyambung ke HP kasir B kan? Ini layak jadi catatan penting buat admin kalau tokonya pakai lebih dari 1 device kasir.

**Dari sisi CS/Kasir (yang pakai harian):**

- **Undo checkout** — kalau salah pencet "Bayar & Cetak Struk" (misal salah qty), apa ada cara cepat buat batalin transaksi tanpa harus muter ke menu Laporan dulu?
- **Cari barang pas rame** — pas antrian panjang, search di Katalog Barang responsif nggak buat nama yang typo dikit (misal "indomi" nemu "Indomie")?
- **Notifikasi stok mepet real-time** — pas kasir lagi transaksi terus stok barang itu abis duluan (dipakai kasir lain kalau ada), apa dia dapet warning, atau baru ketahuan pas laporan udah minus?
- **Kecepatan re-print struk** — kalau pembeli minta struk dicetak ulang (item 20 menit lalu), gampang dicari nggak dari riwayat sesi tanpa scroll manual?

Nih, gua nemu 2 edge case lagi yang lumayan serius bro:

🐛 Edge case #1 — "Tunda Order" ilang total kalau refresh/reload

pendingOrders (isi dari fitur Tunda Order) itu cuma disimpen di React state biasa (useState), BUKAN di localStorage atau IndexedDB — beda sama keranjang aktif yang emang udah di-backup ke localStorage (cleartask_draft_cart). Artinya kalau kasir nunda 3 transaksi terus HP-nya reload (baterai abis, browser di-kill karena low memory, gesture back di Android PWA, atau device di-restart), semua transaksi yang ditunda ilang tanpa jejak, tanpa warning apapun. Padahal justru fitur ini yang paling butuh persistence karena tujuannya "aman disimpan buat dilanjut nanti".

🐛 Edge case #2 — Checkout di 1 tab bisa ngosongin keranjang tab lain secara diam-diam

Ada fitur multi-tab sync (resiliencyGuards.ts), tapi cuma jalan buat 1 skenario: begitu ada checkout SUKSES di satu tab, dia broadcast CART_UPDATED isinya array kosong [] ke SEMUA tab lain yang lagi kebuka, dan tab lain langsung setCart([]) — timpa keranjangnya tanpa konfirmasi. Kalau toko lu pakai 2 device kasir (misal HP + tablet cadangan) dibuka bersamaan, begitu kasir A checkout, keranjang yang lagi diisi kasir B di device lain ke-reset paksa, walau isinya beda transaksi sama sekali. Selain itu, tipe pesan TRANSACTION_ADDED & SESSION_CHANGED udah didefinisiin di kode tapi gak pernah dipakai — jadi sinkronisasi laporan/sesi antar tab sebenernya belum jalan, cuma "ngosongin cart" doang yang aktif.

Nemu 1 lagi yang bakal ngefek langsung ke real-world print quality, bro — di bluetoothPrinterHelper.ts:

🐛 Edge case — Teks di struk bisa jadi karakter aneh/kotak-kotak di printer thermal

Fungsi generateEscPosBytes pakai new TextEncoder() buat ngubah teks jadi bytes — default-nya itu UTF-8. Masalahnya, hampir semua printer thermal 58mm Bluetooth (ESC/POS) itu cuma ngerti single-byte code page (kayak CP437/CP1252), bukan UTF-8. Jadi kalau ada karakter di luar huruf/angka biasa — misal nama barang atau footer struk (settings?.strukFooter, catatan) yang di-copy-paste dari WhatsApp dan kebawa smart-quote (’ “), tanda petik miring, atau huruf beraksen — bakal ke-print jadi karakter aneh/kotak-kotak di kertas struk, karena printer-nya baca bytes UTF-8 itu sebagai 2 karakter random dari code page-nya sendiri. Ini common banget kejadian di sistem kasir yang pake printer thermal murah.

Fix konsepnya: encode teks pake code page yang printer-nya dukung (biasanya CP437, atau kirim command ESC t n buat pilih code page dulu), bukan langsung TextEncoder() default.

💡 QOL kecil terkait: pas nyari printer, requestDevice dipanggil dengan acceptAllDevices: true — ini bikin dialog pairing nampilin SEMUA device Bluetooth di sekitar (HP orang, earbuds, dll), bukan cuma printer. Di lingkungan toko yang rame device Bluetooth, kasir bisa bingung mana yang printer-nya. Bisa dipersempit pakai filters (misal filter nama device yang common buat printer thermal) biar lebih gampang milihnya.

Lanjut ke bagian import/export database — kebanyakan implementasinya udah rapi banget (ada TOCTOU guard, id-stripping buat avoid collision pas bulkAdd, warning orphan transaction di preview modal), tapi gua nemu 1 celah nyata:

🐛 Edge case — Merge database dari 2 device bakal bikin produk ganda di inventory

Di calculateMerge (databaseManager.ts), dedup buat inventory cuma ngecek berdasarkan item.id (UUID), bukan nama barang:

js
const inventoryToAdd = importInventory.filter((item) => {
if (!item.id) return false;
if (seenInventoryIds.has(item.id)) return false; // dedup by UUID doang
...
});

Masalahnya, fitur "Auto-Detect New Product" (yang jalan otomatis pas checkout barang yang belum terdaftar) itu bikin crypto.randomUUID() baru tiap kali. Jadi kalau toko lu pakai 2 device kasir terpisah (HP utama + tablet cadangan, dua-duanya jalan offline sendiri-sendiri), dan kedua device sama-sama pernah auto-detect produk yang sama (misal "Indomie Goreng" ke-input manual di device A, dan juga ke-input manual di device B) — pas databasenya di-merge/gabung, dua-duanya punya id UUID yang beda walau nama produknya identik. Hasilnya: 2 entri "Indomie Goreng" muncul di inventory dengan stok kepisah sendiri-sendiri, bukan ke-merge jadi satu. Padahal fitur Merge ini justru dibuat buat skenario multi-device kayak gini.

Ini nyambung juga ke temuan gua sebelumnya soal matching nama produk yang sensitif ke spasi/typo — root cause-nya sama: sistem gak punya "canonical product identity" berbasis nama, semua identitas produk nempel di UUID lokal per-device.
