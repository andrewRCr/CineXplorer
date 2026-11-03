# Task List: Staging Deployment

**PRD:** `prd-staging-deploy.md`
**Created:** 2026-11-01
**Branch:** `technical/staging-deploy`
**Base Branch:** `main`
**Status:** In Progress

## Overview

**Purpose:** Deploy today's application to a public staging host, `https://staging.cinexplorer.andrewcreekmore.dev`,
on one small server, and make the production path real: production images built and published by CI, a production
Compose file and Caddyfile, hosts and origins from the environment, a frontend bundle that works on any host, and a
runbook for setting up the server, deploying a version and rolling it back.

## Scope

### Will Do

- Backend settings for a public host behind Caddy: development tooling only in development, strict `ENVIRONMENT`,
  hosts and origins from the environment, WhiteNoise static files, client identity from the proxy, a throttle on the
  log endpoint, the silenced deploy check and stdout-only logging (R1, R3–R8, R11)
- A production backend image under 300 MB and a web image carrying Caddy, the bundle and the production Caddyfile,
  both from staged Dockerfiles that keep the development images as they are (R2, R9–R16)
- A standalone production Compose file and env templates (R17–R20)
- A CI job that builds both images on every pull request, checks the backend image, and publishes both on pushes to
  `main` and manual runs (R21–R23)
- A bootstrap script and a runbook, followed on a real server for a deploy and a rollback (R24, R25)

### Won't Do

- Automatic deploys, backups, scheduled jobs and monitoring
- Google and GitHub sign-in and every flow that sends email on the deployed host; with ZeptoMail unconfigured, a request
  that sends email fails on staging with a server error
- The production host, a second environment, Cloudflare proxying, IPv6, and anything for scale
- Application behavior beyond the hardening in R1, R3, R5, R7 and R14
- The shared `anon` throttle history and the CSRF token gaps R8 names (both predate this change)
- Per-worktree development stacks; a deployment section in the README

---

## Tasks

### **Phase 1:** The backend is configured for a public host behind a proxy

- [x] **1.1 Settings read the environment strictly** (R3; SC4)

    - [x] **1.1.a Tests:** Added the isolated real-settings helper and strict-environment/list cases; five cases
      failed before implementation. The development-default guard failed with localhost removed, then passed after
      restoration.
    - [x] **1.1.b Implementation:** Moved environment validation before host lists, rejected unknown environments and
      deployed DEBUG, and read hosts/origins as lists with development defaults. Core/authentication tests: 363
      passed; Ruff and Pyright passed.

- [x] **1.2 Development tooling loads only in development** (R1)

    - [x] **1.2.a Tests:** Added real-settings cases for both development apps, middleware and URL, plus request tests
      for both debug endpoints. Deployed cases failed before gating; development guards failed with tooling removed
      and the debug route denied.
      The request cases load routes before changing ENVIRONMENT, so a staging override cannot cache a route table
      without the development toolbar for later tests; the reproduced staging-then-debug sequence passes.
    - [x] **1.2.b Implementation:** Gated development tooling and endpoints on ENVIRONMENT and regenerated API
      descriptions. Environment cases: 29 passed; core/authentication: 374 passed; Ruff and Pyright passed.

- [x] **1.3 Throttles key on the client address Caddy saw** (R5; SC5)

    - [x] **1.3.a Tests:** Added deployed proxy-count, allauth address and per-client login-limit cases. Four deployed
      cases failed before implementation; forced zero proxies broke separate-client isolation and always-set counts
      broke the development guard.
    - [x] **1.3.b Implementation:** Set both trusted proxy counts to one in staging/production and added the two
      exercised allauth stub signatures. Rate-limit tests: 12 passed; Ruff and Pyright passed.

- [x] **1.4 The log endpoint has its own throttle** (R7; SC5)

    - [x] **1.4.a Tests:** Added the 31st-report rejection and no-log-write case, plus login-history isolation. The
      limit case failed before throttling; deliberately using anon made the isolation guard fail.
    - [x] **1.4.b Implementation:** Added FrontendLogThrottle at 30/m with frontend_logs scope and regenerated its API
      description. Rate-limit/logging API tests: 31 passed; Ruff and Pyright passed.

- [x] **1.5 Static files, the health check over plain HTTP, and the silenced deploy check** (R4, R6, R8)

    - [x] **1.5.a Tests:** Added real-settings storage/root/middleware cases and HTTP redirect cases. Six cases failed
      before implementation; valid unconditional storage and an unrelated redirect exemption each broke their guard.
    - [x] **1.5.b Implementation:** Added WhiteNoise 6.12.x, STATIC_ROOT, deployed manifest storage, the health
      exemption and the documented security.W003 silence. Rebuilt the image. Environment tests: 37 passed; Ruff and
      Pyright passed. Filtered only the observed missing collected-static-directory warning.

