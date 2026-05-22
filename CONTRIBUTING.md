# Contributing to ClearTask

Thanks for taking the time to contribute. This document covers everything you need to get started.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Commit Convention](#commit-convention)
- [Testing](#testing)
- [Code Style](#code-style)
- [Pull Request Guidelines](#pull-request-guidelines)

---

## Prerequisites

| Tool    | Version | Notes                                                                            |
| ------- | ------- | -------------------------------------------------------------------------------- |
| Node.js | ≥ 20    | Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) |
| npm     | ≥ 10    | Comes with Node.js                                                               |
| Git     | any     |                                                                                  |

---

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/ClearTask.git
cd ClearTask

# 2. Install dependencies
npm install

# 3. Copy env file (no values required for local dev)
cp .env.example .env

# 4. Start the dev server
npm run dev
# → http://localhost:5173
```

---

## Project Structure

```
src/
├── components/         # React UI components (Atomic Design)
│   └── ui/             # Base atoms: Button, Input, Card, Modal, Badge, Typography
├── contexts/           # React contexts (SecurityContext, SettingsContext)
├── hooks/              # Custom hooks
│   ├── useTransactions.js      # Composes the three sub-hooks below
│   ├── useTransactionData.js   # CRUD + encryption
│   ├── useTransactionFilter.js # Search, sort, date filter
│   └── useTransactionMetrics.js# Daily analytics
├── services/           # External integrations (db.js = Dexie/IndexedDB)
├── utils/              # Pure utility functions (formatters, crypto, export)
└── test-setup.js       # Vitest global setup

docs/audit/             # 12-phase audit reports + fix plan
public/                 # Static assets, manifest.json, sw.js
```

---

## Development Workflow

```bash
npm run dev          # Start Vite dev server (hot reload)
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm run lint         # ESLint check
npm run format       # Prettier format (writes files)
npm run format:check # Prettier check (CI mode)
```

---

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by Commitlint + Husky.

```
<type>(<scope>): <short description>

Types: feat | fix | docs | style | refactor | test | chore | perf | ci
```

Examples:

```
feat(hooks): add useTransactionMetrics for daily analytics
fix(a11y): increase touch target size on category delete buttons
docs(contributing): add project structure section
test(formatters): add PBT for formatQuantity edge cases
```

The pre-commit hook runs `eslint --fix` + `prettier --write` on staged files automatically.

---

## Testing

```bash
npm run test:run       # Run all unit tests once (CI mode)
npm run test           # Run in watch mode (dev)
npm run test:coverage  # Generate coverage report → coverage/
npm run test:e2e       # Run Playwright E2E tests (requires dev server)
```

### Writing Tests

- Unit tests live next to their source file or in `src/__tests__/`
- Use `@testing-library/react` for component tests
- Use `fast-check` for property-based tests (PBT) on pure utility functions
- IndexedDB is mocked via `fake-indexeddb` — no real browser needed

### Coverage Targets

| Metric     | Target |
| ---------- | ------ |
| Statements | ≥ 80%  |
| Branches   | ≥ 75%  |
| Functions  | ≥ 80%  |
| Lines      | ≥ 80%  |

---

## Code Style

- **ESLint** + **Prettier** are enforced on commit via lint-staged
- Run `npm run lint` and `npm run format` before pushing if you skip the hook
- Tailwind CSS v4 — use design tokens from `src/index.css` (`--color-*`, `--radius-*`)
- No inline styles except in `AppBootstrap.jsx` (pre-Tailwind loading screen)
- All SVGs that are purely decorative must have `aria-hidden="true"`
- Interactive elements (buttons, links) must have a minimum touch target of **44×44 px**

---

## Pull Request Guidelines

1. Branch off `main`: `git checkout -b feat/your-feature`
2. Keep PRs focused — one feature or fix per PR
3. All tests must pass: `npm run test:run`
4. No lint errors: `npm run lint`
5. Update relevant docs if you change public APIs or add new env vars
6. Fill in the PR template (`.github/PULL_REQUEST_TEMPLATE.md`)

---

## Reporting Bugs

Open a GitHub Issue using the **Bug Report** template. Include:

- Steps to reproduce
- Expected vs actual behaviour
- Browser + OS version
- Console errors (if any)

---

## Security Issues

Do **not** open a public issue for security vulnerabilities. See `SECURITY.md` (if present) or email the maintainer directly.
