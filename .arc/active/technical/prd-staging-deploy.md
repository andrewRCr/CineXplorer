# PRD: Staging Deployment

**Type:** Technical
**Status:** Ready for Implementation
**Created:** 2026-10-31

---

## 1. Introduction/Overview

CineXplorer has only ever run as its development stack: Django's development server, the Vite dev server, a Caddy
proxy on `https://localhost:8444` with self-signed certificates, and Postgres and Redis with their ports published to
the host. Its production path has never run, and parts of it cannot:

- `INSTALLED_APPS` lists `debug_toolbar` and `django_extensions`, the toolbar's middleware is in `MIDDLEWARE`, and
  `config/urls.py` routes `__debug__/` unconditionally, but both packages are only in `requirements/req.dev.txt`.
  `apps/authentication/schemas.py` uses Pydantic's `EmailStr`, which needs `email-validator`, also only in
  `req.dev.txt`. An image built without development requirements fails at startup.
- `req.txt` installs plain `psycopg`, whose pure-Python implementation finds libpq with `ctypes.util.find_library`. On
  Alpine that lookup needs a compiler or binutils: with only `libpq` installed it returns `None`, so the driver cannot
  load in a slim image.
- `infrastructure/docker-compose.prod.yml` is a stub override that runs `gunicorn`, which no requirements file lists,
  and hands it the development certificates.
- `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` are hard-coded localhost lists, and
  `STATIC_ROOT` is unset, so `collectstatic` cannot run.
- No production frontend bundle is served anywhere: the frontend image runs the Vite dev server, and CI builds the
  bundle only as a check.
- `apiClient.ts`, `authService.ts` (line 7) and `TestLogin.tsx` read `VITE_BASE_API_URL` with no fallback, so a build
  without it has no API address. Six other places fall back to `https://localhost:8444`: `useOAuthFlow.ts`,
  `useAuth.ts`, `authService.ts` (two password-reset URLs), `logger.ts` and `consoleCapture.ts`.
- `POST /api/logs/` accepts anonymous requests with no rate limit; its comment says it is "throttled at middleware
  level", but no such throttle exists.
- Behind a reverse proxy, every request reaches Django from the proxy's address, so Django Ninja's throttles depend on
  `X-Forwarded-For`. With no proxy count configured they key on the header's whole value, which makes the proxy's
  header handling decide whether clients are told apart and whether a client can choose its own key. Registration,
  for one, allows three attempts an hour per client.
- The backend image built without development requirements is 1,245 MB. 679 MB of it is one layer of system packages
  (`postgresql-dev`, `git`, `bash` and their dependencies), against a 131 MB Python environment.

This change deploys today's application, unchanged in behavior apart from the hardening a public host needs, to a
public staging host, `https://staging.cinexplorer.andrewcreekmore.dev`, on one small virtual server, and makes the
production path real:
production images built in CI, a production Compose file and Caddyfile, environment-driven hosts, a frontend bundle
that works on any host, and a written, repeatable procedure for setting up the server and deploying to it.

## 2. Goals

1. The application runs on the staging host over HTTPS with a publicly trusted certificate, serving anonymous
   browsing, search and movie detail, and sign-in for an existing account.
2. Production images are small, contain no development tooling or development-only pages, and are built and
   published by CI.
3. The same images and Compose file serve any host: moving from staging to the production host later changes only
   environment values and a DNS record.
4. A person with the repository and the server's credentials can set up a fresh server, deploy a given version, and
   roll back to the previous one by following the runbook alone.
5. The server exposes only SSH, HTTP and HTTPS; the database, cache and application server are unreachable from
   outside it.

## 3. User Stories

- As a visitor, I open the staging address and browse, search and read movie pages over HTTPS without a certificate
  warning.
- As the maintainer, I deploy a specific commit to staging, and roll back to the previous one, with a short documented
  sequence of commands.
- As the maintainer, I rebuild the server from scratch using only the repository, the runbook and the secrets I hold.
- As a developer, my local development stack behaves as it does today.

## 4. Functional Requirements

### Backend configuration

