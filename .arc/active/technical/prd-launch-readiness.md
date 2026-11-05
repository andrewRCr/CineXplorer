# PRD: Launch Readiness

**Type:** Technical
**Status:** In Progress
**Created:** 2026-11-03

---

## 1. Introduction/Overview

CineXplorer runs on a public staging host, `https://staging.cinexplorer.andrewcreekmore.dev`: one DigitalOcean droplet
running the production Compose stack (`infrastructure/docker-compose.prod.yml`) behind Caddy, deployed by hand from
images CI publishes, following `infrastructure/deploy/README.md`. It serves anonymous browsing, search and movie
detail, and sign-in for accounts created from the server shell. It is not yet fit to open sign-up to the public:

- **Deploys need a person on the server.** CI publishes `sha-` images on every push to `main`, but a deploy is a
  sequence of commands typed into an SSH session. `main` also takes commits that change only `.arc/` (planning and
  process documents) directly, and each one rebuilds and publishes images of unchanged code.
- **The database has no copy.** Accounts and watchlists live only in the `cinexplorer-prod_db-data` volume on one
  droplet.
- **Expired data is never removed.** `ninja_jwt.token_blacklist` keeps an outstanding-token row for every refresh token
  issued, one per sign-in and one per refresh (refresh tokens rotate). Django's sessions are stored in the database
  (`SESSION_ENGINE` is unset), and allauth keeps them for two weeks. Nothing runs `flushexpiredtokens` or
  `clearsessions`.
- **Nothing watches the site.** An outage is noticed when someone visits. `GET /api/health-check/` returns `200`
  without touching the database, so it reports healthy while Postgres is down.
- **Google and GitHub sign-in and every email flow are unconfigured on the deployed host.** In development the two
  OAuth apps are database rows (`SocialApp`) tied to the Site record `localhost:8444`, entered through Django admin;
  the `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` entries in
  `backend/config/.env.example` are read nowhere. On staging the Site record is Django's default, `example.com`, and
  allauth's default email templates print its name and domain (`account/email/base_message.txt`): the text part of the
  password-reset email (the project overrides only its HTML part) and the unknown-account and account-already-exists
  emails.
