# Deploy CineXplorer

This runbook prepares one Ubuntu 24.04 LTS server and deploys published backend and web images behind Caddy.
The staging address is `https://staging.cinexplorer.andrewcreekmore.dev`. Run commands on the server as `deploy`
except where a local terminal or root session is explicitly named. Builds run in GitHub Actions, not on the server.

Staging supports browsing, search, movie details and existing-account sign-in. OAuth and email delivery are not
configured: do not use email registration, password reset or verification resend there.

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
scp infrastructure/deploy/bootstrap.sh "root@$server_ip:/root/bootstrap.sh"
ssh "root@$server_ip"
```

In that root session:

```sh
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

### Prepare the two env files

Keep both files outside the checkout and readable only by `deploy`:

```sh
cd /opt/cinexplorer/repo/infrastructure
umask 077
install -m 600 prod.env.example /opt/cinexplorer/prod.env
install -m 600 ../backend/config/.env.example /opt/cinexplorer/backend.env
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
- Delete the live ZeptoMail, Google and GitHub credential placeholders. Leave `EMAIL_VERIFICATION_EXPIRY_DAYS=3`.

```sh
openssl rand -hex 32
chmod 600 /opt/cinexplorer/prod.env /opt/cinexplorer/backend.env
```

Use single quotes around secret env values containing dollar signs so Compose does not interpolate them. Do not
source either env file into a shell, commit them, or print the resolved Compose configuration with secrets. Check
configuration without displaying it:

```sh
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env config --quiet
```

### Deploy the first version and create a verified account

From `/opt/cinexplorer/repo/infrastructure`, pull, migrate and load the movie blacklist as one-off containers, then
start the stack. Stop if any command fails; do not continue to `up` after a failed migration or sync.

```sh
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env pull
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env run --rm backend python manage.py migrate --noinput
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env run --rm backend python manage.py sync_blacklist
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env up -d --wait
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env ps
curl --fail --silent --show-error https://staging.cinexplorer.andrewcreekmore.dev/api/health-check/
```

Caddy obtains a public certificate after DNS and ports 80/443 are reachable; inspect web logs if the first HTTPS
check fails. Retry the health check after correcting DNS or connectivity. Never use `-k` for the acceptance check.

Create an account from the interactive server shell, bypassing unavailable email delivery:

```sh
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env run --rm backend python manage.py shell
```

At its Python prompt, enter:

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

Enter a blank line to finish the block, then `exit()`. The password prompt does not echo or enter shell history.
This account can sign in to the site and Django admin; it has no superuser permissions. Use a new username/email
if one already exists.

In a browser, open home, search, a browse page and a movie detail page; reload the detail URL. Sign in, add a movie
to the watchlist and reload it. Visit `/admin/`: it must ask for the separate basic-auth pair before Django login.
From a local terminal, check the public boundary:

```sh
server_ip='YOUR_SERVER_IPV4'
curl --head http://staging.cinexplorer.andrewcreekmore.dev/
curl --head https://staging.cinexplorer.andrewcreekmore.dev/admin/
for port in 5432 6379 8000; do nc -vz -w 5 "$server_ip" "$port"; done
```

HTTP must redirect to HTTPS, admin must return 401 without basic auth, and all three port connections must fail.

Once the checkout contains the bootstrap, run it again as `deploy`:

```sh
sudo /opt/cinexplorer/repo/infrastructure/deploy/bootstrap.sh
```

Every step must report `UNCHANGED`, with no `CHANGED` lines. This proves the second run on the actual server;
container checks alone do not establish it.

## Deploy another version

Publish both images first: run the CI workflow manually on the desired branch, or use a main-push run. A
pull-request CI run does not publish images. Deploy only from a run whose `ci-ok` job passed: the images publish
without waiting for the tests, so a run can publish images whose tests failed. Use the full commit SHA from that run;
the image tag is `sha-` plus its first seven characters.

In the server shell, take a [backup](#back-up-the-database) first, then record the current commit and tag before
changing them. Keep these values for rollback in this terminal, and save them in your deployment notes outside the
checkout:

```sh
cd /opt/cinexplorer/repo/infrastructure
previous_commit=$(git rev-parse HEAD)
previous_tag=$(sed -n 's/^IMAGE_TAG=//p' /opt/cinexplorer/prod.env)
printf 'Previous commit: %s\nPrevious tag: %s\n' "$previous_commit" "$previous_tag"
target_commit='FULL_PUBLISHED_COMMIT_SHA'
git fetch origin
test -z "$(git status --porcelain)"
git checkout --detach "$target_commit"
target_commit=$(git rev-parse HEAD)
target_tag="sha-$(printf '%s' "$target_commit" | cut -c1-7)"
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$target_tag/" /opt/cinexplorer/prod.env
chmod 600 /opt/cinexplorer/prod.env
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env config --quiet
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env pull
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env run --rm backend python manage.py migrate --noinput
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env run --rm backend python manage.py sync_blacklist
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env up -d --wait
curl --fail --silent --show-error https://staging.cinexplorer.andrewcreekmore.dev/api/health-check/
```

Execute one command at a time and stop on failure. The previous containers keep serving until `up` recreates them; there
is no zero-downtime guarantee or automatic recovery. A failed migration can leave schema changes behind: inspect its
output before retrying or considering rollback. `sync_blacklist` makes the movie blacklist table match the version's
`backend/apps/movie/data/blacklist.csv`, and refuses a malformed file without changing the table. Confirm browser
sign-in and watchlist persistence after a successful deploy. Caddy's data volume is retained, so the existing
certificate is reused.

## Back up the database

Take a backup before any step that can lose data: a deploy's `migrate`, a migration reversal, or anything that drops or
recreates the database or its volume. From `/opt/cinexplorer/repo/infrastructure`:

```sh
mkdir -p /opt/cinexplorer/backups
umask 077
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > "/opt/cinexplorer/backups/cinexplorer-$(date +%F-%H%M).dump"
ls -l /opt/cinexplorer/backups/
```

Stop if `pg_dump` fails or the file is empty. To restore, stop the backend, restore into the running database, and
start it again:

```sh
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env stop backend
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < /opt/cinexplorer/backups/BACKUP_FILE.dump
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env up -d --wait
```

Backups stay on the droplet, so they don't survive losing it; copy one off the server when it must.

## Roll back code and compare schema

A rollback restores code, **not automatically the schema**. Reversing migrations can permanently discard the data they
added; take a [backup](#back-up-the-database) before reversing any. If any required migration cannot be reversed, stop
and roll forward with a corrected version instead. Never use `--fake` to bypass a failed migration.

Stay at the newer checkout until schema comparison and any reversal are finished. Set the previous full commit and
tag from your saved deployment notes if the shell variables above are no longer available. Record the newer tag:

```sh
cd /opt/cinexplorer/repo/infrastructure
newer_tag=$(sed -n 's/^IMAGE_TAG=//p' /opt/cinexplorer/prod.env)
previous_commit='PREVIOUS_FULL_PUBLISHED_COMMIT_SHA'
previous_tag='sha-PREVIOUS_FIRST_SEVEN_CHARACTERS'
umask 077
IMAGE_TAG="$previous_tag" docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env pull backend web
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env run --rm backend python manage.py showmigrations --no-color --verbosity 1 > /opt/cinexplorer/migrations-newer.txt
IMAGE_TAG="$previous_tag" docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env run --rm backend python manage.py showmigrations --no-color --verbosity 1 > /opt/cinexplorer/migrations-previous.txt
diff -u /opt/cinexplorer/migrations-previous.txt /opt/cinexplorer/migrations-newer.txt
```

`diff` exits 1 when the lists differ; that is the comparison result. Both commands query the same live database,
but each image lists the migrations it contains, including third-party packages. `[X]` means applied, `[ ]` means
unapplied. Treat `[-]` replacement markers and squashed migrations as needing manual graph inspection; do not infer
that they are safe to reverse from their names alone.

For every applied migration in the newer image absent from the previous image, identify that app's latest migration
in the previous image, or `zero` if the previous image has no migrations for that app. Stop backend writers before
reversing; the site is temporarily unavailable. Preview each reversal with the **newer image**, checking its plan
for dependent apps that also need reversing. Replace the app and migration below with the actual comparison result:

```sh
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env stop backend
IMAGE_TAG="$newer_tag" docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env run --rm backend python manage.py migrate APP_LABEL PREVIOUS_MIGRATION_OR_ZERO --plan
IMAGE_TAG="$newer_tag" docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env run --rm backend python manage.py migrate APP_LABEL PREVIOUS_MIGRATION_OR_ZERO
```

Repeat for each affected app in dependency order, then rerun the newer-image `showmigrations` command to confirm the
applied set is compatible with the previous image. If there are no extra applied migrations, skip these reversal
commands entirely.

The rollback leaves the movie blacklist table as the newer version loaded it. If the previous version has the
`sync_blacklist` command, run it after `migrate` below so the table matches that version's file; an older image has no
such command.

Only after the comparison/reversals succeed, switch checkout and tag, migrate any unapplied migrations belonging to
the previous version, and start it:

```sh
test -z "$(git status --porcelain)"
git checkout --detach "$previous_commit"
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$previous_tag/" /opt/cinexplorer/prod.env
chmod 600 /opt/cinexplorer/prod.env
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env config --quiet
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env pull
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env run --rm backend python manage.py migrate --noinput
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env up -d --wait
curl --fail --silent --show-error https://staging.cinexplorer.andrewcreekmore.dev/api/health-check/
```

Confirm sign-in and watchlist persistence again. Inspect web logs: the retained Caddy volume should supply the
existing certificate, without a new certificate order. A failure stops the rollback; diagnose it before taking
another step.

## Logs, restarts and persistent state

Run these from `/opt/cinexplorer/repo/infrastructure`:

```sh
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env ps
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env logs --tail 100 backend web
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env logs --follow backend
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env restart backend
docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env logs --tail 100 db
docker volume inspect cinexplorer-prod_db-data cinexplorer-prod_caddy-data cinexplorer-prod_caddy-config
```

Postgres data lives in `cinexplorer-prod_db-data`; certificates and ACME account data live in
`cinexplorer-prod_caddy-data`, with Caddy configuration in `cinexplorer-prod_caddy-config`. Redis is disposable cache
with persistence disabled, so a restart clears throttle histories and cached data. Backend logs go to stdout;
Docker retains three 10 MB log files per container. Services restart unless explicitly stopped.

Keep the project name and volumes stable across deploys. Do not run `down -v` on the server: it deletes database and
certificate state. Take a [backup](#back-up-the-database) before any step that drops or recreates the database. Env
files live under `/opt/cinexplorer`, outside the checkout; the repository deploy key and registry credentials live under
`/home/deploy/.ssh` and `/home/deploy/.docker` respectively.

Security updates install automatically. When a required update requests a reboot, unattended-upgrades schedules it
for 09:00 UTC. Inspect `/var/log/unattended-upgrades/`, `systemctl list-timers apt-daily*` and `swapon --show` when
checking host maintenance. Application images update only when you pull and recreate them.

## Recover SSH access through DigitalOcean

The Recovery Console works without the network or `sshd`, but it needs a password. Root has none on a droplet
created with only an SSH key, and the bootstrap leaves root's local password alone, so start with a reset. On the
droplet's **Settings** tab, use **Reset root password**: DigitalOcean emails a temporary password. Then, from the same
tab, open **Recovery console → Launch Console**, sign in as `root` with the temporary password, and choose a new one
when prompted. Store it in your password manager. SSH root login stays disabled. From the console, inspect:

```sh
sshd -t
sshd -T | grep -E '^(passwordauthentication|kbdinteractiveauthentication|permitrootlogin) '
journalctl -u ssh --since '30 minutes ago'
ufw status verbose
ls -ld /home/deploy/.ssh
ls -l /home/deploy/.ssh/authorized_keys
```

Correct the public key or file permissions there. For an SSH configuration change, run `sshd -t` before
`systemctl reload ssh`. Keep the console open until a new key-authenticated `deploy` SSH session works.

## References

- [Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [Ubuntu automatic updates](https://ubuntu.com/server/docs/how-to/software/automatic-updates/)
- [Ubuntu OpenSSH configuration](https://manpages.ubuntu.com/manpages/noble/man5/sshd_config.5.html)
- [GitHub registry authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [GitHub SSH fingerprints](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints)
- [DigitalOcean Recovery Console](https://docs.digitalocean.com/products/droplets/how-to/recovery/recovery-console/)