- **R1. Development tooling only in development.** `debug_toolbar` and `django_extensions` join `INSTALLED_APPS`, the
  toolbar middleware joins `MIDDLEWARE`, and `config/urls.py` routes `__debug__/` only when `ENVIRONMENT` is
  `development`. Both packages stay in `req.dev.txt`, and nothing else imports them. The development-only endpoints
  `POST /api/dev-logs/write/` and `GET /api/debug/error-500/` answer `403` unless `ENVIRONMENT` is `development`,
  in place of their current `DEBUG` check.
- **R2. Runtime dependencies.** `gunicorn` is added to `req.txt` with a bounded version range, and `email-validator`
  moves from `req.dev.txt` to `req.txt`. A new `requirements/req.prod.txt` includes `req.txt` and adds `psycopg[c]`
  in `req.txt`'s `psycopg` version range, so the production image uses psycopg's C implementation, which links libpq
  directly. The development image, CI and local virtual environments keep installing `req.txt` and need no compiler
  or `pg_config`.
- **R3. Hosts and origins from the environment.** `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS` and `CORS_ALLOWED_ORIGINS`
  are read from the comma-separated environment variables `DJANGO_ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS` and
  `CORS_ALLOWED_ORIGINS`.
    - In `development`, an unset variable yields today's localhost list for that setting, so the development stack
      and the tests are unchanged.
    - In `staging` and `production`, `DJANGO_ALLOWED_HOSTS` is required: startup fails with `ImproperlyConfigured`
      naming it. `CSRF_TRUSTED_ORIGINS` and `CORS_ALLOWED_ORIGINS` default to empty there, since the frontend and the
      API share one origin, which Django's CSRF check accepts without a listed trusted origin.
    - In `staging` and `production`, `DEBUG=True` also fails startup with `ImproperlyConfigured`.
    - An `ENVIRONMENT` value other than `development`, `staging` or `production` fails startup with
      `ImproperlyConfigured`, in place of today's fallback to `development`, which would load development tooling the
      production image lacks. An unset `ENVIRONMENT` still means `development`.
- **R4. Static files.** `STATIC_ROOT` is `backend/staticfiles`, and WhiteNoise serves `/static/` from the backend
  (`whitenoise` in `req.txt`, its middleware directly after `SecurityMiddleware`). In `staging` and `production`,
  static files use WhiteNoise's compressed manifest storage; `development` keeps Django's default storage, so tests
  need no `collectstatic`.
- **R5. Client identity behind the proxy.** In `staging` and `production`, `NINJA_NUM_PROXIES` and
  `ALLAUTH_TRUSTED_PROXY_COUNT` are both `1`, so Django Ninja's throttles and allauth's own rate limits key on the last
  `X-Forwarded-For` entry. Caddy discards any `X-Forwarded-For` a client sends and sets the address it received the
  connection from, so that entry is always the client address Caddy saw. `development` keeps today's behavior.
- **R6. Health check behind the HTTPS redirect.** `GET /api/health-check/` is exempt from `SECURE_SSL_REDIRECT`
  (through `SECURE_REDIRECT_EXEMPT`), so the container health check can call it over plain HTTP inside the Compose
  network. Every other plain-HTTP request still redirects.
- **R7. Log endpoint throttle.** `POST /api/logs/` applies its own anonymous throttle, a `TestAwareAnonThrottle`
  subclass with the scope `frontend_logs`, at 30 requests a minute per client, and its comment describes that
  throttle. Its own scope keeps its history apart from the `anon` history that the sign-in, registration and
  resend-verification throttles share. A throttled request receives `429` and writes nothing. The frontend logger
  already treats a failed report as non-fatal: it keeps the report and does not retry it. That behavior is
  unchanged.
- **R8. Deploy checks.** `security.W003` is added to `SILENCED_SYSTEM_CHECKS`, with a comment giving the reason:
  Django's `CsrfViewMiddleware` is deliberately replaced by `apps.authentication.middleware.CsrfHeaderMiddleware`,
  which validates the `X-CSRFToken` header on state-changing requests that carry the JWT cookie, and Django admin's
  views apply `csrf_protect` themselves. The comment also names what neither covers, all of it without a CSRF token
  check: the public authentication endpoints the middleware exempts (registration, sign-in on `/api/token/`, logout,
  email verification and resend; token refresh stays checked), where a cross-site form can still force a sign-in,
  since Django Ninja parses a JSON body whatever its content type; allauth's headless browser endpoints under
  `/_allauth/`; and API requests authenticated by the session alone, which rely on the `SameSite=Lax` session cookie.
  No other check is silenced.

