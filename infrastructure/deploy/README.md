# Deploy CineXplorer

This runbook prepares one Ubuntu 24.04 LTS server and deploys published backend and web images behind Caddy.
The staging address is `https://staging.cinexplorer.andrewcreekmore.dev`. Run commands on the server as `deploy`
except where a local terminal or root session is explicitly named. Builds run in GitHub Actions, not on the server.

After setup, staging supports browsing, email registration/verification, password reset, Google/GitHub sign-in
and watchlists. Password sessions renew while their refresh token remains valid. Complete the first deployment
and its authentication checks before installing live OAuth/mail credentials.

## First-time setup

### Create the server and DNS record

1. Create a DigitalOcean droplet: Basic, Regular CPU (SSD), 2 GB / 1 vCPU / 50 GB, in San Francisco (SFO2), with
   Ubuntu 24.04 LTS and your SSH public key as its only authentication. Leave IPv6 off and the user-data field empty.
2. Save the droplet's public IPv4 address. A droplet created with only an SSH key has no root password; console
   recovery starts with a password reset ([Recover SSH access](#recover-ssh-access-through-digitalocean)).
3. In Cloudflare DNS, create the `A` record `staging.cinexplorer` pointing at that IPv4 address. Select **DNS only**,
   with proxying off. Do not create an `AAAA` record; this deployment uses IPv4 for client-address throttling.
4. Confirm that the public DNS record resolves to the server. Create a DigitalOcean Cloud Firewall for the droplet
   allowing inbound TCP 22, 80 and 443 and UDP 443 only. It filters traffic before it reaches the droplet, so it also
   covers ports Docker publishes, which bypass `ufw`.

If your SSH key is not one SSH offers by default, add a block for the server's address to your local
`~/.ssh/config` so the commands below use it:

```text
Host YOUR_SERVER_IPV4
    IdentityFile ~/.ssh/YOUR_PRIVATE_KEY
    IdentitiesOnly yes
```

From your local checkout, copy the bootstrap and connect as root. Replace the example address and commit with your
server and a full commit whose manual CI run published both images and passed its `ci-ok` job. Choose a published
version containing this runbook and bootstrap script.

```sh
server_ip='YOUR_SERVER_IPV4'
ci_key="$HOME/.ssh/cinexplorer_staging_ci"
test ! -e "$ci_key"
ssh-keygen -t ed25519 -f "$ci_key" -C cinexplorer-staging-ci -N ''
scp infrastructure/deploy/bootstrap.sh "root@$server_ip:/root/bootstrap.sh"
scp "$ci_key.pub" "root@$server_ip:/root/ci-deploy.pub"
ssh "root@$server_ip"
```

Create the CI-only key once; if it already exists, reuse it and skip the generation commands. Keep its private
half locally for the restricted-key checks and in the GitHub environment secret. Verify the server's SSH host-key
fingerprint through DigitalOcean's console before trusting the first SSH connection.

In that root session:

```sh
install -d -m 755 /opt/cinexplorer
install -m 644 /root/ci-deploy.pub /opt/cinexplorer/ci-deploy.pub
bash /root/bootstrap.sh
```

**Keep this session open.** In a second local terminal, prove that your key can sign in as `deploy`:

```sh
server_ip='YOUR_SERVER_IPV4'
ssh "deploy@$server_ip"
sudo -n true
docker info >/dev/null
sudo sshd -T | grep -E '^(passwordauthentication|kbdinteractiveauthentication|permitrootlogin) '
```

The three SSH settings must say `no`. From another local terminal, both commands below must fail, and client failure
alone proves neither setting. The first must show only `publickey` in the server's `Authentications that can
continue` debug lines, with no `password` offered. The second must print `Server accepts key` and then
`Permission denied (publickey)`: root's key from server creation is accepted and the login is still refused. Unlock
the key if prompted; a key that cannot sign fails without testing the root setting:

```sh
server_ip='YOUR_SERVER_IPV4'
ssh -vv -o PubkeyAuthentication=no -o PreferredAuthentications=password -o NumberOfPasswordPrompts=0 "deploy@$server_ip"
ssh -v "root@$server_ip" true 2>&1 | grep -E 'Server accepts key|Permission denied'
```

Only after the `deploy` session and sudo work should you close the original root session. If either fails, keep it
open and inspect `/etc/ssh/sshd_config.d/00-cinexplorer.conf`, `sudo sshd -t` and `sudo ufw status verbose`.

### Give the server read-only repository and registry access

In the `deploy` session, generate a repository-specific key on the server:

```sh
ssh-keygen -t ed25519 -f ~/.ssh/cinexplorer_deploy -C cinexplorer-staging -N ''
cat ~/.ssh/cinexplorer_deploy.pub
```

Add that public key in the repository's GitHub **Settings → Deploy keys**, leaving write access off. Keep the
private key on the server. Configure SSH and confirm GitHub's host fingerprint against its published fingerprints
before accepting the first connection:

```sh
cat >> ~/.ssh/config <<'SSH'
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/cinexplorer_deploy
    IdentitiesOnly yes
SSH
chmod 600 ~/.ssh/config
ssh -T git@github.com
```

GitHub's successful authentication message says it provides no shell access; exit status 1 is expected for that
check. Clone the repository and select the full published commit you intend to deploy:

```sh
git clone git@github.com:andrewRCr/CineXplorer.git /opt/cinexplorer/repo
cd /opt/cinexplorer/repo
target_commit='FULL_PUBLISHED_COMMIT_SHA'
git fetch origin
git checkout --detach "$target_commit"
```

Create a GitHub classic personal access token with only `read:packages` and an expiry date; the token's account
must have read access to both packages. Sign in interactively so the token stays out of shell history:

```sh
docker login ghcr.io --username andrewRCr
chmod 600 ~/.docker/config.json
```

Paste the token at the password prompt; the registry does not accept your GitHub password, and the prompt shows
nothing as you paste. The registry login belongs to `deploy`, so use Docker without sudo from here onward.

### Prepare deployment and operations settings

Keep all three files outside the checkout and readable only by `deploy`:

```sh
cd /opt/cinexplorer/repo/infrastructure
umask 077
install -m 600 prod.env.example /opt/cinexplorer/prod.env
install -m 600 ../backend/config/.env.example /opt/cinexplorer/backend.env
install -m 600 ops.env.example /opt/cinexplorer/ops.env
```

Edit `/opt/cinexplorer/prod.env`:

- Set `IMAGE_TAG=sha-` followed by the first seven characters of the full published commit checked out above.
- Set `SITE_ADDRESS=staging.cinexplorer.andrewcreekmore.dev`, with no scheme, port or path.
- Keep `BACKEND_ENV_FILE=/opt/cinexplorer/backend.env`.
- Fill in `POSTGRES_DB`, `POSTGRES_USER` and a new strong `POSTGRES_PASSWORD`. Use letters, digits and underscores
  for the database and user names. These credentials reach both database and backend through Compose.
- Set a separate admin basic-auth username and password. Generate its bcrypt hash with the command below and
  put it in `ADMIN_BASIC_AUTH_HASH` in **single quotes**, preserving every dollar sign. Set
  `ADMIN_BASIC_AUTH_USER` to the chosen username. Store the password in your password manager.

```sh
docker run --rm -it caddy:2.11-alpine caddy hash-password
```

Edit the **live assignments** in `/opt/cinexplorer/backend.env`; changing comments in the checklist has no effect:

- Set `ENVIRONMENT=staging` and `DEBUG=False`.
- Replace `DJANGO_SECRET_KEY` with a new random value of at least 50 characters and `TMDB_API_KEY` with your TMDB key.
  A password manager can generate the secret; the command below is another option.
- Add live `GUNICORN_WORKERS=2` and `GUNICORN_THREADS=4` assignments.
- Delete the live `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `BACKEND_URL`, `FRONTEND_URL` and `REDIS_URL`
  assignments. Compose supplies them. No manual allowed-host or origin lists are needed for this single origin.
- Leave `EMAIL_VERIFICATION_EXPIRY_DAYS=3`. Initially leave `ZEPTOMAIL_API_KEY`, `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` empty. Set
  `ZEPTOMAIL_SENDER_EMAIL=cinexplorer@andrewcreekmore.dev` when activating email after deployment.
- After the hardened version is serving, fill the complete Google and GitHub pairs and the ZeptoMail key from the
  provider setup below. A partial OAuth pair refuses startup; development uses its database apps instead.
  Deployed providers must have no duplicate database Social Application.

```sh
openssl rand -hex 32
chmod 600 /opt/cinexplorer/prod.env /opt/cinexplorer/backend.env /opt/cinexplorer/ops.env
```

Use single quotes around secret env values containing dollar signs so Compose does not interpolate them. Do not
source `prod.env` or `backend.env` into a shell, commit any env file, or print resolved configuration containing
secrets. Check configuration without displaying it:

```sh
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env config --quiet
```

### Create storage, monitors and provider apps

Prepare these outside the repository. Store credentials in your password manager and the indicated env/secret
fields. Keep the OAuth/mail values off the running server until the hardened deployment has passed its checks.

- In Cloudflare R2, create a private bucket. Keep public access, `r2.dev` and public custom domains disabled.
  Create an **Object Read & Write** API token limited to this bucket. Record its access key, secret and account S3
  endpoint. Add a bucket lifecycle rule that deletes backup objects 30 days after upload; record the enabled rule
  and its prefix scope in the console. Set the endpoint, access key, secret, bucket and chosen prefix in `ops.env`.
  Keep its supplied S3/Cloudflare/auto-region values and `NO_CHECK_BUCKET=true` for the scoped token.
  See [R2 tokens](https://developers.cloudflare.com/r2/api/tokens/) and
  [object lifecycle rules](https://developers.cloudflare.com/r2/buckets/object-lifecycles/).
- In Healthchecks.io, create separate `backup` and `maintenance` checks, each with a 24-hour period and two-hour
  grace. Send failure and missed-ping alerts to the maintainer's verified email. Put their ping URLs in
  `BACKUP_PING_URL` and `MAINTENANCE_PING_URL` in `ops.env`.
- In UptimeRobot, create an HTTP monitor for
  `https://staging.cinexplorer.andrewcreekmore.dev/api/health-check/`, with a five-minute interval and the
  maintainer's email alerted on failure and recovery.
- In the existing Google Cloud project, create a separate **Web application** OAuth client for deployed hosts.
  Authorize both redirect URIs below. Publish the consent screen with its audience status **In production**.
  Save the client ID/secret for the backend's `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- Create a separate GitHub **OAuth App** with homepage `https://cinexplorer.andrewcreekmore.dev` and both exact
  callback URLs below. GitHub supports multiple callback entries; add both, keeping exact matching. Save its client
  ID/secret for `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. Keep the providers' default scopes.
  See [GitHub OAuth app setup](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app).
- In ZeptoMail, obtain an agent API token with `cinexplorer@andrewcreekmore.dev` verified as a sender. Keep the token
  for `ZEPTOMAIL_API_KEY`. A successful test message to Gmail and its inbox delivery are part of activation.

| Provider | Authorized callback URLs |
| --- | --- |
| Google | `https://staging.cinexplorer.andrewcreekmore.dev/accounts/google/login/callback/` and `https://cinexplorer.andrewcreekmore.dev/accounts/google/login/callback/` |
| GitHub | `https://staging.cinexplorer.andrewcreekmore.dev/accounts/github/login/callback/` and `https://cinexplorer.andrewcreekmore.dev/accounts/github/login/callback/` |

The bootstrap installs the timers before the checkout and `ops.env` need exist. An early run fails in the journal
naming its missing input. Finish setup, then start both jobs by hand and confirm their first successful pings.

### Configure GitHub's staging deployment environment

In repository **Settings → Environments**, create `staging`. Its selected deployment branch rule allows only
`main`. Add secrets `DEPLOY_SSH_KEY` and `DEPLOY_KNOWN_HOSTS`, and variable `DEPLOY_HOST`.

From a local terminal with the maintainer's regular SSH key, obtain the host public key through the trusted server
connection. Check its fingerprint against the provider console. The known-host line must name the exact host
string used by `DEPLOY_HOST`; do not populate this secret from an unverified `ssh-keyscan`.

```sh
server_ip='YOUR_SERVER_IPV4'
ci_key="$HOME/.ssh/cinexplorer_staging_ci"
ssh "deploy@$server_ip" 'sudo cat /etc/ssh/ssh_host_ed25519_key.pub' > "$ci_key.host.pub"
ssh-keygen -lf "$ci_key.host.pub"
awk -v host="$server_ip" '{print host " " $0}' "$ci_key.host.pub" > "$ci_key.known_hosts"
gh secret set DEPLOY_SSH_KEY --repo andrewRCr/CineXplorer --env staging < "$ci_key"
gh secret set DEPLOY_KNOWN_HOSTS --repo andrewRCr/CineXplorer --env staging < "$ci_key.known_hosts"
gh variable set DEPLOY_HOST --repo andrewRCr/CineXplorer --env staging --body "$server_ip"
```

The CI key has a different role from the server's read-only GitHub key. Bootstrap appends its public half to
`deploy`'s owner keys with `restrict,command="/usr/local/bin/cinexplorer-deploy --from-ci"`. It authorizes only
full-SHA deployments reachable from `origin/main`, with stale-target refusal; it provides no shell or forwarding.
The maintainer's regular key retains the server shell.

Inspect the environment configuration without reading secret values:

```sh
gh api repos/andrewRCr/CineXplorer/environments/staging
gh api repos/andrewRCr/CineXplorer/environments/staging/deployment-branch-policies
gh api repos/andrewRCr/CineXplorer/environments/staging/secrets --jq '.secrets[].name'
gh api repos/andrewRCr/CineXplorer/environments/staging/variables/DEPLOY_HOST
```

Confirm custom deployment branch policies are enabled, `main` is the only branch policy, both secret names exist,
and the host variable is correct. Record the provider console settings for both callbacks and Google's published
consent screen; a staging sign-in alone cannot prove the future production callback.

### Deploy the first version and activate authentication

Use images published by a successful main-push or manual CI run. A pull-request run builds without publishing;
image publication alone does not prove tests passed. Confirm the run's `ci-ok` passed and use its full SHA.

From the server's regular `deploy` shell:

```sh
target_commit='FULL_PUBLISHED_COMMIT_SHA'
cinexplorer-deploy "$target_commit"
cd /opt/cinexplorer/repo/infrastructure
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env ps
curl --fail --silent --show-error https://staging.cinexplorer.andrewcreekmore.dev/api/health-check/
```

The entry point fetches and runs the target's own deploy script from a temporary copy under the operations lock.
It pulls, migrates, configures the Site, starts services and checks public health. Stop on failure. Caddy obtains
its certificate once DNS and ports are ready; inspect web logs to resolve a certificate failure, then repeat the
health check. Acceptance checks use certificate validation.

Before installing OAuth/mail credentials, confirm the running backend image revision is the intended hardened
commit. In a fresh browser session, an unsafe request without Django's CSRF token must return 403, while the
matching-token request passes; unused allauth sign-up remains 404. Then fill the saved ZeptoMail token and both
complete OAuth pairs in `backend.env`, keep mode 600 and redeploy the same commit. Do not add deployed Social
Application rows for those providers. The Site domain is derived from `SITE_ADDRESS` on every deploy.

Prove email registration, inbox verification and sign-in, verification resend and password reset in a browser.
Sign in with Google and GitHub. Leave a password session idle beyond six minutes and reload it; it must stay
signed in while refresh remains valid. In two same-profile tabs with Remember Me, leave both idle and confirm both
remain signed in. Review logs for errors without copying credentials, addresses or verification tokens into notes.

For a staff account, use the interactive shell with password input that does not echo:

```sh
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env run --rm backend python manage.py shell
```

```python
from getpass import getpass
from django.contrib.auth import get_user_model
from django.db import transaction
from allauth.account.models import EmailAddress

username = input("Username: ")
email = input("Email: ")
with transaction.atomic():
    user = get_user_model().objects.create_user(
        username=username, email=email, password=getpass("Password: "),
        is_active=True, is_staff=True,
    )
    EmailAddress.objects.create(user=user, email=email, verified=True, primary=True)
```

Finish the block with a blank line, then `exit()`. Use a new username/email. The account has staff access without
superuser permission. Verify sign-in and watchlist persistence, and that `/admin/` asks for the separate basic-auth
pair before Django login. Check the public boundary from a local terminal:

```sh
server_ip='YOUR_SERVER_IPV4'
curl --head http://staging.cinexplorer.andrewcreekmore.dev/
curl --head https://staging.cinexplorer.andrewcreekmore.dev/admin/
for port in 5432 6379 8000; do nc -vz -w 5 "$server_ip" "$port"; done
```

HTTP redirects to HTTPS, admin returns 401 without basic auth, and all three private-port connections fail.

## Automatic and manual deployments

A `main` push admitted by CI's path filter deploys after every required check passes. Filtered documentation
pushes run the separate documentation workflow and deploy nothing. Pull requests and manual CI runs do not deploy automatically;
a manual run can publish a branch's `sha-` images for the maintainer to deploy. Main push runs retain their ordered
concurrency group; manual runs use their own groups, and the staging deploy job never cancels a running deploy.

For a branch deployment or redeploy, publish its images with a manual CI run, confirm `ci-ok`, then use the full SHA:

```sh
cinexplorer-deploy FULL_PUBLISHED_COMMIT_SHA
```

Every deploy holds `/opt/cinexplorer/ops.lock`, waiting up to 30 minutes. The trusted manual form reuses a lock held
by the operations shell below. CI always takes it. There is no automatic rollback or zero-downtime guarantee;
previous containers serve until startup recreates them, and failed migrations can leave schema changes behind.
Inspect failure output before retrying or rolling back.

CI receives only the six exact step markers and the final result, exit status and private log path. Full output
lives under `/opt/cinexplorer/deploy-logs/`, readable by `deploy`. If SSH disconnects, CI fails while the detached
worker continues with its lock. Inspect the newest private log and its numeric `.status` sidecar. A successful
deploy also appends `/opt/cinexplorer/deploy-history.log`; failure leaves history unchanged.

Each history line is: UTC ISO timestamp, `ci` or `manual`, previous full SHA, previous tag, new full SHA, new tag.
Fields use single spaces; absent previous fields are `-`. Previous means the last successful deployment, with the
backend container's image tag/revision label as the initial fallback, including a stopped container. A failed deploy
or a checkout made by hand can leave the checkout/tag ahead of the recorded success.

## Update the server bootstrap

When a deployed version changes bootstrap, rerun it from that checkout with `sudo bash`; every step must be
`UNCHANGED` on the next run. A version requiring its new bootstrap before deployment must take it on staging
before merging, because a main push deploys immediately.

For the first upgrade of an existing host, copy its new inputs using the maintainer's regular SSH key, after
creating the CI-only key and provider/monitor settings above:

```sh
server_ip='YOUR_SERVER_IPV4'
ci_key="$HOME/.ssh/cinexplorer_staging_ci"
scp "$ci_key.pub" "deploy@$server_ip:/opt/cinexplorer/ci-deploy.pub"
scp infrastructure/ops.env.example "deploy@$server_ip:/opt/cinexplorer/ops.env.example"
```

On the server, install the template only when the real operations file is absent, then fill its actual values:

```sh
test -e /opt/cinexplorer/ops.env || install -m 600 /opt/cinexplorer/ops.env.example /opt/cinexplorer/ops.env
chmod 600 /opt/cinexplorer/ops.env
```

For later upgrades, preserve those inputs. Open an operations shell as `deploy` and keep the following commands
in it until the operation finishes:

```sh
flock /opt/cinexplorer/ops.lock env CINEXPLORER_OPS_LOCK=held bash
```

Inside it, confirm the checkout is clean and the current container's revision label is present before the first
history entry exists. Check out the published target, bootstrap twice, then deploy. This is the procedure for
upgrading an existing staging host to this automation:

```sh
cd /opt/cinexplorer/repo/infrastructure
backend_id=$(docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env ps --all --quiet backend)
docker inspect --format '{{.Config.Image}} {{index .Config.Labels "org.opencontainers.image.revision"}}' "$backend_id"
cd /opt/cinexplorer/repo
test -z "$(git status --porcelain)"
target_commit='FULL_PUBLISHED_COMMIT_SHA'
git fetch origin
git checkout --detach "$target_commit"
sudo bash infrastructure/deploy/bootstrap.sh
sudo bash infrastructure/deploy/bootstrap.sh
systemctl list-timers cinexplorer-backup.timer cinexplorer-maintenance.timer
cinexplorer-deploy "$target_commit"
exit
```

The first bootstrap reports new items `CHANGED`; the next reports only `UNCHANGED`. Have `ci-deploy.pub` and
`ops.env` in place first. Keep OAuth/mail credentials empty until this version serves and passes its auth checks.
A backup started from another session while the operations shell is held waits for that same lock.

## Deploy a version without the deploy script

The entry point refuses such commits and names these manual steps. Open the operations shell above, run one
command at a time, and stop on any failure. For a version lacking the new authentication protections, first remove
live OAuth/mail values from `backend.env`; activate them only with a hardened version.

Record the last successful version before changing the checkout. If history is empty, inspect the backend container
instead; the checkout and configured tag may already be from a failed deployment:

```sh
cd /opt/cinexplorer/repo/infrastructure
previous_commit=-
previous_tag=-
if test -s /opt/cinexplorer/deploy-history.log; then
    read -r _ _ _ _ previous_commit previous_tag < <(tail -n 1 /opt/cinexplorer/deploy-history.log)
else
    backend_id=$(docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env ps --all --quiet backend)
    if test -n "$backend_id"; then
        image=$(docker inspect --format '{{.Config.Image}}' "$backend_id")
        previous_tag=${image##*:}
        previous_commit=$(docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$backend_id")
        [[ $previous_commit =~ ^[0-9a-f]{40}$ ]] || previous_commit=-
    fi
fi
test -z "$(git status --porcelain)"
target_commit='FULL_PUBLISHED_COMMIT_SHA'
git fetch origin
git checkout --detach "$target_commit"
target_tag="sha-${target_commit:0:7}"
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$target_tag/" /opt/cinexplorer/prod.env
export IMAGE_TAG=$target_tag
chmod 600 /opt/cinexplorer/prod.env
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env config --quiet
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env pull
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env run --rm backend python manage.py migrate --noinput
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env up -d --wait
curl --fail --silent --show-error https://staging.cinexplorer.andrewcreekmore.dev/api/health-check/
printf '%s manual %s %s %s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    "$previous_commit" "$previous_tag" "$target_commit" "$target_tag" >> /opt/cinexplorer/deploy-history.log
exit
```

Append history only after public health succeeds. The legacy version has no `configure_site` command; its existing
Site configuration remains. Confirm browser sign-in and watchlist persistence after any successful switch.

## Roll back code and compare schema

Open the operations shell before choosing or changing versions. Read the running backend's revision/tag from its
container, including a stopped container, and the last history line:

```sh
flock /opt/cinexplorer/ops.lock env CINEXPLORER_OPS_LOCK=held bash
cd /opt/cinexplorer/repo/infrastructure
backend_id=$(docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env ps --all --quiet backend)
docker inspect --format '{{.Config.Image}} {{index .Config.Labels "org.opencontainers.image.revision"}}' "$backend_id"
tail -n 10 /opt/cinexplorer/deploy-history.log
```

Choose the target from history:

- If the running revision differs from the newest line's new revision, use that line's new revision: it is the last
  successful version, before a deployment or rollback failed during startup/health.
- Otherwise, scan backward for the newest line whose new revision is the running one and whose previous revision
  differs from it. Use that previous revision/tag, passing over redeploys and same-version rollback records.
- For a rollback immediately after another rollback, choose the intended earlier target by hand from history;
  following the latest rollback line would just switch back again. A `-` previous field offers no target.

A rollback switches code; schema reversal is a separate operation that can discard data. Take and validate a live
custom-format recovery copy using only the [recovery-copy block](#capture-a-recovery-copy) inside this already
locked shell before a destructive reversal. Keep that copy until rollback's browser checks pass. If a required
migration is irreversible, stop and roll forward with a correction. Never use `--fake` to bypass a failed migration.

Keep the newer checkout while comparing schema. Identify the image that most recently ran migrations from the
private deployment logs, including failed deploys, and use it as `newer_tag`. Compare its migration list with the
chosen target against the same live database, including third-party apps:

```sh
newer_tag='sha-VERSION_THAT_LAST_RAN_MIGRATIONS'
previous_commit='TARGET_FULL_PUBLISHED_COMMIT_SHA'
previous_tag="sha-${previous_commit:0:7}"
umask 077
IMAGE_TAG="$previous_tag" docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env pull backend web
IMAGE_TAG="$newer_tag" docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env run --rm backend python manage.py showmigrations --no-color --verbosity 1 > /opt/cinexplorer/migrations-newer.txt
IMAGE_TAG="$previous_tag" docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env run --rm backend python manage.py showmigrations --no-color --verbosity 1 > /opt/cinexplorer/migrations-previous.txt
diff -u /opt/cinexplorer/migrations-previous.txt /opt/cinexplorer/migrations-newer.txt
```

`diff` status 1 means the lists differ. `[X]` means applied and `[ ]` unapplied. Inspect replacement/squash markers
and dependency graphs directly. For each applied newer migration absent from the target image, find that app's last
migration in the target, or `zero` if the target has none. Stop backend writers and preview each reversal with the
newer image; inspect dependent apps and reverse in dependency order:

```sh
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env stop backend
IMAGE_TAG="$newer_tag" docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env run --rm backend python manage.py migrate APP_LABEL PREVIOUS_MIGRATION_OR_ZERO --plan
IMAGE_TAG="$newer_tag" docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env run --rm backend python manage.py migrate APP_LABEL PREVIOUS_MIGRATION_OR_ZERO
```

Rerun the newer-image migration list and confirm compatibility. When no extra applied migrations exist, skip
reversals. Make the final switch in this same locked shell with `cinexplorer-deploy "$previous_commit"`, or the
manual steps above for a target without the script. Check health, sign-in and watchlist persistence before `exit`.

After rollback, main's head still contains the code rolled back from. Revert or fix it on `main` before another
change merges; the next code push deploys main plus that push. A rollback never promises automatic schema recovery.

## Restore the database from R2

A restore discards all changes made after the dump. Establish its source version using its UTC timestamp and the
deployment history/private logs, including failed migrations. Never restore a dump from a version newer than the
deployed one; deploy its version first. Keep the current database copy until health, sign-in and watchlists pass.

Reuse an existing operations shell, or open one with the first command below. Export only the dedicated
operations file for the rclone wrapper; keep deployment env files under Compose's parser. This uses the same
pinned image and environment remote as the backup job:

```sh
flock /opt/cinexplorer/ops.lock env CINEXPLORER_OPS_LOCK=held bash
cd /opt/cinexplorer/repo/infrastructure
set -a
. /opt/cinexplorer/ops.env
set +a
r2() {
    docker run --rm --user "$(id -u):$(id -g)" \
        --env RCLONE_CONFIG_R2_TYPE --env RCLONE_CONFIG_R2_PROVIDER \
        --env RCLONE_CONFIG_R2_ACCESS_KEY_ID --env RCLONE_CONFIG_R2_SECRET_ACCESS_KEY \
        --env RCLONE_CONFIG_R2_ENDPOINT --env RCLONE_CONFIG_R2_REGION \
        --env RCLONE_CONFIG_R2_NO_CHECK_BUCKET \
        --volume /opt/cinexplorer/backups:/data \
        rclone/rclone:1.75.2 --config /dev/null "$@"
}
r2 lsf "r2:$R2_BUCKET/${R2_PREFIX%/}/"
archive='cinexplorer-UTC_TIMESTAMP.dump'
r2 copyto "r2:$R2_BUCKET/${R2_PREFIX%/}/$archive" "/data/$archive"
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env exec -T db pg_restore --list < "/opt/cinexplorer/backups/$archive"
```

### Capture a recovery copy

Stop on any failed command. Stop backend, copy the live database and verify that copy before emptying anything.
Do not start the backup service for this copy: it waits for the lock already held by this shell.

```sh
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env stop backend
safety_copy="/opt/cinexplorer/backups/before-restore-$(date -u +%Y%m%dT%H%M%SZ).dump"
umask 077
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env exec -T db sh -c \
    'exec pg_dump --format=custom --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' > "$safety_copy"
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env exec -T db pg_restore --list < "$safety_copy"
```

### Replace the schema and restore

Empty the schema, then restore the chosen archive with a single restore transaction. Apply newer migrations and restart:

```sh
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env exec -T db sh -c \
    'exec psql --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --set=ON_ERROR_STOP=1 --command="DROP SCHEMA public CASCADE; CREATE SCHEMA public;"'
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env exec -T db sh -c \
    'exec pg_restore --no-owner --single-transaction --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' < "/opt/cinexplorer/backups/$archive"
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env run --rm backend python manage.py migrate --noinput
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env up -d --wait backend
curl --fail --silent --show-error https://staging.cinexplorer.andrewcreekmore.dev/api/health-check/
```

Schema emptying is outside the restore transaction. If restore or migrations fail, keep backend stopped, empty
`public` again using the same command, then restore the safety copy and migrate/start/check with the current image:

```sh
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env exec -T db sh -c \
    'exec psql --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --set=ON_ERROR_STOP=1 --command="DROP SCHEMA public CASCADE; CREATE SCHEMA public;"'
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env exec -T db sh -c \
    'exec pg_restore --no-owner --single-transaction --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' < "$safety_copy"
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env run --rm backend python manage.py migrate --noinput
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env up -d --wait backend
curl --fail --silent --show-error https://staging.cinexplorer.andrewcreekmore.dev/api/health-check/
```

Verify the intended account and watchlist in the browser. Only after success, remove the safety copy and leave the
locked shell. Rehearse this procedure against a separate local production stack and an R2 dump before relying on
it. Keep that stack's project, ports, volumes and env files isolated, preserve the production memory limits, and
check the host memory policy before starting it.

```sh
rm "$safety_copy"
exit
```

## Nightly jobs and monitoring

`cinexplorer-backup.timer` runs at **10:00 am UTC**, and `cinexplorer-maintenance.timer` at **10:30 am UTC**.
Both are persistent, so a missed run is scheduled after boot. The oneshot services run as `deploy`, read
`/opt/cinexplorer/ops.env` and wait up to 30 minutes for the same operations lock as deploys. The scripts and their
inputs must exist. Keep `ops.env` owned by `deploy` at mode 600.

Run these from an ordinary shell outside the operations lock:

```sh
systemctl list-timers cinexplorer-backup.timer cinexplorer-maintenance.timer
sudo systemctl start cinexplorer-backup.service
sudo systemctl start cinexplorer-maintenance.service
sudo journalctl -u cinexplorer-backup.service -u cinexplorer-maintenance.service --since '2 days ago'
```

Backups are custom archives checked before upload, stored as `<prefix>/cinexplorer-<UTC timestamp>.dump` in the
private bucket. Successful uploads remove the local dump; failures leave it in `/opt/cinexplorer/backups/` for
inspection. Retention is the bucket's 30-day lifecycle rule. The env-only rclone remote follows the official
[R2 configuration](https://rclone.org/s3/#cloudflare-r2); the Object Read & Write token needs `no_check_bucket`.

Each job pings its own Healthchecks.io URL after success, or `/fail` with the failed step's last output lines and a
non-zero exit on failure. A missed ping or failed run alerts the maintainer; UptimeRobot reports health failures
and recovery separately. Test a backup against a nonexistent bucket, check its failure email, restore the real
setting and confirm the next success. Record the first night's timer-originated pings for both checks. In an
operations shell, test public health with backend stopped and then with db stopped, recovering the stack after
each; confirm outage and recovery emails. Stop/check/start commands always select the production Compose inputs.

## Logs, restarts and persistent state

Run Compose commands from `/opt/cinexplorer/repo/infrastructure`:

```sh
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env ps
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env logs --tail 100 backend web
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env logs --follow backend
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env restart backend
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env logs --tail 100 db
docker volume inspect cinexplorer-prod_db-data cinexplorer-prod_caddy-data cinexplorer-prod_caddy-config
```

Postgres data lives in `cinexplorer-prod_db-data`; Caddy certificates/account state in `cinexplorer-prod_caddy-data`
and its configuration in `cinexplorer-prod_caddy-config`. Redis is disposable cache with persistence disabled.
Docker retains three 10 MB stdout/stderr log files per container. Services restart unless explicitly stopped.
Keep project/volume names stable. `down -v` deletes database and certificate state and is not a server maintenance
command. Env files stay outside the checkout; deploy's repository and registry credentials stay in its home.

Security updates may reboot the server at **9:00 am UTC**. Inspect `/var/log/unattended-upgrades/`,
`systemctl list-timers apt-daily*` and `swapon --show`. Application images change through deployment. Public CI logs
contain only deploy markers/outcomes; treat the server's full deployment/job logs and env files as private.

## Move to the production hostname

Create the production `A` record for the same IPv4 address, with DNS-only proxying and no IPv6 record. In the
operations shell, set `SITE_ADDRESS=cinexplorer.andrewcreekmore.dev` in `prod.env` and `ENVIRONMENT=production` in
`backend.env`, then redeploy the chosen published commit with `cinexplorer-deploy`. It updates the Site record and
Caddy's certificate configuration. Update UptimeRobot's URL to the production health endpoint. `DEPLOY_HOST` stays
the same on this server; the Google/GitHub apps already accept both callbacks and the mail sender remains valid.
Production sends a one-year Strict-Transport-Security header with `includeSubDomains` and `preload`. Use the
production hostname in the browser and public curl checks after the move.

## Recover SSH access through DigitalOcean

The Recovery Console bypasses the network and SSH but needs a local password. A key-only droplet starts without a
root password, and bootstrap leaves it unchanged. On the droplet's **Settings**, choose **Reset root password**;
DigitalOcean emails a temporary password. Open **Recovery console → Launch Console**, sign in as root and choose a
new password when prompted. Store it in your password manager. Root SSH remains disabled. From the console:

```sh
sshd -t
sshd -T | grep -E '^(passwordauthentication|kbdinteractiveauthentication|permitrootlogin) '
journalctl -u ssh --since '30 minutes ago'
ufw status verbose
ls -ld /home/deploy/.ssh
ls -l /home/deploy/.ssh/authorized_keys
```

Correct keys/permissions there. Check `sshd -t` before reloading SSH and keep the console open until a new
key-authenticated deploy session works.

## References

- [Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [Ubuntu automatic updates](https://ubuntu.com/server/docs/how-to/software/automatic-updates/)
- [Ubuntu OpenSSH configuration](https://manpages.ubuntu.com/manpages/noble/man5/sshd_config.5.html)
- [GitHub registry authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [GitHub SSH fingerprints](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints)
- [DigitalOcean Recovery Console](https://docs.digitalocean.com/products/droplets/how-to/recovery/recovery-console/)
