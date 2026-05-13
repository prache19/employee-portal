# Employee Portal — Implementation Plan

## Context

The user wants a brand-new **Employee Portal** project scaffolded from scratch under `/mnt/c/Users/pnmpra02/Desktop/Work/EmployeePortal/`. The portal has three core modules:

1. **Profile** — basic employee details (personal info, designation, department, etc.).
2. **Finance Portal** — salary slips (view + download PDFs).
3. **Asset Management** — IT/office assets assigned to employees.

Per the user's choices:
- **Stack:** React + TypeScript + Vite (frontend) + Node/Express + TypeScript + SQLite (backend, via Prisma).
- **Auth:** Role-based — `EMPLOYEE` (sees own data) and `HR_ADMIN` (manages all employees, uploads payslips, assigns assets).
- **Scope:** Production-ready — JWT auth, zod validation, vitest tests (backend + frontend), README, env config.

The portal will be a self-contained monorepo runnable locally with one command. No similar in-repo code exists to reuse — the user's other React+Vite project (`calculator/`) confirms the preferred tooling but does not share modules.

---

## Repository Layout

```
EmployeePortal/
├── README.md
├── .gitignore
├── package.json                      # root: npm workspaces, dev script runs both
├── .env.example
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts                   # seeds 1 HR admin + 3 employees + sample assets/payslips
│   ├── uploads/                      # gitignored; PDF payslip storage
│   ├── src/
│   │   ├── index.ts                  # server bootstrap
│   │   ├── app.ts                    # express app, middleware, routes
│   │   ├── config/env.ts             # zod-validated env
│   │   ├── lib/
│   │   │   ├── prisma.ts             # PrismaClient singleton
│   │   │   ├── jwt.ts                # sign/verify helpers
│   │   │   └── password.ts           # bcrypt wrappers
│   │   ├── middleware/
│   │   │   ├── auth.ts               # requireAuth, requireRole('HR_ADMIN')
│   │   │   ├── validate.ts           # zod request validator
│   │   │   └── error.ts              # central error handler
│   │   ├── schemas/                  # zod schemas per resource
│   │   ├── routes/
│   │   │   ├── auth.routes.ts        # POST /login, POST /refresh, POST /logout, GET /me
│   │   │   ├── employees.routes.ts   # CRUD; self-read for EMPLOYEE
│   │   │   ├── payslips.routes.ts    # list/download self; HR upload/list-all
│   │   │   └── assets.routes.ts      # list self; HR CRUD + assign/return
│   │   └── controllers/              # thin handlers calling services
│   └── tests/                        # vitest + supertest integration tests
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx                   # router + providers
        ├── index.css                 # tailwind
        ├── lib/api.ts                # fetch wrapper with auth header + 401 handling
        ├── context/AuthContext.tsx   # user, login, logout, role guards
        ├── components/
        │   ├── Layout.tsx            # sidebar + header
        │   ├── ProtectedRoute.tsx
        │   ├── RoleRoute.tsx
        │   └── ui/                   # Button, Input, Card, Table, Modal
        ├── pages/
        │   ├── Login.tsx
        │   ├── Dashboard.tsx
        │   ├── Profile.tsx           # view/edit own profile
        │   ├── Finance.tsx           # payslip list + download
        │   ├── Assets.tsx            # own assigned assets
        │   └── admin/
        │       ├── Employees.tsx     # HR: list/add/edit/delete employees
        │       ├── PayslipUpload.tsx # HR: upload payslip PDF for any employee
        │       └── AssetsAdmin.tsx   # HR: manage assets, assign/return
        ├── hooks/                    # useEmployees, usePayslips, useAssets (TanStack Query)
        ├── types/                    # shared TS types mirroring API
        └── __tests__/                # vitest + RTL component tests
```

---

## Database Schema (Prisma / SQLite)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         Role     @default(EMPLOYEE)
  employee     Employee?
  createdAt    DateTime @default(now())
}

enum Role { EMPLOYEE HR_ADMIN }

