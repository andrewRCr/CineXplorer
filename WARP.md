# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

CineXplorer is a Django REST Framework + React TypeScript movie discovery application that helps users find movies and track what they've watched. The application uses Docker for containerization and features a full-stack architecture with PostgreSQL database.

## Development Commands

### Starting Services (Recommended)
```powershell
# Start all services (backend, frontend, Caddy proxy, database)
docker-compose -f infrastructure/docker-compose.yml up

# Start specific service
docker-compose -f infrastructure/docker-compose.yml up backend
docker-compose -f infrastructure/docker-compose.yml up frontend
docker-compose -f infrastructure/docker-compose.yml up caddy

# Stop all services
docker-compose -f infrastructure/docker-compose.yml down
```

### Backend Development
```powershell
# Run Django tests
docker-compose -f infrastructure/docker-compose.yml exec backend python manage.py test

# Run tests with custom settings
docker-compose -f infrastructure/docker-compose.yml exec backend python manage.py test --settings=config.settings_test

# Run single test
docker-compose -f infrastructure/docker-compose.yml exec backend python manage.py test apps.core.tests.test_models

# Run backend linting (flake8)
docker-compose -f infrastructure/docker-compose.yml exec backend flake8 --max-line-length=99 --exclude migrations

# Django database operations
docker-compose -f infrastructure/docker-compose.yml exec backend python manage.py migrate
docker-compose -f infrastructure/docker-compose.yml exec backend python manage.py makemigrations
docker-compose -f infrastructure/docker-compose.yml exec backend python manage.py wait_for_db

# Django shell
docker-compose -f infrastructure/docker-compose.yml exec backend python manage.py shell_plus
```

### Frontend Development
```powershell
# Install dependencies and run dev server (inside container)
docker-compose -f infrastructure/docker-compose.yml exec frontend npm install
docker-compose -f infrastructure/docker-compose.yml exec frontend npm run dev

# Run frontend linting (ESLint)
docker-compose -f infrastructure/docker-compose.yml exec frontend npm run lint

# Run frontend type checking
docker-compose -f infrastructure/docker-compose.yml exec frontend npm run type-check

# Run frontend tests (Vitest)
docker-compose -f infrastructure/docker-compose.yml exec frontend npm test
docker-compose -f infrastructure/docker-compose.yml exec frontend npm run test:watch
docker-compose -f infrastructure/docker-compose.yml exec frontend npm run test:coverage

# Build frontend for production
docker-compose -f infrastructure/docker-compose.yml exec frontend npm run build
```

### Development URLs
- Frontend (via Caddy): https://localhost:8444 
- Backend API (via Caddy): https://localhost:8444/api/
- Direct backend: https://localhost:8000
- Direct frontend: https://localhost:5173

## Architecture Overview

### Monorepo Structure
- **backend/**: Django REST Framework API with PostgreSQL
- **frontend/**: React + TypeScript + Vite SPA using Chakra UI
- **infrastructure/**: Docker Compose configurations and Caddy reverse proxy
- **shared/**: Synchronized error codes between frontend and backend

### Backend Architecture (Django)
The Django backend follows a modular app-based architecture:

- **core/**: Custom user model, authentication, shared utilities, health checks
- **movie/**: Movie data management, TMDB API integration
- **user/**: User management, JWT authentication with cookies
- **user_movie_data/**: User-specific movie tracking (ratings, watched status)

Key backend patterns:
- JWT authentication via cookies with CSRF protection
- Custom authentication backend (`core.backends.CustomUserModelBackend`)
- Shared service layer in `core/services/` for cross-app functionality
- Environment-based configuration with django-environ

### Frontend Architecture (React + TypeScript)
- **pages/**: React Router route components
- **components/**: Reusable UI components
- **hooks/**: Custom React hooks for state and API management
- **services/**: API client and business logic
- **utilities/**: Helper functions
- **constants/**: Application constants

Frontend Tech Stack:
- **React 19** with TypeScript for UI components
- **Vite** for build tooling and development server
- **Chakra UI v3** for component library and theming
- **React Router v7** for client-side routing
- **Axios** for HTTP client with interceptors
- **Formik** for form handling
- **Vitest + React Testing Library** for unit and component testing
- **ESLint** with TypeScript rules for code quality

### Key Integration Patterns

**Error Handling**: Synchronized error codes between backend (`shared/error_codes.py`) and frontend (`shared/error-codes.ts`) prevent drift and ensure consistent error handling.

**Authentication**: JWT tokens stored as HttpOnly cookies with CSRF protection. Frontend uses Axios interceptors for automatic token refresh.

**Development SSL**: All services run with SSL certificates in development for production parity. Caddy reverse proxy handles HTTPS termination and routes traffic.

### Database
PostgreSQL with Django ORM. Key models:
- Custom User model in `core/models.py`
- Movie data synchronized with TMDB API
- User movie preferences and tracking data

## Code Standards

### Python/Django Standards
- Follow PEP 8 with max line length 99 characters
- Use type hints for all functions and methods
- Use Django REST Framework serializers for API data validation
- Write tests for all new features (`python manage.py test`)

### TypeScript/React Standards  
- Use TypeScript interfaces/types for all props and data structures
- Prioritize Chakra UI components over custom CSS
- Follow React best practices (functional components, hooks)
- Use React Router for navigation
- ESLint configuration enforces code standards

### Required Before Commits
- Backend: Run `flake8 --max-line-length=99 --exclude migrations`
- Frontend: Run `npm run lint` and `npm run type-check`
- Backend: Ensure all tests pass with `python manage.py test`
- Frontend: Ensure all tests pass with `npm test`
- Follow DRY principles to avoid code duplication

## Environment Setup

The application requires several environment variables in `backend/config/.env`:
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: Database credentials
- `DJANGO_SECRET_KEY`: Django secret key
- `TMDB_API_KEY`: The Movie Database API key
- `BACKEND_URL`: Backend URL for CORS/CSRF
- `ZEPTOMAIL_API_KEY`: Email service API key (optional)
- `FRONTEND_URL`: Frontend URL for email links

## Key Guidelines

- Always check if backend and frontend servers are running before starting new instances to avoid port conflicts
- Use Docker Compose for all development to ensure environment consistency
- Images should contain meaningful alt text for accessibility
- Follow security best practices including input validation and secure authentication
- Keep error codes synchronized between `shared/error_codes.py` and `shared/error-codes.ts`
- The `shared/` directory contains resources that must stay synchronized between frontend and backend

## Testing

### Backend Testing
- Django's built-in test framework with custom test settings (`settings_test.py`)
- Run tests: `python manage.py test --settings=config.settings_test`
- Custom `wait_for_db` command ensures database readiness

### Frontend Testing
- **Vitest** as the test runner with React Testing Library
- **@testing-library/user-event** for user interaction testing
- **MSW (Mock Service Worker)** for API mocking
- **JSDOM** environment for DOM testing
- Tests support TypeScript out of the box

### CI/CD Pipeline
- **GitHub Actions** runs on every push
- Builds Docker images for both frontend and backend
- Runs backend tests with `python manage.py test --settings=config.settings_test`
- Runs backend linting with `flake8 --max-line-length=99 --exclude migrations`
- Uses Docker layer caching for faster CI builds
- Tests run in containerized environment matching production

<citations>
<document>
    <document_type>WARP_DOCUMENTATION</document_type>
    <document_id>getting-started/quickstart-guide/coding-in-warp</document_id>
</document>
</citations>