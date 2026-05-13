# EmployeePortal — Production Deployment Guide

Stepwise guide for deploying EmployeePortal behind Caddy (HTTPS) on a Linux server. Steps are split into **[USER]** (can run yourself) and **[ADMIN]** (needs root; request from server admin).

The pattern mirrors the SchulerPark deployment — three compose files (`docker-compose.yml` + `docker-compose.prod.yml`, skipping `docker-compose.override.yml`), Caddy as the TLS reverse proxy, a daily SQLite backup container.

---

## Environment assumptions

| Item | Value |
|---|---|
| Server OS | Rocky Linux 10 (or any systemd Linux with Docker) |
| Deploy user | member of `docker` group |
| Corporate proxy | `http://web.schuler.de:3128` *(only if behind Schuler network — skip proxy steps otherwise)* |
| Code location | `~/EmployeePortal` on server |
| DNS | `SITE_DOMAIN` must resolve to the server's public IP |

Pre-installed on the server: **git**, **docker**, **docker compose**, **python3**.

---

## Role summary

| # | Step | Role | Blocks next step? |
|---|------|------|---|
| 1 | Install supporting packages | ADMIN | No — optional |
| 2 | Configure Docker daemon proxy | ADMIN | **Yes** — needed before build *(skip if not behind a corporate proxy)* |
| 3 | Open firewall (80/443) | ADMIN | **Yes** — needed before Caddy starts |
| 4 | SELinux relabel bind-mounts | ADMIN | **Yes** — needed before Caddy starts *(skip on non-SELinux hosts)* |
| 5 | Clone the repo | USER | Yes |
| 6 | Create `.env` with secrets | USER | Yes |
| 7 | Verify Docker can pull | USER | Yes |
| 8 | Build and start the stack | USER | Yes |
| 9 | Verify and first-login | USER | — |
| 10 | Update later | USER | — |

Steps 1–4 can run in parallel with 5–6. Steps 7–9 require 1–4 done.

---

## [ADMIN] Step 1 — Install supporting packages

```bash
sudo dnf install -y policycoreutils-python-utils
```

`policycoreutils-python-utils` provides `chcon` used in step 4. Skip on non-SELinux distros.

---

## [ADMIN] Step 2 — Configure Docker daemon proxy *(corporate network only)*

Docker ignores shell `http_proxy` env vars. It needs a systemd drop-in. Without this, **all image pulls and builds will fail** behind the corporate proxy.

```bash
sudo mkdir -p /etc/systemd/system/docker.service.d

sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf >/dev/null <<'EOF'
[Service]
Environment="HTTP_PROXY=http://web.schuler.de:3128"
Environment="HTTPS_PROXY=http://web.schuler.de:3128"
Environment="NO_PROXY=localhost,127.0.0.1,.local,.schuler.de,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker
```

Verify:
```bash
docker info | grep -i proxy
# Should list the 3 Environment values
```

---

## [ADMIN] Step 3 — Open firewall ports 80 and 443

Caddy needs both ports for Let's Encrypt ACME challenges and production HTTPS.

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

sudo firewall-cmd --list-services   # should include http and https
```

---

## [ADMIN] Step 4 — SELinux relabel bind-mounted files

Rocky / RHEL run SELinux in enforcing mode. The Compose stack bind-mounts `Caddyfile` and `scripts/db-backup.sh` into containers; without relabeling, the containers get "Permission denied".

Replace `<repo-path>` with the absolute path to the user's cloned repo (user provides via `readlink -f ~/EmployeePortal`):

```bash
sudo chcon -Rt container_file_t <repo-path>/Caddyfile <repo-path>/scripts/
```

This must be re-run after any fresh clone or if the files are replaced.

---

## [USER] Step 5 — Clone the repo

```bash
# If behind the corporate proxy:
git config --global http.proxy "http://web.schuler.de:3128"
git config --global https.proxy "http://web.schuler.de:3128"

cd ~
git clone <repo-url> EmployeePortal
cd EmployeePortal

# Give admin the absolute path for step 4:
readlink -f ~/EmployeePortal
```

Create the backup target directory on the host (mounted into the backup container):

```bash
sudo mkdir -p /dbbackup
sudo chown "$(id -u):$(id -g)" /dbbackup
```

---

## [USER] Step 6 — Create `.env` with secrets

```bash
cd ~/EmployeePortal
cp .env.production.example .env
chmod 600 .env
```

Generate the two strong JWT secrets (no openssl required):

```bash
python3 -c "import secrets; print('JWT_ACCESS_SECRET=' + secrets.token_urlsafe(48))"
python3 -c "import secrets; print('JWT_REFRESH_SECRET=' + secrets.token_urlsafe(48))"
```

Edit `.env` (`nano .env` or `vim .env`) and fill in:

| Variable | Source |
|---|---|
| `SITE_DOMAIN` | DNS hostname pointing at this server |
| `JWT_ACCESS_SECRET` | Python output above |
| `JWT_REFRESH_SECRET` | Python output above |
| `BACKUP_RETENTION_DAYS` | `30` (or your preferred retention window) |

---

## [USER] Step 7 — Verify Docker can pull images

Only proceed after admin confirms step 2 is done (or skip if not behind a proxy).

```bash
docker info | grep -i proxy        # expect 3 Environment values (if proxied)
docker pull alpine                  # must succeed
```

If `docker pull` fails behind a proxy, go back to admin — step 2 isn't right.

---

## [USER] Step 8 — Build and start the stack

```bash
cd ~/EmployeePortal

