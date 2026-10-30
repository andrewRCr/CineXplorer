# Type Safety Strategy and Guidelines

**Version:** 2.2 | **Updated:** 2025-10-21 | **Status:** Active

**Version history (latest first):**
2.2 – Clarified configuration tolerance philosophy (Pydantic vs Django ORM)
2.1 – Ruff ANN401 enforcement + validation boundaries
2.0 – Pyright-only migration
1.1 – Ignore guidelines
1.0 – Initial strategy

## Purpose

Authoritative guidance for comprehensive type safety in CineXplorer's Django + Pydantic stack.
Use when implementing models, schemas, or resolving Type-Checking issues.

## Table of Contents

1. [The Challenge](#the-challenge)
2. [Our Solution](#our-solution)
3. [Implementation Patterns](#implementation-patterns)
4. [Type-Checking Configuration](#type-checking-configuration)
5. [Django ORM Type Patterns](#django-orm-type-patterns)
6. [Type Ignore Guidelines](#type-ignore-guidelines)
7. [Maintenance Guidelines](#maintenance-guidelines)

---

## The Challenge

Django generates model fields dynamically at runtime using metaclass magic.
Type checkers analyze statically, creating a mismatch:

```python path=null start=null
class Movie(models.Model):
    title = models.CharField(max_length=255)

# Runtime: movie.title -> str (Django knows)
# Static: movie.title -> ? (Type checker doesn't know)
```

**django-types** provides type stubs enabling Pyright to infer field types and ORM patterns.

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

**Benefits:**

- 100% accurate type inference without modifying source code
- Centralized declarations vs scattered `pyright: ignore` comments
- Excellent IDE autocomplete support

**Trade-offs:**

- ✅ **Pros**: Clean code, eliminates repetitive `pyright: ignore`
- ⚠️ **Cons**: Manual maintenance, can drift, ~250 LOC
- 📊 **Use when**: Library is stable and changes infrequently

**Our stub files** (`backend/stubs/`):

1. **django/contrib/auth/** - Supplements django-types (explicit `id` field on AbstractUser)
2. **allauth/** - Required (no official stubs)
3. **ninja_jwt/** - Required (incomplete official typing)
4. **environ/** - Required (django-environ lacks stubs)

**Configuration:** `"stubPath": "stubs"` in `backend/pyrightconfig.json`

**Maintenance:** Each stub documents library version, verification date, and upgrade checklist.

## Implementation Patterns

### Pattern 1: ModelSchema for Direct Model Mapping

**Use when:** Direct CRUD operations mapping Django model to API response.

```python path=null start=null
from ninja.orm import ModelSchema

class UserMovieDataModelSchema(ModelSchema):
    class Meta:
        model = UserMovieData
        fields = ["id", "user_watched", "user_rating"]
```

**Benefits:** Automatic field inference, zero `pyright: ignore`, minimal boilerplate.

### Pattern 2: from_orm_with_<relation>() for Computed Fields

**Use when:** ModelSchema needs computed fields from ForeignKey relationships.

```python path=null start=null
class UserMovieDataDetailSchema(ModelSchema):
    tmdb_id: int | None = None  # From obj.movie.tmdb_id
    title: str | None = None    # From obj.movie.title

    class Meta:
        model = UserMovieData
        fields = ["id", "user_watched", "user_rating"]

    @classmethod
    def from_orm_with_movie(cls, obj: UserMovieData) -> "UserMovieDataDetailSchema":
        """Populate computed fields from related model."""
        instance = cls.from_orm(obj)
        if obj.movie is not None:
            instance.tmdb_id = obj.movie.tmdb_id
            instance.title = obj.movie.title
        return instance
```

**API Usage:**

```python path=null start=null
@router.get("/by-tmdb-id", response=UserMovieDataDetailSchema)
def get_data(request: HttpRequest, tmdb_id: int) -> UserMovieDataDetailSchema:
    obj = UserMovieData.objects.select_related('movie').get(movie__tmdb_id=tmdb_id)
    return UserMovieDataDetailSchema.from_orm_with_movie(obj)
```

**Benefits:** Encapsulates type handling in schema, zero `cast()` calls, single-line returns.

### Pattern 3: Manual Schema for Input DTOs

**Use when:** Input needs fields not on model, or all-optional PATCH operations.

```python path=null start=null
from ninja import Schema

class UserMovieDataCreateSchema(Schema):
    movie_id: int  # Not on model - used for lookup
    user_watched: bool = False
    user_rating: int | None = None

class UserMovieDataUpdateSchema(Schema):
    user_watched: bool | None = None  # All optional for PATCH
    user_rating: int | None = None
```

### Pattern 4: Pydantic List Defaults (Type-Safe)

**Use when:** Pydantic models need list fields with empty defaults.

**✅ Correct (Pydantic 2 pattern):**

```python path=null start=null
from pydantic import BaseModel

class TMDBMovieResponse(BaseModel):
    genres: list[TMDBGenre] = []  # Type-safe, zero warnings
    cast: list[TMDBCastMember] = []
```

**❌ Incorrect (triggers reportUnknownVariableType):**

```python path=null start=null
from pydantic import BaseModel, Field

class TMDBMovieResponse(BaseModel):
    genres: list[TMDBGenre] = Field(default_factory=list)  # Pyright can't infer type
```

**Why `= []` is safe in Pydantic 2:**

- Pydantic 2 uses field descriptors (`__set_name__`)
- Each instance gets its own list (no shared mutable default)
- This is the idiomatic Pydantic 2 pattern per official docs

**Benefits:** Zero type warnings, cleaner code, no `Field()` import needed.

## Type Checking Configuration

### Pyright with django-types

**Why Pyright-only:**

1. ✅ **Python 3.13 Support** - Full support vs limited MyPy support
2. ✅ **Performance** - 3-5x faster than MyPy
3. ✅ **Consistency** - Same checker locally (VSCode/Pylance) and CI
4. ✅ **Simplicity** - Single type checker, simpler configuration

**Why django-types:** Forked from django-stubs specifically for Pyright compatibility (django-stubs requires MyPy plugin).

**Configuration** (`backend/pyrightconfig.json`):

```json path=backend/pyrightconfig.json start=null
{
  "typeCheckingMode": "strict",
  "pythonVersion": "3.13",
  "stubPath": "stubs",
  "reportUnknownMemberType": "information",
  "reportAttributeAccessIssue": "information"
}
```

**"information" level for Django ORM:** These settings downgrade certain warnings to information level because
they represent django-types limitations, not code problems.

**IMPORTANT - Configuration Philosophy:**

Our Pyright config provides **tolerance for unavoidable framework limitations**, NOT permission to write suboptimal code:

- **Django ORM code**: `reportUnknownVariableType`, `reportUnknownMemberType`, and
  `reportAttributeAccessIssue` are set to "information" because django-types has inherent limitations.
  These warnings are **expected and acceptable** in Django ORM code.

- **Pydantic code**: Should achieve **zero type errors**. Pydantic 2 has excellent typing support—use idiomatic
  patterns (like `field: list[Type] = []` instead of `Field(default_factory=list)`) to avoid triggering
  these warnings.

- **General principle**: If a warning can be eliminated with clean, idiomatic code, fix the code.
  Don't rely on configuration tolerance outside Django ORM contexts.

**Commands:**

```bash path=null start=null
# Fast check
npx pyright backend/apps/ backend/config/ --project backend

# Comprehensive
python backend/scripts/type_check.py
```

**CI:** Type checking is blocking - all code must pass strict mode before merge.

## Django ORM Type Patterns

### Explicit Manager Annotations

**Pattern:** Annotate custom managers explicitly for QuerySet type inference.

```python path=null start=null
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from typing import ClassVar

class CustomUserManager(BaseUserManager["CustomUser"]):
    def create_user(self, email: str, password: str | None = None) -> "CustomUser":
        ...

class CustomUser(AbstractBaseUser):
    objects: ClassVar[CustomUserManager] = CustomUserManager()
    email: models.EmailField  # django-types infers str
    is_active: models.BooleanField  # django-types infers bool
```

**Benefits:** `ClassVar` indicates class-level attribute, generic manager provides QuerySet inference.

### QuerySet Type Hints

**Pattern:** Use explicit QuerySet generics for complex queries.

```python path=null start=null
from django.db.models import QuerySet

def get_active_users() -> QuerySet[CustomUser]:
    return CustomUser.objects.filter(is_active=True)

def process_users(users: QuerySet[CustomUser]) -> list[str]:
    return [user.email for user in users]
```

**Benefits:** Improved IDE autocomplete, type-safe iteration, clear contracts.

### Model Field Access Patterns

```python path=null start=null
# Basic fields (django-types infers)
user = CustomUser.objects.get(email="test@example.com")
email: str = user.email  # ✅ django-types infers str
is_active: bool = user.is_active  # ✅ django-types infers bool

# Primary key (custom stubs supplement)
user_id: int = user.id  # ✅ Custom stub provides explicit id field
```

### ForeignKey and Related Field Typing

**Pattern:** Use `select_related()` with explicit null checks.

```python path=null start=null
def get_user_movie_details(request: HttpRequest, tmdb_id: int) -> UserMovieDataDetailSchema:
    # select_related ensures movie is loaded (no N+1)
    obj = UserMovieData.objects.select_related('movie').get(
        user=request.user, movie__tmdb_id=tmdb_id
    )

    # Explicit null check (Pyright sees Movie | None)
    if obj.movie is not None:
        tmdb_id = obj.movie.tmdb_id
        title = obj.movie.title

    return UserMovieDataDetailSchema.from_orm_with_movie(obj)
```

### Acceptable Information-Level Warnings

**django-types limitations** ("information" level, not errors):

```python path=null start=null
user.email  # reportUnknownMemberType
movie.user_movie_data.user_rating  # reportAttributeAccessIssue
```

**Why acceptable:** Framework limitations, not code errors. Isolated to ORM access, runtime-validated by tests.

## Type Safety Rules

### typing.Any Usage

**PROHIBITED** except for external API boundaries.

**Use instead:**

- `object` for unknown data
- `dict[str, object]` for generic dictionaries
- Union types: `str | int | None`

**Example:**

```python path=null start=null
# ❌ Prohibited
def process_data(data: Any) -> Any: ...

# ✅ Correct
def process_data(data: dict[str, object]) -> dict[str, object]: ...

# ✅ External API boundary
def parse_tmdb_response(payload: Any) -> MovieSchema:  # TMDB contract not typed
    ...
```

### Enforcement: Ruff ANN401 Rule

**Configuration** (`backend/pyproject.toml`):

```toml path=backend/pyproject.toml start=null
[tool.ruff.lint]
select = ["ANN401"]  # Explicit Any detection

[tool.ruff.lint.per-file-ignores]
"apps/authentication/adapters.py" = ["ANN401"]  # Allauth contracts
"apps/authentication/auth_ninja.py" = ["ANN401"]  # Django/OpenAPI schemas
"apps/core/services/metrics.py" = ["ANN401"]  # Monitoring labels allow mixed types
"stubs/**/*.pyi" = ["ANN401"]  # External library contracts
```

**Commands:**

```bash path=null start=null
ruff check backend/ --select ANN401  # Check Any usage
ruff check backend/                  # All rules
```

**Validation Boundary Pattern:**

Contain `Any` at external API boundaries:

```python path=null start=null
class TMDBMovieResponse(BaseModel):
    id: int
    title: str
    release_date: str

def fetch_movie(movie_id: int) -> TMDBMovieResponse:
    # External boundary - Any acceptable
    raw_response: Any = requests.get(f"api.tmdb.org/movie/{movie_id}").json()

    # Immediate validation (Any → Type-safe)
    return TMDBMovieResponse.model_validate(raw_response)
```

**Principles:** Contain Any to boundary, validate immediately, document justification.

**Note:** Pyright only catches implicit Any. Ruff ANN401 catches explicit `Any` usage.

## Type Ignore Guidelines

### Decision Tree (Preference Order)

**Rule:** Type ignores are last resort.

1. **Third-party library missing types?** → Create `.pyi` stub files
2. **Django ORM internals?** → Verify it's information-level (acceptable) or refactor
3. **Runtime-injected attributes?** → Refactor (use `get_current_user()` vs `request.auth`)
4. **Truly unavoidable?** → Use specific `pyright: ignore` with justification

### Acceptable Use Cases

1. **Django framework internals** (verify information-level first)
2. **Django Ninja auth injection** (prefer refactoring)
3. **Documented edge cases** with justification

**NOT acceptable:**

- ❌ External library limitations (create stubs instead)
- ❌ Avoiding proper typing work
- ❌ Silencing real errors

### Pyright Ignore Syntax

**Use specific error codes:**

```python path=null start=null
# ✅ Correct
assert isinstance(request.user, AbstractBaseUser)  # pyright: ignore[reportUnknownMemberType]

# ❌ Wrong
value = get_unknown()  # pyright: ignore
```

**Real examples:**

```python path=null start=null
# Django ORM limitation
def create_token(request: HttpRequest) -> str:
    assert isinstance(request.user, AbstractBaseUser)  # pyright: ignore[reportUnknownMemberType]
    refresh = RefreshToken.for_user(request.user)
    return str(refresh.access_token)

# Manager override variance
class EmailAddress(models.Model):
    objects: ClassVar[EmailAddressManager]  # pyright: ignore[reportIncompatibleVariableOverride]
```

**Requirements:**

- ✅ Specify error code: `# pyright: ignore[reportErrorName]`
- ✅ Add explanation if not obvious
- ✅ Line-level scope only
- ✅ Verify error is legitimate

### Best Practices

**Always:**

- ✅ Specific codes: `# pyright: ignore[reportAttributeAccessIssue]`
- ✅ Inline explanation for non-obvious cases
- ✅ Line-level scope only
- ✅ Verify error legitimacy

**Never:**

- ❌ Generic ignores: `# pyright: ignore`
- ❌ Silencing without investigation
- ❌ Avoiding proper typing work

**Refactoring Example:**

```python path=null start=null
from authentication.auth_ninja import get_current_user

@router.post("/")
def create_entry(request: HttpRequest) -> UserMovieDataModelSchema:
    user = get_current_user(request)  # Returns AbstractBaseUser, no ignores needed
    obj = UserMovieData.objects.create(user=user, ...)
    return UserMovieDataModelSchema.from_orm(obj)
```

**Benefits:** Zero ignores, explicit error handling, better testability.

---

## Maintenance Guidelines

### Stub Maintenance

**django-types upgrades:**

1. Check release notes
2. Run `npx pyright backend/apps/ backend/config/ --project backend`
3. Update stub headers with new version
4. Run backend test suite

**Library upgrades:**

1. Check API changes in release notes
2. Update stub signatures if needed
3. Update "Last verified" date
4. Run backend test suite

**Model change checklist:**

1. Update model + related schema/stub (if applicable)
2. Run `npx pyright backend/apps/ backend/config/ --project backend`
3. Run backend tests to confirm runtime contract

### Pre-Commit Quality Gate

```bash path=null start=null
python backend/scripts/type_check.py
# Must show: ✅ Type Safety Status: Pyright (0 errors)
```

### Development Workflow

```bash path=null start=null
# Fast - specific files
npx pyright backend/apps/authentication/api.py --project backend

# Comprehensive - all code
python backend/scripts/type_check.py
```

**CI:** Type checking is blocking quality gate before merge.

---

## Domain Layer Alternative

Use domain layer (separate dataclasses from ORM) when:

- Business logic exceeds simple CRUD
- Framework-independent testing needed
- Complex algorithms require pure Python models

**Trade-off:** More boilerplate vs framework independence.

**Status:** django-types + stubs solve 95% of needs. Add domain layer only if justified.

---

## Related Documentation

- [DEVELOPMENT-RULES](../constitution/DEVELOPMENT-RULES.md) - Development standards
- [TECHNICAL-OVERVIEW](../constitution/TECHNICAL-OVERVIEW.md) - Architecture overview
- `backend/pyrightconfig.json` - Pyright configuration
- `backend/stubs/` - Custom type stubs
- [django-types](https://pypi.org/project/django-types/) - Django stubs for Pyright