### Backend image

- **R9. Two images from one Dockerfile.** `backend/Dockerfile` gains named stages, all on `python:3.13-alpine3.24`
  (today's `python:3.13-alpine3.21` is no longer rebuilt, and Alpine 3.21's support ends on 2026-11-01):
    - `dev`: today's image (development requirements; the development Compose file runs `runserver_plus` with the
      development certificates), selected by `target: dev` in `infrastructure/docker-compose.yml` and used by CI's
      tests;
    - `production`: dependencies from `req.prod.txt` installed into a virtual environment in a build stage that holds
      the build tools and libpq's headers (for `psycopg[c]`), and a final stage with only runtime libraries (`libpq`),
      the virtual environment and the application code, running as a non-root user. It sets
      `ENVIRONMENT=production` as the image's default, so a deployment that omits the variable gets production
      settings and R3's missing-variable errors rather than an import error for a development package.
- **R10. Static files at build.** The production stage runs `collectstatic --noinput` during the image build under
  `ENVIRONMENT=production`, so the manifest is written. Throwaway values are supplied only to that build step for
  every variable the settings module requires at import: `DJANGO_SECRET_KEY`, `TMDB_API_KEY`, `BACKEND_URL`,
  `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` and `DJANGO_ALLOWED_HOSTS`. None of these throwaway values
  reaches the runtime environment, and since production logging creates no log directory (R11), the build leaves none
  in the image.
- **R11. Runtime command and logging.** The production image starts `gunicorn config.wsgi:application` on
  `0.0.0.0:8000` over plain HTTP, with the `gthread` worker class, `GUNICORN_WORKERS` workers (default 2) of
  `GUNICORN_THREADS` threads each (default 4), a worker timeout of 60 seconds (under `gthread`, this restarts a
  worker process that stops responding; it does not limit how long a request runs), and access logs to stdout. It
  runs no migrations at start. In `staging` and `production`, the application logs to stdout only:
  `config/logging.py` already leaves out its rotating file handlers in CI, and it leaves them out there too, so
  Docker's log rotation (R19) bounds all output. There the console handler defaults to `INFO` rather than `WARNING`,
  so stdout keeps the `INFO` records those files held; `DJANGO_CONSOLE_LOG_LEVEL` still overrides it. Nothing
  creates or probes a log directory there either: the settings module's `ensure_log_directory()` and
  `config/logging.py`'s own directory creation skip `staging` and `production` as they skip CI.
- **R12. Size.** The production backend image is under 300 MB.

### Frontend

- **R13. Same-origin by default.** One module, `src/config/baseUrls.ts`, exports the two base URLs every caller uses:
    - the site origin: `VITE_BASE_URL` when set, otherwise `window.location.origin`;
    - the API base: `VITE_BASE_API_URL` when set, otherwise the site origin followed by `/api`.

  The nine readers listed in § 1 use it, and no file under `src/` outside tests names `https://localhost:8444`.
  Development keeps setting both variables in `frontend/.env`, so its behavior is unchanged.
- **R14. Development routes stay out of production builds.** The typography, theme and layout debug pages
  (`/dev/typography-debug`, `/dev/theme-debug`, `/dev/layout-debug`) and the test login page (`/testlogin`) are
  registered only when `import.meta.env.DEV` is true. In a production build these paths reach the not-found page, and
  their modules are not in the bundle.

### Web image and Caddy

- **R15. Web image.** `frontend/Dockerfile` gains named stages: `dev` (today's image, selected by `target: dev` in the
  development Compose file); a build stage that runs `npm ci`, `npm run typegen` (the Chakra type generation `tsc`
  depends on) and `npm run build`, with no `.env` file and no `VITE_*` variables; and
  `production`, on `caddy:2.11-alpine` (R19), containing the built bundle in `/srv` and the
  production Caddyfile. The Caddyfile reaches the build through a named build context, `infra`, pointing at
  `infrastructure/`.
