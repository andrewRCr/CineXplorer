# Type Safety Strategy and Guidelines

**Version:** 2.0
**Last Updated:** 2025-10-09
**Status:** Active - Official project standards

## Version History

- **2.0** (2025-10-09): Migrated from hybrid Pyright+MyPy to Pyright-only with django-types. Removed MyPy configuration, enhanced Django ORM patterns, simplified type ignore guidelines, documented custom stub supplement strategy.
- **1.1** (2025-10-08): Added comprehensive hybrid type checker ignore guidelines with decision trees, real examples, and anti-patterns
- **1.0**: Initial type safety strategy

## Purpose

This document provides authoritative guidance for achieving comprehensive type safety in CineXplorer's Django + Pydantic stack. Use this when implementing new models, creating schemas, or resolving type checking issues.

## Table of Contents

1. [The Challenge](#the-challenge)
2. [Our Solution](#our-solution)
3. [Implementation Patterns](#implementation-patterns)
4. [Type Checking Configuration](#type-checking-configuration)
5. [Django ORM Type Patterns](#django-orm-type-patterns)
6. [Type Ignore Guidelines](#type-ignore-guidelines)
7. [Maintenance Guidelines](#maintenance-guidelines)

---

## The Challenge

### Why Django ORM Type Safety Is Hard

Django generates model fields dynamically at runtime using metaclass magic. Type checkers analyze code statically before runtime, creating a mismatch:

```python
class Movie(models.Model):
    title = models.CharField(max_length=255)

# Runtime: movie.title -> str (Django knows this)
# Static analysis: movie.title -> ? (Type checker doesn't know this)
```

**django-types** provides type stubs for Django built-ins, enabling Pyright to properly infer field types and ORM patterns.

---

## Our Solution

### Design Principles

1. **Type safety at API boundaries** - Pydantic schemas guarantee type-safe request/response
2. **Minimal type ignores** - Only where necessary, always documented
3. **Pragmatic approach** - Solve common cases elegantly, document edge cases
4. **Low maintenance** - Sustainable for small teams
5. **Pyright-only validation** - Fast, consistent with IDE, Python 3.13 support

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: API Boundary (100% Type Safe)                      │
│ - Django Ninja routers                                      │
│ - Pydantic schemas (ModelSchema + manual Schema)            │
│ - Request validation & response serialization               │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: ORM/Database (Type Safe via django-types + stubs)  │
│ - Django models with django-types inference                 │
│ - Custom .pyi stubs for gaps and third-party libraries      │
│ - Type-safe field access                                    │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: External APIs (Type Safe via Pydantic)             │
│ - TMDB API responses validated with Pydantic                │
│ - Third-party service contracts enforced at runtime         │
│ - Type-safe transformations between external/internal types │
└─────────────────────────────────────────────────────────────┘
```

### Primary Solution: Custom .pyi Stub Files

**Why stub files:**

- Perfect for small library surface area with stable APIs
- 100% accurate type inference without modifying source code
- Centralized type declarations vs scattered `pyright: ignore` comments
- Excellent IDE autocomplete support

**Trade-offs (be honest)**:

- ✅ **Pros**: Clean code, great DX, eliminates repetitive `pyright: ignore`
- ⚠️ **Cons**: Manual maintenance, can drift from reality, ~250 LOC to maintain
- 📊 **Worth it when**: Library is mature/stable (allauth, simplejwt) and changes infrequently
- ❌ **Not worth it when**: Library APIs change often or maintenance burden grows

**Our stub files** (`backend/stubs/`):

1. **django/contrib/auth/** - **Supplements** django-types (provides explicit `id` field declaration on AbstractUser, eliminates `reportAttributeAccessIssue` on `user.id`)
2. **allauth/** - **Required** (no official stubs, stable API)
3. **ninja_jwt/** - **Required** (incomplete official typing)
4. **environ/** - **Required** (django-environ lacks official stubs)

**Key insight from Task 7 testing:**

Custom Django stubs are NOT redundant with django-types:
- **Without custom stubs**: `user.id` triggers `reportAttributeAccessIssue` (2 errors in authentication/api.py)
- **With custom stubs**: `user.id` properly typed (0 errors)
- **Root cause**: django-types doesn't explicitly declare the `id` field on AbstractUser (inherited from models.Model), Pyright can't infer it
- **Decision**: Custom Django stubs **supplement** django-types (not replace it)

**Configuration:** Set `"stubPath": "stubs"` in `backend/pyrightconfig.json`

**Maintenance contract**: Each stub file documents:
- Library version synchronized with
- Last verified date (with django-types version noted)
- Upgrade checklist
- Supplement vs required status
- Explicit acknowledgment this is a maintenance trade-off

**If stubs become a burden**: Remove them and use documented `pyright: ignore` instead. This is a pragmatic choice, not a dogmatic one.

## Implementation Patterns

### Pattern 1: ModelSchema for Direct Model Mapping

**Use when:** Direct CRUD operations mapping Django model to API response.

```python
from ninja.orm import ModelSchema

class UserMovieDataModelSchema(ModelSchema):
    class Meta:
        model = UserMovieData
        fields = ["id", "user_watched", "user_rating"]
```

**Benefits:** Automatic field inference with django-types, zero `pyright: ignore` needed, minimal boilerplate.

### Pattern 2: from_orm_with_<relation>() for Computed Fields

**Use when:** ModelSchema needs computed fields from ForeignKey relationships.

```python
class UserMovieDataDetailSchema(ModelSchema):
    tmdb_id: int | None = None  # From obj.movie.tmdb_id
    title: str | None = None    # From obj.movie.title

    class Meta:
        model = UserMovieData
        fields = ["id", "user_watched", "user_rating"]

    @classmethod
    def from_orm_with_movie(cls, obj: UserMovieData) -> "UserMovieDataDetailSchema":
        """Populate computed fields from related model.

        Note: Django field access may show as 'unknown' in Pyright due to
        django-types generic field type limitations (documented limitation).
        This is acceptable per our type safety strategy.
        """
        instance = cls.from_orm(obj)
        if obj.movie is not None:
            instance.tmdb_id = obj.movie.tmdb_id
            instance.title = obj.movie.title
        return instance
```

**API Usage:**

```python
@router.get("/by-tmdb-id", response=UserMovieDataDetailSchema)
def get_data(request: HttpRequest, tmdb_id: int) -> UserMovieDataDetailSchema:
    obj = UserMovieData.objects.select_related('movie').get(movie__tmdb_id=tmdb_id)
    return UserMovieDataDetailSchema.from_orm_with_movie(obj)  # Clean, one line
```

**Why this pattern:**

- Encapsulates type handling in schema (not API code)
- Zero `cast()` calls polluting endpoints
- Single-line return statements
- Reusable and consistent across project

### Pattern 3: Manual Schema for Input DTOs

**Use when:** Input needs fields not on model, or all-optional PATCH operations.

```python
from ninja import Schema

class UserMovieDataCreateSchema(Schema):
    movie_id: int  # Not on model - used for lookup
    user_watched: bool = False
    user_rating: int | None = None

class UserMovieDataUpdateSchema(Schema):
    user_watched: bool | None = None  # All optional for PATCH
    user_rating: int | None = None
```

## Type Checking Configuration

### Pyright with django-types

**Strategy:** Pyright-only for fast development feedback and CI validation, with django-types for Django ORM inference.

**Why Pyright-only (not hybrid):**

1. ✅ **Python 3.13 Support**: Pyright fully supports Python 3.13, MyPy support limited
2. ✅ **Performance**: Pyright 3-5x faster than MyPy (shorter CI times, faster local checks)
3. ✅ **Consistency**: Same checker locally (VSCode/Pylance) and in CI
4. ✅ **Simplicity**: Single type checker = simpler configuration, less maintenance
5. ✅ **Community Consensus**: "Unless you have existing mypy workflow, skip mypy and use Pyright" (Python community discussion)

**Why django-types (not django-stubs):**

- `django-stubs`: Requires MyPy plugin for Django ORM type inference (Pyright cannot use plugins)
- `django-types`: Forked from django-stubs July 2025 specifically for Pyright compatibility
- Using django-stubs with Pyright results in degraded type checking (incompatibility causes inflated error counts)

**Pyright Configuration** (`backend/pyrightconfig.json`):

```json
{
  "typeCheckingMode": "strict",
  "pythonVersion": "3.13",
  "stubPath": "stubs",
  "reportUnknownMemberType": "information",
  "reportAttributeAccessIssue": "information"
}
```

**Why "information" level:**

Django ORM field warnings represent current django-types limitations - they don't indicate code problems, just framework typing limitations. These are isolated to ORM field access and runtime-validated by tests. This approach aligns with industry leaders (Zulip uses similar configuration).

**Running checks:**

```bash
# From repository root (fastest)
npx pyright backend/apps/ backend/config/ --project backend

# Via type check script (comprehensive)
python backend/scripts/type_check.py           # All modules
python backend/scripts/type_check.py --verbose # With details
```

**CI Configuration:**

Type checking in CI uses Pyright directly (no MyPy):

```yaml
# .github/workflows/ci.yml
- name: Run backend type checking
  run: npx pyright backend/apps/ backend/config/ --project backend
```

Type checking is **blocking** in CI - all code must pass Pyright strict mode before merge.

## Django ORM Type Patterns

### Explicit Manager Annotations

**Pattern:** Always annotate custom managers explicitly to help Pyright understand QuerySet types.

```python
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from typing import ClassVar

class CustomUserManager(BaseUserManager["CustomUser"]):
    """Type-safe user manager."""

    def create_user(
        self,
        email: str,
        password: str | None = None,
        **extra_fields: object
    ) -> "CustomUser":
        """Create and return regular user."""
        ...

class CustomUser(AbstractBaseUser):
    objects: ClassVar[CustomUserManager] = CustomUserManager()

    email: models.EmailField  # django-types infers str type
    is_active: models.BooleanField  # django-types infers bool type
```

**Benefits:**

- Explicit `ClassVar` tells Pyright this is a class-level attribute
- Generic `BaseUserManager["CustomUser"]` provides QuerySet type inference
- django-types handles field type inference (no manual typing needed)

### QuerySet Type Hints

**Pattern:** Use explicit QuerySet generics for complex queries.

```python
from django.db.models import QuerySet

def get_active_users() -> QuerySet[CustomUser]:
    """Return queryset of active users."""
    return CustomUser.objects.filter(is_active=True)

def process_users(users: QuerySet[CustomUser]) -> list[str]:
    """Process user queryset and return emails."""
    return [user.email for user in users]
```

**Benefits:**

- Explicit return types improve IDE autocomplete
- Type-safe iteration over queryset results
- Clear function contracts

### Model Field Access Patterns

**Pattern:** django-types handles basic field inference, custom stubs supplement gaps.

```python
# Basic field access (django-types handles this)
user = CustomUser.objects.get(email="test@example.com")
email: str = user.email  # ✅ django-types infers str
is_active: bool = user.is_active  # ✅ django-types infers bool

# Primary key access (custom stubs supplement django-types)
user_id: int = user.id  # ✅ Custom django/contrib/auth/models.pyi provides explicit id field
```

**Without custom Django stubs**, `user.id` would trigger `reportAttributeAccessIssue` because django-types doesn't explicitly declare the `id` field (it's inherited from models.Model and Pyright can't infer it).

### ForeignKey and Related Field Typing

**Pattern:** Use `select_related()` and `prefetch_related()` with explicit types.

```python
from django.http import HttpRequest

def get_user_movie_details(request: HttpRequest, tmdb_id: int) -> UserMovieDataDetailSchema:
    """Get user movie data with related movie information."""
    # select_related ensures movie is loaded (no N+1)
    obj = UserMovieData.objects.select_related('movie').get(
        user=request.user,
        movie__tmdb_id=tmdb_id
    )

    # Django ORM guarantees movie is not None here (select_related)
    # But Pyright sees movie as Movie | None (conservative)
    if obj.movie is not None:  # Explicit null check for type safety
        tmdb_id = obj.movie.tmdb_id
        title = obj.movie.title

    return UserMovieDataDetailSchema.from_orm_with_movie(obj)
```

**Key insight:**

- Django ORM relationship access may show as `reportUnknownMemberType` in Pyright
- This is a documented django-types limitation (generic field types)
- Runtime tests validate correctness
- Acceptable per `pyrightconfig.json` settings (`"reportUnknownMemberType": "information"`)

### Acceptable Information-Level Warnings

**django-types limitations** (configured as "information" level, not errors):

```python
# Pattern 1: reportUnknownMemberType on model fields
user.email  # Pyright: Unknown member type
# Reason: django-types limitation with generic field types
# Validation: Runtime tests verify correctness
# Status: Acceptable per type safety strategy

# Pattern 2: reportAttributeAccessIssue on related fields (without custom stubs)
movie.user_movie_data.user_rating  # Pyright: Unknown attribute
# Reason: Related manager dynamic attributes
# Validation: Django ORM handles at runtime
# Status: Acceptable per type safety strategy, custom stubs can eliminate if needed
```

**Why acceptable:**

These warnings represent django-types framework limitations, not code errors. They are:

1. **Isolated to ORM field access** (not business logic)
2. **Runtime-validated** by comprehensive test suite
3. **Documented** in pyrightconfig.json with rationale
4. **Industry-standard approach** (Zulip and other large Django projects use similar configuration)

## Type Safety Rules

### typing.Any Usage

**PROHIBITED** except for external API payloads (TMDB, third-party services).

**Use instead:**

- `object` for truly unknown data
- `dict[str, object]` for generic dictionaries
- Specific union types when possible: `str | int | None`

**If Any is unavoidable:** Must have inline comment explaining necessity.

**Example:**

```python
# ❌ Prohibited
def process_data(data: Any) -> Any:
    ...

# ✅ Correct
def process_data(data: dict[str, object]) -> dict[str, object]:
    ...

# ✅ Acceptable with justification
def parse_tmdb_response(payload: Any) -> MovieSchema:  # TMDB API contract not typed
    ...
```

## Type Ignore Guidelines

### Decision Tree (Preference Order)

**Rule:** Type ignores are a last resort. Exhaust all other options first.

**Decision tree (in order of preference):**

1. **Third-party library missing types?** → Create custom `.pyi` stub files (see [Primary Solution: Custom .pyi Stub Files](#primary-solution-custom-pyi-stub-files))
2. **Django ORM internals?** → Verify it's an information-level warning (acceptable), or refactor if it's an error
3. **Runtime-injected attributes?** → Refactor to avoid (e.g., use `get_current_user()` instead of `request.auth`)
4. **Truly unavoidable?** → Use specific `pyright: ignore` with detailed justification

### Acceptable Use Cases

After exhausting above decision tree:

1. **Django framework internals** - Framework magic that can't be typed (verify it's information-level first)
2. **Django Ninja auth injection** - Runtime-injected attributes not in type stubs (prefer refactoring first)
3. **Documented edge cases** - Rare scenarios with detailed justification

**NOT acceptable:**

- ❌ **External library limitations** - Create stub files instead of scattering `pyright: ignore`
- ❌ **Laziness** - Don't use ignores to avoid proper typing work
- ❌ **Silencing real errors** - Investigate and fix the code

### Pyright Ignore Syntax

**Use specific error codes:**

```python
# ✅ Correct: Specific error code with reason
assert isinstance(request.user, AbstractBaseUser)  # pyright: ignore[reportUnknownMemberType]

# ❌ Wrong: Generic ignore without code
value = get_unknown()  # pyright: ignore
```

**Real examples from our codebase:**

```python
# Example 1: Django ORM limitation - HttpRequest.user type
# Pyright sees user as object (generic descriptor typing limitation)
# Runtime: django-types ensures user is AbstractBaseUser
def create_token(request: HttpRequest) -> str:
    assert isinstance(request.user, AbstractBaseUser)  # pyright: ignore[reportUnknownMemberType]
    refresh = RefreshToken.for_user(request.user)
    return str(refresh.access_token)

# Example 2: Manager override in custom stubs (variance strictness)
# Pyright enforces strict variance (Manager[Model] vs EmailAddressManager)
class EmailAddress(models.Model):
    objects: ClassVar[EmailAddressManager]  # pyright: ignore[reportIncompatibleVariableOverride]
```

**Documentation requirements:**

- ✅ Always specify error code: `# pyright: ignore[reportErrorName]`
- ✅ Add inline comment explaining WHY if not obvious from context
- ✅ Keep scope minimal (line-level only, never function-level)
- ✅ Verify the error is legitimate before suppressing

### Best Practices

**Always:**

- ✅ Use specific codes: `# pyright: ignore[reportAttributeAccessIssue]`
- ✅ Add inline explanation for non-obvious suppressions
- ✅ Keep scope minimal (line-level, not function-level)
- ✅ Verify error is legitimate before suppressing
- ✅ Check if error is already "information" level (acceptable without ignore)

**Never:**

- ❌ Blanket ignores without code: `# pyright: ignore`
- ❌ Silencing real errors without investigation
- ❌ Ignoring without understanding why
- ❌ Using ignores to avoid proper typing work

**Example: Avoiding type ignores with refactoring:**

```python
from authentication.auth_ninja import get_current_user

@router.post("/")
def create_entry(request: HttpRequest) -> UserMovieDataModelSchema:
    # Get authenticated user with explicit error handling (zero pyright: ignore needed)
    user = get_current_user(request)  # Returns AbstractBaseUser

    obj = UserMovieData.objects.create(user=user, ...)
    return UserMovieDataModelSchema.from_orm(obj)  # Full type safety from here
```

**Why `get_current_user()` over `cast(User, request.auth)`:**

- ✅ Zero `pyright: ignore` comments needed
- ✅ Explicit error handling with structured responses
- ✅ Built-in logging for observability
- ✅ Easier to test (mockable function)
- ✅ Single source of truth for auth logic

---

## Maintenance Guidelines

### Custom Stub Maintenance

**When Upgrading django-types:**

1. Read django-types release notes for breaking changes
2. Run type checker: `npx pyright backend/apps/ backend/config/ --project backend`
3. If new errors appear, investigate if custom stubs need updates
4. Update stub file headers with new django-types version
5. Run full test suite to verify runtime correctness

**When Upgrading Third-Party Libraries:**

1. Check library release notes for API changes
2. Run full test suite
3. If runtime errors occur related to types, check corresponding stub file
4. Update stub signatures if API changed
5. Update "Last verified" date in stub docstring

### Model Change Checklist

When modifying Django models (if using custom model stubs):

1. Update model file (`models.py`)
2. Update stub file (`models.pyi`) if applicable
3. Update affected schemas (`schemas.py`)
4. Run type checks: `npx pyright backend/apps/ backend/config/ --project backend`
5. Verify no new errors (information-level warnings acceptable)
6. Update tests if contract changed

**Time estimate:** ~5 minutes per change

**Note:** With django-types, most model changes don't require stub updates (django-types handles inference). Only custom stubs in `backend/stubs/` need manual maintenance.

### Model File Headers

Include sync reminder in model files that have corresponding custom stubs:

```python
"""
⚠️ TYPE STUB SYNC REQUIRED
When modifying this file, update: backend/stubs/<path>/models.pyi
"""
```

**Current files requiring sync:**

- None (we use django-types for Django models, custom stubs only for third-party libraries)

### Pre-Commit Quality Gate

```bash
python backend/scripts/type_check.py
# Must show: ✅ Type Safety Status: Pyright
# All apps should pass with 0 errors (information warnings acceptable)
```

**If checks fail:** Fix errors, document new justified ignores, re-run until passing.

### Development Workflow

**Incremental Type Checking (Fast):**

```bash
# Check specific files during development
npx pyright backend/apps/authentication/api.py --project backend

# Check specific app
npx pyright backend/apps/authentication/ --project backend
```

**Full Type Checking (Pre-Commit):**

```bash
# Comprehensive check via script
python backend/scripts/type_check.py

# Or direct Pyright (equivalent)
npx pyright backend/apps/ backend/config/ --project backend
```

**CI Type Checking:**

CI runs Pyright as blocking quality gate (must pass before merge):

```yaml
- name: Run backend type checking
  run: npx pyright backend/apps/ backend/config/ --project backend
```

---

## When to Use Domain Layer Alternative

The domain layer pattern (separate dataclasses from ORM) is available if:

- Business logic grows beyond simple CRUD
- Need framework-independent testing
- Complex algorithms require pure Python models

**Trade-off:** More boilerplate (to_domain/from_domain everywhere) vs framework independence.

**Current status:** django-types + stub files solve 95% of needs. Add domain layer only if complexity justifies it.

---

## Related Documentation

- [DEVELOPMENT-RULES](../constitution/DEVELOPMENT-RULES.md) - Development standards (Pyright-only quality gates)
- [TECHNICAL-ARCHITECTURE](../constitution/TECHNICAL-ARCHITECTURE.md) - Architecture overview (type checking section)
- [API Layer Modernization PRD](.arc/active/prd-api-layer-modernization-p2.md) - API patterns
- `backend/pyrightconfig.json` - Pyright configuration
- `backend/stubs/` - Custom type stubs directory
- [django-types Documentation](https://pypi.org/project/django-types/) - Django stub library for Pyright
- [Pyright Documentation](https://microsoft.github.io/pyright/) - Type checker documentation