- [x] **1.6 Logs go to stdout only outside development** (R11's logging; SC7 checks the running container in 4.2)

    - [x] **1.6.a Tests:** Added subprocess coverage for deployed file-handler suppression, the INFO console default,
      its ERROR override, no log-directory creation/probes, and development file logging with DEBUG disabled.
      Five deployed cases failed before implementation; deliberate suppression of development files, changing its
      console default and ignoring the console override broke all three guard cases.
    - [x] **1.6.b Implementation:** Passed the validated environment into the logging factory as an optional keyword,
      disabled deployed file handlers and directory access, and documented the console defaults. Preserved existing
      callers; the legacy database-file-handler check now reads development settings outside pytest's suppression.
      Environment cases: 45 passed. Full backend: 844 passed. The reproduced URL-isolation sequence and both logging
      compatibility files passed together (13 tests); backend Ruff and full Pyright passed. Frontend lint and
      TypeScript checks also passed after the generated description changes. Runtime frontend tests and CI await
      later verification; no deployed-container claim is made here.

### **Phase 2:** The production backend image is small and checked in CI

- [x] **2.1 Runtime dependencies** (R2)
    - `gunicorn` added to `requirements/req.txt` with a bounded range, and `email-validator` moved there from
      `req.dev.txt` with its range and comment
    - New `requirements/req.prod.txt`: `-r req.txt`, then `psycopg[c]` in `req.txt`'s `psycopg` range
      (`>= 3.2.9, < 3.3`)
    - Rebuilt the development image; Gunicorn 26.2.0 and email-validator both import successfully

- [x] **2.2 Split the backend Dockerfile into `dev` and `production` stages** (R9–R12, R23; SC2, SC3, SC9)

    - [x] **2.2.a Explicit development builds:** Added the shared Alpine 3.24 base and named dev stage,
      selected by Compose with the existing UID/GID arguments; development dependencies install unconditionally.
      Removed the two unused standalone CI builds. Backend CI commands now name both Compose files, since root
      discovery found no configuration; grouped dummy env writes to satisfy actionlint's ShellCheck integration.
      Retained binutils in development: without its linker/objdump, ctypes could not discover the installed libpq
      after temporary build tools were removed. An isolated before/after probe reproduced and fixed that startup
      failure. The rebuilt stack serves the frontend and health endpoint; direct admin HTML includes the toolbar
      and its JavaScript loads. Full backend suite: 844 passed. actionlint and Compose target checks passed.

    - [x] **2.2.b Production image:** Added separate dependency-build and runtime stages, with compiled psycopg,
      runtime libpq, a non-root user and build-time static collection using command-scoped placeholders. Collected
      assets are excluded from the build context. Added Gunicorn's threaded-worker defaults and environment overrides;
      WSGI and ASGI now default to config.settings. Static collection runs before the final non-root USER switch.
      The image filesystem is 190,300,093 bytes by du -sxb. Development-package imports and gcc fail as required;
      psycopg reports c. Production URL imports, strict deployment checks, Gunicorn defaults/overrides, ASGI import,
      non-root identity, static manifest and absence of copied env files/log directories/build-only runtime variables
      all passed. Ruff and Pyright passed.

- [x] **2.3 CI builds and checks the production image** (R21's build, R22; SC3)
    - Added the images job with the production target, local image loading, no publishing, and a backend-scoped GHA
      build cache. It enforces the 300,000,000-byte filesystem ceiling and strict Django deploy checks with a generated
      placeholder secret; ci-ok includes this job and package publishing permissions remain absent.
    - actionlint passed. The exact CI scripts passed locally, rejected a one-byte size limit, and rejected a short
      secret with security.W009 under strict deploy checks while ordinary checks accepted it.
    - With first-push approval, pushed the branch and dispatched manual run 41354826882 at commit 9d3876b8.
      All six jobs passed: backend, frontend, type generation, documentation, production images and ci-ok. The hosted
      image filesystem measured 183,016,680 bytes and strict deploy checks reported no issues beyond the documented
      silence. This also validates the development-target CI edits.

### **Phase 3:** The frontend works on any host and ships in a web image

- [x] **3.1 One module gives the base URLs** (R13; SC6's frontend test)

    - [x] **3.1.a Tests:** Added six isolated module-import cases for page-origin defaults, the explicit site origin
      and its derived API address, and API overrides with or without a site override. Three fallback cases failed
      against the old direct-env behavior; deliberately empty exports also broke the three existing override guards.
    - [x] **3.1.b Implementation:** Added config/baseUrls.ts and used its exports in all nine readers across the
      services, authentication hooks and development login page. No localhost:8444 hardcode remains under src.
      Six new cases and 148 related tests passed; ESLint and TypeScript checks passed.

- [x] **3.2 Development routes stay out of production builds** (R14)
    - Guarded all four development lazy imports and their routes with the development condition. Their paths reach
      the existing not-found route in production; the footer already has its development guard.
    - Production manifests contain four development entries before the change and none after it. Used temporary
      output directories because the pre-existing host dist directory is owned by nobody. ESLint and TypeScript
      checks passed; Vitest found no related App test files. Production-route browser checks remain in 4.2.

- [x] **3.3 The production Caddyfile and the web image** (R15, R16; SC6)

    - [x] **3.3.a Production Caddyfile:** Added environment-based site and admin basic-auth settings, plain-HTTP
      backend proxy routes, bundle fallback with no-cache, immutable existing assets and no-store missing assets.
      The four required security headers apply to responses, including Caddy's own errors. Caddy's documented
      default ignores client-supplied forwarding headers; no trusted proxy configuration is set. Formatted and
      validated with caddy:2.11-alpine and test values; response-level checks follow with the image.

    - [x] **3.3.b Web image:** Named the development stage and selected it in Compose; added a Node build stage
      running npm ci, Chakra type generation and the production build, plus the Caddy 2.11 runtime with its named
      infrastructure context. Rebuilt the development frontend and verified its page and module through Caddy.
      In the isolated build stage, no env files or VITE variables exist; a manifest build contains no development
      pages, and no dist file contains localhost:8444. A standalone web container passed page/deep-link/index cache
      checks, immutable assets, uncached missing assets/directories, all four security headers, absence of CORS
      headers and admin basic-auth enforcement. Full frontend suite: 761 passed; lint and TypeScript checks passed.

    - [x] **3.3.c CI web image:** Added the production web build to the images job with the named infrastructure
      context, local image loading, no publishing and its own web cache scope. actionlint and the local named-context
      build passed. Manual run 41356513034 at 142034b5 passed all six jobs, including both production builds, backend
      and frontend checks, type generation, documentation and ci-ok. Local and hosted frontend suites: 761 passed;
      hosted backend suite: 844 passed.

### **Phase 4:** The production stack runs and CI publishes it

- [x] **4.1 Production Compose and env templates** (R17–R20; SC1)
    - Replaced the override stub with the standalone cinexplorer-prod project: versioned application images, Caddy
      data/config volumes, isolated database storage, cache-only Redis, backend health/dependency checks, required
      image/site inputs, resource limits and rotated container logs. Only web publishes ports, on 80 and 443 TCP
      plus 443 UDP. Site-derived settings and shared database credentials reach the backend through Compose.
    - Added prod.env.example with a single-quoted bcrypt placeholder and updated the backend template's commented
      production checklist, preserving its live development defaults. Config checks validate ports, policies,
      derived values and missing-input rejection.
    - Moved development Postgres to 17-alpine3.24 with its existing volume. User/migration counts are unchanged;
      backend ORM and proxy health checks pass, and the full backend suite passed all 844 tests.

- [x] **4.2 Local production stack** (SC7)
    - Built both current production images under their GHCR names with the local tag. Ran one-off migrations and
      started the isolated stack with staging settings, temporary credentials and the development TMDB key loaded
      without printing it; both env files stayed outside the checkout at mode 600.
    - HTTP checks passed for HTTPS health, staging HSTS, admin static assets/basic auth, plain-HTTP redirects,
      page/deep-link/index cache headers, immutable assets, uncached asset 404s, all four security headers and the
      non-root backend with no logs directory. Changing supplied forwarding headers still yielded five successful
      sign-ins then 429. The movie API returned real TMDB data.
    - Headless Chrome rendered home and the movie page with its poster, reloaded the deep link, showed not-found on
      both development paths, made no requests to the development origin and reported no uncaught script errors.
      A verified staff account created in a one-off container signed in through the Caddy gate and Django admin.
      Screenshots and check summaries are in the personal evidence workspace.
    - Every stack operation used the explicit production file and run env file. Teardown removed its containers,
      volumes and temporary credential files; development stayed healthy and its user/migration counts are unchanged.

- [x] **4.3 CI publishes both images** (R21; SC8)
    - Added job-scoped registry login and cached publishing after both checked builds. Manual runs publish both
      images with seven-character SHA tags; main pushes also publish the main tag. Only this job has package-write
      permission, and pull requests build without publishing. actionlint passed.
    - Manual run 41358836511 at 9d75e13f passed all six jobs and published both GHCR images with tag sha-9d75e13.
      Registry login and both manifest pushes succeeded; image names and run evidence are in the personal workspace.
    - With approval, opened draft PR 24 against main using the approved title and body. Its run 41359341000 passed
      all six jobs: both production builds succeeded, while registry login and both publishing steps were skipped.
      Backend logs confirm the development image target and 844 passing tests; frontend tests passed all 761 cases.

### **Phase 5:** Staging is set up and deployed by the runbook

- [x] **5.1 Write `infrastructure/deploy/bootstrap.sh`** (R24)
    - Added Ubuntu 24.04/root preconditions and state checks for Docker's apt packages, deploy user/SSH keys,
      Docker membership, validated passwordless sudo, deployment directory, UFW rules, security updates, UTC reboot
      scheduling and 2 GiB swap. Each step reports changed or unchanged; root's password is untouched.
    - The first-sorting SSH drop-in is checked with both sshd syntax and effective settings before reload; a failed
      check restores the prior file without reloading. Unexpected UFW rules stop rather than remain silently open.
    - Bash syntax and ShellCheck pass. In an isolated Ubuntu 24.04 container, installed real Docker packages and
      validated actual SSH/sudo parsers. A second run as deploy through sudo changed no checked files or recorded
      service actions. Conflicting SSH settings stopped safely; key-permission and SSH-setting drift were repaired.
      Fixed a reproduced pipefail/SIGPIPE false failure by saving sshd output before matching it.
    - Service control, timezone, firewall activation and swap activation were stubbed in that container; live
      idempotence and outside SSH/firewall checks remain in 5.3. Evidence is in the personal workspace.

- [x] **5.2 Write the runbook, `infrastructure/deploy/README.md`** (R25)
    - Documented Vultr/DNS setup, copying bootstrap before checkout, a second deploy-user SSH session before closing
      root, read-only repository/registry access, mode-600 env files and exact staging edits, first deployment and a
      verified staff account created interactively without email delivery.
    - Added versioned deployment and rollback commands, comparing migrations in both images against the live
      database, including third-party migrations. Reversals use the newer image, with dependency-plan inspection,
      data-loss and irreversible-migration stops; unchanged schemas skip reversal. Also covered health/browser checks,
      logs, restarts, persistent volumes, host maintenance and Vultr console recovery.
    - Markdown lint and all 22 shell-block syntax checks pass. Every Compose command selects the production file
      and external env file. Executed the documented account code against development inside a rolled-back
      transaction: staff status, password and verified email passed, with no account retained.
    - Following the runbook on a real server, including deploy/rollback and certificate reuse, remains in 5.3.

- [x] **5.3 Set up staging and prove it live** (live criteria 1–7)
    - Runs on a DigitalOcean Basic droplet in San Francisco (SFO2), not Vultr, which never verified the account (PRD
      amendment 2026-11-03); the runbook's server, firewall and recovery steps were updated to match before setup.
      Its Cloud Firewall allows inbound TCP 22, 80 and 443 and UDP 443 only.
    - Followed the runbook on the droplet: the bootstrap as root; the deploy-user, SSH-setting and refusal checks; a
      read-only deploy key, checked against GitHub's published host fingerprint; a registry token; both env files at
      mode 600; the first deploy at `c926146b` (publishing run 41682541067), where Caddy obtained a Let's Encrypt
      certificate on its first attempt; and the verified account created from the server shell. Health, the HTTPS
      redirect, admin basic auth, the closed ports and the browser checks passed.
    - The bootstrap's second run as `deploy` failed: its active-swap check passed `--output`, which `swapon` reads as
      its hidden `--output-all`, so the line never matched and the rerun re-enabled active swap (exit 255). 5.1's
      container check had stubbed swap activation. Fixed with `--show=NAME`; rerun from the checkout at `4b10fafa`,
      every step reported unchanged.
    - Runbook fixes: the root-refusal check requires `Server accepts key` before the refusal, since under `BatchMode`
      a passphrase-locked key failed without testing the root setting; the registry login says the token, not the
      GitHub password, goes at the prompt.
    - Deployed `4b10fafa` (publishing run 41690802887) and rolled back to `c926146b`. Each finished with the health
      check passing, a sign-in succeeding with the watchlist intact, and the stored certificate reused (same serial,
      no new order). Both images list the same 70 applied migrations, so the comparison skipped reversal; that path
      stays unexercised until a change ships a migration. Staging was then rolled forward to `4b10fafa`.
    - `migrate` reports unmigrated `accounts` model changes; they predate this branch and are captured as an errand.

### **Phase 6:** Verification

- [ ] **6.1 Verify the work** (load `archive-completed.md` § 1: criteria validation and verification review)

## Implementation Notes

### Phase 1

- **The settings subprocess helper:** `config/settings.py` calls `environ.Env.read_env()` on `config/.env`, which
  fills only variables the process lacks, so a case cannot unset a variable that file defines. Today's `.env`, its
  example and CI's generated `.env` define none of the three host variables; pass `ENVIRONMENT` and `DEBUG` explicitly
  in every case, and `DJANGO_ALLOWED_HOSTS` in every `staging` or `production` case not about it, since 1.1.b makes
  it required there. The child starts from the test process's environment minus the variables that steer logging and
  test detection, none of which an env file defines: `DJANGO_CONSOLE_LOG_LEVEL` and `DJANGO_LOG_LEVEL` (the
  development Compose file sets the first to `DEBUG`), `TESTING`, and the CI markers `get_logging_config()` and
  `ensure_log_directory()` read (`CI`, `GITHUB_ACTIONS`, `CONTINUOUS_INTEGRATION`, `BUILD_NUMBER`; CI's backend
  container sets `CI=true`). A case sets one of them only when it is the case's subject. pytest-django exports
  `DJANGO_SETTINGS_MODULE=config.settings_test`, which the child would inherit, so the helper sets it to
  `config.settings` before any `django.setup()` case
- **Docstrings are API schema:** Django Ninja uses an endpoint's docstring as its OpenAPI description
  (`ninja/operation.py`), and CI's type-generation job fails when the regenerated `api.ts` differs from the committed
  one, so a docstring edit lands with the regenerated `openapi.json` and `api.ts`
- **Guard cases:** a case that passes before its task's change guards behavior the change must keep. See it fail once
  against a narrow, deliberate break of that behavior (for example one host dropped from the development defaults),
  then restore it
- **Throttle tests** follow `test_rate_limiting.py`'s pattern: `@pytest.mark.enable_throttling`,
  `override_settings(TESTING=False)`, and the `clear_throttle_cache` and `enable_throttling_for_test` fixtures from
  `apps/authentication/tests/conftest.py`; the test client sends `X-Forwarded-For` as `HTTP_X_FORWARDED_FOR`
- **Tests outside `apps/` don't run:** `pyproject.toml`'s `testpaths` is `["apps"]` and CI runs `pytest apps/`, so new
  tests go under `apps/`, not `config/tests/`
- **`STORAGES`:** Django 5.2 reads storage from `STORAGES` only; overriding it replaces both entries, so keep
  `default` as Django's `FileSystemStorage`
- **WhiteNoise without `collectstatic`:** when `DEBUG` is off and `STATIC_ROOT` doesn't exist, as in CI's tests,
  check whether WhiteNoise warns `No directory at:` each time its middleware loads; if so, filter that one message in
  `pyproject.toml`'s `filterwarnings` with a comment giving the reason

### Phase 2

- **Alpine 3.24's packages:** `libpq` and `libpq-dev` are 18.6, which works with a Postgres 17 server; `build-base`
  carries the compiler. Today's build step also installs Alpine's `python3-dev`, which brings Alpine's own Python;
  the new build stage needs only `build-base` and `libpq-dev`, since the base image carries Python's headers
- **The `dev` stage stays today's image:** `postgresql-client`, `postgresql-dev`, `curl` (the development health
  check), `git`, `bash`, `shadow` and `su-exec`, and the `USER_UID`/`USER_GID` arguments the development Compose file
  passes
- **The unused CI builds:** both standalone builds tag and load an image no later step uses, since Compose builds the
  `backend` service itself; the backend job's pip cache step serves its host Pyright run and stays
- **Image size:** measure the image's files, which reads the same on any image store:
  `docker run --rm --user root --entrypoint sh <image> -c 'du -sxb /'`, as root so every directory is readable, and
  compare against 300,000,000 bytes. `docker image inspect`'s `.Size` depends on the store and the engine version: on
  the maintainer's machine (Docker 29.9.2, containerd image store) it is the compressed content plus the unpacked
  files, 1,385,469,478 for the development backend image against `du`'s 880,237,516 and a 369 MB content size, while
  Docker 29.1 on the same store reports the compressed content alone (`daemon/containerd/image_inspect.go`)
- **The generated secret key** must pass `security.W009`: at least 50 characters, at least 5 distinct, and not
  prefixed `django-insecure-`; `python -c "import secrets; print(secrets.token_urlsafe(50))"` does

### Phase 3

- **Base URL tests:** `import.meta.env` is read when a module loads, so each case stubs with `vi.stubEnv()`, calls
  `vi.resetModules()` and imports the module afresh; treat an empty value as unset, which lets a case stub `''`.
  `frontend/.env` sets both variables during tests, so every case stubs both
- **Dropping the debug pages from the bundle:** Rollup emits a chunk for every reachable `import()`, so the guard
  must wrap the `lazy()` declarations; in a production build `import.meta.env.DEV` is `false`, and the dead branch
  goes with its import
- **Caddy:** a `header` directive applies before the response is written unless deferred, and an error response keeps
  headers already set, so give the immutable policy only to requests the `file` matcher finds under `/assets/` and
  answer the rest with their own `no-store` `404`. Header matchers see the original path, not `try_files`'s rewrite,
  so match `index.html`'s `no-cache` on every bundle response outside `/assets/` (or after the rewrite); SC7 checks
  `/`, a deep link and `/index.html`
- **`frontend/src/types/api.ts` is tracked,** so the web image's build stage needs no schema export before `tsc -b`

### Phase 4

- **`depends_on`:** `docker compose run` starts a service's dependencies unless given `--no-deps`, so `backend`'s
  conditions (`db` healthy, `redis` started) make the deploy's one-off migration container start the database
- **The backend health check** runs `python -c` with `urllib.request.urlopen` on
  `http://localhost:8000/api/health-check/` and a timeout; `urlopen` raises on a non-2xx status, so the command fails
  with it. R6 exempts the path from the HTTPS redirect, and R17's `localhost` entry matches its `Host` header
- **`postgres:17` keeps its data in `/var/lib/postgresql/data`;** the development volume moves from 17.5 to the current
  17.x without a dump, since both are Postgres 17
- **Redis as a cache:** `redis-server --save "" --appendonly no --maxmemory` below the 64 MB container limit, and
  `--maxmemory-policy allkeys-lru`
- **SC1's `config` run:** `config` reads every `env_file`, and the example's `BACKEND_ENV_FILE` names a path on the
  server; pass `--no-env-resolution`, or point `BACKEND_ENV_FILE` at `../backend/config/.env.example` for the check,
  since Compose resolves a relative `env_file` path from the Compose file's folder
- **The local run's env files** stay outside the repository (the session's scratch space), and hold no production
  secrets; the TMDB key comes from the development env file and is never printed
- **CI publishing:** the job builds and loads each image for its checks, then pushes in a second build-push step that
  reuses the cache, so the checks always run on what gets pushed

### Phase 5

- **Ubuntu's SSH unit is `ssh`:** validate with `sshd -t`, then `systemctl reload ssh`; live criterion 7's outside
  probes, not the reload's exit status, show the running daemon took the change
- **Unattended reboots** use `Unattended-Upgrade::Automatic-Reboot "true"` and
  `Unattended-Upgrade::Automatic-Reboot-Time "09:00"`, read in the server's local time, so the bootstrap checks the
  time zone is UTC (`timedatectl`) and sets it when it is not
- **Docker's apt repository:** the key in `/etc/apt/keyrings/docker.asc` and a `docker.list` source for the release's
  codename; `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin` and `docker-compose-plugin`

## Success Criteria

### Implemented (checkable locally and in CI)

- [x] `docker compose -f infrastructure/docker-compose.prod.yml config`, with the example env values, shows published
  ports only on `web`, and only 80/tcp, 443/tcp and 443/udp.
    - 2026-11-03 at `940bd82a`, with `prod.env.example` and `BACKEND_ENV_FILE` set to the backend example (the
      template's server path does not exist locally): only `web` publishes, on 80/tcp, 443/tcp and 443/udp
- [x] The backend production image is under 300 MB. Inside it, `python -c "import debug_toolbar"`,
  `python -c "import django_extensions"` and `gcc --version` each fail, while
  `python -c "import psycopg; print(psycopg.pq.__impl__)"` prints `c` and
  `python manage.py shell -c "import config.urls"` succeeds under `ENVIRONMENT=production` with placeholder values
  for R10's variables.
    - `production` target built locally at `940bd82a`: 190,300,093 bytes by `du -sxb /`; both imports fail with
      `ModuleNotFoundError` and `gcc` is not found; psycopg reports `c`; `config.urls` imports with CI's placeholders
- [x] Inside the backend production image, `python manage.py check --deploy --fail-level WARNING` exits 0 under
  `ENVIRONMENT=production` with a generated placeholder secret key and placeholders for R10's other variables.
    - Same image with CI's placeholders and a generated `token_urlsafe(50)` key: "no issues (1 silenced)", exit 0;
      CI's image job runs the same check on every pull request and publish
- [x] With `ENVIRONMENT=staging` and `DJANGO_ALLOWED_HOSTS` unset, Django fails to start with `ImproperlyConfigured`
  naming `DJANGO_ALLOWED_HOSTS`; with it set and the two origin variables unset, `CSRF_TRUSTED_ORIGINS` and
  `CORS_ALLOWED_ORIGINS` are empty. With `ENVIRONMENT=development` and the variables unset, the three settings equal
  today's localhost lists. With `ENVIRONMENT=staging` and `DEBUG=True`, Django fails to start with
  `ImproperlyConfigured`, and likewise with `ENVIRONMENT` set to an unrecognised value. Backend tests assert each
  case by loading the real settings module under that environment, for example by importing it in a subprocess, and
  they replace the test in `apps/authentication/tests/integration/test_environment_config.py` that an unrecognised
  value falls back to `development`.
    - `test_invalid_deployment_settings` (an `ImproperlyConfigured` naming each of `DJANGO_ALLOWED_HOSTS`, `DEBUG`
      and `ENVIRONMENT`), `test_staging_origins_default_to_empty` and `test_development_host_and_origin_defaults`
      (equal to `main`'s lists) read the real settings in a subprocess; the fallback test is gone; all pass
- [x] Backend tests show, under the staging proxy setting, that requests to a throttled endpoint from two different
  client addresses in `X-Forwarded-For` are counted separately, that a header with two entries is counted under the
  last, and that allauth resolves the client address to that same last entry; that `POST /api/logs/` returns `429`
  once a client exceeds 30 requests in a minute; and that log reports do not count against the sign-in throttle.
    - `test_forwarded_clients_share_only_their_own_login_limit` (both cases),
      `test_allauth_uses_last_forwarded_address`, `test_frontend_logs_throttle_without_writing_rejected_report` (429
      after 30) and `test_frontend_logs_do_not_consume_login_limit` pass under the staging proxy setting
- [x] In a production frontend build made as CI and the web image make it (no `.env` file, no `VITE_*` variables), no
  emitted file contains `localhost:8444`, and the Vite manifest (`vite build --manifest`) has no entry for a module
  under `src/pages/dev/` or for `src/pages/user/TestLogin.tsx`. A frontend test shows the API base is the page origin
  followed by `/api` when neither variable is set.
    - In the web image's build stage (no env files, no `VITE_*`): no `dist` file, nor any in the image's `/srv`,
      contains `localhost:8444`; a `--manifest` build lists 15 pages, none under `src/pages/dev/` and no
      `TestLogin.tsx`; `baseUrls.test.ts`'s page-origin case passes
- [x] The production stack, run locally from images built on this branch with `SITE_ADDRESS=localhost` while the
  development stack keeps running: migrations complete as a one-off container; the SPA loads at `/` and on a deep
  link to a movie page; `/api/health-check/` returns `200`; Django admin's files are served under `/static/`; and
  `/admin/` answers `401` without credentials and Django's login page with the configured basic-auth pair, where a
  staff account signs in; no
  `/backend/logs` directory exists in the backend container; and `curl -sI` shows `Cache-Control: no-cache` on `/`,
  on a deep link and on `/index.html`, the immutable policy on a file under `/assets/`, and `404` with
  `Cache-Control: no-store` for a missing file there.
    - Images built locally at `940bd82a`, as project `cinexplorer-verify` beside the running development stack: one-off
      migrations; `/`, `/movie/550` and `/index.html` 200 with `no-cache`; an asset immutable, a missing one 404
      `no-store`; health 200; admin CSS 200 under `/static/`; `/admin/` 401, then Django's login with the pair, where
      a staff account reached Site administration; no `/backend/logs`. Torn down with its volumes
- [x] A pull request run builds both images without pushing them, and a manual CI run on this branch publishes
  `ghcr.io/andrewrcr/cinexplorer-backend` and `ghcr.io/andrewrcr/cinexplorer-web`, each tagged `sha-` plus the
  commit's first seven characters.
    - Pull-request run 41360993462 at `f391821` built both images with login and publishing skipped (the workflow is
      unchanged since); manual runs 41682541067 and 41690802887 published `sha-c926146` and `sha-4b10faf`, which the
      staging server pulled
- [x] The development stack, built with `target: dev`, still serves `https://localhost:8444` with the debug toolbar
  available, and CI's backend tests run on its `dev` image.
    - Rebuilt at `940bd82a`, both services on `target: dev`: `https://localhost:8444` 200; the toolbar renders on the
      backend's own port and its script loads (port 8000, as task-list pass 2 settled); CI run 41690802887 built the
      `dev` stage and ran 844 tests on it

### Proven live (on the staging server)

- [x] `curl -sSf https://staging.cinexplorer.andrewcreekmore.dev/api/health-check/` succeeds without `-k`, the
  certificate is issued by a public certificate authority, and `http://` redirects to `https://`.
    - 2026-11-03: succeeds without `-k`; Let's Encrypt (YE1) certificate; `http://` answers 308 to `https://`
- [x] In a browser on the staging host, the home page, a search, a browse page and a movie detail page load with TMDB
  data, and reloading a movie detail URL loads it directly.
    - The Owner, after the first deploy: home, search, browse and a movie detail page with TMDB data; the detail URL
      reloaded directly
- [x] Signing in with the account created from the server shell succeeds, and a movie added to the watchlist is still
  there after a reload.
    - The Owner signed in with the shell-created account; the watchlist movie survived a reload, and again after the
      newer deploy and after the rollback
- [x] From outside the server, connections to ports 5432, 6379 and 8000 fail, and `/admin/` asks for basic auth before
  Django's login page, which the configured pair passes.
    - Ports 5432, 6379 and 8000 time out from outside; `/admin/` answers 401 with a basic-auth challenge, and the
      Owner passed the pair to Django's login
- [x] Following the runbook, a deploy of a newer commit and a rollback to the previous one each finish with the health
  check passing and a sign-in succeeding, and Caddy reuses its stored certificate rather than obtaining a new one.
    - Deployed `4b10fafa` and rolled back to `c926146b` by the runbook: the health check passed and the Owner signed in
      after each; the certificate kept its serial and issue time, with no new order in Caddy's logs
- [x] Running `sudo bootstrap.sh` a second time as `deploy` on the configured server completes without error and changes
  nothing.
    - From the checkout at `4b10fafa`, after the swap-check fix: exit 0, 34 steps unchanged, none changed (5.3)
- [x] On the server, `sudo sshd -T` reports `passwordauthentication no` and `permitrootlogin no`; from outside it, a
  password-only SSH login and an SSH login as root are both refused.
    - `sshd -T` reports both `no`; a password-only login is offered only `publickey` and refused; root's key is accepted
      and the login refused

## Review Log

### 2026-11-01 — PRD, Pass 1

- **Rubric:** planning-review `artifact: spec` — assess-design-proportionality, design-audit, spec-review with
  source-grounding; runner independent (fresh read-only subagent)
- **Findings (verified):** 1 critical, 6 major, 7 minor; proportionality held. F2 (libpq on Alpine) confirmed by
  experiment; F5 (IPv6 through Docker's userland proxy) accepted from Docker's documentation, not run live
- **Dispositions (Owner approved all, 2026-11-01):** all 14 fixed. Choices: `psycopg[c]` built in the production build
  stage (Decision 15; placed in a production-only `req.prod.txt` so dev, CI and local venvs need no compiler); IPv4
  only on staging (Decision 16). Also: `email-validator` to `req.txt`; typegen in the web build; SC6 checks the Vite
  manifest; dev endpoints gated on `ENVIRONMENT`; code-only rollback with a reverse-migration step; full env list for
  build and CI; `name: cinexplorer-prod`; single-quoted bcrypt hash and a sign-in criterion; Caddy XFF wording;
  logger and Swagger wording; non-goal narrowed; Google note dropped
- **Stop reason:** fixes landed; fix check offered
- **Elapsed:** about 24 minutes (reviewer), plus verification

### 2026-11-01 — PRD, Fix check, round 1 since pass 1

- **Rubric:** fold verification — closure, behavioral grounding, propagation and completeness, new failure; runner
  independent (fresh read-only subagent)
- **Closure:** 13 of pass 1's 14 closed, 1 partly (finding 1, through SC2's missing `ENVIRONMENT`)
- **Findings (verified):** 5 minor, one outside the folds' diff (allauth's proxy count)
- **Dispositions (Owner approved all, 2026-11-01):** all 5 fixed — SC2 under `ENVIRONMENT=production` and the
  production image defaults `ENVIRONMENT=production`; rollback sources migrations from the checkout and states
  irreversible and data-loss cases; `DEBUG=True` fails startup outside development; Decision 15's update-path wording;
  `ALLAUTH_TRUSTED_PROXY_COUNT=1` beside `NINJA_NUM_PROXIES` with a test
- **Stop reason:** minor-only repairs; round 2 declined on the Owner's approval of the recommendation; pass 2 approved
  (pass 1 did not converge)
- **Elapsed:** about 20 minutes (reviewer), plus verification

### 2026-11-01 — PRD, Pass 2

- **Rubric:** as pass 1; runner independent (fresh read-only subagent)
- **Findings (verified):** 2 major, 6 minor; proportionality held; round-1 repairs held under re-attack
- **Dispositions (Owner approved all, 2026-11-01):** all 8 fixed — `/api/logs/` gets its own `frontend_logs` throttle
  scope (the auth endpoints' shared `anon` history captured to the inbox for launch-readiness); `deploy` gets
  passwordless sudo, re-runs the bootstrap with it, Vultr console named as the way back in; rollback compares the two
  images' migrations; `gthread` workers with a 60 s timeout; stdout-only logging outside development (Decision 17),
  logs volume dropped; Decision 8 names everything Redis holds; password-reset label; COOP in Caddy's headers
- **Stop reason:** material fixes landed; fix check approved; pass 3 approved (pass 2 did not converge)
- **Elapsed:** about 23 minutes (reviewer), plus verification

### 2026-11-01 — PRD, Fix check, round 1 since pass 2

- **Rubric:** fold verification — closure, behavioral grounding, propagation and completeness, new failure; runner
  independent (fresh read-only subagent)
- **Closure:** 7 of pass 2's 8 closed, 1 partly (finding 8, through Django's HSTS)
- **Findings (verified):** 5 minor, all inside the folds' diff; F5's precondition grounded in Vultr's documentation
- **Dispositions (Owner approved all, 2026-11-01):** all 5 fixed — console handler at `INFO` in staging and production,
  SC7 checks no files under `/backend/logs`; the 60 s timeout described as a worker-liveness check; R16's parity claim
  narrowed to its four headers, HSTS left with Django; rollback compares both images' `showmigrations` and takes an
  app the older image lacks to `zero`; only SSH root login disabled, root's password kept for the Vultr console
  (Overview tab), and Dependencies requires the server without Limited User Login
- **Stop reason:** minor-only repairs; round 2 not recommended; pass 3 approved (pass 2 did not converge)
- **Elapsed:** about 12 minutes (reviewer), plus verification

### 2026-11-01 — PRD, Pass 3

- **Rubric:** as pass 1; runner independent (fresh read-only subagent)
- **Findings (verified):** 1 major, 7 minor; proportionality held; earlier repairs held under re-attack. F1 confirmed
  on Docker Hub and Alpine's release page (`python:3.13-alpine3.21` last rebuilt 2025-12, Alpine 3.21 support ends
  2026-11-01, Postgres 17 at 17.11)
- **Dispositions (Owner approved all, 2026-11-01):** all 8 fixed — third-party images name maintained release lines
  (`python:3.13-alpine3.24`, `caddy:2.11-alpine`, `postgres:17-alpine3.24` in both Compose files; `redis:7.4-alpine` the
  named exception), Decision 15 restated; R8 names the pre-existing CSRF gap, recorded as a non-goal and captured to
  the inbox for launch-readiness; unrecognised `ENVIRONMENT` fails startup; no log directory created or probed in
  staging and production; SPA cache headers and `404` for missing assets; host-derived backend values built from
  `SITE_ADDRESS` in Compose, deploy checks health through the public URL; live criterion on `sshd -T`; `.env.example`
  checklist trimmed of contradicted steps
- **Stop reason:** material fix landed (F1); fix check approved; pass 4 approved (pass 3 did not converge)
- **Elapsed:** about 26 minutes (reviewer), plus verification

### 2026-11-01 — PRD, Fix check, round 1 since pass 3

- **Rubric:** fold verification — closure, behavioral grounding, propagation and completeness, new failure; runner
  **separation-failure** (fresh read-only subagent; the account carried an author verification claim on R15/R19 and
  disposition rationale on R17, so the run is not independent evidence; every finding was still grounded at source)
- **Closure:** 6 of pass 3's 8 closed, 2 partly (finding 7, config not daemon; finding 8, the checklist's URL lines)
- **Findings (verified):** 5 minor, one a new failure from finding 5's fold (the `404` could carry the immutable header)
- **Dispositions (Owner approved all, 2026-11-01):** all 5 fixed — the `404` for a missing asset carries `no-store`
  and the immutable policy applies only to existing files; SC7 checks `no-cache` on `/`, a deep link and
  `/index.html`; the bootstrap reloads SSH and live criterion 7 adds outside probes; R8 and the non-goal name the
  exempt public auth endpoints (forced sign-in), inbox errand widened; `.env.example` checklist drops the
  `FRONTEND_URL`/`BACKEND_URL` steps
