# Employee Portal — Docker

Two-container stack: **backend** (Node + Express + SQLite) and **frontend** (nginx serving the Vite build + reverse-proxying `/api/*` to the backend). The frontend container is the only one exposed to the host.

```
┌─────────── host ───────────┐
│  http://localhost:8081     │
│         │                  │
│         ▼                  │
│  ┌──────────────┐  /api/*  │
│  │  ep-frontend │ ───────▶ │   ┌──────────────┐
│  │  nginx :80   │          │   │  ep-backend   │
│  └──────────────┘ ◀─────── │   │  express :4000│
│                            │   │  + sqlite     │
│                            │   └──────┬───────┘
│                            │          │
│                            │     volumes:
│                            │     ep_db        →  /data
│                            │     ep_uploads   →  /app/backend/uploads
└────────────────────────────┘
```

## Quick start

From the repo root:

```bash
docker compose up --build
```

When the logs show `[backend] listening on http://localhost:4000`, open <http://localhost:8081>.

### Default credentials

The backend's entrypoint runs `prisma db push` and then runs the seed **once** (gated by a `.seeded` sentinel in the `ep_db` volume), so first boot creates these accounts:

| Role | Email | Password |
| --- | --- | --- |
| HR Admin | `hr@company.com` | `Admin@123` |
| Employee | `emp1@company.com` (Alex Chen) | `Emp@123` |
| Employee | `emp2@company.com` (Priya Sharma) | `Emp@123` |
| Employee | `emp3@company.com` (Marco Bianchi) | `Emp@123` |

On subsequent restarts the seed is skipped, so any data you added (new employees, uploaded payslips, asset assignments) is preserved.

## Files

| File | Purpose |
| --- | --- |
| `docker-compose.yml` | Two services + two named volumes (build context = repo root). |
| `backend/Dockerfile` | Multi-stage: install + prisma generate + tsc → slim runtime. |
| `backend/.dockerignore` | Keeps the build context lean (no `node_modules`, no `dev.db`, no tests). |
| `backend/docker-entrypoint.sh` | Runs `prisma db push`, seeds on first boot, then `node dist/index.js`. |
| `frontend/Dockerfile` | Multi-stage: Vite build with `VITE_API_BASE_URL=/api` → nginx alpine. |
| `frontend/nginx.conf` | SPA fallback + `/api/` proxy + cache headers + 10 MB body limit (payslip uploads). |

## Ports & URLs

| Service | Container port | Host port |
| --- | --- | --- |
| frontend (nginx) | 80 | **8081** |
| backend (express) | 4000 | *(not published — only reachable through the internal docker network)* |

Change `8081` in `docker-compose.yml` (both the `ports:` mapping and the `CORS_ORIGIN` env var on the backend) if you need a different host port.

## Volumes

Two named volumes are created on first `up`:

| Volume | Mounted at | What's inside |
| --- | --- | --- |
| `ep_db` | `/data` | `dev.db` (the SQLite file) + `.seeded` sentinel |
| `ep_uploads` | `/app/backend/uploads` | Payslip PDFs uploaded by HR |

These persist across `docker compose stop/start/restart`. They are removed only when you run `docker compose down -v` (or `docker volume rm employeeportal_ep_db employeeportal_ep_uploads`).

## Environment variables

Defaults are baked into `docker-compose.yml`. Override by exporting before `up` or by editing the compose file:

| Var | Default | Notes |
| --- | --- | --- |
| `JWT_ACCESS_SECRET` | development placeholder | Override for any non-throwaway deployment. |
| `JWT_REFRESH_SECRET` | development placeholder | Same. |
| `NODE_ENV` | `development` | Set to `production` only when serving over **https** — otherwise the refresh cookie's `secure` flag prevents login. |
| `DATABASE_URL` | `file:/data/dev.db` | Path inside the container; corresponds to the `ep_db` volume. |
| `CORS_ORIGIN` | `http://localhost:8081` | Must match the host URL the browser actually loads. |

Example with overridden secrets:

```bash
JWT_ACCESS_SECRET="$(openssl rand -hex 32)" \
JWT_REFRESH_SECRET="$(openssl rand -hex 32)" \
  docker compose up --build
```

## Common operations

```bash
# Build + start in the foreground (logs in terminal)
docker compose up --build

# Detached mode
docker compose up -d --build

# View logs
docker compose logs -f                 # both services
docker compose logs -f backend         # backend only

# Status
docker compose ps

# Stop (volumes preserved)
docker compose stop

# Stop + remove containers (volumes preserved)
docker compose down

# Nuclear: stop + remove containers AND volumes (re-seeds on next up)
docker compose down -v

# Open a shell inside a running container
docker compose exec backend sh
docker compose exec frontend sh

# Run an ad-hoc command (e.g. inspect the SQLite DB)
docker compose exec backend sh -c 'apt-get update && apt-get install -y sqlite3 && sqlite3 /data/dev.db "select count(*) from User;"'

# Re-seed without losing other data: not supported by design. Use `down -v` then `up`.
```

## Smoke test

```bash
curl http://localhost:8081/api/health
# {"ok":true}

curl -X POST -H 'Content-Type: application/json' \
  -d '{"email":"hr@company.com","password":"Admin@123"}' \
  http://localhost:8081/api/auth/login | head -c 200
# {"accessToken":"eyJ...","user":{"id":"...","email":"hr@company.com","role":"HR_ADMIN", ...}}
```

Then open <http://localhost:8081> in a browser and follow the [Manual Testing checklist](./MANUAL_TESTING.md) — every step works the same as the local-dev variant; only the URL changes.

## Production notes

This setup is fine for local demos, internal tooling, and on-prem deployments behind another reverse proxy. For an internet-facing production deployment:

1. Put a TLS terminator (Caddy, Traefik, nginx, or a managed load balancer) in front of the frontend container.
2. Switch `NODE_ENV` to `production` so the refresh cookie is `Secure`.
3. Override both JWT secrets with `openssl rand -hex 32` values.
4. Update `CORS_ORIGIN` to the public hostname.
5. Back up the `ep_db` volume regularly — that's where every account, payslip record, and asset history lives.
6. SQLite is fine up to a few dozen concurrent users. Beyond that, swap the `datasource` in `backend/prisma/schema.prisma` to `postgresql`, add a `db` service in compose, and re-run `prisma migrate dev`.

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `Bind for 0.0.0.0:8081 failed: port is already allocated` | Another process is using 8081. Change the host port in `docker-compose.yml` (also update `CORS_ORIGIN`). |
| Login succeeds in the API call but the browser stays on `/login` | Refresh cookie isn't being set/sent — check that `NODE_ENV=development` (or that you're using https) and that `CORS_ORIGIN` exactly matches the address bar. |
| Backend keeps restarting with `Environment validation failed` | One of the JWT secrets is shorter than 16 chars. |
| `[entrypoint] Seed already applied — skipping` but the DB is empty | You manually deleted the DB but left the `.seeded` sentinel. `docker compose down -v` + `up` rebuilds from scratch. |
| Frontend shows API errors after rebuild | The browser cached the old bundle. The nginx config sends `Cache-Control: no-store` on `index.html`, so a hard refresh (Ctrl-Shift-R) is enough; don't clear the database. |
