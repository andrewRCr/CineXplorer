# Task List: Staging Deployment

**PRD:** `prd-staging-deploy.md`
**Created:** 2026-11-01
**Branch:** `technical/staging-deploy`
**Base Branch:** `main`
**Status:** Pending

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

- [ ] **1.1 Settings read the environment strictly** (R3; SC4)

    - [ ] **1.1.a Write tests that load the real settings module**
        - In `apps/core/tests/test_helpers.py`, the project's shared test helpers, a helper that imports
          `config.settings` in a subprocess (`sys.executable`, working directory the backend root) under a given set of
          environment variables, with the child environment the Phase 1 note describes. It takes optional code to run
          before the import (1.6.a wraps `os.makedirs` and `open` there), and can run `django.setup()` and report
          values read afterwards (1.2.a reads `config.urls.urlpatterns`). Requests are dotted names read in the child
          after the import, or after `django.setup()`: a bare name is an attribute of `config.settings`, and the
          pre-import code stores what it observes under a name the case then requests. It returns either the requested
          values as JSON, leaving out any name the module does not define and converting values JSON cannot hold, such
          as paths, to strings, or the `ImproperlyConfigured` message the import raised
        - The cases go in `apps/authentication/tests/integration/test_environment_config.py`. Its module docstring is
          rewritten, without its task reference, to describe the module by its subject, configuration that depends on
          the environment, and the three ways its tests work: replicating the settings logic (the cookie, HSTS and
          HTTPS-redirect tests), loading the real settings module in a subprocess, and making requests under
          `override_settings` (1.2.a and 1.5.a add these)
        - `ENVIRONMENT=staging` with `DJANGO_ALLOWED_HOSTS` unset fails naming `DJANGO_ALLOWED_HOSTS`
        - `ENVIRONMENT=staging` with `DJANGO_ALLOWED_HOSTS` set and both origin variables unset gives empty
          `CSRF_TRUSTED_ORIGINS` and `CORS_ALLOWED_ORIGINS`; each of the three variables is read as a comma-separated
          list
        - `ENVIRONMENT=development` with the three variables unset gives today's `ALLOWED_HOSTS`,
          `CSRF_TRUSTED_ORIGINS` and `CORS_ALLOWED_ORIGINS` lists, written out in the test
        - `ENVIRONMENT=staging` with `DJANGO_ALLOWED_HOSTS` set and `DEBUG=True` fails with a message naming `DEBUG`;
          `ENVIRONMENT=qa` fails with a message naming `ENVIRONMENT`
        - Delete `test_invalid_environment_defaults_to_development`, which replicates the old fallback instead of
          loading settings
        - Expect the `staging` and `qa` cases to FAIL initially; the `development` case passes today and guards the
          defaults (see the Phase 1 note on guard cases)

    - [ ] **1.1.b Validate `ENVIRONMENT` and read hosts and origins from the environment** in `config/settings.py`
        - Move the `DEBUG` and `ENVIRONMENT` block above `ALLOWED_HOSTS`, since this task and 1.2 make the lists near
          the top of the module depend on it
        - An unrecognised `ENVIRONMENT` raises `ImproperlyConfigured` in place of the `RuntimeWarning` fallback; unset
          still means `development`
        - `DEBUG=True` with `ENVIRONMENT` `staging` or `production` raises `ImproperlyConfigured`
        - `env.list()` for the three variables: today's lists as the development defaults, `DJANGO_ALLOWED_HOSTS`
          required in staging and production, both origin lists empty there by default
        - Tests should now PASS