- **R16. Production Caddyfile** (`infrastructure/Caddyfile.prod`):
    - The site address comes from `{$SITE_ADDRESS}`, so one image serves any host. Caddy obtains and renews the
      certificate automatically and redirects HTTP to HTTPS.
    - `/api/*`, `/_allauth/*`, `/accounts/*`, `/admin/*` and `/static/*` proxy to `backend:8000` over plain HTTP.
    - `/admin/*` sits behind Caddy `basic_auth`, with the user name and bcrypt hash from `{$ADMIN_BASIC_AUTH_USER}`
      and `{$ADMIN_BASIC_AUTH_HASH}`, in front of Django's own staff login.
    - Every other path serves the bundle from `/srv`, falling back to `index.html`, so client routes load directly.
    - `index.html`, served directly or as that fallback, carries `Cache-Control: no-cache`, and files that exist under
      `/assets/` (Vite's content-hashed build output) carry `Cache-Control: public, max-age=31536000, immutable`. A
      request for a missing file under `/assets/` answers `404` with `Cache-Control: no-store` rather than
      `index.html`, so a browser holding a page from before a deploy or rollback gets an error for a file the new
      image lacks, not HTML in its place, and does not keep that error once a rollback restores the file.
    - Responses Caddy serves itself carry `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
      `Referrer-Policy: same-origin` and `Cross-Origin-Opener-Policy: same-origin`, the values Django sends for these
      four headers on its own responses. `Strict-Transport-Security` stays with Django, whose settings give it a
      different lifetime in staging and production; browsers apply it to the whole host.
    - It sends no CORS headers; the development Caddyfile keeps its localhost CORS handling.

### Production Compose file

- **R17. Services.** `infrastructure/docker-compose.prod.yml` is a standalone file, not an override of the
  development file. Its top-level `name: cinexplorer-prod` keeps its containers and volumes apart from the development
  project's, and it has four services on Compose's default IPv4 network:
    - `web`: the web image; the only service that publishes ports (80/tcp, 443/tcp, 443/udp); `SITE_ADDRESS`,
      `ADMIN_BASIC_AUTH_USER` and `ADMIN_BASIC_AUTH_HASH` in its `environment`, from the Compose env file, which
      `--env-file` alone only uses to fill in the Compose file; Caddy's `/data` and `/config` on named volumes, so
      certificates survive container re-creation; starts once `backend` is healthy;
    - `backend`: the production backend image; settings from the env file named by `BACKEND_ENV_FILE`, plus
      `DB_HOST=db`, `REDIS_URL=redis://redis:6379/0` and the Postgres credentials from Compose; the values built from
      `SITE_ADDRESS`, so the host is set once: `DJANGO_ALLOWED_HOSTS` as `${SITE_ADDRESS},localhost` (`localhost`
      being the host the container health check sends), and `FRONTEND_URL` and `BACKEND_URL` each as
      `https://${SITE_ADDRESS}`; starts once `db` is healthy and `redis` has started, so a one-off container of it,
      such as the deploy's migration step (R25), starts them first; a health check that requests
      `http://localhost:8000/api/health-check/` with Python's `urllib`, since the image has no `curl`;
    - `db`: `postgres:17-alpine3.24`, its data on a named volume, with a `pg_isready` health check. The development
      Compose file moves to the same tag from `postgres:17.5-alpine`, so CI's tests run on the version production
      runs;
    - `redis`: `redis:7.4-alpine` as a cache only, with persistence off and a memory cap with least-recently-used
      eviction, so throttle counters reset if it restarts.
- **R18. Versions.** Images are referenced as `ghcr.io/andrewrcr/cinexplorer-backend:${IMAGE_TAG}` and
  `ghcr.io/andrewrcr/cinexplorer-web:${IMAGE_TAG}`. `IMAGE_TAG` has no default, so a deploy always names a version.
- **R19. Operation.** Every service has `restart: unless-stopped`, a memory limit (initially web 128 MB, backend
  640 MB, db 384 MB, redis 64 MB) and `json-file` log rotation (10 MB, 3 files). Third-party images name a
  maintained release line rather than an exact patch release, so each rebuild or pull takes its patch releases:
  `python:3.13-alpine3.24`, `caddy:2.11-alpine` and `postgres:17-alpine3.24`. The one exception is
  `redis:7.4-alpine`: Redis 7.4 still receives patch releases, but its image is built only on Alpine 3.21, whose
  support ends on 2026-11-01. It is an internal cache with no published port, and moving to Redis 8 is a version
  change outside this one. Nothing uses `latest`, and the project's own images keep exact tags (R18).
- **R20. Env files.** Two templates list every variable a deployment must set, with no real values:
    - `infrastructure/prod.env.example`, the Compose env file passed with `--env-file`: `IMAGE_TAG`, `SITE_ADDRESS`
      (the bare host, such as `staging.cinexplorer.andrewcreekmore.dev`, from which R17 builds the backend's allowed
      hosts and site URLs), `BACKEND_ENV_FILE`, the admin basic-auth pair (the bcrypt hash in single quotes, since
      Compose interpolates `$` in unquoted and double-quoted values), and the Postgres credentials, which live only
      here and reach both `db` and `backend` through Compose;
    - the production entries in `backend/config/.env.example`: `ENVIRONMENT`, `DEBUG=False`, `GUNICORN_WORKERS` and
      `GUNICORN_THREADS`. The values derived from the site host are not among them, since R17 sets them. The file's
      production checklist drops the steps this change contradicts: setting `POSTGRES_PASSWORD` in this file, since
      the Postgres credentials live only in the Compose env file; updating hosts and origins in `settings.py` (R3);
      setting `FRONTEND_URL` and `BACKEND_URL` by hand, which Compose sets from `SITE_ADDRESS` (R17); and setting up
      rotation for application log files (R11).

### CI

- **R21. Image publishing.** A CI job builds the backend `production` target and the web image on every pull request,
  without pushing, using the GitHub Actions layer cache. On a push to `main`, and on a manual run from any branch, it
  pushes both to GitHub Container Registry tagged `sha-` plus the commit's first seven characters, and also `main`
  for pushes to `main`. Only this job holds `packages: write`, and the `ci-ok` rollup includes it.
- **R22. Image checks.** The same job fails if the backend production image is 300 MB or larger, or if
  `python manage.py check --deploy --fail-level WARNING` fails inside it under `ENVIRONMENT=production`, with a
  generated placeholder secret key and placeholders for the other variables R10 lists.
- **R23. No unused builds.** The two standalone backend image builds whose output the test and type-generation jobs
  never use are removed; those jobs keep building the `dev` image through Compose.

### Server and runbook

- **R24. Bootstrap script.** `infrastructure/deploy/bootstrap.sh`, run once as root on a fresh Ubuntu 24.04 LTS
  server, prepares it, and run again (as `deploy`, with `sudo`) makes no further changes:
    - a `deploy` user with the root account's SSH keys, in the `docker` group and with passwordless `sudo`, which adds
      no authority since `docker` group membership is already equivalent to root;
    - Docker Engine and the Compose plugin from Docker's apt repository;
    - `ufw` allowing only SSH, 80/tcp, 443/tcp and 443/udp;
    - SSH password login and SSH root login (`PermitRootLogin no`) disabled, with root's local password left
      untouched for the provider's recovery console, and the SSH service reloaded so the running daemon applies them;
    - `unattended-upgrades` for security updates, with automatic reboot at 09:00 UTC when an update requires one;
    - a 2 GB swap file;
    - `/opt/cinexplorer`, owned by `deploy`.
- **R25. Runbook** (`infrastructure/deploy/README.md`), covering:
    - first-time setup: the server, the DNS record, the bootstrap, a read-only deploy key and a checkout of the
      repository at `/opt/cinexplorer/repo`, a registry login with a read-only token, both env files at mode `600`, the
      first deploy, and an account that can sign in through the site, created from the server shell with its email
      address marked verified;
    - a deploy: check out the commit, set `IMAGE_TAG`, pull, run migrations as a one-off container, start the stack,
      and confirm the health check through the site's public URL;
    - a rollback: the same steps with the previous commit and tag. A rollback restores code, not schema: the runbook
      lists the migrations in both images (`showmigrations`, run in each), and wherever the newer image shows an
      applied migration the older one lacks, migrates that app back, using the newer image, to the older image's
      latest migration for it (`migrate <app> <migration>`), or to `zero` for an app the older image does not have,
      then switches tags. Comparing images rather than commits also catches migrations
      shipped inside third-party packages, whose versions can differ between two builds. Reversing a migration
      discards the data it added, and a migration that cannot be reversed stops the rollback: the fix then rolls
      forward;
    - reading logs (`docker compose logs`), restarting a service, where state lives (the named volumes), and
      DigitalOcean's Recovery Console as the way back in if SSH access is lost, signing in as root after a root
      password reset from the droplet's Settings tab, since a droplet created with only an SSH key has no root
      password.

## 5. Non-Goals (Out of Scope)

- Deploying automatically from CI: deploys are manual in this change.
- Database backups and a restore procedure; scheduled jobs such as expired-token cleanup; uptime and backup-failure
  monitoring.
- Google and GitHub sign-in, and every flow that sends email (email sign-up, verification resend and password reset),
  working on the deployed host. Their code is unchanged; their provider configuration is not set up there. With
  ZeptoMail unconfigured, a request that sends email fails on staging with a server error, and a failed sign-up
  leaves no account behind.
- The production host `cinexplorer.andrewcreekmore.dev`, and a second environment beside staging.
- Cloudflare proxying of the staging host, and anything for scale: several servers, high availability,
  zero-downtime deploys.
- Any change to application behavior, the API schema or the generated frontend types, beyond the hardening in R1,
  R3, R5, R7 and R14.
- IPv6 on the staging host (Design Decision 16).
- The sign-in, registration and resend-verification throttles sharing one `anon` history, which predates this change.
- CSRF token checks on the public authentication endpoints the middleware exempts, on allauth's headless browser
  endpoints and on API requests authenticated by the session alone (R8). Today only `SameSite=Lax` cookies limit
  them, and those do not stop a forced sign-in.
- Per-worktree development stacks, which this change's environment-driven hosts make easier but do not build.
- A deployment section in the README.

## 6. Design Considerations

No user-facing design change: the staging site looks and behaves like the development stack.

## 7. Design Decisions

1. **Images built in CI and pulled by the server**, over building on the server: the server has one vCPU and 2 GB, so
   builds there would be slow, risk memory pressure, and leave build tools on a public machine. The repository is
   private for now, so the published images are private, and the server logs in to the registry with a read-only
   token: a classic personal access token with only `read:packages`, the kind GitHub's container registry accepts.
2. **A web image carrying Caddy, the bundle and the Caddyfile**, over a bundle on a volume Caddy mounts: one immutable
   artifact per version, nothing to keep in step at deploy, and rollback is an image tag. `{$SITE_ADDRESS}` keeps the
   image independent of the host.
3. **WhiteNoise for Django's static files**, over `collectstatic` into a volume Caddy serves: the backend image stays
   self-contained, and the two images stay independent at deploy. The only static consumer is Django admin (the API
   documentation page loads Swagger UI from a CDN, since `ninja` is not in `INSTALLED_APPS`), so serving it through
   the backend costs nothing noticeable.
4. **Same-origin URLs with optional overrides**, over a build per host: one bundle runs on staging, on the production
   host later, and on any local stack, and the missing-API-address defect goes away. The overrides keep the
   development setup working as it is.
5. **A standalone production Compose file**, over an override of the development file: the development file's bind
   mounts, published ports, certificates and development servers would each need stripping, and a missed one would
   reach production.
6. **Basic auth in front of Django admin**, over admin protected only by Django's staff login (whose form has no rate
   limit), and over admin reachable only through an SSH tunnel (safer, but a step every time the maintainer needs
   it). Basic auth keeps the login form out of public reach for one block of configuration.
