# Payslip Email Notification

## Context

Today an HR Admin uploads a salary-slip PDF for an employee via `POST /api/payslips` (route at `backend/src/routes/payslips.routes.ts`). The employee has no way of knowing a new payslip has been issued until they happen to visit `/finance`. This change adds an email notification, sent immediately after a successful upload, that tells the employee a new payslip is available and links them to the Finance page in the portal.

There is currently **no email infrastructure** in the backend (no nodemailer, no SMTP config, no mailer module). This plan introduces all of it in one focused pass and wires it into the existing payslip upload flow.

## Approach summary

- Add **nodemailer** to the backend and a tiny `lib/mailer.ts` module with one exported helper, `sendPayslipNotification(toEmail, employeeName, month, year)`.
- Extend the zod env schema with **optional** SMTP vars + a required-with-fallback `PORTAL_URL` used to build the link in the email.
- Fire the email **fire-and-forget** from the `POST /api/payslips` handler after `prisma.payslip.create()` returns. Email failures are logged but do **not** fail the upload response — HR gets a 201 either way.
- In dev, run **Mailhog** as a docker compose service so any outgoing email is visible at `http://localhost:8025`. The dev compose pre-points the backend to it.
- The email link is simply `${PORTAL_URL}/finance` (no deep-link page, no per-payslip URL). The employee logs in if their session has expired and sees the new slip at the top of their list.
- The HR upload UI gets a one-word copy tweak so HR knows the notification fires.

## File-level changes

### Backend

| File | Change |
|---|---|
| `backend/package.json` | Add `nodemailer@^6` + `@types/nodemailer@^6` (dev). |
| `backend/src/config/env.ts` | Add to the zod schema: `PORTAL_URL`, `SMTP_HOST` (optional), `SMTP_PORT` (default 587), `SMTP_USER` (optional), `SMTP_PASS` (optional), `SMTP_FROM` (default `"Employee Portal <no-reply@employeeportal.local>"`), `SMTP_SECURE` (default false). |
| `backend/src/lib/mailer.ts` | **New.** Memoized `getTransporter()` (returns `null` if `SMTP_HOST` unset) and `sendPayslipNotification(toEmail, employeeName, month, year)`. The payslip's salary fields are **not** passed in and never appear in the email. If no transporter, logs `[mailer] SMTP not configured — would send: …` and returns. Never throws. |
| `backend/src/routes/payslips.routes.ts` | Extend the existing `findUnique` to include `user.email`. Fire `sendPayslipNotification(...)` *without* `await` after `prisma.payslip.create(...)`. |

### Compose / env

| File | Change |
|---|---|
| `docker-compose.override.yml` | Add a `mailhog` service (ports `1025:1025` and `8025:8025`). Wire `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` on backend. |
| `docker-compose.prod.yml` | Pass through `SMTP_HOST/PORT/USER/PASS/FROM/SECURE` and `PORTAL_URL` on the `backend` service from `.env`. |
| `.env.example` | Append `PORTAL_URL` and commented SMTP vars. |
| `.env.production.example` | Append real SMTP vars + `PORTAL_URL=https://${SITE_DOMAIN}`. |

### Frontend (tiny)

| File | Change |
|---|---|
| `frontend/src/pages/admin/PayslipUpload.tsx` | Success message: `"Payslip uploaded — employee notified by email."` |

### Tests

| File | Change |
|---|---|
| `backend/tests/payslips.test.ts` | Add a test that mocks the mailer module and asserts `sendPayslipNotification` was called once with the employee's email + the right month/year after a successful upload. |

### Docs

| File | Change |
|---|---|
| `docs/PayslipEmailNotification.md` | **This file.** |
| `README.md` | One line under env vars: mention SMTP/PORTAL_URL. |
| `docs/DOCKER.md` | One paragraph: "Mailhog UI at http://localhost:8025." |

## Why these choices

- **Fire-and-forget**, not a Prisma `$transaction`. Email is a side-effect on an external system; rolling back the DB row because the mail server is slow would be wrong. The asset-history `$transaction` pattern in `backend/src/routes/assets.routes.ts` is for *internal* DB consistency and isn't the right model here.
- **No queue / background job runner.** Adding BullMQ/agenda for one email type triples the moving parts. If failures become a real problem we can add a queue later — the mailer module is the right seam.
- **Link to `/finance`, not a deep link.** Avoids inventing a per-payslip frontend route, avoids any "token in URL" auth dance, and the slip is the top row of the list anyway since it's the newest.
- **No salary amounts in the email.** Pay information stays behind the authenticated portal so it doesn't sit in inboxes or mail-server logs.
- **SMTP optional outside docker.** Bare `npm run dev` without `SMTP_HOST` set will log instead of error — keeps the local-Node story friction-free. Docker dev auto-wires Mailhog via the override file.

## Email content

```
Subject: Your payslip for <Month> <Year> is ready

Hi <First Name>,

Your salary slip for <Month> <Year> has been uploaded to the Employee Portal.

View and download it here: <PORTAL_URL>/finance

— Employee Portal
```

HTML body: same content with a single styled `<a>` button linking to `/finance`. **No salary amounts** anywhere in the email — only the notice and the link.

## Verification

1. **Unit test:** `npm --workspace backend test` — the new test passes alongside the existing payslip suite.
2. **Docker dev round-trip:**
   - `docker compose up --build`
   - Log in as HR (`hr@company.com` / `Admin@123`) at http://localhost:8081
   - Upload a payslip for `emp1@company.com`
   - Open `http://localhost:8025` → Mailhog UI should show one new message to `emp1@company.com` with the right subject and a link to `http://localhost:8081/finance`
   - Click the link → lands on the Finance page → new payslip appears in the list
3. **No-SMTP fallback (bare Node):** `npm run dev`, upload a payslip, confirm backend stdout logs `[mailer] SMTP not configured — would send: …` and 201 is unaffected.
4. **Upload still succeeds when SMTP misbehaves:** `docker compose stop mailhog`, upload again — the upload still returns 201, backend logs the email error, nothing user-visible breaks.
5. **Typecheck:** `npm run typecheck` clean.