docker compose -f docker-compose.yml -f docker-compose.prod.yml build \
  --build-arg http_proxy --build-arg https_proxy --build-arg no_proxy

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

The `-f docker-compose.yml -f docker-compose.prod.yml` flags **skip** `docker-compose.override.yml` (the dev-only file that publishes port 8081). The `--build-arg` flags forward your shell's proxy env into the build containers so npm/Prisma can reach the internet.

Build takes several minutes (Prisma generate, Vite frontend build).

---

## [USER] Step 9 — Verify and first login

```bash
# All four containers should be Up / healthy
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Watch Caddy obtain the certificate
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f caddy
# Look for: "certificate obtained successfully"

# App health via the domain
curl https://<SITE_DOMAIN>/api/health
# → {"ok":true}
```

Open `https://<SITE_DOMAIN>` in a browser. Log in with the seeded accounts (created on first boot by the backend's entrypoint):

| Role | Email | Password |
| --- | --- | --- |
| HR Admin | `hr@company.com` | `Admin@123` |
| Employee | `emp1@company.com` | `Emp@123` |

**Change the HR admin password immediately** via the Profile page.

---

## [USER] Step 10 — Updating later

```bash
cd ~/EmployeePortal
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml build \
  --build-arg http_proxy --build-arg https_proxy --build-arg no_proxy
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Prisma applies the schema automatically on app startup (`prisma db push` in the entrypoint). Existing data in the `ep_db` volume is preserved.

If a new clone is done (or SELinux context is lost), re-run step 4.

---

## Backups

The `db-backup` container runs an internal cron at 03:00 UTC daily and writes gzipped SQLite snapshots to `/dbbackup` on the host (retention controlled by `BACKUP_RETENTION_DAYS`).

Trigger an on-demand backup:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec db-backup /usr/local/bin/db-backup.sh
```

Restore (stop the stack first to avoid concurrent writes):
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop backend
gunzip -c /dbbackup/employeeportal_YYYYMMDD_HHMMSS.db.gz \
  | docker run --rm -i -v employeeportal_ep_db:/data alpine sh -c 'cat > /data/dev.db'
docker compose -f docker-compose.yml -f docker-compose.prod.yml start backend
```

> ⚠️ The `uploads/` volume (payslip PDFs) is **not** included in these dumps. For full disaster recovery also archive the `ep_uploads` docker volume on a schedule.

---

## Admin handoff — paste-ready block

Copy this block into a ticket for the server admin. Fill in `<repo-path>` from `readlink -f ~/EmployeePortal` first. Drop step 2 if the server is not behind a corporate proxy; drop step 4 if SELinux is not enforcing.

```bash
# 1. Packages
sudo dnf install -y policycoreutils-python-utils

# 2. Docker daemon proxy (skip if not behind corporate proxy)
sudo mkdir -p /etc/systemd/system/docker.service.d
sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf >/dev/null <<'EOF'
[Service]
Environment="HTTP_PROXY=http://web.schuler.de:3128"
Environment="HTTPS_PROXY=http://web.schuler.de:3128"
Environment="NO_PROXY=localhost,127.0.0.1,.local,.schuler.de,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker

# 3. Firewall
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# 4. SELinux relabel (use absolute path from `readlink -f`)
sudo chcon -Rt container_file_t <repo-path>/Caddyfile <repo-path>/scripts/
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `docker pull` — "connection refused" | Daemon proxy missing | Admin step 2 |
| Caddy logs: "permission denied" on `/etc/caddy/Caddyfile` | SELinux | Admin step 4 |
| Caddy can't obtain cert | Ports 80/443 blocked or DNS wrong | Admin step 3; check `dig +short <SITE_DOMAIN>` |
| App container restart loop | Missing JWT secret or DB volume permission | Check `docker compose logs backend`; ensure both `JWT_*_SECRET` set in `.env` |
| `npm` failures during build | Build containers can't see proxy | Ensure `--build-arg http_proxy --build-arg https_proxy` on the `build` command |
| `db-backup` container says "permission denied" on `/backups` | Host `/dbbackup` directory missing or wrong owner | Re-run `mkdir -p /dbbackup && chown` from step 5 |
| Browser shows Cloudflare redirect loop | Cloudflare SSL set to Flexible | Set to **Full (strict)** in Cloudflare |
