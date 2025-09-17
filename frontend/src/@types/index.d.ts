/**
 * Centralized type definitions for CineXplorer frontend
 * Import from this index to get all types in one place
 */

// Shared types (consistent with backend) - imported in movie.d.ts
// export * from 'shared'; // Commented out to avoid path resolution issues during build

// Movie-related types (includes shared + frontend-specific)
export * from './movie';

// Common UI and utility types
export * from './common';

// Authentication and user types
export * from './auth-state';
export * from './user';
