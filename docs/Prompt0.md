# Prompt0 — Employee Portal

This file captures the original prompts and the decisions made during scaffolding, so the project's intent is recoverable from the repo itself.

## Original prompt

> Create a new project, **Employee Portal**, which will have basic Employee details as **Profile**, **Finance portal** like **Salary slips**, **Asset management**. Use plan mode.

## Follow-up prompts

1. *Save the plan to docs folder. Also save testing steps.*
2. *Use agentic mode and fix any issues found.*
3. *Create Playwright tests and test the full project.*
4. *Write a `Prompt0.md` file.*

## Decisions made during planning (in plan mode)

Pinned down via clarifying questions before any code was written:

| Question | Answer |
| --- | --- |
| Tech stack | React + TypeScript + Vite (frontend) + Node/Express + TypeScript + SQLite via Prisma (backend) — single monorepo, npm workspaces. |
| Authentication | Role-based — `EMPLOYEE` (self-service) and `HR_ADMIN` (manage all employees, upload payslips, manage assets). JWT access token (Bearer) + refresh token (httpOnly cookie); bcrypt password hashes. |
| Scope / polish level | Production-ready — auth, zod request validation, vitest tests (backend + frontend), README, env config. |

## Feature breakdown

Three modules, both self-service (employee view) and admin (HR view):

1. **Profile** — view employee details (name, designation, department, joining date, etc.); employees can edit phone/address.
2. **Finance portal** — list monthly salary slips; download PDF; HR can upload payslip PDFs with gross/deductions/net metadata.
3. **Asset management** — list assets currently assigned to the logged-in employee; HR can create, assign, return, and delete assets with an audit trail (`AssetHistory`).

## What was produced

- `backend/` — Express + Prisma + SQLite. Routes: `auth`, `employees`, `payslips` (multer upload), `assets` (assign/return with transactional history). zod schemas for every request. Vitest + Supertest integration tests.
- `frontend/` — React 18 + Tailwind + React Router + TanStack Query. AuthContext with silent refresh + axios interceptor. Layout with role-aware sidebar; `ProtectedRoute` + `RoleRoute` guards. Six pages (Login, Dashboard, Profile, Finance, Assets, plus three HR-only admin pages). Vitest + RTL + MSW for component tests.
- `e2e/` — Playwright spec files: `auth`, `employee-flow`, `hr-flow`, `role-guard`. `globalSetup` reseeds the DB; `webServer` starts both dev servers.
- `docs/` — `PLAN.md` (the approved plan), `TESTING.md` (manual + automated test guide), this `Prompt0.md`.
- `README.md` — quick-start, scripts table, env var reference, API surface, project layout.

## Issues discovered while testing the full project (and fixed)

| # | Issue | Fix |
| --- | --- | --- |
| 1 | Prisma SQLite doesn't support `enum` types | Replaced `Role` / `AssetStatus` enums with `String` columns; zod enforces values at the API boundary. |
| 2 | Prisma CLI didn't find `DATABASE_URL` (looked in `backend/.env`, not the repo-root `.env` the README told users to create) | Added `dotenv-cli` and prefixed Prisma scripts with `dotenv -e ../.env -e .env --`. |
| 3 | Backend tests failed with SQLite error 1032 (`READONLY_DBMOVED`) — `prisma db push --force-reset` ran in `beforeAll` *per test file*, but the singleton Prisma client kept a connection to a file the next file deleted | Moved schema reset to vitest `globalSetup` (runs once for the whole run). Moved the test DB to `/tmp` to avoid `/mnt/c` (NTFS) flakiness in WSL. |
| 4 | dotenv only loaded `process.cwd()/.env`; running from `backend/` missed the root `.env` | `backend/src/config/env.ts` and `backend/prisma/seed.ts` now load `dotenv.config({ path: [root, local] })`. Vite frontend got `envDir: '..'`. |
| 5 | Multer `fileFilter` rejected non-PDF uploads with a raw `Error` → 500 response | Wrapped in `badRequest('Only PDF allowed')` so non-PDFs return 400. |
| 6 | Vite `defineConfig` was imported from `'vite'` but the file also defined a `test:` block | Switched to `import { defineConfig } from 'vitest/config'`. |
| 7 | Frontend RTL test matched both the sidebar nav link and the dashboard tile link by name | Used exact-name matching in RTL. |
| 8 | Several Playwright specs hit the same sidebar-vs-tile collision; one hit `selectOption({label: regex})` (only strings allowed); one matched both `LAP-001` and `S/N: SN-LAP-001` | Added a `navLink(page, name)` helper that scopes to `getByRole('navigation')`. Switched `selectOption` to plain strings. Used `{ exact: true }` for short text matches. |

## Default seed credentials

| Role | Email | Password |
| --- | --- | --- |
| HR Admin | `hr@company.com` | `Admin@123` |
| Employee | `emp1@company.com` (Alex Chen) | `Emp@123` |
| Employee | `emp2@company.com` (Priya Sharma) | `Emp@123` |
| Employee | `emp3@company.com` (Marco Bianchi) | `Emp@123` |

The seed also creates 5 assets (3 assigned, 2 available/spare) and 2 months of payslips per employee with auto-generated sample PDFs via `pdfkit`.

## Test results at the end of session

- **Backend unit tests**: 17/17 ✓ (`npm --workspace backend test`)
- **Frontend unit tests**: 3/3 ✓ (`npm --workspace frontend test`)
- **Playwright e2e**: 15/15 ✓ (`npm run test:e2e`)
