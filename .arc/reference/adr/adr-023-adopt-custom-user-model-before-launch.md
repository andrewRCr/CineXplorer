# ADR-023: Adopt a Custom User Model Before Launch

## Status

Accepted (Owner, 2026-11-04)

Implemented by: PR #67. The development and staging databases are reset with it.

## Context

Django's documentation recommends starting every project with a custom user model, because switching to one later
is a hard migration. CineXplorer started with one (`AUTH_USER_MODEL = "accounts.User"`) and removed it on 2025-10-01
(`26ce772e`) to work around a django-stubs bug under `mypy --strict`. The backend now type-checks with Pyright, so
that reason no longer applies.

The question came up again on 2026-11-03, before a planned rework of the model that stores each user's movie data.
The swap was estimated at about 2 days, and the decision was to keep Django's `User` and add a `Profile` one-to-one
when a field needed it. The next day the Owner doubted the estimate, and a probe on a throwaway copy of the code
measured the swap instead:

- Pyright reported no errors before the swap and none after.
- Two migrations needed a `swappable_dependency` line, and a fresh database migrated cleanly in the right order. No
  migrations had to be squashed.
- 883 of 888 backend tests passed unchanged. Three admin tests and two tests that name Django's `User` directly
  failed.
- The whole change, with a case-insensitive unique email constraint, came to about 3.5–5 hours.

CineXplorer has no real users yet, and staging holds one account. Existing databases can't take the swap in place
(Django refuses with `InconsistentMigrationHistory`), so the development and staging databases are reset. After
launch the same change means a subclass on `db_table="auth_user"`, rehearsed on a restored backup: about 2–3 days.

### Alternatives Considered

- **Keep `User`; add a `Profile` one-to-one when a field needs it.** No cost now. Email uniqueness stays in
  application code, and any later swap happens against real data.
- **Swap after launch if a need appears.** About 2–3 days, rehearsed on a restored backup.
- **Swap now, before launch (chosen).** About 3.5–5 hours, plus resetting two databases that hold no real users.

## Decision

We will use a custom user model, `users.User`, a subclass of `AbstractUser`, set as `AUTH_USER_MODEL` before launch.

- Email addresses are unique regardless of case, enforced by a database constraint on `Lower("email")` that leaves
  empty addresses out.
- The model records `updated_at`; `date_joined` is its created time.
- Registration keeps its friendly duplicate check. A race that gets past it answers with the same 409 body, so the
  endpoint keeps one error shape until authentication's errors move to the shared contract
  ([ADR-024](adr-024-map-domain-exceptions-to-one-error-contract.md)).
- The development and staging databases are reset, and staging's JWT signing key is replaced, so tokens issued before
  the reset can't resolve to recycled user IDs.

## Consequences

### Positive

- The database enforces email uniqueness regardless of case, which application code only approximated before.
- New user fields go on the user row, without a second table.
- The project matches Django's recommended setup, and the costlier post-launch migration is avoided.

### Negative

- Local development data is lost in the reset, and the development OAuth setup is entered again.
- The staging account is registered again.
- Branches in progress must merge the change and reset their test databases.

### Risks

- A database that was migrated before the change refuses later migrations until it's reset. Every checkout's
  development and test databases need that reset once.

## References

- Django documentation, "Using a custom user model when starting a project":
  <https://docs.djangoproject.com/en/5.2/topics/auth/customizing/#using-a-custom-user-model-when-starting-a-project>
- Commit `26ce772e`, which removed the earlier custom model
- [ADR-024](adr-024-map-domain-exceptions-to-one-error-contract.md)
