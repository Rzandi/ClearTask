---
description: Review diff ClearTask sebelum commit/merge: regresi, perubahan tak perlu, error handling, kompatibilitas
---

Aturan: baca diff saja, jangan jalankan test (itu /cleartask-test) dan jangan edit.

1. Ambil git diff (staged, atau terhadap branch utama kalau mau merge).
2. Cari: regresi, perubahan di luar tujuan commit, error handling lemah, risiko kompatibilitas data/versi lama.
3. Laporkan per file dengan severity: blocker, saran, nit.
4. Akhiri dengan verdict: aman di-commit / perlu diperbaiki dulu.