- [ ] **1.2 Development tooling loads only in development** (R1)

    - [ ] **1.2.a Write tests** in `test_environment_config.py`
        - With 1.1.a's helper: under `ENVIRONMENT=staging`, `INSTALLED_APPS` has neither `debug_toolbar` nor
          `django_extensions` and `MIDDLEWARE` lacks `debug_toolbar.middleware.DebugToolbarMiddleware`; under
          `development` all three are present
        - In the same subprocess style, after `django.setup()`, `config.urls.urlpatterns` has no `__debug__/` route
          under `staging` and has one under `development`
        - With `override_settings(ENVIRONMENT="staging", DEBUG=True)`, `POST /api/dev-logs/write/` and
          `GET /api/debug/error-500/` answer `403`, which shows the gate is `ENVIRONMENT` and not `DEBUG`; under
          `development`, `GET /api/debug/error-500/` answers `500`
        - Expect the `staging` cases and the endpoint cases to FAIL initially; the `development` apps, middleware and
          route cases pass today and are guard cases

    - [ ] **1.2.b Gate the tooling on `ENVIRONMENT`**
        - `config/settings.py`: add `django_extensions` and `debug_toolbar` to `INSTALLED_APPS`, and the toolbar
          middleware at the head of `MIDDLEWARE`, only in development
        - `config/urls.py`: add the `__debug__/` route only when `settings.ENVIRONMENT` is `development`
        - `apps/core/api.py`: `write_dev_console_log` and `debug_error_500` check `settings.ENVIRONMENT` in place of
          `settings.DEBUG`, and their docstrings say so
        - Regenerate the API types (`npm run generate-types` in `frontend/`, with the development stack running) and
          commit `frontend/openapi.json` and `frontend/src/types/api.ts` with this change; their diff shows only these
          two endpoints' descriptions
        - Tests should now PASS

- [ ] **1.3 Throttles key on the client address Caddy saw** (R5; SC5)

    - [ ] **1.3.a Write tests** in `apps/authentication/tests/integration/test_rate_limiting.py`, where the throttle
      fixtures live
        - The in-process cases run under the staging proxy setting: they read `NINJA_NUM_PROXIES` and
          `ALLAUTH_TRUSTED_PROXY_COUNT` under `staging` with 1.1.a's helper and apply them with `override_settings`,
          leaving out a count the staging settings don't define (Django Ninja reloads its settings on
          `setting_changed`; allauth reads its own on every call)
        - Two headers with different first entries and the same last entry (`198.51.100.7, 203.0.113.9` and
          `192.0.2.4, 203.0.113.9`) share one count; this fails before 1.3.b, when the key is the whole header value
        - allauth's `get_adapter().get_client_ip(request)` returns the header's last entry; this fails before 1.3.b,
          when allauth ignores the header and returns `REMOTE_ADDR`
        - Sign-in requests whose `X-Forwarded-For` names two different clients are counted separately: one client's
          sixth attempt is throttled while the other's first succeeds. This passes before and after 1.3.b, so see it
          fail once with `NINJA_NUM_PROXIES=0` in its override, which keys every request on `REMOTE_ADDR`
        - With 1.1.a's helper: both counts are `1` under `staging` and `production`, and absent under `development`
        - Expect the shared-count, allauth and helper cases to FAIL initially

    - [ ] **1.3.b Set both proxy counts** to `1` in staging and production in `config/settings.py`; development leaves
      them unset
        - Tests should now PASS

- [ ] **1.4 The log endpoint has its own throttle** (R7; SC5)

    - [ ] **1.4.a Write tests** in `test_rate_limiting.py`
        - `POST /api/logs/` answers `429` on a client's 31st report within a minute, and the throttled report writes no
          record to the `frontend` logger
        - After 30 reports, the same client's sign-in still succeeds five times; this passes today, since the endpoint
          has no throttle, and guards the separate history after the change
        - Expect the `429` test to FAIL initially

    - [ ] **1.4.b Add the throttle**
        - A `TestAwareAnonThrottle` subclass in a new `apps/core/throttles.py` with `scope = "frontend_logs"`, applied
          to `frontend_log` in `apps/core/api.py` at `30/m`; it is core's first import from `apps.authentication`,
          since moving the base class into core would be a refactor outside this change
        - The endpoint's `auth=None` comment and its docstring's Security section describe that throttle in place of
          "throttled at middleware level"
        - Regenerate the API types as in 1.2.b and commit them with this change; their diff shows only `frontend_log`'s
          description
        - Tests should now PASS; then see the separate-history test fail once with the throttle's scope set to the
          shared `anon`, and restore `frontend_logs`

