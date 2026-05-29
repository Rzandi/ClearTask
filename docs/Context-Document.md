# 📄 CONTEXT DOCUMENT — ClearTask (Draft)

> Project: **ClearTask**  
> Status: **MENUNGGU APPROVAL (URG-0)**  
> Tanggal: **2026-05-30**  
> Framework: **A-ADD v3.0**

---

## 1. Ringkasan Project

**ClearTask** adalah aplikasi manajemen tugas (Task Management) berbasis web yang dirancang untuk bekerja secara mandiri dan cepat menggunakan penyimpanan lokal (**IndexedDB**) yang dibungkus dengan **Dexie.js** sebagai _Source of Truth_ tunggal lokal.

---

## 2. Parameter Arsitektur & Lingkungan

Berdasarkan keputusan desain awal, project dikonfigurasikan dengan parameter berikut:

- **Platform & Core Tech Stack:**
  - **Frontend:** React 19 (dengan JSX & Tailwind CSS v4), Vite 8.
  - **Penyimpanan (Local DB):** Dexie.js (`dexie` & `dexie-react-hooks`) untuk performa tinggi local storage.
  - **Code Quality:** ESLint, Prettier, Husky pre-commit hooks, Commitlint.
- **Architecture Mode:**
  - **[Fully Offline]** — Seluruh logika bisnis dan Service Layer berada secara penuh di dalam aplikasi (embedded). Tidak ada ketergantungan pada backend eksternal (REST/GraphQL API Stack dapat di-skip).
- **Source of Truth (SoT):**
  - **Local DB (IndexedDB via Dexie)** — Skema database lokal adalah sumber kebenaran data tunggal untuk seluruh task, tags, dan settings.
- **Awesome Skills Library Integration:**
  - **Aktif** (`c:\Users\fikza\OneDrive\Documents\bebas kelas\antigravity-awesome-skills`) — Sub-agent wajib merujuk ke playbooks seperti `@test-driven-development`, `@playwright-skill`, dan `@clean-code` selama siklus kerja berjalan.

---

## 3. Strategi Pengujian (Testing)

ClearTask telah dilengkapi dengan struktur pengujian yang tangguh:

- **Unit & Component Testing:** Menggunakan **Vitest** dengan JSDom, `@testing-library/react`, dan `fake-indexeddb` untuk mengisolasi pengujian basis data lokal.
- **E2E Testing:** Menggunakan **Playwright** untuk pengujian alur pengguna dari hulu ke hilir.
- **TDD Enforcement:** Semua fitur baru wajib mengikuti alur sekuensial TDD (RED ➔ GREEN ➔ REFACTOR) dengan membuat tes unit di folder `src/__tests__` terlebih dahulu.

---

## 🔄 URG-0 — Context Review Gate

> ⛔ **STATUS: MENUNGGU APPROVAL**  
> Silakan Orchestrator (lu) mereview draf pemahaman konteks dasar ClearTask ini.
>
> **Ketik salah satu respon berikut di chat:**
>
> - `APPROVED` ➔ Untuk mengunci draf ini dan lanjut ke **Fase 0.2 (Codebase Audit)**.
> - `REVISI: [koreksi]` ➔ Jika ada penyesuaian parameter arsitektur atau tech stack sebelum audit dimulai.