7. **Migrations as an explicit deploy step**, over migrating at container start: a failed migration stops the deploy
   while the previous version keeps serving, where a migrate-at-start failure leaves the backend restarting in a loop
   that the restart policy hides.
8. **Redis kept, as a cache only**, over Django's database cache: no code change, about 6 MB idle, every
   rate-limited endpoint keeps the throttle backend its tests exercise, and the pagination deduplication sets keep
   the raw Redis client they use (`apps/core/services/redis_client.py`), which the database cache cannot provide.
   Persistence is off and eviction is allowed because everything Redis holds is disposable: rate-limit counters,
   deduplication sets (the code falls back when they are missing), single-use resend-verification tokens (a user can
   request another) and the cached data-quality blacklist.
9. **`ENVIRONMENT`, not `DEBUG`, gates development tooling and the development-only endpoints, and `DEBUG` stays off
   outside development** (startup refuses it, R3): gating on `DEBUG` would let one mis-set value import packages the
   production image lacks and open an anonymous, unthrottled file-writing endpoint, and `DEBUG` itself would show
   debug tracebacks on a public host.
10. **Allowed hosts required outside development**, over a localhost default everywhere: a production process
    silently falling back to localhost hosts would reject every real request, where failing at startup names the
    problem. The two origin lists default to empty there instead: the site is one origin, which Django's CSRF check
    accepts without a listed trusted origin, and allauth adds the hosts of `CSRF_TRUSTED_ORIGINS` to the redirect
    targets it treats as safe, so a localhost default would only widen that set.
