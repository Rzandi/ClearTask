# 🎨 Stitch Design Prompts — ClearTask v3.1.0

> **Project:** ClearTask v3.1.0  
> **Status:** Generated Prompts | Pending Approval (URG-3d Part 2)  
> **Date:** 2026-05-30  
> **Language:** English (optimized for Stitch model execution)

This document contains highly optimized, curated Stitch Canvas prompts for generating premium-grade visual layouts for the main screens of ClearTask v3.1.0.

---

## 1. Screen 1: Input Penjualan (Checkout / Cashier Screen)

```text
Design a cashier checkout input sales screen for ClearTask.
Features:
- Active shift session banner indicator with closing shortcuts.
- Real-time autocomplete inventory product scanner search bar.
- Add quantity, customizable discount values, and automatic calculations.
- Responsive cart items checkout grid list.
- Instant change calculating numeric input panel.
Style: Clean slate dark interface, harmonious emerald slate-gray accent tokens, modern typography, glassmorphism card containers, rounded-xl borders, subtle neon alert icons, premium responsive grid layout.
Components: Sticky TopBar banner (Shift ID, kasir name, Close Session button), 2-column cashier workspace, left-hand numeric product form, right-hand scrollable invoice cart list with grand total typography (64px), checkout primary neon green action button.
```

---

## 2. Screen 2: Laporan & Ekspor (Transaction Report & Export Screen)

```text
Design a transactions reports and export panel screen for ClearTask.
Features:
- Filter transactions by localized dates range.
- Search transaction records dynamically.
- Interactive transaction lists with expanding order cart detail rows.
- Dynamic excel and CSV export buttons.
Style: Premium dark mode dashboard look, harmonized ocean-blue slate-gray visual tokens, custom rounded cards, scannable data layouts, high accessibility (WCAG AA contrast compliant).
Components: Dropdown filters panel, DateRange selector input, responsive transactional table lists with action items (edit, delete buttons), Excel/CSV export primary buttons showcasing number of rows to export dynamically.
```

---

## 3. Screen 3: Restock SPK (Replenishment Analysis Decision Support Screen)

```text
Design a replenishment priority restock analysis decision support screen for ClearTask.
Features:
- Multi-criteria prioritization using SAW calculations.
- Configurable weights control inputs panel.
- Urgent replenishment pulse indicator alert.
- Peringkat horizontal priority neon bars charts visualization.
- Scoring ranking table with urgency badges and excluded lists secondary tab.
Style: High-end visual visual, vibrant neon-pink and neon-blue glow colors, futuristic glassmorphic dashboard containers, elegant micro-animations, premium typography (Outfit font).
Components: SPK Header (title, total urgent count pulse indicator badge, dropdown period filter), interactive glassmorphic slider controls card for C1 to C4 weights with real-time percentage indicators and "Save & Calculate" primary glow button, vertically aligned bar chart for Top 10 rankings, scannable priority ranks list table with custom urgency badges (red "Urgent", yellow "Attention", green "Safe").
```

---

## 4. Screen 4: Database Management (Utilities Screen)

```text
Design a database management backup and import utilities screen for ClearTask.
Features:
- Programmatic JSON local database backup export.
- Atomic merge import validator file dropzone.
- Cold archival data partition setup.
Style: Sleek minimalist dark design, secure slate-gray theme, alert amber and warning red accents for destructive actions.
Components: Card for export database backup with "Last Backup Reminders", file dropzone input container for JSON import with clear version requirements indicators, "Wipe All Data" critical warning card with confirmation guards, "Data Archiving Setup" custom interval date selector form.
```

---

## 5. Screen 5: Riwayat Sesi (Shift History Screen)

```text
Design a shift session history reporting list screen for ClearTask.
Features:
- Cashier shift sessions list table.
- Cash summary metrics calculations per session.
- Expandable transactions list under specific session ID.
Style: Clean structured gray interface, secure minimalist layout, highly readable financial typography.
Components: Session list table columns (Session ID, Cashier name, Start timestamp, End timestamp, Status open/closed badge), expandable child rows fetching session transaction logs, session metrics summary panel (total sales volume, grand total earnings).
```
