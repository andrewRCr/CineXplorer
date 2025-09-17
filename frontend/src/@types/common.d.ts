/**
 * Common type definitions used across UI components and utilities
 */

// Import shared error handling types
export type { ErrorCode, ErrorCategory, ERROR_CODES } from 'shared';

/**
 * Pagination-related types
 */
export interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;
  totalResults?: number;
}

/**
 * Loading states
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Sort options
 */
export interface SortOption {
  value: string;
  label: string;
  direction?: 'asc' | 'desc';
}

/**
 * Generic form field types
 */
export interface FormField {
  name: string;
  value: string | number | boolean;
  error?: string;
  touched?: boolean;
}

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

/**
 * Modal/Dialog types
 */
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
}

/**
 * Toast/Notification types
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * URL/Navigation types
 */
export interface RouteParams {
  [key: string]: string | undefined;
}

export interface QueryParams {
  [key: string]: string | string[] | undefined;
}

/**
 * Event handler types
 */
export type EventHandler<T = HTMLElement> = (event: React.SyntheticEvent<T>) => void;
export type ChangeHandler = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
export type ClickHandler = (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;

/**
 * Component size variants
 */
export type ComponentSize = 'small' | 'medium' | 'large';

/**
 * Theme/styling types
 */
export type ThemeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

/**
 * Generic data fetching states
 */
export interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated?: Date;
}