11. **A checkout of the repository on the server**, over copying files to it: the Compose file and runbook stay
    versioned with the images, and a deploy or rollback checks out the same commit its image tag names.
12. **Only `web` publishes ports:** Docker's published ports bypass `ufw`, so the firewall cannot hide a published
    database or cache port; publishing nothing else is what keeps them private.
13. **Manual runs publish images from any branch,** so a branch can be deployed to staging and checked before it
    merges; pushes to `main` publish every merged version.
14. **An explicit proxy count for throttles,** over keying on the header's whole value: with `NINJA_NUM_PROXIES` set,
    the throttle key is the entry the server's own proxy wrote. Adding a proxy in front of Caddy later (such as
    Cloudflare's) needs both counts raised and Caddy's `trusted_proxies` set to that proxy's address ranges, since
    Caddy otherwise discards the header the outer proxy sets.
15. **psycopg's C implementation, built in the build stage,** over the pure-Python driver, which cannot find libpq in
    a slim Alpine image (§ 1), and over `psycopg[binary]`, which bundles its own libpq and OpenSSL that update only
    with psycopg releases. The runtime image's `libpq` comes from Alpine's packages, the system-library path psycopg's
    documentation prefers for production. It takes Alpine's security updates whenever the image is rebuilt without
    the cached package layer or after its base tag moves, which `python:3.13-alpine3.24` does with Python patch
    releases and Alpine 3.24's own updates (R19). Moving to a later Alpine branch before 3.24's support ends in June
    2028 is a tag change.
