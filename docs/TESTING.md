# Employee Portal — Testing Guide

This document covers how to verify the Employee Portal end-to-end: automated test suites, a manual smoke test for both roles, and direct API probes.

All commands run from the repo root (`EmployeePortal/`) unless noted.

---

## 1. First-time setup

```bash
npm install
cp .env.example .env
npm --workspace backend run db:migrate:dev --name init    # creates dev.db
npm run db:seed                                            # 1 HR + 3 employees + assets + payslips
```

Default credentials produced by the seed:

| Role | Email | Password |
| --- | --- | --- |
| HR Admin | `hr@company.com` | `Admin@123` |
| Employee | `emp1@company.com` | `Emp@123` |
| Employee | `emp2@company.com` | `Emp@123` |
| Employee | `emp3@company.com` | `Emp@123` |

---

## 2. Automated tests

### Backend (Vitest + Supertest)

```bash
npm --workspace backend test
```

What it covers (in `backend/tests/`):

- `auth.test.ts` — login success/failure, `GET /auth/me` with and without token.
- `employees.test.ts` — HR listing, role-gated creation, self-read allowed, cross-employee read forbidden.
- `payslips.test.ts` — HR upload, employee list + download own, employee upload forbidden (403).
- `assets.test.ts` — create → assign → return cycle, employee scoped listing, employee create forbidden, double-assign rejected.

Each suite spins up a fresh SQLite file at `backend/prisma/test.db` via `prisma db push` in `tests/setup.ts` and cleans up afterwards.

### Frontend (Vitest + React Testing Library + MSW)

```bash
npm --workspace frontend test
```

What it covers (in `frontend/src/__tests__/`):

- `Login.test.tsx` — employee logs in and lands on the dashboard; invalid creds show an error.
- `Finance.test.tsx` — after employee login, payslip rows render with formatted period and net amount.

MSW handlers live in `frontend/src/test/msw-server.ts` and stand in for the backend.

### End-to-end (Playwright, Chromium)

```bash
npm run test:e2e:install   # one-time: downloads Chromium (~290 MB)
npm run test:e2e           # runs the full e2e suite
npm run test:e2e:ui        # opens Playwright UI mode
```

What it covers (in `e2e/`):

- `auth.spec.ts` — login rejection, redirect-when-unauth, HR vs employee sidebar visibility, logout.
- `employee-flow.spec.ts` — profile read + update, payslip list + PDF download, "my assets" list.
- `hr-flow.spec.ts` — create + delete employee, upload a payslip (real PDF buffer), create + assign + return + delete an asset.
- `role-guard.spec.ts` — employee blocked from each `/admin/*` route via the UI, plus a direct API probe that `GET /api/employees` returns 403 for the employee token.

The Playwright config starts `npm run dev` automatically (`webServer` option). The `globalSetup` runs `npm --workspace backend run db:seed` so every e2e run starts from a known data set. On failure, the run produces screenshots, videos, and a trace under `test-results/`; open the HTML report with:

```bash
npx playwright show-report
```

### Run everything

```bash
npm test          # backend then frontend unit tests
npm run test:e2e  # Playwright e2e (with dev server)
npm run test:all  # unit + e2e in sequence
npm run typecheck # tsc on both workspaces
```

---

## 3. Manual smoke test (browser)

Start both servers:

```bash
npm run dev
```

- Backend: <http://localhost:4000> (health: `GET /api/health`)
- Frontend: <http://localhost:5173>

### HR Admin path

1. Go to <http://localhost:5173/login> and sign in as `hr@company.com` / `Admin@123`.
2. The sidebar should show the **HR Admin** section (Employees, Upload Payslip, Manage Assets).
3. **Employees** → add a new employee (e.g. `test@company.com` / `Test@1234`, Junior Dev, Engineering). Confirm the row appears in the table.
4. **Upload Payslip** → pick the new employee, fill amounts, attach a PDF (any small `.pdf`), upload. Expect a green "Payslip uploaded." message.
5. **Manage Assets** → add a new asset (`LAP-99`, `LAPTOP`, Dell, XPS). It should appear with status `AVAILABLE`. Use the dropdown to assign it to the new employee → status flips to `ASSIGNED`. Click **Return** → status back to `AVAILABLE`.
6. Click **Log out** in the sidebar.

### Employee path

1. Log in as the employee you just created (or `emp1@company.com` / `Emp@123`).
2. Sidebar should **not** include the HR Admin section.
3. **Profile** → existing details render; update Phone/Address and save. Reload to confirm persistence.
4. **Finance** → see your payslips. Click **PDF** and confirm the file downloads and opens.
5. **My Assets** → see equipment assigned to you (none if you just hit Return as HR above; otherwise the assigned asset card).
6. Try entering `/admin/employees` directly in the URL bar → you should be redirected back to `/`.
7. Log out.

### Re-test the seeded data

Log in as `emp1@company.com` / `Emp@123` and confirm:
- Profile shows Alex Chen, Senior Software Engineer, Engineering.
- Finance shows two payslips (Mar 2026, Apr 2026), Net 6800.00.
- My Assets shows `LAP-001` and `MON-001`.

---

## 4. API probes (curl)

Quick verification without the UI. Replace `$TOKEN` with the `accessToken` returned by login.

```bash
# Login (HR)
curl -s -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"email":"hr@company.com","password":"Admin@123"}' \
  http://localhost:4000/api/auth/login | jq

# Save the access token
TOKEN=$(curl -s -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"email":"hr@company.com","password":"Admin@123"}' \
  http://localhost:4000/api/auth/login | jq -r .accessToken)

# Me
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/auth/me | jq

# List employees (HR)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/employees | jq

# List assets (HR)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/assets | jq

# Refresh token (uses cookie jar from login)
curl -s -b cookies.txt -X POST http://localhost:4000/api/auth/refresh | jq

# Negative: no token → 401
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000/api/employees   # → 401

# Negative: employee → cannot list all employees → 403
EMP_TOKEN=$(curl -s -H 'Content-Type: application/json' \
  -d '{"email":"emp1@company.com","password":"Emp@123"}' \
  http://localhost:4000/api/auth/login | jq -r .accessToken)
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $EMP_TOKEN" http://localhost:4000/api/employees   # → 403
```

---

## 5. Common issues

| Symptom | Cause / Fix |
| --- | --- |
| Backend exits with "Environment validation failed" | `.env` missing or secrets shorter than 16 chars. Copy `.env.example` and replace placeholders. |
| Frontend shows CORS error | `CORS_ORIGIN` in `.env` doesn't include `http://localhost:5173`. |
| Payslip upload returns 400 "Only PDF allowed" | The selected file isn't `application/pdf`. |
| Payslip download returns 404 "File missing on disk" | The DB row exists but the PDF was removed from `backend/uploads/payslips/`. Re-upload or re-seed. |
| Assign returns 400 "Asset already assigned" | Asset is in `ASSIGNED` status; return it first. |
| Tests fail on first run with `prisma: command not found` | Dependencies aren't installed; run `npm install` from the repo root. |
| `prisma db push` errors about a locked DB | A previous dev server is still running and holding `prisma/dev.db`. Stop it before running migrations. |

---

## 6. Reset to a clean state

```bash
# Wipe DB + uploaded payslips, then re-seed
rm -f backend/prisma/dev.db backend/prisma/test.db
rm -rf backend/uploads/payslips/*
npm --workspace backend run db:migrate:dev --name init
npm run db:seed
```