- **Stop reason:** minor-only repairs; round 2 not recommended; pass 4 approved (pass 3 did not converge). Pass 4's
  account carries Owner choices only, no author rationale
- **Elapsed:** about 22 minutes (reviewer), plus verification

### 2026-11-01 — PRD, Pass 4

- **Rubric:** as pass 1; runner independent (fresh read-only subagent; the account carried Owner choices only)
- **Findings (verified):** 5 minor, none critical or major; earlier repairs, base-image facts and R5 held under
  re-attack. F4 confirmed at source: no CSRF check reads `CSRF_TRUSTED_ORIGINS` beyond admin's same-origin
  `csrf_protect` (proxy SSL header set in staging and production), and allauth's `is_safe_url` adds its hosts to the
  safe-redirect set. F1 confirmed: password reset and resend raise `EmailDeliveryError` uncaught; sign-up rolls back
  and returns `500`
- **Dispositions (Owner approved all, 2026-11-01):** all 5 fixed — the email non-goal covers every flow that sends
  email and states the staging failure; R17 gives `web` its `environment`, `backend` waits on `db` healthy and `redis`
  started, and the health check uses Python's `urllib`; SC4's tests load the real settings module and replace the
  fallback test, and R3 joins the non-goal's hardening list; `CSRF_TRUSTED_ORIGINS` defaults to empty outside
  development like `CORS_ALLOWED_ORIGINS` (R3, R10, R17, SC4, Decision 10); R20 drops the checklist's
  `POSTGRES_PASSWORD` step and lists "every variable a deployment must set"