16. **IPv4 only on the staging host:** Docker maps IPv6 host ports to an IPv4-only bridge network through its
    userland proxy, which hides each IPv6 visitor's address, so an `AAAA` record would put every IPv6 visitor on one
    throttle key. Enabling IPv6 on the Compose network is the alternative, left until IPv6 traffic matters.
17. **Logs to stdout outside development,** over per-process log files: several gunicorn processes cannot safely
    share Python's rotating file handler, since one process's rotation leaves the others writing to the renamed file,
    and Docker's `json-file` rotation already bounds stdout.

## 8. Success Criteria

### Implemented (checkable locally and in CI)

1. `docker compose -f infrastructure/docker-compose.prod.yml config`, with the example env values, shows published
   ports only on `web`, and only 80/tcp, 443/tcp and 443/udp.
2. The backend production image is under 300 MB. Inside it, `python -c "import debug_toolbar"`,
   `python -c "import django_extensions"` and `gcc --version` each fail, while
   `python -c "import psycopg; print(psycopg.pq.__impl__)"` prints `c` and
   `python manage.py shell -c "import config.urls"` succeeds under `ENVIRONMENT=production` with placeholder values
   for R10's variables.
3. Inside the backend production image, `python manage.py check --deploy --fail-level WARNING` exits 0 under
   `ENVIRONMENT=production` with a generated placeholder secret key and placeholders for R10's other variables.
4. With `ENVIRONMENT=staging` and `DJANGO_ALLOWED_HOSTS` unset, Django fails to start with `ImproperlyConfigured`
   naming `DJANGO_ALLOWED_HOSTS`; with it set and the two origin variables unset, `CSRF_TRUSTED_ORIGINS` and
   `CORS_ALLOWED_ORIGINS` are empty. With `ENVIRONMENT=development` and the variables unset, the three settings equal
   today's localhost lists. With `ENVIRONMENT=staging` and `DEBUG=True`, Django fails to start with
   `ImproperlyConfigured`, and likewise with `ENVIRONMENT` set to an unrecognised value. Backend tests assert each
   case by loading the real settings module under that environment, for example by importing it in a subprocess, and
   they replace the test in `apps/authentication/tests/integration/test_environment_config.py` that an unrecognised
   value falls back to `development`.