- [ ] **1.5 Static files, the health check over plain HTTP, and the silenced deploy check** (R4, R6, R8)

    - [ ] **1.5.a Write tests** in `test_environment_config.py`
        - With `override_settings(SECURE_SSL_REDIRECT=True)`, a plain-HTTP `GET /api/health-check/` answers `200` and
          another path answers `301` to `https://`; the test client loads its middleware on the first request, so the
          override must be active before it
        - With 1.1.a's helper: under `staging`, the `staticfiles` storage is WhiteNoise's
          `CompressedManifestStaticFilesStorage`, and under `development` the module defines no `STORAGES`, which
          leaves Django's default; in both, `STATIC_ROOT` is `backend/staticfiles` and
          `whitenoise.middleware.WhiteNoiseMiddleware` comes directly after `SecurityMiddleware`
        - Expect the health-check, `staging` storage, `STATIC_ROOT` and middleware cases to FAIL initially; the
          other path's `301` and the `development` storage case pass today and are guard cases

    - [ ] **1.5.b Implement**
        - `whitenoise` in `requirements/req.txt` with a bounded range; rebuild the development image, which installs
          `req.txt`
        - `STATIC_ROOT` and the middleware in every environment; `STORAGES` with WhiteNoise's storage only in staging
          and production
        - `SECURE_REDIRECT_EXEMPT = [r"^api/health-check/$"]`
        - `SILENCED_SYSTEM_CHECKS = ["security.W003"]` with the comment R8 gives, which replaces the stale block
          headed `# CSRF Configuration for Django Ninja + Django Middleware Integration` that describes
          `CsrfViewMiddleware` as enabled; drop `CSRF_TRUSTED_ORIGINS_USE_HTTPS`, which Django does not read
        - `backend/staticfiles/` in `.gitignore`
        - Tests should now PASS