model Employee {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  firstName     String
  lastName      String
  dateOfBirth   DateTime?
  dateOfJoining DateTime
  designation   String
  department    String
  phone         String?
  address       String?
  photoUrl      String?
  payslips      Payslip[]
  assets        Asset[]   @relation("CurrentHolder")
  assetHistory  AssetHistory[]
}

model Payslip {
  id           String   @id @default(cuid())
  employeeId   String
  employee     Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  month        Int      // 1-12
  year         Int
  grossSalary  Decimal
  deductions   Decimal
  netSalary    Decimal
  pdfPath      String
  uploadedById String
  createdAt    DateTime @default(now())
  @@unique([employeeId, month, year])
}

model Asset {
  id                String   @id @default(cuid())
  assetTag          String   @unique
  type              String   // LAPTOP, MONITOR, PHONE, etc.
  brand             String
  model             String
  serialNumber      String?
  purchaseDate      DateTime?
  status            AssetStatus @default(AVAILABLE)
  currentEmployeeId String?
  currentEmployee   Employee? @relation("CurrentHolder", fields: [currentEmployeeId], references: [id])
  assignedAt        DateTime?
  history           AssetHistory[]
}

enum AssetStatus { AVAILABLE ASSIGNED RETIRED IN_REPAIR }

model AssetHistory {
  id         String   @id @default(cuid())
  assetId    String
  asset      Asset    @relation(fields: [assetId], references: [id], onDelete: Cascade)
  employeeId String
  employee   Employee @relation(fields: [employeeId], references: [id])
  assignedAt DateTime
  returnedAt DateTime?
  notes      String?
}
```

---

## API Endpoints (Express)

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | public | email+password → `{accessToken, user}` |
| POST | `/api/auth/refresh` | cookie | rotate refresh token |
| POST | `/api/auth/logout` | auth | clear refresh cookie |
| GET  | `/api/auth/me` | auth | current user + employee profile |
| GET  | `/api/employees` | HR_ADMIN | list all |
| POST | `/api/employees` | HR_ADMIN | create employee + user |
| GET  | `/api/employees/:id` | HR_ADMIN or self | one employee |
| PUT  | `/api/employees/:id` | HR_ADMIN or self (limited fields) | update |
| DELETE | `/api/employees/:id` | HR_ADMIN | delete |
| GET  | `/api/payslips` | EMPLOYEE (own) / HR_ADMIN (all, filter by `employeeId`) | list |
| POST | `/api/payslips` | HR_ADMIN | multipart upload (pdf + metadata) |
| GET  | `/api/payslips/:id/download` | owner or HR_ADMIN | stream PDF |
| GET  | `/api/assets` | EMPLOYEE (own) / HR_ADMIN (all) | list |
| POST | `/api/assets` | HR_ADMIN | create asset |
| PUT  | `/api/assets/:id` | HR_ADMIN | update |
| POST | `/api/assets/:id/assign` | HR_ADMIN | `{employeeId}` → assign |
| POST | `/api/assets/:id/return` | HR_ADMIN | mark returned |

**Auth pattern:** access token (JWT, 15 min) in `Authorization: Bearer`, refresh token (opaque) in httpOnly cookie. `requireAuth` decodes JWT; `requireRole('HR_ADMIN')` checks role; ownership checks live in controllers.

**Validation:** every request body/params/query goes through a `validate(schema)` middleware backed by zod schemas in `src/schemas/`.

**File upload:** `multer` with disk storage to `backend/uploads/payslips/`, filename = `{employeeId}_{year}_{month}.pdf`. Size limit 5 MB, MIME-checked for `application/pdf`.

---

## Frontend Routing

| Route | Guard | Page |
|---|---|---|
| `/login` | public | Login |
| `/` | auth | Dashboard (cards linking to modules) |
| `/profile` | auth | Profile (own) |
| `/finance` | auth | Payslips list + download |
| `/assets` | auth | Own assigned assets |
| `/admin/employees` | HR_ADMIN | Employee management |
| `/admin/payslips` | HR_ADMIN | Upload payslip |
| `/admin/assets` | HR_ADMIN | Asset CRUD + assign/return |

**Libraries:**
- `react-router-dom` v6 (data routers)
- `@tanstack/react-query` for server state
- `react-hook-form` + `zod` + `@hookform/resolvers` for forms
- `tailwindcss` for styling (no heavy component library — small handwritten `components/ui/` set)
- `axios` (or fetch wrapper) with interceptor injecting JWT + handling 401 refresh
- `lucide-react` icons

---

## Key Files To Create

**Root:** `package.json` (workspaces: `backend`, `frontend`; `"dev": "concurrently \"npm:dev -w backend\" \"npm:dev -w frontend\""`), `README.md`, `.gitignore`, `.env.example`.

**Backend critical files:**
- `backend/prisma/schema.prisma` — schema above
- `backend/prisma/seed.ts` — seeds 1 HR (`hr@company.com` / `Admin@123`), 3 employees (`emp1@company.com` / `Emp@123` etc.), 5 assets, 2 months of payslips
- `backend/src/middleware/auth.ts` — JWT + role guards
- `backend/src/routes/*.routes.ts` — four route files
- `backend/src/lib/prisma.ts`, `lib/jwt.ts`, `lib/password.ts`
- `backend/tests/auth.test.ts`, `employees.test.ts`, `payslips.test.ts`, `assets.test.ts` — supertest integration tests against an in-memory SQLite (`file::memory:?cache=shared` or per-test temp DB)

**Frontend critical files:**
- `frontend/src/context/AuthContext.tsx` — login/logout/me + token refresh
- `frontend/src/lib/api.ts` — fetch wrapper
- `frontend/src/components/ProtectedRoute.tsx`, `RoleRoute.tsx`, `Layout.tsx`
- `frontend/src/pages/*` — listed above
- `frontend/src/__tests__/Login.test.tsx`, `Profile.test.tsx`, `Finance.test.tsx` — RTL tests with MSW for API mocking

---

## Build Order

1. **Scaffold root + workspaces** — root `package.json`, `.gitignore`, `.env.example`, `README.md` skeleton.
2. **Backend foundation** — `tsconfig`, Prisma init, schema, first migration, `prisma.ts`, env config, `app.ts` with health check.
3. **Auth** — User model wiring, `password.ts`, `jwt.ts`, `auth.routes.ts`, `auth.ts` middleware, seed HR admin. Test: login/logout/refresh.
4. **Employees module** — schema (already in step 2), routes, controllers, zod schemas, tests.
5. **Payslips module** — multer setup, routes, download streaming with ownership check, tests.
6. **Assets module** — routes incl. assign/return transactions writing `AssetHistory`, tests.
7. **Seed script** — finalize seed with 3 employees, 5 assets, sample payslip PDFs (generate placeholder PDFs at seed time).
8. **Frontend scaffold** — Vite TS template, Tailwind, router, AuthContext, Layout, Login page wired to `/api/auth/login`.
9. **Employee-facing pages** — Profile, Finance (list + download), Assets.
10. **HR admin pages** — Employees CRUD, payslip upload, asset management.
11. **Frontend tests** — RTL + MSW for the three employee pages and login flow.
12. **README + run scripts** — document setup, env, default credentials, npm scripts, test commands.

---

## Verification

After implementation:

1. **Install + setup**
   ```bash
   cd EmployeePortal
   npm install
   cp .env.example .env
   npm --workspace backend run db:migrate
   npm --workspace backend run db:seed
   ```
2. **Run**
   ```bash
   npm run dev    # spins up backend on :4000 and frontend on :5173
   ```
3. **Tests**
   ```bash
   npm --workspace backend test
   npm --workspace frontend test
   ```
4. **Manual smoke test in browser**
   - Log in as `hr@company.com` / `Admin@123` → see admin nav → create a new employee → upload a payslip PDF for them → create an asset → assign it.
   - Log out, log in as `emp1@company.com` / `Emp@123` → only see Profile / Finance / Assets → download own payslip → confirm cannot hit `/admin/*` (RoleRoute redirects).
   - Try direct API calls without token → 401. With EMPLOYEE token to `GET /api/employees` → 403.
5. **Lint + typecheck**
   ```bash
   npm --workspace backend run typecheck
   npm --workspace frontend run typecheck && npm --workspace frontend run lint
   ```

All tests green, both servers running, both role flows verified in browser = done.
