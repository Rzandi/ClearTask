# ⚙️ PROJECT CONFIG — ClearTask

> File ini adalah identitas project. Mention ke AI di awal setiap sesi biar dia langsung paham konteks tanpa perlu cerita ulang.
> Update setiap kali ada perubahan signifikan.

---

## 📋 IDENTITAS PROJECT

```
Nama Project     : ClearTask
Deskripsi Singkat: Task Management web application with local storage (IndexedDB via Dexie)
Versi Saat Ini   : v3.1.0
Status           : [x] Planning  [ ] In Progress  [ ] Done  [ ] On Hold
Jenis            : [ ] Baru  [x] Legacy (Strangler Fig Mode)
```

---

## 👥 TEAM

```
Orchestrator (lu): Fikz (User)
Developer 1      : Scout Agent (Gemini 3.5 Flash - Phase 0 & 1)
Developer 2      : Architect Agent (Claude Opus 4.7 - Phase 2 & 3)
Developer 3      : Designer Agent (Gemini 3.5 Flash - Phase 3d)
Developer 4      : Coder Agent (Gemini 3.5 Flash + Claude Opus 4.7 - Phase 4 & 5)
Developer 5      : QA Agent (Gemini 3.5 Flash - Phase 5-8)
```

---

## 🛠️ TECH STACK

```
Frontend   : React 19, Tailwind CSS v4, Vite 8, eslint, Prettier, Husky
Backend    : Tidak ada (Fully Offline - Service Layer embedded)
Database   : Dexie.js (IndexedDB wrapper) - Local Source of Truth (SoT)
DevOps     : Android-build (optional)
Testing    : Vitest (Unit/Component), Playwright (E2E)
Other      : Pre-commit git hooks, conventional commits
```

---

## 🤖 AGENT & MODEL AKTIF

```
Scout      : Gemini 3.5 Flash (High) | Fallback: Gemini 3.1 Pro
Architect  : Claude Opus 4.7        | Fallback: Claude Sonnet 4.6
Designer   : Gemini 3.5 Flash       | Fallback: Stitch standalone
Coder      : Flash + Opus 4.7       | Fallback: Sonnet 4.6
QA         : Gemini 3.5 Flash       | Fallback: Gemini 3.1 Pro
```

---

## 📍 FASE AKTIF

```
Fase saat ini    : Fase 7 — Documentation & Run Guide
URG terakhir     : URG-7 (Documentation & Run Guide Gate)
Status URG       : [ ] Pending Review
Agent aktif      : QA (Technical Writer Mode)
Sesi terakhir    : 2026-05-30
```

---

## 🔗 LINKS & INTEGRASI

```
GitHub Repo      : [tulis jika ada]
Notion Workspace : [tulis jika ada]
Stitch Canvas    : [tulis jika ada]
Awesome Skills   : c:\Users\fikza\OneDrive\Documents\bebas kelas\antigravity-awesome-skills
```

---

## 📦 DEPENDENCIES ANTAR DOKUMEN

```
PRD.md           → depends on : Context Doc
SRS.md           → depends on : PRD.md
SDD.md           → depends on : SRS.md
UIUX-Flow.md     → depends on : PRD.md, SRS.md
Task-Breakdown.md→ depends on : SDD.md, UIUX-Flow.md
```

---

## 📝 CATATAN ORCHESTRATOR

```
Awesome Skills Library terintegrasi penuh. Sebelum melakukan eksekusi task,
sub-agent wajib memindai skills_index.json di library awesome-skills
untuk menggunakan playbook best-practices yang relevan.
```
