# Authentication Modernization - Sub-PRD

**Document Version:** 1.0  
**Created:** 2025-09-27  
**Feature Priority:** High (Critical Blocker Resolution)  
**Implementation Phase:** Between API-Layer-Modernization Phase 1 & Phase 2

## Introduction/Overview

This Sub-PRD defines the migration from custom User model authentication to django-allauth, eliminating the django-stubs mypy --strict bug while significantly enhancing the portfolio value through professional social authentication. This modernization unblocks comprehensive type checking, reduces demo friction for potential employers, and establishes industry-standard authentication patterns.

**Critical Context:** This addresses the django-stubs internal error (`AssertionError: Must not defer during final iteration`) that prevents mypy --strict mode, which is blocking the Backend Modernization Sub-PRD type safety objectives.

## Goals

1. **Eliminate django-stubs typing bug** by removing custom AUTH_USER_MODEL setting that triggers circular dependency in django-stubs plugin initialization
2. **Enable comprehensive type safety** by allowing mypy --strict mode without internal errors
3. **Enhance portfolio demonstration value** through professional social login reducing demo friction for recruiters/employers
4. **Preserve existing functionality** maintaining all current authentication features and user experience
5. **Maintain email verification system** integrating existing ZeptoMail service with allauth email management
6. **Establish foundation for scalability** providing industry-standard authentication platform for future features

## User Stories

1. **As a prospective employer reviewing the demo**, I want to sign in quickly with my Google/GitHub account so that I can evaluate the application without signup friction.

2. **As the developer**, I want to run mypy --strict on the entire codebase so that I can achieve comprehensive type safety and demonstrate professional Python practices.

3. **As an existing user**, I want to continue logging in with my username or email so that the authentication experience remains unchanged.

4. **As the developer**, I want to preserve the existing email verification workflow so that the branded ZeptoMail templates and tracking continue working.

5. **As a prospective employer**, I want to see industry-standard authentication implementation so that I can assess the developer's knowledge of professional Django patterns.

## Functional Requirements

### Core Authentication Migration

1. **The system must migrate from custom User model to default Django User model** eliminating the AUTH_USER_MODEL setting that triggers the django-stubs bug.

2. **The system must implement django-allauth** providing username/email login functionality identical to the current custom backend.

3. **The system must support social authentication** for Google and GitHub OAuth to reduce demo friction.

4. **The system must preserve all existing user data** through data migration ensuring no user accounts are lost.

5. **The system must maintain email verification functionality** integrating the existing ZeptoMail service through custom allauth adapters.

### Email System Integration

6. **The system must leverage allauth's authentication UX improvements** for both social and traditional login flows.

7. **The system must maintain ZeptoMail service integration** preserving email delivery, tracking, and development mode capabilities.

8. **The system must implement email template refresh** using allauth templates as starting point with CineXplorer branding opportunities.

9. **The system must configure custom allauth adapter** integrating with existing email_service.py infrastructure where beneficial.

### Type Safety & Development

9. **The system must enable mypy --strict mode** on all backend code without django-stubs internal errors.

10. **The system must maintain existing API contracts** ensuring no breaking changes to authentication endpoints.

11. **The system must update authentication serializers** to work with default User model while preserving JWT functionality.

### Social Authentication Setup

12. **The system must configure Google OAuth** for development environment (`localhost:8444`) with portfolio demonstration capabilities.

13. **The system must configure GitHub OAuth** for development environment appealing to developer/recruiter audiences.

14. **The system must implement social account linking** if standard Django practice and reasonable implementation effort.

15. **The system must document production OAuth setup** for future deployment configuration.

### Security & Compatibility

15. **The system must maintain JWT cookie authentication** preserving the existing secure token handling.

16. **The system must preserve user profile functionality** maintaining first_name, last_name, and other user fields.

17. **The system must handle email_verified status** migrating or recreating this functionality using allauth's email address verification.

## Non-Goals (Out of Scope)

- **Additional social providers** beyond Google and GitHub (can be added later)
- **Password reset functionality** (allauth provides this automatically, but UI customization is deferred)
- **Account management UI** beyond basic allauth templates (customization is future work)
- **Two-factor authentication** (not required for current project scope)
- **Enterprise SSO** (not applicable to portfolio project)

## Design Considerations

- **Backward Compatibility**: All existing authentication functionality must continue working identically
- **Data Integrity**: User accounts, emails, and relationships must be preserved during migration
- **Email Branding**: Existing ZeptoMail templates and tracking must continue working
- **Type Safety**: The migration must enable mypy --strict mode throughout the backend
- **Portfolio Value**: Social login must provide seamless demo experience for recruiters

## Technical Considerations

### Implementation Strategy
- **Migration Approach**: Direct migration with thorough testing (existing user data is development/testing only)
- **Deployment Architecture**: Development OAuth setup for `localhost:8444` (Docker Compose + Caddy)
- **Production OAuth**: Deferred until deployment architecture is finalized
- **Admin Account**: Preserve core admin account data during migration

### Integration Details
- **Django-stubs Compatibility**: Using default User model eliminates the circular dependency bug
- **Email System Strategy**: Leverage allauth's low-friction UX while preserving ZeptoMail integration
- **Template Approach**: Start with standard allauth templates, opportunity for branding refresh
- **Social Account Linking**: Include if standard practice and not excessive effort
- **Testing Strategy**: Comprehensive flow testing for all authentication paths

## Success Metrics

### Primary Success Criteria
1. **Bug Resolution (Priority #1)**: mypy --strict runs without django-stubs internal errors
2. **Feature Parity**: All existing authentication features (username/email login, email verification) work identically
3. **Type Safety**: Comprehensive type checking enabled across backend

### Secondary Success Criteria
4. **Registration Friction Reduction**: Social login significantly reduces demo signup barriers
5. **Social Login**: Google and GitHub OAuth fully functional for development demonstration
6. **Email Integration**: ZeptoMail service continues working with enhanced UX
7. **Portfolio Enhancement**: Industry-standard authentication showcases professional Django patterns

## Open Questions

1. **Social Account Linking Complexity**: Research required to determine if social account linking is standard Django practice and implementation effort involved.

2. **Email System Integration Details**: Technical analysis needed to determine optimal integration between allauth email system and existing ZeptoMail service.

3. **Admin Account Migration**: Define specific approach for preserving core admin account during User model migration.

4. **Production OAuth Timeline**: Coordinate OAuth production setup with deployment architecture decisions.

---

**Next Steps:**
1. Review and approve this Sub-PRD
2. Complete API-Layer-Modernization Task 5.0 (frontend integration)
3. Merge API-Layer-Modernization Phase 1 to main branch
4. Generate detailed task breakdown for Authentication Modernization
5. Create feature branch: `feature/authentication-modernization` from main
6. Begin implementation starting with foundation setup

**Dependencies:**
- API-Layer-Modernization Phase 1 completion (Task 5.0)
- Access to Google/GitHub OAuth application setup
- Backend development environment with existing user data

**Blockers Resolved:**
- Django-stubs mypy --strict bug (validated as eliminated by this approach)
- Type safety implementation for Backend Modernization Sub-PRD