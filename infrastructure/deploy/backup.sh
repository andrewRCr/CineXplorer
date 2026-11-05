#!/usr/bin/env bash
# The service holds the operations lock and supplies ops.env as the environment.
set -euo pipefail
umask 077
output=$(mktemp /tmp/cinexplorer-backup.XXXXXX)
finish() {
    status=$?
    trap - EXIT
    set +e
    if ((status != 0)); then
        tail -n 20 "$output" >&2
        if [[ -n ${BACKUP_PING_URL:-} ]]; then
            tail -n 20 "$output" | curl --fail --silent --show-error \
                --connect-timeout 10 --max-time 30 --data-binary @- "${BACKUP_PING_URL%/}/fail"
        fi
    fi
    rm -f "$output"
    exit "$status"
}
trap finish EXIT
for required in RCLONE_CONFIG_R2_TYPE RCLONE_CONFIG_R2_PROVIDER RCLONE_CONFIG_R2_ACCESS_KEY_ID \
    RCLONE_CONFIG_R2_SECRET_ACCESS_KEY RCLONE_CONFIG_R2_ENDPOINT RCLONE_CONFIG_R2_REGION \
    RCLONE_CONFIG_R2_NO_CHECK_BUCKET R2_BUCKET R2_PREFIX BACKUP_PING_URL; do
    if [[ -z ${!required:-} ]]; then
        printf 'Missing required environment variable: %s\n' "$required" >&2
        exit 1
    fi
done
cd /opt/cinexplorer/repo/infrastructure
compose() { docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env "$@"; }
archive=cinexplorer-$(date -u +%Y%m%dT%H%M%SZ).dump
dump=$(mktemp "/opt/cinexplorer/backups/$archive.XXXXXX")

printf 'Dumping the application database.\n'
printf 'Database dump:\n' > "$output"
# Expand credentials inside the db container, whose environment supplies them.
# shellcheck disable=SC2016
compose exec -T db sh -c \
    'exec pg_dump --format=custom --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' \
    > "$dump" 2>> "$output"

printf 'Checking the archive.\n'
printf 'Archive validation:\n' > "$output"
compose exec -T db pg_restore --list < "$dump" >> "$output" 2>&1

printf 'Uploading the archive.\n'
printf 'Archive upload:\n' > "$output"
docker run --rm --user "$(id -u):$(id -g)" \
    --env RCLONE_CONFIG_R2_TYPE --env RCLONE_CONFIG_R2_PROVIDER \
    --env RCLONE_CONFIG_R2_ACCESS_KEY_ID --env RCLONE_CONFIG_R2_SECRET_ACCESS_KEY \
    --env RCLONE_CONFIG_R2_ENDPOINT --env RCLONE_CONFIG_R2_REGION \
    --env RCLONE_CONFIG_R2_NO_CHECK_BUCKET \
    --volume /opt/cinexplorer/backups:/data:ro \
    rclone/rclone:1.75.2 --config /dev/null copyto \
    "/data/$(basename "$dump")" "r2:$R2_BUCKET/${R2_PREFIX%/}/$archive" >> "$output" 2>&1

printf 'Removing the local archive and reporting success.\n'
printf 'Local cleanup and heartbeat:\n' > "$output"
rm "$dump" >> "$output" 2>&1
curl --fail --silent --show-error --connect-timeout 10 --max-time 30 \
    "$BACKUP_PING_URL" >> "$output" 2>&1
