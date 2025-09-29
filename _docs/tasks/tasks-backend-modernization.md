# Backend Modernization & Type Safety - Task List

**Based on:** `prd-backend-modernization.md`
**Created:** 2025-09-23
**Status:** In Progress - Planning & Scoping
## Relevant Files

### Core Infrastructure
- `backend/config/settings.py` - Django settings with hardcoded values to be moved to environment
- `backend/mypy.ini` - ✅ Hybrid configuration: strict for services/utilities, relaxed for Django framework
- `backend/pyrightconfig.json` - ✅ Pyright configuration for development type checking
- `backend/scripts/type_check.py` - ✅ Comprehensive hybrid type checking script (mypy + Pyright)
- `backend/scripts/test_typing.py` - ✅ Isolated typing validation for core utilities
- `backend/.flake8` - flake8 configuration (already established)
- `backend/requirements/req.dev.txt` - Development dependencies (mypy, django-stubs, pyright, django-types)
- `shared/api_types.py` - ✅ Python TypedDict equivalents of TypeScript API types for contract consistency
- `shared/error_codes.py` - ✅ Updated with modern typing and shared error definitions
- `shared/__init__.py` - ✅ Centralized imports for all shared Python types

### Models & Core Services
- `backend/apps/core/models.py` - ✅ Django models with forward references, ClassVar managers, and type-safe patterns
- `backend/apps/core/services/email_service.py` - ✅ ZeptoMail service with professional type annotations for all methods
- `backend/apps/core/services/email_service.py` - ✅ ZeptoMail service with professional type annotations for all methods- `backend/apps/core/services/tmdb_api_client.py` - New exemplar client architecture (reference standard)
- `backend/apps/core/services/api_response.py` - ✅ API response wrapper with professional typing, no Any usage
- `backend/apps/core/services/base_api_client.py` - ✅ Base HTTP client with professional type annotations
- `backend/apps/user_movie_data/services/user_movie_data_service.py` - ✅ User movie data service with typed bulk operations
- `backend/apps/core/views/logging.py` - ✅ Django views with type narrowing and object validation patterns
- `backend/middleware/logging.py` - ✅ Django middleware with HttpRequest extensions and type-safe META access
- `backend/config/django_types.py` - ✅ Django type extensions for custom HttpRequest attributes

### Views & Serializers
- `backend/apps/core/views/*.py` - ✅ Core views with professional type annotations using django-stubs and shared types
- `backend/apps/movie/views.py` - ✅ Movie views with professional type annotations (11 view classes, refined Any usage)
- `backend/apps/user/views.py` - ✅ User views with professional type annotations (8 view classes, minimal Any usage)
- `backend/apps/user_movie_data/views.py` - ✅ User movie data viewset with django-stubs QuerySet generics
- `backend/apps/movie/serializers.py` - ✅ Movie serializers with professional type annotations and shared types
- `backend/apps/user/serializers.py` - ✅ User serializers with professional type annotations (auth, registration, JWT)
- `backend/apps/user_movie_data/serializers.py` - ✅ User movie data serializers with comprehensive type annotations

### Tests & Quality
- `backend/apps/*/tests/*.py` - Test files requiring type safety validation
- `backend/apps/core/tests/test_logging_api.py` - Logging test example (integration with logging system)

### Authentication & Middleware
- `backend/apps/user/authenticate.py` - ✅ JWT cookie authentication backend with professional type annotations
- `backend/apps/user/middleware.py` - ✅ CSRF header middleware with comprehensive type annotations
- `backend/apps/core/backends.py` - ✅ Custom user authentication backend with django-stubs integration

### Notes
- Type checking: `python scripts/type_check.py` (comprehensive hybrid mypy + Pyright validation)
- Development type checking: `npx pyright apps/` (fast, strict checking with shared types)
- CI/CD type checking: `mypy apps/ --strict` (Django-compatible validation)
- Linting: `flake8 apps/` (already configured)
- Testing: `python manage.py test --keepdb` (maintain existing test patterns)
- The movie_service.py and tmdb_api_client.py serve as architectural reference standards for other services

## Tasks

- [ ] 1.0 **Type System Modernization & mypy Compliance**
  - [x] 1.1 Update mypy.ini to strict configuration with professional standards
  - [x] 1.2 Replace all deprecated typing imports (`Dict` → `dict`, `Optional[T]` → `T | None`, `List[T]` → `list[T]`)
  - [x] 1.3 Add comprehensive type annotations to core models (User, Movie, UserMovieData)
  - [x] 1.4 Add type annotations to all view classes and methods
  - [x] 1.5 Create Python TypedDict equivalents for shared TypeScript API types and refine Any usage
  - [x] 1.6 Add type annotations to all serializer classes and methods
  - [x] 1.7 Add type annotations to authentication backends and middleware
  - [x] 1.8 Add type annotations to email service and other utility services
  - [x] 1.9 Fix Django-specific type patterns using django-stubs
  - [x] 1.10 Run hybrid type checking (python scripts/type_check.py) and resolve Pyright errors in movie views
  - [ ] 1.11 Run hybrid type checking (python scripts/type_check.py) and resolve ANY remaining Pyright errors across backend, while also ensuring zero usage of `Any` and minimal `type: ignore` comments with explanations as to their necessity
  - [ ] 1.12 Validate all tests pass with type-safe code

