#!/usr/bin/env bash
# The service holds the operations lock and supplies ops.env as the environment.
set -euo pipefail
umask 077
output=$(mktemp /tmp/cinexplorer-maintenance.XXXXXX)
finish() {
    status=$?
    trap - EXIT
    set +e
    if ((status != 0)); then
        tail -n 20 "$output" >&2
        if [[ -n ${MAINTENANCE_PING_URL:-} ]]; then
            tail -n 20 "$output" | curl --fail --silent --show-error \
                --connect-timeout 10 --max-time 30 --data-binary @- "${MAINTENANCE_PING_URL%/}/fail"
        fi
    fi
    rm -f "$output"
    exit "$status"
}
trap finish EXIT
: "${MAINTENANCE_PING_URL:?MAINTENANCE_PING_URL must be set}"
cd /opt/cinexplorer/repo/infrastructure
compose() { docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env "$@"; }

printf 'Cleaning expired refresh tokens.\n'
printf 'Expired-token cleanup:\n' > "$output"
compose exec -T backend python manage.py flushexpiredtokens >> "$output" 2>&1

printf 'Cleaning expired sessions.\n'
printf 'Expired-session cleanup:\n' > "$output"
compose exec -T backend python manage.py clearsessions >> "$output" 2>&1

printf 'Refreshing stored movie cards.\n'
printf 'Movie-card refresh:\n' > "$output"
compose exec -T backend python manage.py refresh_movie_cards >> "$output" 2>&1
cat "$output"

printf 'Reporting maintenance success.\n'
printf 'Maintenance heartbeat:\n' > "$output"
curl --fail --silent --show-error --connect-timeout 10 --max-time 30 \
    "$MAINTENANCE_PING_URL" >> "$output" 2>&1
