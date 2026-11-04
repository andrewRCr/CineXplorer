# ADR-033: Host on One Droplet with Docker Compose Behind Caddy

## Status

Accepted (Owner, 2026-10-31; provider revised 2026-11-03)

Recorded 2026-11-04 from sources of the time.

Implemented by: PR #24 (`683ce1fd`, 2026-11-03), which deployed the staging host.

## Context

CineXplorer had only ever run as its development stack: Docker Compose, with a Caddy proxy in front of Django's and
Vite's development servers. Its production path had never run, and parts of it could not. It needed a public host,
first for staging and then for launch. The Owner had no account at any VPS provider and a low budget.

The development stack idled at about 335 MiB across five containers. Production was estimated to be comfortable on
2 GB, and workable on 1 GB only with swap and one or two Gunicorn workers.

Alternatives weighed:

- **A virtual server running the Compose stack behind Caddy (chosen).** Vultr, DigitalOcean and Akamai (Linode)
  offered comparable 2 GB plans.
- **Heroku,** where the Owner already had an account: a Basic dyno with managed Postgres and a key-value store.
- **Vercel,** also already in use. It "hosts only the frontend", and splitting the app across Vercel and an API host
  "breaks the single-origin cookie and CSRF setup the auth depends on".
- **Hetzner (US) and Azure:** ruled out on cost.

The reasoning recorded for the choice: Heroku would have been quicker to set up and needed less upkeep (no server
to patch; managed TLS, backups and scheduling), but it would "drop the Compose and Caddy deployment the repository and
README describe", split development (Compose) from production, and cap the web process at 0.5 GB. Vultr came first
as "the cheapest 2 GB plan, and a central-US region confirmed for it", with DigitalOcean "a sound second choice".

Vultr never verified the account, so on 2026-11-03 the Owner moved to DigitalOcean for both the staging and the
production host: one provider keeps "the runbook, backups and DNS pattern single, and staging rehearses production".
New York offered no Basic plan when the droplet was created, so it runs in San Francisco. One server serves both
hosts in turn because nothing is in production before launch, so a second environment would sit idle.

The deployment's own design decisions set how the stack is built and run:

- Images are built in CI and pulled by the server, because "the server has one vCPU and 2 GB, so builds there would
  be slow, risk memory pressure, and leave build tools on a public machine".
- A web image carries Caddy, the frontend bundle and the Caddyfile: "one immutable artifact per version, nothing to
  keep in step at deploy, and rollback is an image tag".
- A standalone production Compose file replaces an override of the development one, whose bind mounts, published
  ports, certificates and development servers "would each need stripping, and a missed one would reach production".

## Decision

We will run CineXplorer on one small virtual server, now a DigitalOcean Basic droplet (Regular CPU, 2 GB, 1 vCPU)
in San Francisco (SFO2) on Ubuntu 24.04 LTS. A standalone production Compose stack runs the backend, Postgres and
Redis behind a web image in which Caddy serves the frontend bundle, proxies the API and obtains TLS certificates
automatically. Only that web container publishes ports. CI builds the production images and publishes them to
GitHub's container registry, and the server pulls them. The same server serves the staging host until launch and
then the production host.

## Consequences

### Positive

- Development and production run the same way, as Compose stacks behind Caddy, as the repository and README
  already described.
- The setup is provider-neutral: the bootstrap script targets plain Ubuntu 24.04, and the move from Vultr to
  DigitalOcean changed only the runbook's server, firewall and recovery steps.
- A version is a pair of immutable images; a deploy or rollback pulls a tag and checks out the commit it names,
  following a runbook that a live deploy, rollback and roll-forward proved.
- The same images and Compose file serve any host, so moving to the production host changes only environment values
  and a DNS record.

### Negative

- The server is the project's to run: operating-system updates, the firewall, SSH access and recovery, which a
  platform host would have handled.
- One server is a single point of failure, with no high availability and no zero-downtime deploys.
- The first deployment left out backups, scheduled jobs, monitoring and automatic deploys; each is separate work.
- Keeping a staging stack beside production after launch would need a server of about 4 GB.

### Risks

- Docker's published ports bypass `ufw`, so keeping the database and cache private rests on publishing only the web
  container and on the provider's firewall, which filters traffic before it reaches the droplet.

Current state: the droplet serves only `staging.cinexplorer.andrewcreekmore.dev`, deployed by hand from the runbook;
the production host waits for launch.

## References

- `.arc/reference/archive/2026-q4/technical/06_staging-deploy/prd-staging-deploy.md`: §§ 1, 2 (goal 3) and 5;
  § 7, design decisions 1, 2, 5 and 12; § Amendments (2026-11-03)
- `.arc/reference/archive/2026-q4/technical/06_staging-deploy/completion-staging-deploy.md`
- `infrastructure/deploy/README.md` (the runbook), `infrastructure/deploy/bootstrap.sh`
- `infrastructure/docker-compose.prod.yml`, `infrastructure/Caddyfile.prod`
- `.github/workflows/ci.yml`, job `images`
- `README.md` § Details
- PR #24
