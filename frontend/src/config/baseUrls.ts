/** Shared site and API addresses for browser requests. */
export const siteOrigin = import.meta.env.VITE_BASE_URL || window.location.origin;
export const apiBaseUrl = import.meta.env.VITE_BASE_API_URL || `${siteOrigin}/api`;
