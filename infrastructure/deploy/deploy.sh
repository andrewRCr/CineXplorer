#!/usr/bin/env bash
# Deploy a published commit. The entry point holds the operations lock for this run.
set -euo pipefail
umask 077

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
[[ $# -eq 2 ]] || fail 'Usage: deploy.sh <full-commit-sha> <ci|manual>'
target=$1
source=$2
[[ $target =~ ^[0-9a-f]{40}$ ]] || fail 'Expected a full lowercase commit SHA.'
[[ $source == ci || $source == manual ]] || fail 'Expected source ci or manual.'

operations=/opt/cinexplorer
prod_env=$operations/prod.env
history=$operations/deploy-history.log
new_tag=sha-${target:0:7}
compose() { docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env "$@"; }

printf '==> 1 Check checkout and record previous version\n'
cd "$operations/repo"
[[ -z $(git status --porcelain) ]] || fail 'Checkout has uncommitted changes.'
previous_commit=-
previous_tag=-
if [[ -s $history ]]; then
    read -r _ _ _ _ previous_commit previous_tag < <(tail -n 1 "$history")
else
    cd infrastructure
    container_id=$(compose ps --all --quiet backend)
    if [[ -n $container_id ]]; then
        image=$(docker inspect --format '{{.Config.Image}}' "$container_id")
        previous_tag=${image##*:}
        revision=$(docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$container_id")
        if [[ $revision =~ ^[0-9a-f]{40}$ ]]; then previous_commit=$revision; fi
    fi
    cd "$operations/repo"
fi
printf 'Previous version: %s %s\n' "$previous_commit" "$previous_tag"

printf '==> 2 Select target version\n'
git checkout --detach "$target"
if grep -q '^IMAGE_TAG=' "$prod_env"; then
    sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$new_tag/" "$prod_env"
else
    printf '\nIMAGE_TAG=%s\n' "$new_tag" >> "$prod_env"
fi
export IMAGE_TAG=$new_tag
cd infrastructure

printf '==> 3 Pull images and migrate\n'
compose config --quiet
compose pull
compose run --rm backend python manage.py migrate

printf '==> 4 Configure Site\n'
compose run --rm backend python manage.py configure_site

printf '==> 5 Start services and check health\n'
compose up -d --wait
site_address=$(compose config --environment | sed -n 's/^SITE_ADDRESS=//p')
[[ -n $site_address ]] || fail 'SITE_ADDRESS is missing from deployment configuration.'
curl --fail --silent --show-error --max-time 30 "https://$site_address/api/health-check/" > /dev/null

printf '==> 6 Record successful deployment\n'
printf '%s %s %s %s %s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$source" \
    "$previous_commit" "$previous_tag" "$target" "$new_tag" >> "$history"
