# Incidental Work: Frontend Auth Service Extraction

**Created**: 2025-01-30
**Triggered By**: Task 5.3 in API Layer Modernization Phase 2
**Status**: In Progress
**Estimated Effort**: 45 minutes

## Context

**Why Now**: During Task 5.3 (updating authentication frontend to use generated API types), we discovered that authentication logic is directly embedded in the `useAuth.ts` hook (~220 lines of mixed concerns), while `userMovieDataService.ts` follows the proper service layer pattern. Fixing this now prevents compounding tech debt before Phase 6 (comprehensive testing) and establishes consistency across the entire frontend.

**Discovery**: While updating `useAuth.ts` to use generated types, noticed it contains inline axios calls, mixed state management + API logic, and is not reusable outside React context. Meanwhile, `userMovieDataService.ts` demonstrates the correct pattern: clean service functions, reusable, testable.

**Impact**:

- **Consistency**: All API calls follow the same service layer pattern
- **Testability**: Pure functions can be tested without React Testing Library
- **Reusability**: Auth functions can be used anywhere (hooks, components, utilities)
- **DRY**: Eliminates duplication of API logic
- **Future-proof**: Clean services ready for TanStack Query migration (Frontend Modernization PRD)

## Scope

**Will Do**:

- Create `frontend/src/services/authService.ts` following `userMovieDataService.ts` pattern
- Extract 6 auth API functions: `login`, `register`, `logout`, `getUserProfile`, `verifyEmail`, `resendVerificationEmail`
- Update `useAuth.ts` to use authService (remove inline axios calls)
- Update `Login.tsx` resend email logic to use authService
- Update `VerifyEmail.tsx` to use authService
- Delete obsolete `userService.ts` (replaced by authService)
- Use generated API types for all requests/responses
- Run frontend type checking and linting

**Won't Do** (deferred to Frontend Modernization PRD):

- TanStack Query migration (future PRD)
- React Hook Form migration (future PRD)
- Comprehensive error boundary implementation (future PRD)
- Toast notification system (future PRD)

## Tasks

- [x] 1. Create `authService.ts` with 6 core functions
    - [x] 1.1 Create file with imports (apiClient, generated types, CSRF utilities)
    - [x] 1.2 Implement `login(username, password)` using TokenObtainInput/TokenResponse types
    - [x] 1.3 Implement `register(username, email, password, firstName, lastName)` using RegisterInput/TokenResponse types
    - [x] 1.4 Implement `logout()` using LogoutResponse type
    - [x] 1.5 Implement `getUserProfile()` using UserProfile type
    - [x] 1.6 Implement `verifyEmail(token)` for email verification flow
    - [x] 1.7 Implement `resendVerificationEmail(email)` for resend flow
    - [x] 1.8 Add JSDoc comments and export all functions

- [x] 2. Update `useAuth.ts` to use authService
    - [x] 2.1 Import authService functions
    - [x] 2.2 Replace inline axios call in `login()` with `authService.login()`
    - [x] 2.3 Replace inline axios call in `register()` with `authService.register()`
    - [x] 2.4 Replace inline axios call in `logout()` with `authService.logout()`
    - [x] 2.5 Replace inline axios call in `getUserDetails()` with `authService.getUserProfile()`
    - [x] 2.6 Remove axios import (no longer needed)
    - [x] 2.7 Verify hook maintains same public interface

- [x] 3. Update `Login.tsx` to use authService
    - [x] 3.1 Import `authService.resendVerificationEmail`
    - [x] 3.2 Replace inline axios resend logic (lines ~207-227) with service call
    - [x] 3.3 Remove BASE_URL constant (now in service)
    - [x] 3.4 Remove axios import

- [x] 4. Update `VerifyEmail.tsx` to use authService
    - [x] 4.1 Import `authService.verifyEmail`
    - [x] 4.2 Replace inline axios verification logic (lines ~41-49) with service call
    - [x] 4.3 Remove BASE_URL constant (now in service)
    - [x] 4.4 Remove CSRF token extraction logic (handled by service)
    - [x] 4.5 Remove axios import

- [x] 5. Clean up obsolete files
    - [x] 5.1 Delete `frontend/src/services/userService.ts` and `frontend/src/hooks/useUser.ts` (replaced by authService, unused)

- [x] 6. Quality gates
    - [x] 6.1 Run frontend type checking: `npm run type-check` (0 errors ✅)
    - [x] 6.2 Run frontend linting: `npm run lint` (0 violations ✅)
    - [x] 6.3 Run frontend tests: `npm test` (197 tests passed ✅)

## Relevant Files

- `frontend/src/services/authService.ts`: Created - 178 lines, 6 functions with JSDoc, uses generated API types
- `frontend/src/hooks/useAuth.ts`: Refactored - removed axios, uses authService, maintains same interface
- `frontend/src/pages/user/Login.tsx`: Updated - replaced inline axios resend logic with authService.resendVerificationEmail()
- `frontend/src/pages/user/VerifyEmail.tsx`: Updated - replaced inline axios verification with authService.verifyEmail()
- `frontend/src/services/userService.ts`: Deleted (obsolete, replaced by authService)
- `frontend/src/hooks/useUser.ts`: Deleted (dead code, no usages)

## Completion Notes

Successfully extracted all auth API logic to centralized authService.ts. Refactored 3 files (useAuth.ts, Login.tsx, VerifyEmail.tsx) to use service layer. Deleted 2 obsolete files (userService.ts, useUser.ts). All quality gates passed: 0 type errors, 0 lint violations, 197 tests passed. Ready for atomic commit.
