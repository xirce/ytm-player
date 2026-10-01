#!/bin/sh
set -eu

: "${APP_IMAGE:?APP_IMAGE is required}"

COMPOSE="docker compose --env-file .env.production --env-file .env.release -f compose.production.yml"
BACKUP_DIR="backups"

test -f .env.production || { echo '.env.production is missing' >&2; exit 1; }
mkdir -p "$BACKUP_DIR"

if [ -f .env.release ]; then
    cp .env.release .env.release.previous
fi
printf 'APP_IMAGE=%s\n' "$APP_IMAGE" > .env.release.next
mv .env.release.next .env.release

if $COMPOSE ps --status running --services 2>/dev/null | grep -qx postgres; then
    timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
    backup="$BACKUP_DIR/postgres-$timestamp.dump"
    $COMPOSE exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$backup.tmp"
    mv "$backup.tmp" "$backup"
fi

$COMPOSE pull app po-token-provider
if $COMPOSE up -d --wait --remove-orphans; then
    echo "Deployed $APP_IMAGE"
    exit 0
fi

echo 'Deployment failed; attempting rollback' >&2
if [ -f .env.release.previous ]; then
    mv .env.release.previous .env.release
    $COMPOSE up -d --wait --remove-orphans
    echo 'Rollback completed' >&2
fi
exit 1
