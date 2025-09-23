# Tasks: Logging System Implementation

## Relevant Files

- `backend/config/logging.py` - Django logging configuration settings with environment-based log levels
- `backend/config/tests/test_logging_config.py` - Test script to verify logging configuration and environment variables
- `backend/apps/core/management/commands/test_logging.py` - Django management command to test logging system integration
- `backend/config/tests/test_settings_test_logging.py` - Comprehensive test suite for test environment logging configuration
- `backend/middleware/logging.py` - Custom middleware for request correlation and performance tracking
- `backend/logs/` - Directory for backend log files with separate files for app, Django, requests, database queries, and errors
- `backend/logs/README.md` - Comprehensive documentation for log directory usage and commands
- `backend/logs/.gitignore` - Excludes log files from version control while preserving directory structure
- `backend/logs/test_permissions.py` - Permission testing script for log directory access verification
- `frontend/src/services/logger.ts` - Frontend logger service with configurable levels (DEBUG, INFO, WARN, ERROR, CRITICAL) and user interaction tracking for development debugging
- `frontend/src/components/ErrorBoundary.tsx` - React error boundary component with logger integration and user-friendly error UI
- `frontend/logs/` - Directory for frontend log files (created by logging system)
- `backend/apps/core/views/logging.py` - Django API views for receiving and processing frontend log entries with validation and correlation
- `backend/apps/core/urls.py` - URL configuration for core app logging endpoints
- `backend/apps/core/tests/test_logging_api.py` - Comprehensive test suite for frontend logging API endpoints
- `frontend/src/App.tsx` - Main application component wrapped with ErrorBoundary for application-wide error catching
- `frontend/src/components/__tests__/ErrorBoundaryIntegration.test.tsx` - Integration tests verifying ErrorBoundary works at the application level
- `infrastructure/docker-compose.yml` - Updated to include log volume mounts for persistent storage

### Notes

- Log directories will be created automatically by the logging configuration
- Docker volume mounts will make logs accessible on the host at `C:\dev\CineXplorer\backend\logs\` and `C:\dev\CineXplorer\frontend\logs\`
- Existing Django settings in `backend/config/settings.py` will need to import and include the logging configuration
- Frontend logger service should integrate with existing API utilities for backend error reporting

## Tasks

- [x] 1.0 Configure Django Backend Logging System
  - [x] 1.1 Create `backend/config/logging.py` with Django logging configuration
  - [x] 1.2 Set up environment variable support for log levels (DJANGO_LOG_LEVEL)
  - [x] 1.3 Configure separate formatters for development (human-readable) and production (JSON)
  - [x] 1.4 Set up file handlers with rotation (10MB files, 5 backups)
  - [x] 1.5 Configure database query logging for development environment
  - [x] 1.6 Import and integrate logging configuration in `backend/config/settings.py`
  - [x] 1.7 Create `backend/logs/` directory and ensure proper permissions
  - [x] 1.8 Configure logging for test environment in `settings_test.py` (ERROR level, console-only, no files)

- [x] 2.0 Implement Request Correlation and Middleware
  - [x] 2.1 Create `backend/middleware/logging.py` with RequestLoggingMiddleware class
  - [x] 2.2 Implement UUID-based correlation ID generation for each request
  - [x] 2.3 Add request start logging with method, path, and user context
  - [x] 2.4 Add request completion logging with status code and duration
  - [x] 2.5 Configure middleware to exclude sensitive data from logs
  - [x] 2.6 Add middleware to MIDDLEWARE list in Django settings
  - [x] 2.7 Create utility function to get correlation ID from request object

- [x] 3.0 Create Frontend Logging Infrastructure
  - [x] 3.1 Create `frontend/src/services/logger.ts` with Logger class and log levels
  - [x] 3.2 Implement environment-based logging (development vs production)
  - [x] 3.3 Add method to send critical errors to backend logging endpoint
  - [x] 3.4 Create `frontend/src/components/ErrorBoundary.tsx` React component
  - [x] 3.5 Implement error catching and logging in ErrorBoundary
  - [x] 3.6 Add user interaction tracking for development environment
  - [x] 3.7 Create backend API endpoint (`/api/logs/`) to receive frontend logs
  - [x] 3.8 Integrate ErrorBoundary with main App.tsx component

- [ ] 4.0 Set Up Docker Volume Configuration for Log Access
  - [ ] 4.1 Update `infrastructure/docker-compose.yml` to add backend log volume mount
  - [ ] 4.2 Update `infrastructure/docker-compose.yml` to add frontend log volume mount
  - [ ] 4.3 Test log file accessibility from host machine
  - [ ] 4.4 Verify log rotation and file permissions work correctly
  - [ ] 4.5 Document log file locations and access methods for development workflow

- [ ] 5.0 Integrate Logging with Existing TMDB API Calls
  - [ ] 5.1 Identify existing TMDB API integration points in the codebase
  - [ ] 5.2 Add logging to TMDB API requests (URL, method, headers)
  - [ ] 5.3 Add logging to TMDB API responses (status code, rate limit headers)
  - [ ] 5.4 Log TMDB API errors with full context and correlation IDs
  - [ ] 5.5 Add performance logging for slow TMDB API calls (>1000ms)
  - [ ] 5.6 Test logging output during typical TMDB API operations
  - [ ] 5.7 Verify sensitive data (API keys) are excluded from log output
