# Completion: Staging Deployment

**Completed**: 2026-11-03
**Branch**: technical/staging-deploy
**Category**: Technical
**Context**: Stage 3 of the launch plan: the first deployment to a public host, ahead of production

## Summary

CineXplorer now runs on a public staging host, `https://staging.cinexplorer.andrewcreekmore.dev`, on one DigitalOcean
droplet behind Caddy's automatic TLS. The production path, which had never run, is real: CI builds, checks and
publishes production images, a standalone Compose stack runs them, settings come from the environment, the frontend
bundle works on any host, and a bootstrap script and runbook set up the server, deploy a version and roll it back.
A live deploy, rollback and roll-forward proved the runbook.

## Key Deliverables

- Backend settings for a public host: strict `ENVIRONMENT` and host validation, hosts and origins from the
  environment, development tooling only in development, WhiteNoise static files, client addresses from the one
  trusted proxy, a throttle on the frontend log endpoint and stdout-only logging outside development
- A staged backend Dockerfile: the `dev` target keeps the development stack and CI's tests as they were, and the
  `production` target is a non-root Gunicorn image with compiled psycopg and collected static files, under the 300 MB
  ceiling CI enforces
- A web image: Caddy 2.11 serving the production bundle through `infrastructure/Caddyfile.prod` (cache policy, admin
  basic auth, security headers, plain-HTTP proxy to the backend)
- Frontend base URLs from one module that defaults to the page origin; development routes left out of production
  builds
- `infrastructure/docker-compose.prod.yml` and `infrastructure/prod.env.example`: a standalone stack where only `web`
  publishes ports
- A CI images job that builds and checks both images on every pull request and publishes `sha-` tagged images to
  GHCR on manual runs and pushes to `main`
- `infrastructure/deploy/bootstrap.sh`, an idempotent Ubuntu 24.04 server bootstrap, and
  `infrastructure/deploy/README.md`, the runbook for server setup, deploys, rollbacks, operations and recovery

## Implementation Highlights

- Throttles key on the last `X-Forwarded-For` entry: `NINJA_NUM_PROXIES` and `ALLAUTH_TRUSTED_PROXY_COUNT` are 1
  outside development, so clients behind Caddy are told apart and cannot choose their own throttle key
- `psycopg[c]` compiles in a production build stage, since pure-Python psycopg cannot find libpq on Alpine without
  a compiler or binutils; image size is measured with `du -sxb /`, because `docker image inspect`'s size varies by
  image store and engine version
- The host moved from Vultr to DigitalOcean (SFO2) when Vultr never verified the account; the PRD records the
  amendment, and only the runbook's server, firewall and recovery steps changed
- Following the runbook on the real server found what container checks could not: the bootstrap's active-swap check
  never matched, so a second run failed, and the runbook's root-refusal check could pass without testing the setting
- The verification review found Caddy's security headers doubled on proxied responses, where a repeated
  `Cross-Origin-Opener-Policy` does not parse; Caddy now drops Django's copies, and the PRD's Caddyfile requirement
  was amended to match
- A rollback compares each image's `showmigrations` against the live database before switching; both live deploys
  shared their migrations, so the reversal steps have not yet run on a server

## Related Documentation

- PRD: `prd-staging-deploy.md`
- Tasks: `tasks-staging-deploy.md`

## Follow-Up Work

- The rollback's reverse-migration path stays unexercised until a change ships a migration
- The retired `accounts` models still need their deletion migration, and CI has no missing-migration check; captured
  as an errand
- Left out by the PRD: automatic deploys, backups, scheduled jobs, monitoring, Google and GitHub sign-in and email on
  the deployed host, and the production host itself