- **Stop reason:** converged (no critical or major finding fixed); no fix check
- **Post-settle reread:** coherence held; 3 wording slips in the pass-4 edits fixed. Owner approved one addition:
  SC7's admin check ends with a staff account signing in, the proof that empty `CSRF_TRUSTED_ORIGINS` leaves
  admin's same-origin login working. PRD committed (`c8198682`)
- **Elapsed:** about 26 minutes (reviewer), plus verification

### 2026-11-01 — Task list, Pass 1

- **Rubric:** planning-review `artifact: task-list` — task-audit at full depth (source-grounding floor and the eight
  categories) with executability, over the PRD; runner independent (fresh read-only subagent)
- **Findings (verified):** 3 major, 8 minor; all 11 confirmed at source. F7 answered with a local `.Size`
  measurement whose reading the fix check below corrected
- **Dispositions (Owner approved all, 2026-11-01):** 10 fixed, 1 carried as context. Fixed: 1.2.b and 1.4.b
  regenerate and commit the API types; 1.3.a's in-process cases run under the staging proxy counts read through the
  helper, with a seen-failing run for the two-clients and log-separation cases; the helper drops
  inherited logging and CI variables, lives in `apps/core/tests/test_helpers.py` and leaves out undefined names, and
  the `DEBUG` and `qa` cases check their messages; 4.2's backend env file adds the secret key and
  `ENVIRONMENT=staging`; Phase 5 names the `scp` transfer, the deploy key's timing and per-step change reports; the
  production entries are commented in `.env.example`; the size note's evidence; 2.3's negative case is a short
  secret key; 4.2's `X-Forwarded-For` wording. Carried: the rollback's reverse-migration path stays unexercised (5.3)