- **Authentication has gaps that matter once sign-up is public:**
    - Registration (`3/h`), sign-in (`5/m`) and resend-verification (`3/h`) all use `TestAwareAnonThrottle`
      (`apps/authentication/throttles.py`), whose Django Ninja parent keys every caller on `throttle_anon_<ip>`. They
      share one history, and each request trims it to its own duration and stores it with that lifetime, so a sign-in
      cuts the hourly limits down to about a minute.
    - Django Ninja keeps one throttle object per operation and reuses it for every request; `allow_request` stores the
      request's key, history and time on that object before `throttle_success` writes the history under the stored
      key (`ninja/throttling.py`). Gunicorn runs four threads per worker, so two concurrent requests to one endpoint can
      interleave: one is counted under the other's key, or lost.
    - `apps.authentication.middleware.CsrfHeaderMiddleware` replaces Django's `CsrfViewMiddleware`. It exempts the
      public authentication paths and everything under `/_allauth/`, and it checks the remaining unsafe requests only
      when they carry an `access_token` cookie, which only `POST /api/token/refresh/` sets. The frontend reads its token
      from a cookie named `XSRF-TOKEN` (`utilities/csrfTokenFetcher.ts`, `services/apiClient.ts`), which nothing sets;
      Django's cookie is `csrftoken`. In effect no request is token-checked: not the two refresh endpoints, which the
      `refresh_token` cookie authenticates; not API requests authenticated by the session alone, which is how users
      signed in with Google or GitHub reach the API (`JWTCookieAuth`'s session fallback); not allauth's headless
      browser endpoints, which expect Django's middleware (`allauth/headless/internal/decorators.py`, `browser_view`);
      and not sign-in, where a cross-site form can force a sign-in because Django Ninja parses a JSON body whatever its
      content type. Users signed in with a password send their access token in an `Authorization` header, which a
      cross-site page cannot set.
    - `/_allauth/` routes every allauth headless endpoint (`config/urls.py`), for both of allauth's default clients,
      `browser` and `app`, though the frontend uses four: `auth/session`, `auth/password/request`,
      `auth/password/reset` and `auth/provider/redirect`. allauth's own `auth/signup` creates an account and sends a
      verification email at up to 20 requests a minute per client (its default rate limit), outside the project's
      registration throttle and forbidden usernames, and its `auth/login` signs in outside the project's sign-in
      throttle. The `app` client's views are CSRF-exempt by design.
    - `CustomAccountAdapter.send_mail` raises `EmailDeliveryError` when nothing was sent
      (`apps/authentication/adapters.py`). Registration catches it; allauth's headless password-reset request and
      `AuthenticationService.resend_verification` do not, so a failed send there is an unhandled `500`. The resend
      token is consumed when it is checked, before the send (`_validate_resend_token`), so a retry after a failed send
      presents a spent token, receives the generic success answer, and sends nothing.
    - `django-zoho-zeptomail` 0.0.4 sends with `requests.post` and no timeout (`zoho_zeptomail/emails/__init__.py`), so
      a stalled ZeptoMail API holds a request thread indefinitely, and its message class prints every API response to
      stdout (`zoho_zeptomail/backend/message.py`), which the production container's logs collect. It returns `0` for
      an error answer in ZeptoMail's JSON error format, and raises on a network error or an error body it cannot
      parse, such as a gateway's HTML page.
    - `useAuth` decides whether a password user is signed in from the access token alone: `areTokensExpired()`
      (`utilities/tokenUtils.ts`) reads only its expiry. Access tokens last 5 minutes and refresh tokens 14 days
      (`SIMPLE_JWT`). On load, an expired access token sends the hook to allauth's session check, which finds nothing
      for a password user, since a password sign-in makes no Django session; and the hook's 60-second check signs the
      user out once the access token has expired. Only the API client uses the refresh token, after a request is
      refused with `401`. A password user is therefore signed out after about 5 idle minutes, and appears signed out
      after a reload.
- **The sign-in client has no unit tests.** `hooks/auth/useAuth.ts`, `hooks/auth/useOAuthFlow.ts`,
  `services/authService.ts`, `utilities/tokenUtils.ts` and `utilities/csrfTokenFetcher.ts` have no tests of their
  own; one page test replaces `useAuth` with a mock. This change edits several of them, and the site's next changes
  rebuild the pages around them.
- **CI checks neither production configuration file.** The web image copies `infrastructure/Caddyfile.prod` in
  unparsed, and nothing renders `infrastructure/docker-compose.prod.yml`, so a Caddyfile error first shows on the
  server, after `web` has been recreated.

This change makes the staging host ready to open to the public: every merged change deploys automatically, the
database is backed up nightly off the server and a restore has been rehearsed, expired data is cleaned up nightly, an
outage or a failed nightly job reaches the maintainer, email sign-up and Google and GitHub sign-in work on the deployed
host, and the authentication gaps above are closed. The site stays at the staging address; moving it to
`cinexplorer.andrewcreekmore.dev` is a documented later step that changes environment values and DNS only.

## 2. Goals

1. A push to `main` that changes anything outside `.arc/` is deployed to staging once every CI check on it has
   passed, without anyone signing in to the server. A push that changes only `.arc/` builds, publishes and deploys
   nothing.
2. The database is copied off the server every night, and restoring a copy has been done once, end to end.
3. A visitor on staging can sign up with an email address, verify it from the email, reset a forgotten password, and
   sign in with Google or GitHub; a visitor signed in with a password stays signed in, through an idle tab and a
   reload, while their refresh token is valid.
4. A site outage, a database outage, and a nightly job that fails or does not run each reach the maintainer by email.
5. A cross-site request cannot act with a visitor's cookies, email sign-up and password sign-in go only through the
   site's own rate-limited endpoints, each anonymous authentication throttle counts only its own endpoint's requests,
   and a failed password-reset or verification email gives the visitor a clear message instead of a server error,
   after which a retry works.
6. Moving to the production hostname needs no change to OAuth client credentials, authorized callbacks or the mail
   sender. Google consent-screen publication is a separate follow-up once the website pages below are live.

## 3. User Stories

- As a visitor, I sign up with my email address, find the verification email in my inbox, verify, and sign in; later
  I reset my forgotten password from the email I am sent.
- As a visitor, I sign in with my Google or GitHub account and keep my watchlist.
- As the maintainer, I merge a pull request and staging runs it a few minutes later; when a deploy fails, the failed
  CI run tells me.
- As the maintainer, I restore the database from a recent backup by following the runbook.
- As the maintainer, I get an email when the site is down or a nightly job has failed or not run.

## 4. Functional Requirements

### Deploying from CI

- **R1. Deploy script.** `infrastructure/deploy/deploy.sh <full-commit-sha> <ci|manual>` performs the runbook's
  deploy as one script, run as `deploy` against `/opt/cinexplorer/repo`, `/opt/cinexplorer/prod.env` and
  `/opt/cinexplorer/backend.env`. Its two positional arguments (the target commit and the deploy's source), its step
  markers (each step below begins with one line on standard output: `==>`, a space, the step's number and its name)
  and the line format of `deploy-history.log` (step 6) are the contract between the entry point (R2), the runbook
  (R26) and every version of the script, since each deploy runs the target commit's own copy and reads the line an
  earlier version wrote:
    1. refuse a checkout with uncommitted changes, and record the previous version: the new commit and tag on
       `deploy-history.log`'s last line, which only a successful deploy writes (step 6); when the log is empty or
       absent, the `backend` container's image tag and the full commit in that image's
       `org.opencontainers.image.revision` label, which CI's publish step sets, whether the container is running or
       stopped; with neither, there is no previous version. The previous version is therefore the last one a
       successful deploy recorded, not necessarily the one running: a rollback after a deploy that failed at step 5
       records the same version as previous and new. The checkout and `IMAGE_TAG` are not used, since a checkout made
       by hand or a deploy that failed partway can leave them at the target already;
    2. check out the target commit (detached) and set `IMAGE_TAG` in `prod.env` to `sha-` plus its first seven
       characters;
    3. `config --quiet`, `pull`, prepare `db` with `up -d --wait --no-recreate db`, then take a fresh R2 backup
       through `/opt/cinexplorer/operations/backup.sh` using exported `ops.env` settings in a subshell. Stop before
       migrations if any backup
       step, upload or heartbeat fails. A fresh database is initialized and backed up empty; an existing database
       container is started without recreation before its snapshot. Run migrations as a one-off backend container,
       immediately followed by `python manage.py sync_blacklist` so the table matches the target image's tracked
       file, then continue to step 4;
    4. `python manage.py configure_site` as a one-off backend container (R16);
    5. `up -d --wait`, then `GET https://<SITE_ADDRESS>/api/health-check/` through the public address;
    6. on success only, append one line to `/opt/cinexplorer/deploy-history.log`, its fields separated by single
       spaces in this order: the UTC time in ISO 8601, the source, the previous commit, the previous tag, the new
       commit and the new tag, with `-` for each previous field when there is no previous version.

  Each step's failure stops the script with a non-zero exit and that step's output. Nothing is rolled back
  automatically: a failure before step 5 leaves the previous containers serving, and the runbook's rollback (R26)
  covers the rest.
- **R2. Deploy entry point.** `/usr/local/bin/cinexplorer-deploy`, owned by root and installed by the bootstrap script
  (R12), is how every deploy runs. It has two forms:
    - `cinexplorer-deploy <full-commit-sha>`, run from a `deploy` shell: a manual deploy of a commit whose images are
      published and which contains the deploy script, a branch's included; source `manual`. Its output goes to the
      terminal.
    - `cinexplorer-deploy --from-ci`, the CI key's forced command (R3): it reads the commit from
      `SSH_ORIGINAL_COMMAND`, which must be exactly 40 lowercase hexadecimal characters, and after fetching, before it
      takes the operations lock, it refuses a commit that is not reachable from `origin/main`, and one that is an
      ancestor of the new version on `deploy-history.log`'s last line, other than that version itself, naming the
      version deployed (a re-run of an older run's deploy); source `ci`. The deploy's full output goes to a new file in
      `/opt/cinexplorer/deploy-logs/` (R12), and the SSH session receives only the script's step markers (R1) and the
      outcome, with the exit status and that file's path on failure, so the last marker names the failing step. CI's
      job log is public, and a failed migration's database errors can quote user data. The deploy does not depend on
      the session: output reaches the file before anything is sent to the session, and neither a failed write to the
      session nor its hang-up stops the deploy, which then finishes and records its outcome in its file and, on
      success, in `deploy-history.log`.

  Both forms fetch `origin`, confirm the commit exists, take the operations lock (R5; the manual form skips this inside
  a shell that already holds it), and copy
  `infrastructure/deploy/deploy.sh` as it is at the target commit to a temporary file, then run that copy with the
  commit and the source (R1). The deploy logic is therefore the target commit's own, and no running script is a file
  that the checkout replaces. A commit without that file, such as any commit from before this change, is refused with
  a message naming the runbook's manual deploy steps, which stay in the runbook for such commits (R26).

  Under the operations lock, before running the target script or changing the checkout, the entry point also
  installs the target's versioned `backup.sh` and `maintenance.sh` at
  `/opt/cinexplorer/operations/backup.sh` and `/opt/cinexplorer/operations/maintenance.sh`. It is the sole updater
  of these installed files. Both source files are extracted from the target and pass `bash -n` before either
  installed file changes. Complete mode-700 files are prepared in the operations directory and each is renamed
  over its destination; no running job overlaps this update because the worker holds the lock. A missing or
  invalid source file or any installation failure stops the deploy before checkout and execution. If replacing
  the second file fails, the first may already be updated; both destinations remain complete files, and retry
  reconciles them from the chosen target before deployment advances. The installed scripts remain after a later
  deploy failure, and retain the stable Compose `db`/`backend`, PostgreSQL credential and built-in cleanup-command
  interfaces used by the previous published main version `f49b6837c5a72ad4a823bf7594f2d9cf94fcd46d`.

  A target with neither job source retains an already installed executable pair; a partial source pair is
  refused. If there is no installed pair to retain, the entry point refuses that target and names the need to
  deploy a version supplying both scripts first. The explicit manual route for a target without `deploy.sh`
  likewise retains the installed pair. Returning to a target carrying both sources refreshes the installed files
  through the same entry point. This does not assert compatibility with arbitrary historical Compose or backend
  command contracts.
- **R3. CI key restriction.** The CI deploy key's public half sits at `/opt/cinexplorer/ci-deploy.pub`. When that file
  exists, the bootstrap script writes `deploy`'s `authorized_keys` as root's keys followed by one line for the CI key
  with the options `restrict,command="/usr/local/bin/cinexplorer-deploy --from-ci"`; without it, root's keys only, as
  today. The CI key therefore runs nothing but the forced command: no shell, no terminal, no port, agent or X11
  forwarding. Re-running the bootstrap with the file unchanged changes nothing.
- **R4. CI deploy job.** `.github/workflows/ci.yml` gains a `deploy` job that runs on a push to `main`, after `ci-ok`
  succeeds; it is not part of `ci-ok`. A push that changes only `.arc/` starts no run of the workflow (R6).
    - Its condition admits a push to `main` only, and the workflow gains no `pull_request_target` or `workflow_run`
      trigger, either of which would run a pull request's code with the repository's secrets.
    - It uses the GitHub environment `staging`, whose deployment branch rule allows only `main`, with the secrets
      `DEPLOY_SSH_KEY` (the CI key's private half) and `DEPLOY_KNOWN_HOSTS` (the server's host key line) and the
      variable `DEPLOY_HOST` (the server's address).
    - It checks out nothing. It writes the key and the host key line to files readable only by the runner user,
      connects as `deploy` with strict host key checking against that host key and with SSH keepalives
      (`ServerAliveInterval`), since the session can stay silent through a wait for the lock (R5) or a slow step, and
      sends the run's full commit SHA. While the session holds, the job's result is the remote command's exit status,
      and the job log shows what the entry point returns (R2). When the session is lost, the job fails while the
      deploy carries on (R2), and the deploy's outcome is in the newest file in `/opt/cinexplorer/deploy-logs/` and in
      `deploy-history.log` (R26).
    - Its token permissions are `contents: read`, and its concurrency group `deploy-staging` never cancels a running
      deploy. The workflow's existing per-ref concurrency already runs `main`'s push runs one at a time, so deploys
      happen in push order, and the entry point's CI form refuses a re-run of an older run's deploy (R2). Manual runs
      get a concurrency group of their own, so a manual run never cancels a waiting push run; they publish only `sha-`
      tags, so one running beside a push run cannot move the `main` tag. A newer push may cancel a push run still
      waiting; the newer run contains the cancelled run's changes and deploys them, and an `.arc/`-only push starts no
      run, so it cancels none.
    - SSH (port 22) stays reachable from any address, since GitHub's runner addresses cannot be listed in a firewall;
      SSH accepts keys only.
- **R5. One operations lock.** Deploys (R2), backups (R8) and maintenance (R11) each hold an exclusive `flock` on
  `/opt/cinexplorer/ops.lock` for their whole run, waiting up to 30 minutes for it and failing after that. The
  runbook's operations by hand run in a shell that holds the same lock: the restore (R10), and the rollback, the
  manual deploy steps and the update that bootstraps a version before deploying it (R26). The shell is opened as
  `flock /opt/cinexplorer/ops.lock env CINEXPLORER_OPS_LOCK=held bash`, so an automatic deploy or a nightly job waits
  for them, or fails visibly after 30 minutes. The entry point's manual form, run inside that shell, sees
  `CINEXPLORER_OPS_LOCK=held` and does not take the lock again; its CI form always takes it. No two of these
  operations overlap: no backup runs during a migration, and no checkout changes under a running job. The deploy's
  pre-migration backup invokes `backup.sh` directly under its already-held lock, never through the systemd service
  that would attempt to take that lock again.

### CI change detection and configuration checks

- **R6. Code-change detection.** `ci.yml`'s `push` trigger ignores `.arc/**` (`paths-ignore`), so a push to `main`
  whose changes all lie under `.arc/` starts no run of the workflow, and a push with any change outside `.arc/` runs
  every job as today. Pull requests and manual runs are not filtered, and `ci-ok` is unchanged. A second workflow runs
  the `markdown` job's steps (the recovery-hook test and the markdown lint) on a push to `main` that changes anything
  under `.arc/`, from one definition that `ci.yml`'s `markdown` job also uses; a push that changes both runs both. An
  `.arc/`-only push therefore cannot cancel a waiting code run (R4), and it never retries a failed deploy.
- **R7. Production configuration checks.** The `images` job, after building the web image, runs
  `caddy validate --adapter caddyfile --config /etc/caddy/Caddyfile` inside it with placeholder `SITE_ADDRESS`,
  `ADMIN_BASIC_AUTH_USER` and a bcrypt-format `ADMIN_BASIC_AUTH_HASH`, and runs
  `docker compose -f infrastructure/docker-compose.prod.yml --env-file infrastructure/prod.env.example config --quiet`
  with `BACKEND_ENV_FILE` overridden to the repository's `backend/config/.env.example`, since the example's server path
  does not exist on the runner. Either failing fails the job.

### Backups and restore

- **R8. Nightly backup.** The versioned source `infrastructure/deploy/backup.sh` is installed by R2 at
  `/opt/cinexplorer/operations/backup.sh`, which runs from `cinexplorer-backup.service`
  (as `deploy`), started daily at 10:00 UTC by `cinexplorer-backup.timer` with `Persistent=true`, so a run missed while
  the server was off happens at the next boot. The service starts the script only once it holds the operations lock
  (R5). The script:
    1. writes `pg_dump --format=custom` of the application database, run in the `db` container, to a new file in
       `/opt/cinexplorer/backups/` (mode `700`);
    2. checks the file with `pg_restore --list` in the `db` container;
    3. uploads it to Cloudflare R2 as `<R2_PREFIX>/cinexplorer-<UTC timestamp>.dump` with the `rclone/rclone` image on
       a pinned release line, configured entirely by environment variables (no rclone configuration file);
    4. deletes the local file and requests the backup check's ping URL.

  On any failure it requests the ping URL's `/fail` form, sending the failed step's last output lines as the request
  body, and exits non-zero. Its settings come from `/opt/cinexplorer/ops.env` (mode `600`): the R2 account endpoint,
  access key, secret, bucket and prefix, and the backup and maintenance ping URLs. `infrastructure/ops.env.example`
  lists every variable with no real values. The same script also supplies the deploy's pre-migration backup (R1),
  with its existing upload and heartbeat failure behavior. Its configuration is ready before the first automated
  deployment. Assignments in `ops.env` must be compatible with both systemd's EnvironmentFile and shell sourcing:
  `NAME=value` or single-quoted values, without `export` statements or shell commands.
- **R9. Backup storage.** The bucket is private, the token the server holds can read and write objects in that bucket
  only, and a lifecycle rule deletes backup objects 30 days after upload. The maintainer sets these in Cloudflare.
- **R10. Restore procedure.** The runbook gives the restore, run in a shell holding the operations lock (R5):
    1. list the backups in R2 and download one through the rclone image;
    2. stop `backend`;
    3. copy the live database with `pg_dump --format=custom` through the `db` container to a file in
       `/opt/cinexplorer/backups/` (the backup service cannot make this copy, since it waits for the lock the shell
       holds);
    4. empty the application database's `public` schema (drop it with `CASCADE` and recreate it) through the `db`
       container;
    5. restore with `pg_restore --no-owner --single-transaction`;
    6. run migrations with the deployed image, which applies any migration newer than the dump;
    7. start `backend`, confirm the health check and a sign-in, then delete the copy.

  If the restore or the migrations fail, the copy is restored the same way (steps 4 to 7), which returns the database
  to its state before the restore: emptying the schema falls outside the restore's transaction, so without the copy a
  failed restore would leave an empty database. Restoring into an emptied schema, rather than with `--clean` over the
  live one, is what lets a dump older than the deployed schema restore: `--clean` drops only the objects in the
  archive, so a newer table survives, and either blocks the drop of a table it references or makes the next migration
  fail on a table that already exists. The runbook states that a restore discards every change made after the dump,
  and that a dump must not come from a version newer than the deployed one: deploy the dump's version first.

### Scheduled maintenance

- **R11. Nightly maintenance.** The versioned source `infrastructure/deploy/maintenance.sh` is installed by R2 at
  `/opt/cinexplorer/operations/maintenance.sh`, which runs from `cinexplorer-maintenance.service` (as
  `deploy`), started daily at 10:30 UTC by `cinexplorer-maintenance.timer` with `Persistent=true`, under the
  operations lock. It runs `python manage.py flushexpiredtokens` and `python manage.py clearsessions` in the running
  `backend` container, then requests the maintenance check's ping URL, or its `/fail` form with the output on failure.
- **R12. Server setup.** The bootstrap script (`infrastructure/deploy/bootstrap.sh`) also installs
  `/usr/local/bin/cinexplorer-deploy` (R2), creates `/opt/cinexplorer/deploy-logs/`, `/opt/cinexplorer/backups/`
  and `/opt/cinexplorer/operations/`
  (mode `700`, owned by `deploy`), writes the four systemd units (R8, R11), and enables both timers, keeping
  its contract that a second run reports every step `UNCHANGED`. Times are in UTC, clear of the 09:00 UTC window in
  which security updates may reboot the server. The entry point's and the units' content is carried inside the
  bootstrap script, as every file it installs already is, so its first run on a new server, which happens before the
  repository is cloned, installs them. Bootstrap creates the operations directory and stable service paths,
  without embedding duplicate job bodies. A job before the checkout, `ops.env` or the first installed script exists
  fails, naming the missing input in its journal.

### Monitoring

- **R13. Health check covers the database.** `GET /api/health-check/` runs `SELECT 1` on the default database
  connection: `200 {"status": "healthy"}` when it succeeds, `503 {"detail": "Service unavailable."}` when it fails,
  in the project's error shape (R20) and with no error text from the database. The OpenAPI schema and the generated
  frontend types include the `503` response. Redis is not
  checked. Both Compose files' backend health checks call this endpoint, so a database outage marks the backend
  unhealthy, and a deploy's `up --wait` fails while the database is down.
- **R14. External monitors.** An UptimeRobot HTTP monitor requests `https://<site>/api/health-check/` every 5 minutes
  and alerts the maintainer by email when it fails and when it recovers. Two Healthchecks.io checks, `backup` and
  `maintenance`, each expect a ping every day with a 2-hour grace period and alert by email on a `/fail` ping or a
  missed one. The maintainer sets these up.

### Sign-in and email on the deployed host

- **R15. OAuth apps from the environment outside development.** In `staging` and `production`, each provider's app
  comes from the backend environment through `SOCIALACCOUNT_PROVIDERS[<provider>]["APP"]`:
    - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` both set: Google is configured; neither: Google is unconfigured,
      and allauth refuses a sign-in attempt with it; only one: startup fails with `ImproperlyConfigured` naming the
      missing variable. The same holds for `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
    - In `development` the four variables are ignored, and the database rows stay the only source; allauth's lookup
      fails when a provider has both a database row and a settings app. `backend/config/.env.example` says so, and
      its production checklist's OAuth and maintenance items are rewritten to match this change: the four variables
      in the backend env file, and the nightly timers (R11) in place of its daily `flushexpiredtokens` cron job.

  The deployed hosts use their own provider apps, not the development ones: a Google OAuth client in the existing
  Google Cloud project whose authorized redirect URIs are
  `https://staging.cinexplorer.andrewcreekmore.dev/accounts/google/login/callback/` and
  `https://cinexplorer.andrewcreekmore.dev/accounts/google/login/callback/`; and a GitHub OAuth App whose homepage is
  `https://cinexplorer.andrewcreekmore.dev` and whose callback configuration accepts
  `/accounts/github/login/callback/` on both hosts. The scopes are allauth's defaults: Google uses only basic identity
  scopes (`email`, `profile`, and optionally `openid`). The Google project may remain in `Testing` for this sign-in,
  including accounts absent from its test-user list. Publishing the consent screen to `In production` moves to the
  later website work (Stage 4), once the application homepage, privacy policy and terms pages are live. The deployed
  client and both authorized callbacks stay as configured.
- **R16. Site record from the deployment.** A `configure_site` management command sets the Site record named by
  `SITE_ID` to the domain in the `SITE_DOMAIN` setting and the name `CineXplorer`, and reports whether it changed
  anything. `SITE_DOMAIN` comes from the `SITE_DOMAIN` environment variable, which the production Compose file sets to
  `${SITE_ADDRESS}` for `backend`. In `development` it defaults to `localhost:8444`, the development record's domain.
  In `staging` and `production` it has no default, and the command exits non-zero naming it when it is unset; startup
  does not require it, so the image build's static-file step and CI's deployment-settings check need no new
  placeholder. The deploy script runs the command after migrations (R1), so a deploy without it stops there.
- **R17. Email on the deployed host.** The backend env file sets `ZEPTOMAIL_API_KEY` and
  `ZEPTOMAIL_SENDER_EMAIL=cinexplorer@andrewcreekmore.dev`, and mail is sent through R23's backend. Verification and
  password-reset links already use `FRONTEND_URL`, which the production Compose file derives from `SITE_ADDRESS`.

### Authentication hardening

- **R18. A throttle scope per endpoint.** Registration, sign-in and resend-verification each use their own anonymous
  throttle scope (`auth_register`, `auth_login`, `auth_resend_verification`), beside the frontend log endpoint's
  `frontend_logs`; rates are unchanged. A request to one of these endpoints counts against that endpoint's history
  only.
- **R19. Throttle state per request.** The project's throttle base classes, `TestAwareAnonThrottle` and
  `TestAwareUserThrottle`, keep a request's cache key, history and time in thread-local storage rather than on the
  shared throttle object, so concurrent requests handled by different threads of one worker are each counted under
  their own key. Django Ninja calls `wait()` on the same object right after a refusal to set `Retry-After`, in the same
  thread, so the header reflects the refused request's own history. Counting across worker processes stays as it is: a
  read, then a write to Redis, not atomic.
- **R20. CSRF checked by default.** A new CSRF middleware replaces `CsrfHeaderMiddleware`. It subclasses Django's
  `CsrfViewMiddleware`, and differs in two ways only: it checks every `POST`, `PUT`, `PATCH` and `DELETE` request even
  when the view is marked CSRF-exempt (Django Ninja marks all its views so), and it exempts three paths:
  `POST /api/logs/`; `POST /api/dev-logs/write/`, the development-only log endpoint, which answers `403` outside
  `development` and which the frontend's console capture calls with a plain `fetch`; and `/__debug__/`, the debug
  toolbar, mounted only in `development`, whose SQL panel posts to views it marks CSRF-exempt without a token.
  Everything else is Django's:
    - the token comes from the `X-CSRFToken` header or the `csrfmiddlewaretoken` form field and must match the
      `csrftoken` cookie;
    - on HTTPS requests the `Origin` header, or else the `Referer`, must match the host or `CSRF_TRUSTED_ORIGINS`;
    - the `csrftoken` cookie is set on any response for which a token was requested, so allauth's session request,
      which the frontend makes when it checks the sign-in state on load, sets it, and `GET /api/csrf/` keeps setting
      it explicitly;
    - Django's test client still skips the check unless it is created with `enforce_csrf_checks=True`.

  A refused request receives `403 {"detail": "CSRF token missing or invalid."}`, in the `{"detail"}` shape the
  project's new error bodies use, with no debug text in any environment. `security.W003` stays silenced, since
  Django's check looks for its own class path, and the comment beside it names the three exemptions and their
  reasons.
- **R21. The frontend sends the token.** `getCsrfToken` and the API client's request interceptor read the `csrftoken`
  cookie. Before an unsafe request, the interceptor fetches `GET /api/csrf/` when the cookie is missing. Every unsafe
  request the frontend sends carries the token, including those made outside the interceptor:
    - the access-token refresh the API client's response interceptor retries with a bare `axios.post` to
      `/api/auth/refresh`, which would otherwise be refused and sign every password user out;
    - the sign-out of a user signed in with Google or GitHub, a `fetch` `DELETE` on allauth's session endpoint
      (`hooks/auth/useAuth.ts`);
    - the password-reset completion, a `fetch` in `authService.resetPassword`;
    - the OAuth start form, which also fetches `GET /api/csrf/` first when the cookie is missing.

  The two development log calls are exempt (R20).
- **R22. A failed send is a handled error.** When an email fails to send:
    - `POST /_allauth/browser/v1/auth/password/request` and `POST /api/resend-verification/` answer
      `503 {"detail": "We couldn't send the email. Please try again in a few minutes."}`, and the backend logs the
      failure at `ERROR` without a traceback: a fixed message naming the endpoint and, for resend-verification, the
      user's ID, never the address or the exception's text. For allauth's endpoint, a middleware turns an
      `EmailDeliveryError` raised under `/_allauth/` into that response; the resend service catches it itself, and
      the resend endpoint declares the `503` response, so the committed OpenAPI schema and generated frontend types
      include it.
    - The resend token is consumed only once the email has been sent: checking it reads it, and a successful send
      deletes it. After a failed send the same token stays valid and its 10-minute lifetime starts again, so a retry
      within the few minutes the message names sends the email. Two concurrent requests with one token may both send;
      the endpoint's throttle bounds that.
    - `authService.requestPasswordReset` keeps the response's status and its `detail` message when it rethrows, and
      the forgot-password page shows that message on a `503`, keeping its generic confirmation for every other
      outcome. The login page's resend action shows that message in its failure toast on a `503`, in place of
      "Please try again later.", and keeps its current toasts for every other error.
    - The API client's global "Server error" toast, shown today for every response of `500` or above, is not shown
      for a `503` from these two endpoints, whose callers show their own message.
    - Registration keeps its current response to a failed send.
- **R23. ZeptoMail backend.** `EMAIL_BACKEND` names a project backend, a subclass of Django's `BaseEmailBackend`, that
  reuses the package's message conversion and sends the request itself. The package's own backend only loops over its
  message class, and its module imports that class at the top, so the project backend replaces it rather than
  subclassing it and imports the message class inside its send path, once a key is set. It sends:
    - with a 10-second connect and read timeout;
    - with nothing written to stdout;
    - logging each send's outcome through `logging`: at `INFO` when accepted and at `WARNING` when refused or failed,
      with the status code (or the exception's class) and the request identifier or error code when ZeptoMail's
      response carries one, never the API key, the recipients or the message content;
    - counting a timeout, a connection error or a non-2xx answer as not sent (`0`), never raising, so every failure
      reaches the adapter's `EmailDeliveryError` and R22's response;
    - with no API key set, sending nothing and returning `0` with a `WARNING`, without importing the package's message
      class, whose class body raises `ValueError` when the key is empty. Staging runs this change before its key is
      set (Dependencies and Preconditions), and a send in that window reaches R22's response too.

  Comments and docstrings that name the configured email backend, such as `CustomAccountAdapter`'s docstring and the
  comment above `EMAIL_BACKEND` in `settings.py`, describe the project backend.

  `req.txt` pins `django-zoho-zeptomail==0.0.4`, the version the backend is written against; the existing
  transport-layer test fails if a different version changes what reaches ZeptoMail.
- **R24. Only the allauth endpoints the site uses.** A middleware answers `404` to every request under `/_allauth/`
  except these, with these methods: `browser/v1/auth/session` (`GET`, `DELETE`), `browser/v1/auth/password/request`
  (`POST`), `browser/v1/auth/password/reset` (`POST`) and `browser/v1/auth/provider/redirect` (`POST`). allauth's
  sign-up and password sign-in, its other browser endpoints and its whole `app` client become unreachable, so
  registration and password sign-in go only through the project's own endpoints, with their throttles, username rules
  and JWT handling. The OAuth provider callbacks under `/accounts/` are unaffected. In every environment, so the
  development stack matches what is deployed.
- **R25. Sign-in client tests.** The frontend gains unit tests for the sign-in state the site keeps and the storage it
  keeps it in:
    - `useAuth`: the initial state from stored tokens; a password sign-in storing its tokens and fetching the
      profile; a session found for a user signed in with Google or GitHub; an expired access token and a failed
      refresh ending the signed-in state, and an expired access token with a successful refresh keeping it (R28), on
      load, at the periodic check and before the profile is fetched; a failed refresh on load clearing the stored
      tokens; the refreshed token stored where the old one was; a refresh that waits for another tab's refresh and
      uses the newer token that tab stored instead of requesting one; the hook and the API client's interceptor,
      refreshing at the same moment, sending one refresh request; a user signed in with Google or GitHub never
      requesting one; and sign-out for each kind of user clearing the stored state (with R21's token on the OAuth
      sign-out); sign-out while renewal waits for a Web Lock or a successful response must leave both browser
      storages cleared after the older operation settles, without clearing credentials established by a later sign-in;
    - `utilities/tokenUtils.ts`: reading a token from a cookie, reading a token's expiry, choosing and reporting the
      storage in use, storing and clearing tokens, and `areTokensExpired`.

  They test behavior through each module's exports, with the network replaced at the request boundary. A separate
  browser regression loads the real hook and Axios transport against a local HTTP fixture: it holds refresh
  headers, or sends the headers and holds the body, until a successful logout and optional later sign-in finish.
  It observes the HTTP-only cookie and the next renewal's account identity, for both browser storages. This is a
  client/transport regression; no deployed backend or provider sign-in is needed.
- **R28. A password user stays signed in while the refresh token is valid.** Before `useAuth` treats a user holding
  an access token as signed out because that token has expired (on load, in its 60-second check, and before it
  fetches the profile), it requests a new access token through the API client's refresh (`POST /api/auth/refresh`,
  carrying R21's token). On success it stores the new access token in the storage that held the old one, so a
  sign-in made without "remember me" still ends with the browser session, and the user stays signed in; on failure
  the stored tokens are cleared and the user is signed out, as today. Each refresh rotates the refresh token and
  blacklists the one it presented, so two refreshes at the same moment can fail. Within a tab, the hook and the API
  client's response interceptor share one refresh in flight. Across tabs, which share the refresh cookie and
  `localStorage`, refreshes take turns under the browser's Web Locks API (`navigator.locks`): holding the lock, a
  refresh first reads the storage again and uses an access token another tab stored meanwhile, unexpired and expiring
  later than its own, instead of requesting one; otherwise it requests one, presenting the cookie any earlier refresh
  rotated. Where the API is missing, refreshes are shared within a tab only. These rules hold for the interceptor's
  refreshes too. Users signed in with Google or GitHub hold no access token and are unaffected. Until the refresh
  answers on load, the page shows the signed-out state, as it already does while a Google or GitHub user's session is
  checked. The refresh runs in the hook's existing effects, an exception to the rule that server data is read through
  TanStack Query: it renews a token rather than reading data a page shows, and moving the sign-in state onto
  TanStack Query is a change of its own. An explicit sign-out invalidates renewal work belonging to the ended
  session. A renewal waiting for its Web Lock does not begin a request after that invalidation; an already-sent
  renewal does not publish credentials when its response arrives. Invalidation cancels this tab's active refresh
  transport synchronously before clearing credentials or sending the logout request. A response whose headers
  already installed a rotated HTTP-only refresh cookie is ordered before the successful logout response that
  deletes it; cancellation prevents later headers from replacing that deletion or a subsequent sign-in's cookie.
  This guarantee covers renewal controlled by the signing-out tab, not cancellation or session revocation in other
  tabs. Renewal-dependent callers likewise do not publish authenticated state or clear a newer session from an
  obsolete completion. Ordinary successful and failed renewal, and logout's existing network-failure behavior,
  retain their existing behavior.

### Runbook

- **R26. Runbook.** `infrastructure/deploy/README.md` covers:
    - first-time setup additions: `ops.env`; the CI deploy key (generated locally, its public half at
      `/opt/cinexplorer/ci-deploy.pub`, its private half and the server's host key line as the `staging` environment's
      secrets, `DEPLOY_HOST` as its variable, `main` as its only deployment branch); the env file entries for
      ZeptoMail and both OAuth apps, which setup used to delete;
    - deploys: automatic from `main`, and manual with `cinexplorer-deploy <sha>`, for a branch or a redeploy; where a
      CI deploy's full output is kept (R2), and where its outcome is when the CI job lost its session (R4);
    - the manual deploy steps the runbook gives today, kept for a commit without the deploy script, which the entry
      point refuses (R2): run in a shell holding the operations lock (R5), and ending with the line R1's last step
      would write, appended to `deploy-history.log` by hand;
    - updating the server itself: when a deployed version changes `bootstrap.sh`, re-run the bootstrap from that
      checkout after the deploy. A version whose deploy needs its own bootstrap changes first takes them on the server
      before it merges, since CI deploys it as soon as it merges: in a shell holding the operations lock (R5), it is
      checked out by hand, bootstrapped with `sudo`, then deployed with `cinexplorer-deploy`, which runs at once inside
      that shell. That is how the existing staging server takes this change: the bootstrap's first run installs the
      entry point and the units and reports them `CHANGED`, and the run after reports every step `UNCHANGED`;
    - rollback, in a shell holding the operations lock (R5): the existing schema comparison and reversal, with the
      target read from `deploy-history.log`. When the running version is not the newest line's new version (a deploy
      or rollback after that line failed at step 5), the target is the newest line's new version. Otherwise it is the
      previous version on the newest line whose new version is the one running and whose previous version differs
      from it, which passes over a redeploy's line and a line recording a rollback after a failed deploy. The running
      version is read from the `backend` container as R1's first step reads it. A rollback right after another
      rollback picks its target from the log by hand, since the newest line is then the first rollback itself. The
      final switch is made in the same shell with `cinexplorer-deploy <target-sha>` or, for a commit without the deploy
      script, the manual steps. The manual route keeps the installed operations scripts and uses their stable
      backup path before a later legacy operation; neither service depends on files removed by the checkout.
      After a rollback, `main`'s head still holds the version rolled back from, and the next
      push run deploys it with whatever that push adds: revert or fix it on `main` before anything else merges;
    - the restore procedure (R10);
    - the nightly jobs: their timers, `journalctl` for their output, and starting one by hand with `systemctl start`;
    - the monitors (R14) and where their alerts go;
    - moving to `cinexplorer.andrewcreekmore.dev`: an `A` record, `SITE_ADDRESS`, `ENVIRONMENT=production` (a one-year
      `Strict-Transport-Security` with `includeSubDomains` and `preload`), a deploy, which updates the Site record, and
      the UptimeRobot monitor's address. The provider apps already accept the production callbacks, and
      `DEPLOY_HOST` is unchanged on the same server.

  The runbook's opening note on what staging supports is updated.

### Authentication reference

- **R27. Authentication strategy and stale references.** `.arc/reference/strategies/project/strategy-authentication.md`,
  which names itself the authoritative reference for authentication, is updated to this change throughout: wherever
  it describes CSRF, its CSRF section and its frontend code samples among them, to R20 and R21 (the `csrftoken`
  cookie, every unsafe request checked, the token on OAuth requests required); its description of allauth's headless
  clients to R24 (the browser endpoints the site uses, the `app` client closed); and its steps for adding a provider
  to R15 (environment variables in deployed environments, database rows in development only); and its token refresh
  flow and its response-interceptor sample to R28 (the refresh in `useAuth` on load, in the 60-second check and
  before the profile is fetched; one refresh function the hook and the interceptor share; refreshes taking turns
  across tabs under Web Locks, with no refresh made outside that function). Every other comment,
  docstring, test and document outside the archive that describes the old design is brought in line with R20 and R21
  too. The old design means `CsrfHeaderMiddleware` and its path-based exemptions, an `XSRF-TOKEN` cookie, CSRF-exempt
  sign-in, registration or allauth endpoints, and an optional token on OAuth requests. Beside the files R20 and R21
  replace, the sites include `backend/config/api.py`'s and `backend/apps/authentication/auth_ninja.py`'s CSRF
  comments, the comment on the CSRF middleware's entry in `settings.py`'s `MIDDLEWARE`, the docstring of
  `useOAuthFlow.ts`'s OAuth start, and `backend/apps/authentication/tests/integration/test_csrf_protection.py`, whose
  docstring and whose tests asserting that sign-in and registration need no token describe the old design.
  `backend/scripts/test_csrf_protection.sh`, which expects sign-in and registration to accept requests without a
  token and which nothing runs or references, is removed; Implemented 2's tests cover its checks.

## 5. Non-Goals (Out of Scope)

- Moving the site to `cinexplorer.andrewcreekmore.dev`, and running a second environment beside staging. The runbook
  documents the move (R26).
- Deploying branches from CI, automatic rollback, and zero-downtime deploys.
- Hiding the sign-in button of an unconfigured provider, Google's brand verification, and the privacy policy page it
  needs.
- Client-side encryption of backups, DigitalOcean's droplet backups, continuous archiving or point-in-time recovery,
  scheduled backups more often than nightly, and backing up Caddy's certificates or the env files (the maintainer
  keeps the secrets).
- Monitoring beyond the health endpoint and the two nightly jobs: metrics, log collection, error tracking, Redis.
- Atomic throttle counting across worker processes, and new or changed rate limits.
- Registration's response to a failed send, which already rolls back and answers with a message.
- An upstream fix to `django-zoho-zeptomail`, and the sender's display name.
- CORS changes, and CSRF checks on safe methods.
- End-to-end tests of sign-up and sign-in; R25's unit tests cover the client's sign-in state.
- A sign-in state that is still being resolved, as distinct from signed out, and the moment on load that shows a
  signed-in user as signed out (R28); moving the sign-in state onto TanStack Query; and the `{"error"}` bodies the
  authentication endpoints return today.
- Any change to application behavior, the API schema or the generated frontend types beyond R13, R15, R16,
  R18–R24 and R28.

## 6. Design Considerations

Three visible changes. Two come when an email cannot be sent (R22): the forgot-password page shows a message, and the
login page's resend action shows that message in its own failure toast, without the global "Server error" toast
beside it. The third: a visitor signed in with a password is still signed in after an idle tab or a reload (R28).
The pages otherwise look as they do today.

## 7. Design Decisions

1. **One change, with the authentication hardening in the build that first opens sign-up**, over separate deployment
   and authentication changes: the hardening exists for one event, email and OAuth sign-in opening on a public host,
   and both halves are checked in the same live session on staging. Each half alone is small, and together they stay
   well inside what one review of the whole change set can hold.
2. **CI pushes the deploy over SSH with a key locked to one command**, over an unrestricted key and over a pull-based
   agent on the server. The `deploy` user is in the `docker` group, so an unrestricted key in CI would be root on the
   server. A pull-based agent adds a daemon that polls and has no tie to CI's result. The forced command limits a
   leaked CI key to deploying a commit from `main`'s history.
3. **The entry point lives outside the checkout and runs the target commit's deploy script from a temporary copy**,
   over running the script in place, which `git checkout` would replace while it runs, and over logic installed once
   by the bootstrap, which would drift from the version being deployed. A commit from before the script existed is
   refused rather than guessed at, and the runbook keeps the manual steps for it, the one route back across this
   change. The previous version is the last one a successful deploy recorded in the history log, and the `backend`
   container's image only while the log is empty. The checkout would be wrong after a checkout made by hand or a
   deploy that failed partway, both of which leave it at the target already; the running container alone would be
   wrong after a rollback, which has stopped it, and after a deploy that failed its health check, which has already
   replaced it. Either way a rollback would target a version it is meant to leave.
4. **Automatic deploys only from `main`, after `ci-ok`**: images publish before the tests finish, so a deploy that
   waited only for its images could ship a build whose tests failed. Branch deploys stay manual, since a branch
   deployed automatically would be replaced by the next push to `main`.
5. **One operations lock** across deploys, backups and maintenance, over scheduling them apart. A manual deploy and an
   automatic one at the same time would race on the checkout, `IMAGE_TAG` and the migrations, and deploys come at any
   hour, so no schedule keeps a nightly job from running while a deploy switches the checkout its script lives in or
   holds table locks for a migration. The runbook's operations by hand take the same lock for the same reason: an
   automatic deploy landing mid-restore would migrate and restart against a half-restored database, one landing
   mid-rollback would migrate forward over the reversal, and a nightly job firing during a hand checkout or migration
   would run against it. Letting the manual entry point run inside the locked shell keeps a rollback's final switch
   under that lock.
6. **Host systemd timers**, over a scheduler container in the Compose stack: the jobs show in `systemctl` and the
   journal, `Persistent=true` catches missed runs, and the stack's services and memory limits stay as they are. Docker
   is the only runtime the jobs need; rclone runs as a container.
7. **Nightly `pg_dump` to R2**, over DigitalOcean's weekly droplet backups (a whole disk, weekly, held by the same
   provider as the server) and over continuous archiving (more mechanism than a site of this size needs). The custom
   format restores selectively and is checked before upload. **No client-side encryption:** the R2 token sits on the
   server that holds the database itself, so encryption would protect only against R2 leaking on its own, and would add
   a key whose loss loses every backup.
8. **The restore empties the schema first and is rehearsed on a local production stack.** Emptying the schema, over
   `pg_restore --clean`, lets a dump older than the deployed schema restore and then migrate forward, the usual case
   when a deploy is what went wrong (R10). Emptying it falls outside the restore's transaction, so the live database
   is copied first, and a failed restore can still be abandoned. The rehearsal runs locally, over restoring on the
   live server, which would discard live data; it proves the dump restores into the deployed images and that the
   application signs in with its accounts.
9. **A heartbeat per nightly job**, over mail sent from the server on failure: a job that never ran, or a server that
   is down, sends nothing, but a missed heartbeat still alerts.
10. **The health check covers the database and not Redis:** accounts, watchlists and sign-in live in the database,
    so its outage breaks every signed-in page while the shallow check still reports healthy. Redis holds only
    disposable data that needs no recovery, and its container restarts when it fails. The deeper check also makes
    `up --wait` refuse a deploy while the database is down.
11. **OAuth apps from the environment in deployed environments**, over database rows entered through admin: the
    secrets stay out of the database and so out of every backup, and a rebuilt server gets sign-in back from its env
    file. Development keeps its rows because allauth's lookup fails when one provider has both sources.
12. **Separate provider apps for the deployed hosts**, over adding their callbacks to the development apps: the
    provider's consent and authorization screens show the app's name and homepage to every visitor, and development
    secrets stay on development machines.
13. **The Site record set by a command at each deploy**, over a data migration (migrations should not depend on the
    environment) and over a step in admin (forgotten on a rebuild). The command is idempotent, so every deploy can run
    it.
14. **CSRF checked on every unsafe request, with three exemptions**, over closing the listed gaps in the path list. The
    path list needed an entry for every new endpoint, and its trigger, an `access_token` cookie, missed every
    cookie-authenticated request that exists. Subclassing Django's middleware keeps Django's token comparison, Origin
    check and cookie handling and the test client's opt-in, and covers allauth's browser views, which expect Django's
    middleware, and Django Ninja's views, which Django's middleware would skip. Requests authenticated by an
    `Authorization` header are checked too, although a cross-site page cannot forge them: the frontend sends the token
    on every unsafe request, and one rule is easier to keep right than two. `POST /api/logs/` is exempt because it is
    anonymous, rate-limited, and changes nothing a forged request could exploit, and a first-time visitor's error
    reports must not depend on a cookie. `POST /api/dev-logs/write/` is exempt because it exists only in development,
    where the console capture calls it outside the API client, and `/__debug__/` because the debug toolbar exists only
    in development and its own views are CSRF-exempt.
15. **Throttle state in thread-local storage**, over a lock around the throttle (which would serialize every request
    to that endpoint) and over a throttle object per request (Django Ninja builds them once per operation). Gunicorn's
    `gthread` worker handles one request per thread at a time.
16. **A project email backend over the ZeptoMail package's message conversion**, over waiting for an upstream release:
    the timeout and the logging are needed before sign-up opens. It replaces the package's backend rather than
    subclassing it, since that module imports the message class, which fails without a key, and the package's backend
    adds nothing the project backend keeps. Pinning the exact version keeps the backend and the package in step.
    Failures, a missing key among them, are counted as not sent rather than raised, so every failure reaches one
    handled path.
17. **`503` for a failed send**, over `500`: the email service is unavailable, the server is not broken, and a
    distinct status lets the forgot-password page show the failure while keeping its generic confirmation for
    everything else. allauth also emails addresses with no account (its default `ACCOUNT_EMAIL_UNKNOWN_ACCOUNTS`), so
    the reset request attempts a send either way, and a `503` says nothing about whether an account exists. Resend's
    `503` tells the holder of a resend token that the token was valid, which that holder can already see. The resend
    token is spent on a successful send rather than on checking, over issuing a fresh token in the `503` (a new field
    in the API for the same effect) and over telling the visitor to sign in again (a worse retry than the one the
    message offers). A failed send restarts the token's lifetime, so the retry the message invites falls inside it.
18. **Change detection by the push trigger's path filter, with a small workflow linting `.arc/` pushes**, over a
    detection job that diffs against the last successful push run (an Actions API query, a token permission and a
    two-mode `ci-ok` for the same effect) and over a third-party filter action (one more pinned dependency). An
    `.arc/`-only push starts no CI run, so it cannot cancel a waiting code run, and a code push's run contains every
    change of a run it cancels. GitHub runs a filtered workflow whenever it cannot compute the diff, and its
    3,000-file limit cannot hide a code change behind `.arc/` files at this tree's size. The filter applies to pushes
    only, so pull requests and `ci-ok`'s meaning for them are unchanged. A failed deploy is not retried by a later
    `.arc/`-only push, which would otherwise redeploy a version a rollback had just left.
19. **Setup outside the repository is checked, not assumed.** Each step in a provider's console has a success
    criterion that proves it through behavior, or records it where behavior cannot show it yet, as with the production
    host's callbacks before that host exists.
20. **An allowlist of the allauth endpoints the site uses**, over closing allauth's local sign-up through the account
    adapter and over filtering paths in Caddy. allauth's social adapter asks the account adapter whether sign-up is
    open, so closing it there would also close sign-up through Google and GitHub, and would leave allauth's password
    sign-in and its `app` client open. A Caddy filter would leave the development stack different from what is
    deployed and the backend reachable on the Compose network. The allowlist names four endpoints the frontend calls,
    so anything allauth adds in a later version stays closed until the site uses it.
21. **A CI deploy's full output stays on the server**, over streaming it to the job log: the repository's Actions logs
    are public, and a failed migration's database error can quote the rows it rejected. CI still sees which step
    failed and where the full log is.
22. **Unit tests for the sign-in client in this change, and end-to-end tests later**: this change edits `useAuth`
    and the token handling around it, unit tests run in the frontend suite CI already runs, and an end-to-end suite
    needs its own environment and browser setup, which is a change of its own.
23. **Refresh before signing a password user out**, over a longer access-token lifetime: a 5-minute access token
    limits what a stolen one can do, and the 14-day refresh token in its HTTP-only cookie exists to renew it; the hook
    asks for the same renewal the API client already makes after a `401`. A sign-in state that is still resolving,
    which would hide the signed-out moment on load, is a change of its own.
24. **Refreshes take turns across tabs under Web Locks**, over reading the storage again after a failed refresh:
    Chrome runs the timers of hidden tabs on the same minute boundary, so two idle tabs' 60-second checks refresh at
    the same instant, and the tab that loses may read the storage before the other has stored its token. With the
    lock the second refresh starts only after the first has finished, so it finds the new token or presents the
    rotated cookie and succeeds; that also serves sign-ins without "remember me", whose storage other tabs cannot
    read. Current Chrome, Firefox and Safari provide the API.

25. **Installed operations scripts survive legacy checkout.** Versioned source remains with the application,
    while the entry point installs complete executables outside the checkout under the shared lock. Keeping the
    installed copies during a legacy rollback preserves backups and cleanup without another checkout or scheduler.
    One updater prevents bootstrap and deployment from selecting different versions; per-file replacement and a
    retriable failure stop are sufficient because these two jobs use independent, stable command interfaces.
26. **Explicit sign-out wins over renewal.** Pending credential renewal belongs to the session that started it.
    Invalidation at sign-out prevents a late response from undoing the visitor's action, including callers waiting
    for the Web Lock. Canceling the refresh transport before logout also orders its HTTP-only cookie effects before
    the successful logout deletion and a later sign-in. The guarantee is local to the signing-out tab; it does not
    add cross-tab session revocation, a resolving authentication state or a move onto TanStack Query.

## 8. Success Criteria

The criteria come in three groups. **Implemented** criteria are checked locally and in CI. **Proven live** criteria
are checked with staging running this change's images, deployed with `cinexplorer-deploy` before the pull request
merges: on the server, in the provider consoles and GitHub's settings, and in one restore rehearsed locally.
**Proven after merge** criteria depend on a push to `main`, so verification before the merge cannot check them: they
are checked once the change has merged, and their evidence is recorded before the work is archived. Each criterion
is marked with its evidence beside it, and the evidence for setup done in a provider's console says
what was seen and where.

### Implemented (checkable locally and in CI)

1. Backend tests show that requests to sign-in do not count against the registration or resend-verification
   throttles, nor the reverse, and that a test which interleaves two requests from different client addresses on one
   throttle object, across two threads, records each under its own key.
2. Backend tests with `enforce_csrf_checks=True` show that each of these, sent without a token or with a token that
   does not match the cookie, answers `403` with R20's body, and passes the check with a matching cookie and header:
   sign-in, registration, logout, email verification, resend-verification, both refresh endpoints, allauth's
   password-reset request, and a watchlist change by a user authenticated by the session alone. A request with a
   matching token and an `Origin` from another site is refused on HTTPS. `POST /api/logs/` without a token is
   accepted, as is `POST /api/dev-logs/write/` under `development`.
3. Frontend tests show the API client sends the `csrftoken` cookie's value as `X-CSRFToken` on an unsafe request and
   fetches `/api/csrf/` first when the cookie is missing; that the refresh retry, the OAuth sign-out, the
   password-reset completion and the OAuth start form each send the token; that the forgot-password page shows
   R22's message on a `503` and its generic confirmation on other errors; that the login page's resend action shows
   R22's message on a `503`; and that the API client shows no global "Server error" toast for a `503` from the
   password-reset request or resend-verification, and still shows it for other `500`-range answers.
4. Backend tests show that when the email backend sends nothing, the password-reset request, for an address with an
   account and one without, and resend-verification answer `503` with R22's body; and that after a failed resend the
   token's lifetime starts again and the same token, presented again with the backend working, sends the email, after
   which the token is spent. Tests at the transport layer show that the ZeptoMail backend sends with a timeout,
   returns `0` without raising on a timeout, a connection error, a non-2xx answer in ZeptoMail's error format, one
   with a body that is not JSON, and a missing API key, writes nothing to stdout, and logs the outcome without the API
   key or the recipients. The missing-key test imports the backend's module afresh with the key empty (in a
   subprocess, or with the package's and the backend's modules removed from `sys.modules`), so an import of the
   package's message class at module level fails it.
5. Backend tests show `GET /api/health-check/` answers `200` when the database query succeeds and `503` with R13's
   body when it fails; the committed OpenAPI schema and frontend types include that `503` and resend-verification's
   (R22), and CI's type-drift check passes.
6. Backend tests that load the settings module under each environment show: under `staging`, both Google variables
   set yields one settings app for Google, neither yields none, and one alone fails startup with
   `ImproperlyConfigured` naming the other (likewise for GitHub); under `development`, the variables set yields no
   settings apps. Tests show `configure_site` sets the record's domain and name, reports no change on a second run,
   and under `staging` with `SITE_DOMAIN` unset exits non-zero naming it.
7. The two commands R7 adds pass on this change's files and fail on a copy of the Caddyfile with an invalid directive
   and on a Compose file with a syntax error, run locally the way the `images` job runs them; a pull-request run shows
   both steps passing.
8. On a pull request, every CI job runs and `ci-ok` passes as before, and the `deploy` job does not run.
9. Backend tests show that requests under `/_allauth/` outside R24's list, among them `browser/v1/auth/signup`,
   `browser/v1/auth/login` and an `app/v1/` endpoint, answer `404` and create no account, and that each listed
   endpoint with its listed methods still reaches allauth.
10. R25's frontend tests pass in the frontend suite, covering each behavior R25 lists for `useAuth` and
    `utilities/tokenUtils.ts`.
11. [~] The authentication strategy states R20, R21, R24 and R15 wherever R27 lists; a case-insensitive
    `git grep -E` outside the archive and this PRD for `CsrfHeaderMiddleware|XSRF-TOKEN|csrf[- ]exempt|path-based
    exemption|CSRF token is optional` finds no text describing the old design; no test in `test_csrf_protection.py`
    asserts that sign-in or registration needs no token; and `backend/scripts/test_csrf_protection.sh` no longer
    exists. (Superseded by the 2026-11-04 amendment: criterion 12 adds R28's refresh.)
12. The authentication strategy states R20, R21, R24, R15 and R28 wherever R27 lists; a case-insensitive
    `git grep -E` outside the archive and this PRD for `CsrfHeaderMiddleware|XSRF-TOKEN|csrf[- ]exempt|path-based
    exemption|CSRF token is optional` finds no text describing the old design; no test in `test_csrf_protection.py`
    asserts that sign-in or registration needs no token; and `backend/scripts/test_csrf_protection.sh` no longer
    exists.

13. Frontend tests hold an idle renewal response until explicit sign-out has completed, then release it and show
    that authentication and both browser storages remain cleared. They also hold the Web Lock until after sign-out
    and prove no refresh request is started, for both storage choices. A later sign-in remains intact when the old
    operation settles; ordinary renewal and shared callers still work.
14. Disposable deployment tests install the target's job sources through the entry point, then switch the checkout
    to the previous published main tree `f49b6837c5a72ad4a823bf7594f2d9cf94fcd46d`. Both installed service
    commands and the locked-shell backup still finish
    their expected operations and heartbeats, the checkout stays clean and legacy, and returning to a supported
    target updates the installed scripts. Missing/invalid/partial sources and installation failure stop before
    target deployment; a retry reconciles complete installed files.

15. A real-browser regression loads the actual sign-in hook and Axios client against an HTTP fixture that sets
    HTTP-only refresh cookies. With refresh headers delayed, or its headers sent and body delayed, a successful
    logout leaves no refresh cookie; a subsequent sign-in and renewal belong to the new account after the old
    response settles. Both browser-storage choices pass. The no-cancellation control reproduces the late-cookie
    overwrite when headers are delayed.

### Proven live (with staging running this change, before merge)

1. With the CI key from a local terminal: the forced command refuses an argument that is not a 40-character SHA, a
   commit not reachable from `origin/main`, a `main` commit that the deployed branch commit contains (once criterion
   2 has deployed it), naming the deployed version, and a request for a shell or a command, deploying nothing each
   time; a port-forwarding request is refused. On the server, `deploy`'s `authorized_keys` ends with the CI key's line
   carrying `restrict` and the forced command.
2. In the shell holding the operations lock in which the server takes this change (R26, criterion 3),
   `cinexplorer-deploy <this branch's published commit>` starts without waiting and deploys it: the health check
   passes through the public address, `deploy-history.log` gains a `manual` line whose previous version is the one
   that was running (the `main` version deployed before, not the branch commit checked out by hand for the bootstrap)
   and whose new version is the branch's, and `configure_site` reports the staging host. A backup started with
   `systemctl start cinexplorer-backup` meanwhile starts only after that shell exits. Outside the shell, a redeploy of
   the same commit with `cinexplorer-deploy` takes the lock itself: a backup started during it starts only after it
   finishes. `cinexplorer-deploy` given that earlier `main` commit, which has no deploy script, refuses it and names
   the runbook's manual steps.
3. On the existing staging server, with this branch checked out and `ci-deploy.pub` in place, the bootstrap's first
   run installs the entry point, the two directories, the units and the CI key's line, and the next run reports every
   step `UNCHANGED`; `systemctl list-timers` then shows both timers with their next runs at 10:00 and 10:30 UTC.
4. `systemctl start cinexplorer-backup` uploads a new dump to R2 (the object is listed in the bucket), leaves nothing
   in `/opt/cinexplorer/backups/`, and the `backup` check shows the ping. With the bucket name in `ops.env` changed to
   one that does not exist, a run fails, the check receives the `/fail` ping, and the maintainer receives Healthchecks'
   alert email; with the name restored, the next run succeeds. After the first night, the `backup` check shows a ping
   from the timer's own run.
5. A dump downloaded from R2 is restored into a local production stack built from this change's images, following the
   runbook's restore procedure (a copy of the live database, an emptied schema, then migrations); the staging account
   then signs in there, and its watchlist shows the movies it holds on staging.
6. In Cloudflare's dashboard, the backup bucket shows public access off and a lifecycle rule that deletes objects 30
   days after upload, and the server's R2 token is limited to that bucket with object read and write; the maintainer
   records what each page showed.
7. `systemctl start cinexplorer-maintenance` completes both commands, and the `maintenance` check shows the ping; after
   the first night, it shows a ping from the timer's own run.
8. With `backend` stopped, UptimeRobot alerts the maintainer by email within 10 minutes, and again on recovery once it
   is started. With `db` stopped, `curl` of the health check returns `503` and UptimeRobot alerts likewise; once `db`
   is started, the health check returns `200`.
9. [~] Signing up on staging with a Gmail address delivers the verification email to that Gmail inbox, not its spam
   folder, from `cinexplorer@andrewcreekmore.dev`. Gmail's "Show original" view shows DKIM passing for
   `andrewcreekmore.dev` and a `multipart/alternative` message with a `text/plain` part containing the verification
   link. Following the link verifies the address, and the visitor then signs in with the password. A password reset
   for the same address delivers a reset email to the inbox whose text part names
   `staging.cinexplorer.andrewcreekmore.dev` and whose link sets a new password that then signs in. The backend's logs
   show each send's outcome and no ZeptoMail response printed raw.
   (Superseded by the 2026-11-04 inbox-provider amendment: criterion 17
   uses the maintainer's inbox and records recipient and sender-original evidence separately.)
10. [~] Signing in with Google, using an account that is not on the Google Cloud project's test-user list, succeeds, which
    shows the consent screen published and the deployed client, its redirect URI and the env file wired together.
    Signing in with GitHub succeeds. Each signed-in user then adds a movie to the watchlist, and it is still there after
    a reload. (Superseded by the 2026-11-04 Google Testing amendment: criterion 16 accepts basic identity
    sign-in in Testing; publication moves to the later website work.)
11. The Google client's authorized redirect URIs list both hosts' callback URLs, and the GitHub OAuth App's homepage
    and callback configuration name the production host; the maintainer records what each console showed. The
    production host cannot be exercised before it exists.
12. `gh api repos/andrewRCr/CineXplorer/environments/staging` shows `custom_branch_policies: true`,
    `gh api repos/andrewRCr/CineXplorer/environments/staging/deployment-branch-policies` lists `main` as the only
    pattern, and `gh api repos/andrewRCr/CineXplorer/environments/staging/secrets` lists `DEPLOY_SSH_KEY` and
    `DEPLOY_KNOWN_HOSTS`.
13. A sign-in request to staging with valid credentials, an `Origin` from another site and no token answers `403`, and
    the same request from the site's own pages signs in.
14. [~] Signed in with a password on staging, a tab left idle for 6 minutes still shows the user signed in, and so
    does a reload of it; the watchlist then loads. (Superseded by the 2026-11-04 amendment: criterion 15 reopens the
    page with the access token expired.)
15. Signed in with a password and "remember me" on staging, a tab left idle on the watchlist page for 6 minutes still
    shows the user signed in. With every tab of the site then closed for 6 minutes, opening the watchlist page shows
    the user signed in and lists their watchlist, and the browser's network panel shows at least one request to
    `/api/auth/refresh` during that load, each answered `200`.

16. Signing in with Google on staging, using an account absent from the Google Cloud project's test-user list,
    succeeds with only basic identity scopes (`email`, `profile`, and optionally `openid`). The project may remain in
    Testing. This proves the deployed client, its redirect URI and the environment credentials work together. Signing
    in with GitHub succeeds. Each signed-in user adds a movie to the watchlist and still sees it after a reload.

17. Signing up on staging with an email address whose inbox the maintainer controls delivers the verification email
    to that inbox, not its spam folder, from `cinexplorer@andrewcreekmore.dev`. The receiving provider's authentication
    results show DKIM passing for `andrewcreekmore.dev`. ZeptoMail's saved original shows a `multipart/alternative`
    message with a `text/plain` part containing the staging verification link. Following the link verifies the address,
    and the visitor then signs in with the password. A password reset for the same address delivers a reset email to
    the inbox; its saved original's text part names `staging.cinexplorer.andrewcreekmore.dev`, and its link sets a new
    password that then signs in. The backend logs show each send's outcome and no raw ZeptoMail response. The evidence
    records the receiving provider and the source of the MIME observation separately.

18. After staging takes the repaired deployment entry point and images, both installed service commands use
    `/opt/cinexplorer/operations/`, both installed scripts match the published target's sources, and manual backup
    and maintenance runs complete with their success pings. The bootstrap's repeat run remains unchanged.

### Proven after merge

1. The push of the merge commit to `main` runs the `deploy` job after `ci-ok` passes; the job log shows the deploy's
   steps and its success but not its full output, which is in a new file in `/opt/cinexplorer/deploy-logs/` on the
   server; `deploy-history.log` gains a `ci` line naming the merge commit; and the health check passes.
2. A push to `main` that changes only `.arc/`, such as the commit recording the first criterion's evidence, starts no
   run of the CI workflow and one run of the `.arc/` lint workflow (R6), which passes; no image tagged with that commit
   is published, and `deploy-history.log` gains no line.
3. With the CI key from a local terminal, a redeploy of the merge commit (the first criterion's, whose images are
   published) whose local `ssh` is killed after the first step marker still finishes: `deploy-history.log` gains its
   `ci` line, and the newest file in `/opt/cinexplorer/deploy-logs/` ends with the deploy's outcome (R2, R4). Before
   the merge no commit on `main` carries the deploy script, so this cannot run earlier.

## 9. Open Questions

None.

## Dependencies and Preconditions

The maintainer performs these steps outside the repository. They are not tasks, and each is checked by the proven-live
criterion named beside it:

- **Google:** a web OAuth client in the existing Google Cloud project with both hosts' redirect URIs and only basic
  identity scopes; the project may remain in Testing (criteria 16 and 11). Consent-screen publication moves to the
  later website work (Stage 4), once the application homepage, privacy policy and terms pages are live.
- **GitHub:** an OAuth App for the deployed hosts (criteria 16 and 11).
- **ZeptoMail:** a send-mail token for a mail agent with `andrewcreekmore.dev` verified; its DKIM record is already in
  place (criterion 17). The maintainer supplies an address whose inbox they control and records the receiving
  provider; Inbox placement and DKIM are observed there, and MIME/plain-text links in ZeptoMail's saved original.
  If the first verification email lands in that inbox's spam folder, diagnose the recipient-provider result and DNS,
  such as a `_dmarc` record for `andrewcreekmore.dev`, rather than changing the application blindly.
- **Cloudflare R2:** a private bucket, a token limited to it with object read and write, and the 30-day lifecycle rule
  (criteria 4 and 6).
- **Healthchecks.io:** the `backup` and `maintenance` checks with email alerts (criteria 4 and 7).
- **UptimeRobot:** the health check monitor with email alerts (criterion 8).
- **The CI deploy key:** an Ed25519 key pair generated for CI alone; its public half on the server, and its private
  half, the server's host key line, `DEPLOY_HOST` and the `main`-only branch rule in the `staging` environment
  (criteria 1 and 12).

The ZeptoMail token and both OAuth apps' credentials go into staging's backend env file only once this change's images
are running there (criterion 2): until then, allauth's own sign-up and sign-in endpoints stay reachable (R24) and the
authentication hardening (R18–R23) is not deployed.

## Amendments

- **2026-11-03,** during task generation, on the Owner's decisions (R25's wording and the error shape relayed by
  `project-manager.CX`; those and the fix confirmed by the Owner in the planning session): R28 added, since
  `useAuth` signs a password user out once the 5-minute access token expires, despite the 14-day refresh token
  (found by reading the code; reproduced by hand before the fix lands). R25's expired-token case now names the
  refresh's outcome, so its test does not fix that behavior in place. R20's and R22's new bodies use
  `{"detail": ...}`, the shape the project's new error bodies follow; the `{"error"}` bodies the authentication
  endpoints return today stay as they are. Introduction, Goal 3, Non-Goals, Design Considerations, Design Decision 23
  and Proven live 14 follow.
- **2026-11-04,** from the task list's first review and its fix check, on the Owner's approval: R28 stores a
  refreshed token in the storage that held the old one (today's refresh moves a sign-in made without "remember me"
  into `localStorage`), has refreshes take turns across tabs under Web Locks, reading the storage again before
  refreshing (Design Decision 24), and records its refresh in the hook's effects as an exception to the TanStack
  Query rule; R25 lists those cases, a failed refresh on load clearing the stored tokens, the single refresh, the
  check before the profile is fetched and the Google and GitHub users who never refresh. Non-Goals add moving the
  sign-in state onto TanStack Query. R22's failure log names the endpoint, never the email address, under the rule on
  personal data in logs. R13's `503` takes the `{"detail"}` shape. Proven live 14 is superseded by 15, which reopens
  the watchlist page after the access token has expired, so it exercises the refresh on load: in a tab left open,
  the 60-second check keeps the token fresh, so a reload needs no refresh. R27 brings the authentication strategy's
  token refresh flow to R28, so Implemented 11 is superseded by 12, which adds R28.
- **2026-11-04,** at the merge of `main` before implementation: R22 no longer gives as its reason that the exception's
  text carries the address, since `main` (#62) took the address out of `EmailDeliveryError`'s message; the log rule
  is unchanged.

- **2026-11-04,** on the Owner's explicit approval after the tracked blacklist landed on `main`: R1 syncs the
  image's tracked blacklist immediately after migrations and takes a fresh validated R2 backup before migrations.
  R5 keeps that backup inside the deploy's existing lock; R8 reuses the existing script and failure behavior, with
  shell/systemd-compatible `ops.env` configured before first deployment. Non-Goals exclude more frequent scheduled
  backups; the pre-deployment backup is included. The runbook retains backup-first manual deployment and blacklist
  rollback guidance alongside the stronger R2 restore procedure.
- **2026-11-04, Google Testing,** on the Owner's approval after successful staging sign-in with an empty test-user
  list and confirmation of watchlist persistence after reload: R15 and Dependencies accept Testing for basic identity
  scopes, consistent with [Google's audience guidance](https://support.google.com/cloud/answer/15549945?hl=en).
  Criterion 10 is superseded, with its text retained, by criterion 16; Google/GitHub sign-in and both watchlist reload
  checks remain. Consent-screen publication moves to the later website work (Stage 4), once homepage, privacy and
  terms pages are live. Goal 6 narrows the hostname-move promise to credentials, callbacks and sender configuration.
  The task list and runbook follow. The Owner declined the offered independent review for this contained amendment.
- **2026-11-04, inbox provider,** on the Owner's approval without an independent review: criterion 9 is retained
  and superseded by 17, using the maintainer's available inbox. Proton Mail delivered verification/reset to Inbox,
  DKIM passed, and verification/password sign-in/reset worked. ZeptoMail's saved original supplies the MIME and
  plain-text evidence because Proton's export reconstructs one selected body; the Owner confirmed both MIME types
  and both plain-text links use staging. Sender, Inbox placement, DKIM, verification/reset behavior, staging links
  and quiet logs remain required. Gmail-specific delivery was not tested and is not claimed. Dependencies, task
  references and runbook follow; application behavior and provider settings do not change.

- **2026-11-05, code-review repairs,** on the Owner's approval of F1–F3: R2 installs versioned job scripts at
  stable paths outside the checkout through one updater, with explicit validation, replacement, retry and legacy
  retention rules; R1, R8, R11, R12 and R26 follow, and Design Decision 25 records the compatibility reason. R25
  and R28 preserve explicit sign-out across pending renewal and protect a later sign-in (Decision 26). Implemented
  13–14 and Proven live 18 add direct checks of those behaviors without rewriting existing criteria. The live
  repair check requires a separately approved publication/deployment before verification can close again.

- **2026-11-05, cookie-ordering clarification,** on the Owner's approval of amendment-review F1: R28 names
  transport cancellation before logout and the ordering of HTTP-only cookie effects, limited to this tab's renewal.
  R25 and appended Implemented 15 require a faithful browser regression over headers/body timing and the later
  account's renewal identity. Existing criteria remain unchanged.
