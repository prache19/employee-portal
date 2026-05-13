# Employee Portal

A self-contained employee portal with three modules:

- **Profile** — view and update your personal/contact details.
- **Finance** — view and download monthly salary slips (PDF).
- **Assets** — see equipment assigned to you (laptops, monitors, phones, etc.).

Role-based access: `EMPLOYEE` (self-service) and `HR_ADMIN` (manage all employees, upload payslips, run asset inventory).

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 18 + TypeScript + Vite + Tailwind + React Router + TanStack Query |
| Backend | Node + Express + TypeScript + Prisma + SQLite |
| Auth | JWT access token (Bearer) + refresh token (httpOnly cookie); bcrypt passwords |
| Tests | Vitest + Supertest (backend), Vitest + React Testing Library + MSW (frontend) |

Monorepo with npm workspaces: `backend/`, `frontend/`.

## Quick start

### Option A — local Node

```bash
# from EmployeePortal/
npm install
cp .env.example .env

# initialize DB and seed sample data
npm run db:push     # creates dev.db from schema (use db:migrate for production-style migrations)
npm run db:seed

# run both servers
npm run dev

# (optional) run the test suites
npm test                   # backend + frontend unit tests
npm run test:e2e:install   # one-time: install Playwright Chromium
npm run test:e2e           # Playwright e2e tests
```

### Option B — Docker

```bash
docker compose up --build
# open http://localhost:8081
```

The backend's entrypoint runs `prisma db push` and seeds on first boot. See [`docs/DOCKER.md`](docs/DOCKER.md) for full details (volumes, env overrides, production notes).

- Backend: http://localhost:4000  (health: `GET /api/health`)
- Frontend: http://localhost:5173

### Default credentials

| Role | Email | Password |
| --- | --- | --- |
| HR Admin | `hr@company.com` | `Admin@123` |
| Employee | `emp1@company.com` | `Emp@123` |
| Employee | `emp2@company.com` | `Emp@123` |
| Employee | `emp3@company.com` | `Emp@123` |

## Scripts

Run from the repo root:

| Command | What it does |
| --- | --- |
| `npm run dev` | Start backend (4000) and frontend (5173) together. |
| `npm run build` | Build backend (tsc) and frontend (Vite). |
| `npm run typecheck` | TypeScript check both workspaces. |
| `npm test` | Run backend + frontend unit tests. |
| `npm run test:e2e` | Run Playwright e2e tests (auto-starts dev server). |
| `npm run test:e2e:install` | Install Playwright Chromium browser (one-time). |
| `npm run test:all` | Unit + e2e in sequence. |
| `npm run db:push` | Sync the Prisma schema to the dev DB (no migration history). |
| `npm run db:migrate` | Apply Prisma migrations (production-style). |
| `npm run db:seed` | Reset and reseed the database. |

Workspace-scoped scripts use `npm --workspace backend …` / `npm --workspace frontend …`.

## Environment variables

See [`.env.example`](.env.example). Key values:

- `DATABASE_URL` — SQLite file path (default: `file:./dev.db` inside `backend/prisma/`).
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — must be at least 16 chars; rotate before deploying.
- `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL` — durations like `15m`, `7d`.
- `UPLOAD_DIR` — where payslip PDFs are stored (default `./uploads`).
- `CORS_ORIGIN` — comma-separated allowed origins for the API.
- `VITE_API_BASE_URL` — frontend → backend API URL.

## API surface

All endpoints are under `/api`. Auth required unless noted.

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| POST | `/auth/login` | public | `{ email, password }` → `{ accessToken, user }`; sets refresh cookie. |
| POST | `/auth/refresh` | cookie | Rotates the access token. |
| POST | `/auth/logout` | any | Clears refresh cookie. |
| GET | `/auth/me` | any | Current user + employee. |
| GET | `/employees` | HR_ADMIN | List all employees. |
| POST | `/employees` | HR_ADMIN | Create user + employee. |
| GET | `/employees/:id` | HR_ADMIN or self | Read one employee. |
| PUT | `/employees/:id` | HR_ADMIN or self (limited) | Update. HR may edit all fields; employees can edit `phone`, `address`, `photoUrl`. |
| DELETE | `/employees/:id` | HR_ADMIN | Deletes user + employee. |
| GET | `/payslips` | EMPLOYEE (own) / HR_ADMIN (filterable by `employeeId`, `year`) | List. |
| POST | `/payslips` | HR_ADMIN | `multipart/form-data` with `pdf` file + metadata fields. |
| GET | `/payslips/:id/download` | owner or HR_ADMIN | Streams PDF. |
| GET | `/assets` | EMPLOYEE (own) / HR_ADMIN (all) | List. |
| POST | `/assets` | HR_ADMIN | Create asset. |
| PUT | `/assets/:id` | HR_ADMIN | Update. |
| POST | `/assets/:id/assign` | HR_ADMIN | `{ employeeId, notes? }`. |
| POST | `/assets/:id/return` | HR_ADMIN | Mark returned. |
| DELETE | `/assets/:id` | HR_ADMIN | Delete asset. |

## Docs

- [`docs/PLAN.md`](docs/PLAN.md) — implementation plan
- [`docs/TESTING.md`](docs/TESTING.md) — automated test commands + API probes
- [`docs/MANUAL_TESTING.md`](docs/MANUAL_TESTING.md) — manual QA checklist
- [`docs/DOCKER.md`](docs/DOCKER.md) — full docker compose guide
- [`docs/Deployment.md`](docs/Deployment.md) — production deployment (Caddy + HTTPS)
- [`docs/Prompt0.md`](docs/Prompt0.md) — original prompt + decisions

## Project layout

```
EmployeePortal/
├── backend/
│   ├── prisma/        # schema.prisma, seed.ts, migrations/
│   ├── src/
│   │   ├── config/    # env loader (zod)
│   │   ├── lib/       # prisma, jwt, password, httpError
│   │   ├── middleware # auth, validate, error
│   │   ├── schemas/   # zod request schemas
│   │   ├── routes/    # auth/employees/payslips/assets
│   │   ├── app.ts     # express app factory
│   │   └── index.ts   # server bootstrap
│   ├── uploads/       # payslip PDF storage (gitignored)
│   └── tests/         # supertest integration tests
└── frontend/
    └── src/
        ├── components/    # Layout, guards, ui primitives
        ├── context/       # AuthContext
        ├── lib/api.ts     # axios + auth/refresh interceptors
        ├── pages/         # Login, Dashboard, Profile, Finance, Assets, admin/*
        ├── types/         # shared TS models
        └── __tests__/     # RTL + MSW tests
```

## Testing

- **Backend** (`npm --workspace backend test`): integration tests hit a real SQLite database (`prisma/test.db`) provisioned via `prisma db push` in the test setup. Covers login, role enforcement, employee CRUD, payslip upload/download, asset assign/return flow.
- **Frontend** (`npm --workspace frontend test`): component tests use MSW to mock the backend; covers the login flow and the Finance page.

## Production notes

- Run `npm --workspace backend run db:migrate` (not `db:migrate:dev`) on the production database.
- Set strong values for both JWT secrets and serve the API over HTTPS — refresh cookies will be marked `Secure` automatically when `NODE_ENV=production`.
- Payslip PDFs are stored on the local filesystem under `UPLOAD_DIR`. For a real deployment, mount a persistent volume or swap the multer storage adapter for S3/Azure Blob.