- **Stop reason:** material fixes landed; fix check offered
- **Elapsed:** about 28 minutes (reviewer), plus verification

### 2026-11-01 — Task list, Fix check, round 1 since pass 1

- **Rubric:** fold verification — closure, behavioral grounding, propagation and completeness, new failure; runner
  independent (fresh read-only subagent; the account carried Owner choices only)
- **Closure:** 10 of pass 1's 11 closed, 1 partly (finding 7, through the `.Size` label)
- **Findings (verified):** 1 major, 2 minor. F1 confirmed by measurement (for the development backend image, `du`
  880 MB against `.Size` 1,385 MB and a 369 MB content size) and in Docker 29.1's source
- **Dispositions (Owner approved all, 2026-11-01):** all 3 fixed — the size check measures the image's files with
  `du -sxb /` as root against 300,000,000 bytes, and 2.3's runner comparison is dropped; 5.2's backend env file fills
  in a new secret key and the TMDB key; 1.1.a, 1.2.a, 1.5.a and 1.6.a name their failing and guard cases, with a
  Phase 1 note on seeing a guard case fail
- **Stop reason:** material fix landed; round 2 not taken; pass 2 approved (pass 1 did not converge)
- **Elapsed:** about 22 minutes (reviewer), plus verification

### 2026-11-01 — Task list, Pass 2