5. Backend tests show, under the staging proxy setting, that requests to a throttled endpoint from two different
   client addresses in `X-Forwarded-For` are counted separately, that a header with two entries is counted under the
   last, and that allauth resolves the client address to that same last entry; that `POST /api/logs/` returns `429`
   once a client exceeds 30 requests in a minute; and that log reports do not count against the sign-in throttle.
6. In a production frontend build made as CI and the web image make it (no `.env` file, no `VITE_*` variables), no
   emitted file contains `localhost:8444`, and the Vite manifest (`vite build --manifest`) has no entry for a module
   under `src/pages/dev/` or for `src/pages/user/TestLogin.tsx`. A frontend test shows the API base is the page origin
   followed by `/api` when neither variable is set.
7. The production stack, run locally from images built on this branch with `SITE_ADDRESS=localhost` while the
   development stack keeps running: migrations complete as a one-off container; the SPA loads at `/` and on a deep
   link to a movie page; `/api/health-check/` returns `200`; Django admin's files are served under `/static/`; and
   `/admin/` answers `401` without credentials and Django's login page with the configured basic-auth pair, where a
   staff account signs in; no
   `/backend/logs` directory exists in the backend container; and `curl -sI` shows `Cache-Control: no-cache` on `/`,
   on a deep link and on `/index.html`, the immutable policy on a file under `/assets/`, and `404` with
   `Cache-Control: no-store` for a missing file there.
8. A pull request run builds both images without pushing them, and a manual CI run on this branch publishes
   `ghcr.io/andrewrcr/cinexplorer-backend` and `ghcr.io/andrewrcr/cinexplorer-web`, each tagged `sha-` plus the
   commit's first seven characters.
9. The development stack, built with `target: dev`, still serves `https://localhost:8444` with the debug toolbar
   available, and CI's backend tests run on its `dev` image.

### Proven live (on the staging server)

1. `curl -sSf https://staging.cinexplorer.andrewcreekmore.dev/api/health-check/` succeeds without `-k`, the
   certificate is issued by a public certificate authority, and `http://` redirects to `https://`.
2. In a browser on the staging host, the home page, a search, a browse page and a movie detail page load with TMDB
   data, and reloading a movie detail URL loads it directly.
3. Signing in with the account created from the server shell succeeds, and a movie added to the watchlist is still
   there after a reload.
4. From outside the server, connections to ports 5432, 6379 and 8000 fail, and `/admin/` asks for basic auth before
   Django's login page, which the configured pair passes.
5. Following the runbook, a deploy of a newer commit and a rollback to the previous one each finish with the health
   check passing and a sign-in succeeding, and Caddy reuses its stored certificate rather than obtaining a new one.
6. Running `sudo bootstrap.sh` a second time as `deploy` on the configured server completes without error and changes
   nothing.
7. On the server, `sudo sshd -T` reports `passwordauthentication no` and `permitrootlogin no`; from outside it, a
   password-only SSH login and an SSH login as root are both refused.

## 9. Open Questions

None.

## Dependencies and Preconditions

The proven-live criteria depend on these steps outside the repository, which the maintainer performs:

- A DigitalOcean Basic droplet (Regular CPU, 2 GB / 1 vCPU / 50 GB) in San Francisco (SFO2) running Ubuntu 24.04
  LTS, created with the maintainer's SSH key as its only authentication.
- A Cloudflare DNS `A` record for `staging.cinexplorer`, pointing at the server's IPv4 address with proxying off, so
  Caddy can complete its certificate challenge; no `AAAA` record (Design Decision 16).
- A classic personal access token with only `read:packages` for the server's registry login, and a read-only deploy
  key on the repository for its checkout.
- The application's secrets for the server's env files: a new `DJANGO_SECRET_KEY`, the TMDB API key, Postgres
  credentials, and the admin basic-auth pair.

## Amendments

- 2026-11-03: the server moves from a Vultr Regular 2 GB in Dallas to a DigitalOcean Basic droplet (Regular CPU,
  2 GB) in San Francisco (SFO2), the maintainer's revised hosting decision after Vultr never verified the account;
  New York, the first choice, offered no Basic plan when the droplet was created. Dependencies, R24's root-password
  clause and R25's recovery path follow: a droplet created with only an SSH key has no root password, so recovery
  starts with a reset. The code, images, Compose files, CI and DNS pattern are unchanged.
