# Logging System - Sub-PRD

**Document Version:** 1.0  
**Created:** 2025-09-22  
**Feature Priority:** High (Foundation)  
**Implementation Phase:** Before User Movie Lists  

## Introduction/Overview

This Sub-PRD defines the implementation of a best-practices logging system for CineXplorer that maintains high standards while avoiding over-engineering for a portfolio project. The system will provide idiomatic logging patterns for both Django backend and React frontend, with emphasis on debugging TMDB API integration issues and following industry best practices. The logging system will support future scalability while remaining pragmatic for a project with a handful of test users.

## Goals

1. **Implement idiomatic logging patterns** for Django backend and React frontend services
2. **Enable effective debugging** of TMDB API integration issues and application errors  
3. **Follow industry best practices** for log levels, formatting, and configuration
4. **Maintain simplicity** appropriate for a portfolio project scope
5. **Provide flexible configuration** via both environment variables and Django settings
6. **Support development workflow** with file-based logs accessible via grep/search

## User Stories

1. **As a developer**, I want to quickly identify TMDB API integration issues so that I can debug connection problems and rate limiting effectively.

2. **As a developer**, I want configurable log levels so that I can enable detailed logging during development and reduce noise in production.

3. **As a developer**, I want separate logging per service so that I can debug backend and frontend issues independently with appropriate tools.

4. **As a developer**, I want request correlation between frontend and backend so that I can trace user actions across the full stack when debugging complex issues.

5. **As a portfolio project maintainer**, I want logging that demonstrates industry best practices without over-engineering for the limited user base.

## Functional Requirements

### Backend Logging (Django)

1. **The system must implement Django's built-in logging framework** with proper configuration for development and production environments.

2. **The system must log all TMDB API calls** including request URLs, response status codes, rate limit headers, and error messages.

3. **The system must support configurable log levels** via both environment variables (e.g., `DJANGO_LOG_LEVEL=DEBUG`) and Django settings with environment variables taking precedence.

4. **The system must include request correlation IDs** to trace requests from frontend through backend processing.

5. **The system must log database query performance** in development mode to identify slow queries.

6. **The system must exclude sensitive information** from logs (API keys, passwords, personal user data).

7. **The system must implement proper log rotation** to prevent disk space issues.

### Frontend Logging (React)

8. **The system must implement React Error Boundaries** to catch and log unhandled component errors.

9. **The system must log failed API requests** with context including request details and error responses.

10. **The system must track user interactions in development** (page navigation, search queries, watchlist actions) for behavior analysis.

11. **The system must disable user interaction tracking in production** to respect privacy for portfolio demonstration.

12. **The system must provide a simple logger service** with appropriate log levels (error, warn, info, debug).

### Log Management

13. **The system must store logs in files** accessible via Docker volumes for easy grep/search access.

14. **The system must use structured log formats** (JSON for production, human-readable for development) to support both readability and parsing.

15. **The system must implement separate log files per service** (backend, frontend) while maintaining request correlation capability.

## Non-Goals (Out of Scope)

- External log aggregation services (Datadog, Splunk, CloudWatch)
- Real-time log streaming or advanced analytics dashboards  
- Long-term log archival beyond basic rotation
- Advanced user session replay functionality
- Centralized log management across all services
- Production-scale log monitoring and alerting systems

## Design Considerations

- **File Structure**: Separate log directories for backend (`/backend/logs/`) and frontend (`/frontend/logs/`) accessible on host at `C:\dev\CineXplorer\backend\logs\` and `C:\dev\CineXplorer\frontend\logs\`
- **Log Format**: JSON in production for parsing, detailed text format in development for readability
- **Correlation**: Use UUID-based correlation IDs passed via HTTP headers between services
- **Configuration**: Environment-first approach with sensible defaults in Django settings

## Technical Considerations

- **Integration**: Should work seamlessly with existing Docker Compose development setup
- **Dependencies**: Minimal new dependencies - primarily use Django's built-in logging and standard Python libraries
- **Performance**: Logging should add minimal overhead (target <5ms per request)
- **Storage**: Log files should be accessible via Docker volumes for development workflow
- **Rotation**: Implement size-based rotation (10MB files, keep 5 backups) to manage disk usage

## Success Metrics

1. **Developer Productivity**: Reduce time to identify and debug TMDB API issues by 50%
2. **Code Quality**: Demonstrate industry-standard logging practices suitable for portfolio review
3. **Maintainability**: Log configuration can be adjusted without code changes via environment variables
4. **Performance**: Logging adds less than 5ms overhead to API response times
5. **Usability**: Developers can easily search and filter logs using standard Unix tools (grep, tail, etc.)

## Open Questions

1. **Log Level Defaults**: What should be the default log level for development vs production environments?
2. **Correlation Implementation**: Should correlation IDs be generated on the frontend or backend, and how should they be passed between services?
3. **Error Notification**: For critical errors, should there be any immediate notification mechanism, or is file logging sufficient?
4. **Testing Integration**: How should logging be handled in automated tests to avoid noise while still capturing test-related errors?

---

**Next Steps:**
1. Review and approve this Sub-PRD
2. Begin implementation with Django logging configuration  
3. Set up Docker volume configuration for log file access
4. Implement frontend error boundaries and logging service
5. Test correlation ID flow between frontend and backend