- **Rubric:** as task-list pass 1; runner independent (fresh read-only subagent; the account carried Owner choices
  only)
- **Findings (verified):** 1 major, 6 minor; the round-1 repairs held under re-attack. F1 confirmed at source
  (`config/wsgi.py` and `config/asgi.py` default to `backend.settings`); F2 confirmed on the running development stack
  (the toolbar renders on port 8000, not through 8444)
- **Dispositions (Owner approved all, 2026-11-01):** 6 fixed, 1 to the inbox. Fixed: 2.2.b sets both entry points'
  default to `config.settings` and its check loads the application; 2.2.a checks the toolbar on the backend's own
  port; 4.2's commands and teardown name the production Compose file; the server's env files live at
  `/opt/cinexplorer/prod.env` and `/opt/cinexplorer/backend.env`, and the backend one drops the lines Compose sets and
  the ZeptoMail and OAuth placeholders; the settings helper takes pre-import code, reads after `django.setup()` and
  converts values to strings; 1.1.a rewrites the test module's docstring. Inbox: Django Ninja's shared throttle state
  under threaded workers, linked to the throttle-scope errand
- **Stop reason:** material fix landed (F1); fix check approved; pass 3 decided after it
- **Elapsed:** about 30 minutes (reviewer), plus verification

### 2026-11-01 — Task list, Fix check, round 1 since pass 2