- [ ] **1.6 Logs go to stdout only outside development** (R11's logging; SC7 checks the running container in 4.2)

    - [ ] **1.6.a Write tests** with 1.1.a's helper, in `test_environment_config.py`
        - In-process, `get_logging_config()` sees `pytest` in `sys.modules` and drops its file handlers whatever the
          environment, so these tests import `config.settings` in a subprocess
        - Under `staging` and `production`: the `LOGGING` handlers include no file handler, the console handler's level
          is `INFO`, and `DJANGO_CONSOLE_LOG_LEVEL=ERROR` sets it to `ERROR`
        - Under `staging`, nothing creates or probes a log directory: the subprocess wraps `os.makedirs` and `open`
          before the import and reports any call under a `logs` path
        - Under `development` with `DEBUG=False`, the file handlers are present and the console default stays `WARNING`
        - Expect the `staging` and `production` handler, `INFO` and log-directory cases to FAIL initially; the
          `DJANGO_CONSOLE_LOG_LEVEL=ERROR` case and the `development` case pass today and are guard cases

    - [ ] **1.6.b Implement**
        - `get_logging_config()` takes the environment from the settings module, which has validated it, as a keyword
          argument with a default, so existing callers keep working; it treats `staging` and `production` as it treats
          CI for file handlers and directory creation, and the console default there is `INFO`
        - `ensure_log_directory()` returns `None` in staging and production
        - The module docstring of `config/logging.py` states the new defaults
        - Tests should now PASS

### **Phase 2:** The production backend image is small and checked in CI

- [ ] **2.1 Runtime dependencies** (R2)
    - `gunicorn` added to `requirements/req.txt` with a bounded range, and `email-validator` moved there from
      `req.dev.txt` with its range and comment
    - New `requirements/req.prod.txt`: `-r req.txt`, then `psycopg[c]` in `req.txt`'s `psycopg` range
      (`>= 3.2.9, < 3.3`)
    - Rebuild the development image; `python -c "import gunicorn, email_validator"` succeeds in it

- [ ] **2.2 Split the backend Dockerfile into `dev` and `production` stages** (R9–R12, R23; SC2, SC3, SC9)

    - [ ] **2.2.a Name today's image the `dev` stage, select it everywhere it is built, and remove the unused builds**
      in one change, so no commit leaves an untargeted build picking a different stage
        - `backend/Dockerfile`: a shared base on `python:3.13-alpine3.24` and a `dev` stage that is today's image; the
          `dev` stage always installs `req.dev.txt`, so the `DEV` build argument and its entry in
          `infrastructure/docker-compose.yml` go
        - `target: dev` on the backend's `build` in `infrastructure/docker-compose.yml`
        - `.github/workflows/ci.yml`: remove the backend job's "Set up Docker Buildx", "Docker meta for backend" and
          "Build and cache backend image (local only)" steps and the type-generation job's "Set up Docker Buildx" and
          "Build backend image" steps (R23); both jobs keep building through Compose
        - Check: the rebuilt development stack serves `https://localhost:8444`; the debug toolbar loads on
          `https://localhost:8000/admin/login/`, the backend's own port, where it shows today (through Caddy the
          backend sees Caddy's address, which is not in `INTERNAL_IPS`); and the full backend suite passes in it,
          since the base image changes under every app

    - [ ] **2.2.b Add the build and `production` stages**
        - A build stage from the shared base that installs `build-base` and `libpq-dev` and installs `req.prod.txt`
          into a virtual environment
        - A final `production` stage, last in the file, from the shared base: `apk add libpq`, the virtual environment
          copied from the build stage, the application code, a non-root user, and `ENV ENVIRONMENT=production`
        - `RUN` `collectstatic --noinput` with throwaway values for R10's variables set on that one command, so none
          reaches the image's environment
        - `backend/gunicorn.conf.py`, which gunicorn loads from its working directory: bind `0.0.0.0:8000`,
          `worker_class = "gthread"`, `workers` from `GUNICORN_WORKERS` (default 2), `threads` from `GUNICORN_THREADS`
          (default 4), `timeout = 60`, access log to stdout; `CMD ["gunicorn", "config.wsgi:application"]`
        - `config/wsgi.py` and `config/asgi.py` default `DJANGO_SETTINGS_MODULE` to `config.settings`, as `manage.py`
          does; both name `backend.settings` today, which does not exist. Nothing has relied on that default: the
          development server imports `config.wsgi` through `WSGI_APPLICATION` only after `manage.py` has set the
          variable, and nothing imports `config.asgi`
        - `staticfiles/` in `backend/.dockerignore`, so a local `collectstatic` run never reaches the build context
        - Check: `docker build --target production backend` succeeds; the image is under 300 MB by the Phase 2 note's
          measure; SC2's commands give their stated results; SC3's `check --deploy --fail-level WARNING` exits 0;
          `gunicorn --print-config config.wsgi:application` in the image, with R10's variables as placeholders and no
          `DJANGO_SETTINGS_MODULE` set, shows the worker class, workers, threads and timeout and exits 0, since it
          loads the application after printing

- [ ] **2.3 CI builds the production image and checks it** (R21's build, R22; SC3)
    - A new `images` job in `.github/workflows/ci.yml` on every event the workflow runs for: Buildx, then
      `docker/build-push-action` with `context: ./backend`, `target: production`, `load: true`, no push, and the
      GitHub Actions cache under a scope of its own (`cache-from`/`cache-to` `type=gha,scope=backend`, `mode=max`)
    - A step that fails when the image's files total 300,000,000 bytes or more, measured as the Phase 2 note says
    - A step that runs `python manage.py check --deploy --fail-level WARNING` in the image with
      `ENVIRONMENT=production`, a generated secret key and placeholders for R10's other variables
    - `ci-ok`'s `needs` includes `images`; the job holds no `packages` permission until 4.3
    - Check: `actionlint`; run locally against the image, each check step fails on a case it must catch (a threshold
      below the image's size; a short `DJANGO_SECRET_KEY`, which raises `security.W009` and so passes without
      `--deploy --fail-level WARNING` and fails with them); then, with the Owner's approval to push the branch, a
      manual run (`gh workflow run ci.yml --ref technical/staging-deploy`) passes every job, which also checks 2.2.a's
      CI edits

### **Phase 3:** The frontend works on any host and ships in a web image

- [ ] **3.1 One module gives the base URLs** (R13; SC6's frontend test)

    - [ ] **3.1.a Write tests** in `frontend/src/config/baseUrls.test.ts`
        - Neither variable set: the site origin is `window.location.origin` and the API base is that origin followed by
          `/api`
        - `VITE_BASE_URL` set: the site origin is its value, and the API base is that value followed by `/api`
        - `VITE_BASE_API_URL` set: the API base is its value
        - Expect tests to FAIL initially

    - [ ] **3.1.b Create `src/config/baseUrls.ts` and use it in the nine readers**
        - `src/services/apiClient.ts` (line 11), `src/services/authService.ts` (lines 7, 213 and 260),
          `src/pages/user/TestLogin.tsx` (line 6), `src/hooks/auth/useOAuthFlow.ts` (line 200),
          `src/hooks/auth/useAuth.ts` (line 39), `src/services/logger.ts` (line 355) and
          `src/services/consoleCapture.ts` (lines 6 and 100)
        - Afterwards `grep -rn "localhost:8444" src` finds only test files
        - Tests should now PASS, with the touched modules' related tests

- [ ] **3.2 Development routes stay out of production builds** (R14)
    - `src/App.tsx`: the `lazy()` declarations for `TypographyDebug`, `ThemeDebug`, `LayoutDebug` and `TestLogin`, and
      their `<Route>` elements, exist only when `import.meta.env.DEV` is true; `/testlogin` then falls to the layout's
      catch-all not-found route, like the three debug paths
    - The footer's debug links are already gated on `import.meta.env.DEV`
    - Check: `npx vite build --manifest` writes a `dist/.vite/manifest.json` with no entry under `src/pages/dev/` and
      none for `src/pages/user/TestLogin.tsx`

- [ ] **3.3 The production Caddyfile and the web image** (R15, R16; SC6)

    - [ ] **3.3.a Write `infrastructure/Caddyfile.prod`** to R16
        - Site address `{$SITE_ADDRESS}`; `/api/*`, `/_allauth/*`, `/accounts/*`, `/admin/*` and `/static/*` to
          `backend:8000` over plain HTTP; `basic_auth` on `/admin/*` from `{$ADMIN_BASIC_AUTH_USER}` and
          `{$ADMIN_BASIC_AUTH_HASH}`
        - The bundle from `/srv` with `try_files {path} /index.html`; `Cache-Control: no-cache` on `index.html` however
          it is reached; the one-year immutable policy on files that exist under `/assets/`; a `404` with
          `Cache-Control: no-store` for a missing one
        - The four security headers on responses Caddy serves itself; no CORS headers; no `trusted_proxies`, so Caddy
          replaces any `X-Forwarded-For` a client sends (its `reverse_proxy` documentation: values from untrusted
          clients are ignored)
        - Check: `caddy validate` in `caddy:2.11-alpine` with test values for the three variables

    - [ ] **3.3.b Split the frontend Dockerfile, select `dev` in the development Compose file, and add the production
      stages** in one change
        - `frontend/Dockerfile`: `dev` (today's image), a `build` stage on the same `node:26-alpine` base that runs
          `npm ci`, `npm run typegen` and `npm run build`, and a final `production` stage on `caddy:2.11-alpine` with
          `/srv` from the build stage and `Caddyfile.prod` as `/etc/caddy/Caddyfile` from the `infra` named context
        - `target: dev` on the frontend's `build` in `infrastructure/docker-compose.yml`
        - Check: the development stack's frontend still serves through `https://localhost:8444`;
          `docker build --build-context infra=infrastructure --target production frontend` succeeds; in the `build`
          stage, which has no `.env` (`frontend/.dockerignore`) and no `VITE_*` variables, `npx vite build --manifest`
          gives SC6's results and no file under `dist/` contains `localhost:8444`; the web image run alone with test
          values answers SC7's cache and security-header checks on `/`, a deep link, `/index.html`, an existing
          `/assets/` file and a missing one

    - [ ] **3.3.c CI builds the web image** in the `images` job: `context: ./frontend`, `target: production`,
      `build-contexts: infra=./infrastructure`, no push, its own cache scope (`scope=web`)
        - Check: `actionlint`, and the next manual run on the pushed branch builds it

### **Phase 4:** The production stack runs and CI publishes it

- [ ] **4.1 The production Compose file and env templates** (R17–R20; SC1)
    - `infrastructure/docker-compose.prod.yml` replaced by the standalone file R17 describes: `name: cinexplorer-prod`;
      `web`, `backend`, `db` and `redis` with R17's images, ports, volumes, environment, health checks and
      `depends_on` conditions; R18's image references; R19's restart policy, memory limits and log rotation
    - `IMAGE_TAG` and `SITE_ADDRESS` use `${VAR:?message}`, so a deploy that omits either fails before starting
      anything
    - The development file's `dev-db` moves to `postgres:17-alpine3.24`
    - `infrastructure/prod.env.example`, whose `BACKEND_ENV_FILE` is the server's `/opt/cinexplorer/backend.env`, and
      R20's production entries and checklist edits in `backend/config/.env.example`; the production entries go in the
      file's commented production checklist, not as live keys, since developers copy the file to `config/.env`
    - Check: SC1's `docker compose config` with the example values; the development stack still starts on the new
      Postgres tag with its existing data

- [ ] **4.2 Run the production stack locally** (SC7)
    - Build both images on this branch and tag them `ghcr.io/andrewrcr/cinexplorer-backend:local` and
      `ghcr.io/andrewrcr/cinexplorer-web:local`, so the Compose file's references resolve with `IMAGE_TAG=local`
    - A Compose env file and a backend env file for the run, outside the repository and following R20's templates.
      The Compose env file has `SITE_ADDRESS=localhost`, test Postgres credentials, an admin basic-auth pair and
      `BACKEND_ENV_FILE` giving the run's backend env file as an absolute path. The backend env file has a generated
      `DJANGO_SECRET_KEY`, `ENVIRONMENT=staging`, `DEBUG=False` and the development TMDB key copied from the
      development env file. `staging` is what the staging host runs: its HSTS lasts an hour and leaves out subdomains,
      where the image's `production` default would send the browser used for the checks one-year HSTS covering
      subdomains for `localhost`
    - Run SC7: migrations as a one-off container, then `up`; every check SC7 lists, including a staff account created
      in a one-off container signing in through `/admin/`
    - Also: `/dev/theme-debug` and `/testlogin` show the not-found page; plain HTTP redirects to HTTPS; the sign-in
      endpoint's sixth attempt within a minute is throttled although each attempt sends a different
      `X-Forwarded-For`, which shows a client-sent `X-Forwarded-For` cannot change the throttle key (R5); that Caddy
      replaces the header rests on its documentation (3.3.a)
    - Every command in the run, the teardown included, uses
      `docker compose -f infrastructure/docker-compose.prod.yml --env-file <the run's Compose env file>`, so none
      depends on the working directory; tear the stack and its volumes down afterwards with that invocation's
      `down -v`

- [ ] **4.3 CI publishes both images** (R21; SC8)
    - In the `images` job, on a push to `main` or a manual run: log in to `ghcr.io` with `GITHUB_TOKEN`, and push both
      images tagged `sha-` plus the commit's first seven characters, and `main` for pushes to `main`
      (`docker/metadata-action` with `type=sha` and a `main` tag enabled only on `main`)
    - Job-level `permissions` of `contents: read` and `packages: write` on this job only; the workflow's top-level
      `contents: read` stays
    - Pull request runs still build without pushing
    - Check: `actionlint`; then, with the Owner's approval to open the pull request, SC8: the pull request's run passes
      every job and builds both images without pushing, and its backend tests run on the `dev` image (SC9); a manual
      run on the branch publishes both images with the `sha-` tag

### **Phase 5:** Staging is set up and deployed by the runbook

- [ ] **5.1 Write `infrastructure/deploy/bootstrap.sh`** (R24)
    - Each step checks the state it would create, changes nothing when it is already there, and prints whether it
      changed anything, so a second run as `deploy` with `sudo` reports no changes (live criterion 6)
    - SSH settings in a drop-in that sorts first in `/etc/ssh/sshd_config.d/` (Ubuntu reads that directory before the
      main file and keeps the first value, and cloud images can ship a `50-cloud-init.conf` that enables passwords),
      checked with `sshd -t` before the reload
    - The `deploy` user's `sudo` rule in its own file under `/etc/sudoers.d/`, checked with `visudo -cf`
    - Check: `shellcheck` and `bash -n` pass; live criteria 6 and 7 are the proof (5.3)

- [ ] **5.2 Write the runbook, `infrastructure/deploy/README.md`** (R25)
    - First-time setup, a deploy, a rollback with the migration comparison, logs, restarts, where state lives, and
      the Vultr console fallback, each as R25 states it
    - First-time setup copies `bootstrap.sh` to the new server with `scp` from a local checkout, since the private
      repository is not on the server yet; later bootstrap runs use the copy in the server's checkout
    - First-time setup keeps the root session open after the bootstrap until a second session signs in as `deploy`,
      since the bootstrap turns off root's SSH login
    - After the bootstrap, the deploy key pair is generated on the server as `deploy` and its public key added on
      GitHub as a read-only deploy key, before the checkout
    - Both env files live beside the checkout, not in it, at mode `600`: the Compose env file at
      `/opt/cinexplorer/prod.env`, made from `infrastructure/prod.env.example`, and the backend env file at
      `/opt/cinexplorer/backend.env`, made from `backend/config/.env.example`
    - In the backend env file, the live `ENVIRONMENT` and `DEBUG` lines take the production checklist's values
      (`ENVIRONMENT=staging` on staging), the checklist's `GUNICORN_*` entries are added, and a new
      `DJANGO_SECRET_KEY` and the TMDB key are filled in from the Owner's secrets (5.3). The lines Compose sets
      (`POSTGRES_*`, `BACKEND_URL`, `FRONTEND_URL`, `REDIS_URL`) are deleted, and so are the ZeptoMail and OAuth
      placeholders, since neither service is set up on staging
    - Every command uses `docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env` from the
      checkout's `infrastructure/` directory

- [ ] **5.3 Set up staging and prove it live** (live criteria 1–7)
    - Before starting, the Owner's steps from the PRD's Dependencies: the server, the `A` record, the registry token
      and the secrets; the deploy key is made during first-time setup (5.2), once the server exists
    - Two manual CI runs at two different commits of this branch, so a deploy and a rollback each have a published
      version
    - Follow the runbook from first-time setup through the first deploy, the account created from the server shell,
      a deploy of the newer commit and a rollback to the older one, then check live criteria 1–7
    - Anything the runbook got wrong or left out is fixed in the runbook, not worked around on the server
    - Both deploys carry the same migrations, so the rollback's comparison finds no difference and its
      reverse-migration steps don't run; that path stays unexercised until a change ships a migration

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

- [ ] `docker compose -f infrastructure/docker-compose.prod.yml config`, with the example env values, shows published
  ports only on `web`, and only 80/tcp, 443/tcp and 443/udp.
- [ ] The backend production image is under 300 MB. Inside it, `python -c "import debug_toolbar"`,
  `python -c "import django_extensions"` and `gcc --version` each fail, while
  `python -c "import psycopg; print(psycopg.pq.__impl__)"` prints `c` and
  `python manage.py shell -c "import config.urls"` succeeds under `ENVIRONMENT=production` with placeholder values
  for R10's variables.
- [ ] Inside the backend production image, `python manage.py check --deploy --fail-level WARNING` exits 0 under
  `ENVIRONMENT=production` with a generated placeholder secret key and placeholders for R10's other variables.
- [ ] With `ENVIRONMENT=staging` and `DJANGO_ALLOWED_HOSTS` unset, Django fails to start with `ImproperlyConfigured`
  naming `DJANGO_ALLOWED_HOSTS`; with it set and the two origin variables unset, `CSRF_TRUSTED_ORIGINS` and
  `CORS_ALLOWED_ORIGINS` are empty. With `ENVIRONMENT=development` and the variables unset, the three settings equal
  today's localhost lists. With `ENVIRONMENT=staging` and `DEBUG=True`, Django fails to start with
  `ImproperlyConfigured`, and likewise with `ENVIRONMENT` set to an unrecognised value. Backend tests assert each
  case by loading the real settings module under that environment, for example by importing it in a subprocess, and
  they replace the test in `apps/authentication/tests/integration/test_environment_config.py` that an unrecognised
  value falls back to `development`.
- [ ] Backend tests show, under the staging proxy setting, that requests to a throttled endpoint from two different
  client addresses in `X-Forwarded-For` are counted separately, that a header with two entries is counted under the
  last, and that allauth resolves the client address to that same last entry; that `POST /api/logs/` returns `429`
  once a client exceeds 30 requests in a minute; and that log reports do not count against the sign-in throttle.
- [ ] In a production frontend build made as CI and the web image make it (no `.env` file, no `VITE_*` variables), no
  emitted file contains `localhost:8444`, and the Vite manifest (`vite build --manifest`) has no entry for a module
  under `src/pages/dev/` or for `src/pages/user/TestLogin.tsx`. A frontend test shows the API base is the page origin
  followed by `/api` when neither variable is set.
- [ ] The production stack, run locally from images built on this branch with `SITE_ADDRESS=localhost` while the
  development stack keeps running: migrations complete as a one-off container; the SPA loads at `/` and on a deep
  link to a movie page; `/api/health-check/` returns `200`; Django admin's files are served under `/static/`; and
  `/admin/` answers `401` without credentials and Django's login page with the configured basic-auth pair, where a
  staff account signs in; no
  `/backend/logs` directory exists in the backend container; and `curl -sI` shows `Cache-Control: no-cache` on `/`,
  on a deep link and on `/index.html`, the immutable policy on a file under `/assets/`, and `404` with
  `Cache-Control: no-store` for a missing file there.
- [ ] A pull request run builds both images without pushing them, and a manual CI run on this branch publishes
  `ghcr.io/andrewrcr/cinexplorer-backend` and `ghcr.io/andrewrcr/cinexplorer-web`, each tagged `sha-` plus the
  commit's first seven characters.
- [ ] The development stack, built with `target: dev`, still serves `https://localhost:8444` with the debug toolbar
  available, and CI's backend tests run on its `dev` image.

### Proven live (on the staging server)

- [ ] `curl -sSf https://staging.cinexplorer.andrewcreekmore.dev/api/health-check/` succeeds without `-k`, the
  certificate is issued by a public certificate authority, and `http://` redirects to `https://`.
- [ ] In a browser on the staging host, the home page, a search, a browse page and a movie detail page load with TMDB
  data, and reloading a movie detail URL loads it directly.
- [ ] Signing in with the account created from the server shell succeeds, and a movie added to the watchlist is still
  there after a reload.
- [ ] From outside the server, connections to ports 5432, 6379 and 8000 fail, and `/admin/` asks for basic auth before
  Django's login page, which the configured pair passes.
- [ ] Following the runbook, a deploy of a newer commit and a rollback to the previous one each finish with the health
  check passing and a sign-in succeeding, and Caddy reuses its stored certificate rather than obtaining a new one.
- [ ] Running `sudo bootstrap.sh` a second time as `deploy` on the configured server completes without error and changes
  nothing.
- [ ] On the server, `sudo sshd -T` reports `passwordauthentication no` and `permitrootlogin no`; from outside it, a
  password-only SSH login and an SSH login as root are both refused.

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