- [ ] 2.0 **Architecture Review & SOLID/DRY Refactoring**
  - [ ] 2.1 Audit entire codebase for function-based service patterns
  - [ ] 2.2 Identify all services requiring class-based refactoring (movie_service, email_service, etc.)
  - [ ] 2.3 Refactor movie_service.py from function-based to class-based architecture
  - [ ] 2.4 Refactor email_service.py to class-based architecture with dependency injection
  - [ ] 2.5 Refactor any other identified function-based services to class patterns
  - [ ] 2.6 Implement dependency injection for all service class constructors
  - [ ] 2.7 Convert global client instances to injected dependencies across services
  - [ ] 2.8 Audit remaining services for monolithic patterns (follow TMDB client example)
  - [ ] 2.9 Identify code duplication across views and serializers
  - [ ] 2.10 Extract common view patterns into base classes or mixins
  - [ ] 2.11 Extract common serializer validation patterns
  - [ ] 2.12 Review authentication backends for single responsibility principle
  - [ ] 2.13 Create service base classes for common functionality patterns
  - [ ] 2.14 Refactor any monolithic view methods into focused components
  - [ ] 2.15 Apply dependency inversion where appropriate (follow client pattern)
  - [ ] 2.16 Standardize error handling patterns across all services
  - [ ] 2.17 Validate refactored architecture with existing tests

- [ ] 3.0 **Security & Configuration Hardening**
  - [ ] 3.1 Move DEBUG setting to environment variable with secure defaults
  - [ ] 3.2 Audit and move all hardcoded secrets to environment variables
  - [ ] 3.3 Implement environment-based configuration for ALLOWED_HOSTS
  - [ ] 3.4 Add security headers middleware configuration
  - [ ] 3.5 Review and secure database connection settings
  - [ ] 3.6 Add environment variable validation and error handling
  - [ ] 3.7 Create separate settings configurations for dev/staging/prod
  - [ ] 3.8 Update Docker environment configuration for new settings
  - [ ] 3.9 Configure container health check endpoint integration
  - [ ] 3.10 Add production-ready logging configuration integration
  - [ ] 3.11 Document environment variable requirements
  - [ ] 3.12 Test security configurations in development environment

- [ ] 4.0 **Code Quality & Technical Debt Elimination**
  - [ ] 4.1 Scan codebase for all TODO, FIXME, and HACK comments
  - [ ] 4.2 Resolve or document each TODO/FIXME item with implementation plan
  - [ ] 4.3 Remove all unused imports across the codebase
  - [ ] 4.4 Remove unused variables and dead code
  - [ ] 4.5 Fix unused type: ignore comments identified by mypy
  - [ ] 4.6 Standardize import ordering and formatting
  - [ ] 4.7 Add proper __str__ methods to all model classes
  - [ ] 4.8 Standardize URL pattern naming conventions (RESTful)
  - [ ] 4.9 Run flake8 and resolve all linting violations
  - [ ] 4.10 Validate all tests pass after cleanup

- [ ] 5.0 **Performance Optimization & Monitoring Foundation**
  - [ ] 5.1 Review existing database queries for N+1 patterns
  - [ ] 5.2 Add database indexes where appropriate for common queries
  - [ ] 5.3 Optimize database connection settings and pooling
  - [ ] 5.4 Review and optimize Django migrations for performance
  - [ ] 5.5 Add performance timing to API endpoints (integrate with logging)
  - [ ] 5.6 Implement strategic response caching where beneficial
  - [ ] 5.7 Optimize serializer performance for heavy operations
  - [ ] 5.8 Add comprehensive health check endpoints
  - [ ] 5.9 Integrate django-silk for database query profiling and analysis
  - [ ] 5.10 Add memory profiling capabilities for view performance analysis
  - [ ] 5.11 Set up APM integration preparation for production monitoring
  - [ ] 5.12 Establish performance baseline metrics and documentation
  - [ ] 5.13 Add resource monitoring capabilities (memory, CPU)

- [ ] 6.0 **Documentation & Development Workflow Integration**
  - [ ] 6.1 Add docstrings to all public methods and classes
  - [ ] 6.2 Create architecture documentation for service patterns
  - [ ] 6.3 Document type hinting standards and conventions
  - [ ] 6.4 Update API documentation with new patterns and endpoints
  - [ ] 6.5 Set up pre-commit hooks for automated quality checks
  - [ ] 6.6 Integrate mypy and flake8 into CI/CD workflow
  - [ ] 6.7 Configure GitHub Actions type checking integration
  - [ ] 6.8 Add automated shared type validation to CI pipeline
  - [ ] 6.9 Set up quality gate failure notifications
  - [ ] 6.10 Create code review guidelines emphasizing type safety
  - [ ] 6.11 Update developer onboarding documentation
  - [ ] 6.12 Document performance optimization guidelines
  - [ ] 6.13 Create troubleshooting guide for common type errors

- [ ] 7.0 **Full-Stack Integration Validation**
  - [ ] 7.1 Validate API contract changes maintain frontend compatibility
  - [ ] 7.2 Update shared type definitions for new backend patterns
  - [ ] 7.3 Synchronize error handling patterns across frontend/backend
  - [ ] 7.4 Test end-to-end type safety through API boundaries
  - [ ] 7.5 Coordinate frontend TODO resolution with backend improvements
  - [ ] 7.6 Validate logging integration works across stack
  - [ ] 7.7 Update frontend services to match new backend architecture
  - [ ] 7.8 Ensure email verification flow works with backend auth improvements
  - [ ] 7.9 Test performance impact on frontend API calls
  - [ ] 7.10 Validate Docker environment works with new configurations
