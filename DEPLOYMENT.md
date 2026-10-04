# Production deployment

## Prerequisites

- Linux host with Docker Engine and Compose plugin.
- DNS `A`/`AAAA` record for the application host.
- TCP 80/443 and UDP 443 open; PostgreSQL and port 3001 stay private.
- Access to the configured container registries.

## Google OAuth

Create a Web application OAuth client. Configure:

- Authorized JavaScript origin: `https://music.example.com`
- Authorized redirect URI: `https://music.example.com/api/auth/google/callback`

The origin must equal `APP_BASE_URL`. Each Google user gets an independent encrypted YouTube Music cookie record.

## Configure

```sh
cp .env.production.example .env.production
chmod 600 .env.production
openssl rand -base64 32 # YOUTUBE_CREDENTIALS_ENCRYPTION_KEY
openssl rand -hex 32    # METRICS_TOKEN
openssl rand -base64 36 # GRAFANA_ADMIN_PASSWORD
openssl rand -base64 36 # POSTGRES_PASSWORD; URL-encode it in DATABASE_URL
```

Keep `YOUTUBE_CREDENTIALS_ENCRYPTION_KEY` stable. Losing it makes stored YouTube cookies unreadable; changing it requires all users to reconnect YouTube Music.

## Deploy

```sh
docker compose --env-file .env.production -f compose.production.yml build --pull
docker compose --env-file .env.production -f compose.production.yml up -d --wait
docker compose --env-file .env.production -f compose.production.yml ps
curl --fail https://music.example.com/health/ready
```

Caddy provisions and renews TLS automatically. The app and PostgreSQL have no published host ports.
The PO-token provider runs in the same Compose project and is reachable only on the internal Docker network as `http://po-token-provider:4416`. Its image is pinned by digest; change `PO_TOKEN_PROVIDER_IMAGE` explicitly when upgrading it.
Prometheus scrapes `app:3001/metrics` over an internal network. Grafana listens only on host loopback port `3002`; use an SSH tunnel to access it remotely.

If a corporate network requires an authenticated npm proxy, pass the local npm configuration only as a BuildKit secret:

```sh
docker build --secret id=npmrc,src="$HOME/.npmrc" -t ytm-player:local .
```

The secret is mounted only during dependency installation and is not copied into an image layer. Committed lockfiles use `registry.npmjs.org` so CI and public servers do not depend on the corporate proxy.

## Update and rollback

Tag immutable images in a registry and set `APP_IMAGE`. Before update, record the current tag and back up PostgreSQL. Then:

```sh
docker compose --env-file .env.production -f compose.production.yml pull
docker compose --env-file .env.production -f compose.production.yml up -d --wait
```

For rollback, restore the previous `APP_IMAGE` and run the same `up` command. Never run `down -v` in production.

## GitHub Actions deployment over SSH

`.github/workflows/ci.yml` verifies the project, builds an immutable image tagged with the commit SHA, pushes it to GHCR, and deploys default-branch pushes over SSH. Deployments are serialized with the `production` concurrency group. Configure required reviewers for the GitHub `production` environment if deployment must wait for manual approval.

Configure GitHub Actions repository secrets:

- `DEPLOY_SSH_KEY` — private deploy key.
- `DEPLOY_KNOWN_HOSTS` — trusted host-key entry; verify the fingerprint out of band and do not generate it inside CI.
- `DEPLOY_HOST`, `DEPLOY_USER`, optional `DEPLOY_PORT`.
- `DEPLOY_PATH`, for example `/opt/ytm-player`.

Configure the `production` environment variable `PRODUCTION_URL`, for example `https://music.example.com`. GitHub supplies `GITHUB_TOKEN` for publishing and pulling the repository's GHCR package. The deploy user must be able to run Docker without interactive `sudo` and write to `DEPLOY_PATH`.

Bootstrap the host once:

```sh
sudo install -d -o deploy -g deploy -m 700 /opt/ytm-player
sudo -u deploy cp .env.production.example /opt/ytm-player/.env.production
sudo -u deploy chmod 600 /opt/ytm-player/.env.production
```

Fill `.env.production` on the host; Actions never uploads or overwrites it. Each deployment uploads Compose, Caddy, the observability configuration, and the deployment script. Before changing containers, the script creates a PostgreSQL custom-format dump under `backups/`. If health checks fail, it restores the previous image reference and runs Compose again.

## Backup

The database contains user identities, hashed sessions, and encrypted YouTube cookies. Back it up together with the exact encryption key, stored separately.

```sh
docker compose --env-file .env.production -f compose.production.yml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > ytm.dump
```

Test restore periodically. The `youtube-cache` volume is disposable; Caddy volumes should be retained to avoid needless certificate reissuance.

## Metrics and logs

`METRICS_TOKEN` and `GRAFANA_ADMIN_PASSWORD` are required in production. Prometheus authenticates to `/metrics` with the token; do not expose it in browser code. Access Grafana through an SSH tunnel: `ssh -L 3002:127.0.0.1:3002 deploy@music.example.com`, then open <http://localhost:3002>. Collect container logs with rotation configured on the Docker host.

## Smoke checks

1. `/health/live` and `/health/ready` return 200.
2. Google login returns to `/account` and sets a Secure HttpOnly session cookie.
3. Two Google accounts cannot see or replace each other's YouTube connection.
4. Logout invalidates the server-side session.
5. Restarting app/PostgreSQL preserves account connections.
6. `/metrics`, PostgreSQL, Prometheus, Grafana, ports 3001/3002/4416/9090, and `tools/remote-codex` are not publicly accessible.