- **Rubric:** fold verification — closure, behavioral grounding, propagation and completeness, new failure; runner
  independent (fresh read-only subagent; the account carried Owner choices only)
- **Closure:** 4 of pass 2's 6 fixed findings closed, 2 partly (finding 5, the helper's request form; finding 6, the
  docstring's description); finding 7 outside the task list by the Owner's choice
- **Findings (verified):** 4 minor, none critical or major; one outside the folds' diff (the SC1 note's relative
  `env_file` path)
- **Dispositions (Owner approved all, 2026-11-01):** all 4 fixed — 2.2.b's reason restated (the development server
  imports `config.wsgi` after `manage.py` sets the variable); the test module's docstring describes its subject and
  its three kinds of test; the helper's requests are dotted names read in the child, with pre-import observations
  stored under a requested name; the SC1 note's fallback is `../backend/config/.env.example` and 4.2's
  `BACKEND_ENV_FILE` is absolute
- **Stop reason:** Owner stopped the loop on the recommendation (minor-only check; pass 2's one major was an isolated
  source fact, and every earlier repair held); pass 2 did not converge, and pass 3 was not taken
- **Post-settle suite-coherence pass:** coverage of R1–R25 and every success criterion, task ordering, cross-task
  interfaces and size (six phases, under 1,000 lines) held; 1.5.a and 1.6.a now name their test file, and three
  wrapped lines were rejoined
- **Elapsed:** about 12 minutes (reviewer), plus verification

### 2026-11-03 — Verification, author criteria walk

- **Rubric:** validate-criteria over the work unit: the 16 Success Criteria, `main...HEAD` at `940bd82a` and its tree;
  runner the author
- **Gates:** the full local run at `940bd82a`, after rebuilding the development stack: backend 844 passed, frontend
  761 passed; Ruff, ESLint, type-check, Pyright (0 errors) and markdown lint clean, with no auto-fix changes
- **Result:** 16 of 16 met, with evidence under each criterion; the live criteria rest on the 5.3 runs, rechecked from
  outside where a check runs without the browser
- **Noted:** pull request 24 conflicts with `main`, which deleted `PROJECT-STATUS.md` while this branch's activation
  edited it, so no pull-request run has started since `f391821`
