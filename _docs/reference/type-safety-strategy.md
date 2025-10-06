# Type Safety Strategy and Guidelines

**Version:** 1.0
**Status:** Active - Official project standards

## Purpose

This document provides authoritative guidance for achieving comprehensive type safety in CineXplorer's Django + Pydantic stack. Use this when implementing new models, creating schemas, or resolving type checking issues.

## Table of Contents

1. [The Challenge](#the-challenge)
2. [Our Solution](#our-solution)
3. [Implementation Patterns](#implementation-patterns)
4. [Type Checking Configuration](#type-checking-configuration)
5. [Type Ignore Guidelines](#type-ignore-guidelines)
6. [Maintenance Guidelines](#maintenance-guidelines)

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

**django-stubs** provides partial solutions for Django built-ins, but custom models still show as "unknown" without additional work.

---

## Our Solution

### Design Principles

1. **Type safety at API boundaries** - Pydantic schemas guarantee type-safe request/response
2. **Minimal type ignores** - Only where necessary, always documented
3. **Pragmatic approach** - Solve common cases elegantly, document edge cases
4. **Low maintenance** - Sustainable for small teams
5. **Hybrid validation** - Pyright for speed, MyPy for Django compatibility

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
│ Layer 2: ORM/Database (Type Safe via .pyi stubs)            │
│ - Django models with .pyi stub files                        │
│ - Type-safe field access                                    │
│ - Explicit type annotations for all custom models           │
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
- Centralized type declarations vs scattered `type: ignore` comments
- Good IDE autocomplete support

**Trade-offs (be honest)**:

- ✅ **Pros**: Clean code, great DX, eliminates repetitive `type: ignore`
- ⚠️ **Cons**: Manual maintenance, can drift from reality, ~250 LOC to maintain
- 📊 **Worth it when**: Library is mature/stable (allauth, simplejwt) and changes infrequently
- ❌ **Not worth it when**: Library APIs change often or maintenance burden grows

**Our stub files** (`backend/stubs/`):

1. **Third-party libraries** (allauth, simplejwt):
   - These libraries lack or have incomplete type stubs
   - Alternative: 20+ `type: ignore` comments scattered in code
   - Decision: Centralize in stubs for better maintainability

2. **Django built-ins** (`stubs/django/contrib/auth/`):
   - Supplements django-stubs gaps (UserManager.create_user, AbstractBaseUser methods)
   - Alternative: 5+ `type: ignore` for common Django operations
   - Decision: Worth it to enable clean authentication code

**Configuration:** Set `"stubPath": "stubs"` in `backend/pyrightconfig.json`

**Maintenance contract**: Each stub file documents:
- Library version synchronized with
- Last verification date
- Upgrade checklist
- Explicit acknowledgment this is a maintenance trade-off

**If stubs become a burden**: Remove them and use documented `type: ignore` instead. This is a pragmatic choice, not a dogmatic one.

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

**Benefits:** Automatic field inference, zero `type: ignore` needed, minimal boilerplate.

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
        """Populate computed fields from related model."""
        instance = cls.from_orm(obj)
        if obj.movie is not None:
            instance.tmdb_id = obj.movie.tmdb_id
            instance.title = obj.movie.title
        return instance
```

**API Usage:**

```python
@router.get("/by-tmdb-id", response=UserMovieDataDetailSchema)
def get_data(request: HttpRequest, tmdb_id: int):
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

### Hybrid Approach: Pyright + MyPy

**Strategy:** Pyright for fast development feedback, MyPy for Django-aware CI validation.

**Pyright** (`backend/pyrightconfig.json`):

- `typeCheckingMode: "strict"` - Maximum safety
- `reportUnknownMemberType: "information"` - Django ORM limitations (acceptable)
- `reportAttributeAccessIssue: "information"` - ForeignKey access (acceptable)
- `stubPath: "stubs"` - Custom stubs location

**MyPy** (`backend/mypy.ini`):

- Global relaxed for Django framework compatibility
- Per-module strict for business logic (`apps.core.services.*`, etc.)
- `plugins = mypy_django_plugin.main` - Django-aware inference

**Why "information" level:**

Django ORM field warnings represent current tooling limits - they don't indicate code problems, just framework typing limitations. These are isolated to ORM access and documented where they occur.

**Running checks:**

```bash
python backend/scripts/type_check.py           # All modules
python backend/scripts/type_check.py --verbose # With details
python backend/scripts/type_check.py --only user_movie_data
```

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

### Type Ignore Guidelines

**Rule:** Type ignores are a last resort. Exhaust all other options first.

**Acceptable use cases:**

1. **Django Ninja auth injection** - Runtime-injected attributes not in type stubs
2. **External library limitations** - Third-party code without stubs
3. **Django framework internals** - Framework magic that can't be typed
4. **Documented edge cases** - Rare scenarios with detailed justification

### Best Practices

**Always:**

- ✅ Use specific codes: `# type: ignore[attr-defined]`
- ✅ Add inline explanation: `# Django Ninja injects at runtime`
- ✅ Keep scope minimal (line-level, not function-level)
- ✅ Immediately cast to proper type for downstream safety

**Never:**

- ❌ Blanket ignores without code: `# type: ignore`
- ❌ Silencing real errors without investigation
- ❌ Ignoring without explanation
- ❌ Using ignores to avoid proper typing

**Example:**

```python
from authentication.auth_ninja import get_current_user

@router.post("/")
def create_entry(request: HttpRequest):
    # Get authenticated user with explicit error handling (zero type: ignore needed)
    user = get_current_user(request)  # Returns AbstractUser

    obj = UserMovieData.objects.create(user=user, ...)
    return UserMovieDataModelSchema.from_orm(obj)  # Full type safety from here
```

**Why `get_current_user()` over `cast(User, request.auth)`:**

- ✅ Zero `type: ignore` comments needed
- ✅ Explicit error handling with structured responses
- ✅ Built-in logging for observability
- ✅ Easier to test (mockable function)
- ✅ Single source of truth for auth logic

---

## Maintenance Guidelines

### Model Change Checklist

When modifying Django models:

1. Update model file (`models.py`)
2. Update stub file (`models.pyi`)
3. Update affected schemas (`schemas.py`)
4. Run type checks: `python scripts/type_check.py`
5. Verify no new warnings
6. Update tests if contract changed

**Time estimate:** ~5 minutes per change

### Model File Headers

Include sync reminder in all model files:

```python
"""
⚠️ TYPE STUB SYNC REQUIRED
When modifying this file, update: backend/apps/<app>/models.pyi
"""
```

### Pre-Commit Quality Gate

```bash
python backend/scripts/type_check.py
# Must show: Results: X/X tests passed
```

**If checks fail:** Fix errors, document new justified ignores, re-run until passing.

---

## When to Use Domain Layer Alternative

The domain layer pattern (separate dataclasses from ORM) is available if:

- Business logic grows beyond simple CRUD
- Need framework-independent testing
- Complex algorithms require pure Python models

**Trade-off:** More boilerplate (to_domain/from_domain everywhere) vs framework independence.

**Current status:** Stub files solve 95% of needs. Add domain layer only if complexity justifies it.

---

## Related Documentation

- `_docs/DEVELOPMENT-RULES.md` - Development standards
- `_docs/sub-prds/prd-api-layer-modernization-p2.md` - API patterns
- `backend/pyrightconfig.json` - Pyright config
- `backend/mypy.ini` - MyPy config
