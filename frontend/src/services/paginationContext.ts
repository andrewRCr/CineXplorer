/**
 * Pagination context ID for multi-tab isolation.
 *
 * Generates a unique ID per page load to ensure pagination state
 * is isolated between browser tabs. The backend uses this ID
 * (along with session_id) to track which movies have been returned
 * in each tab's pagination session.
 *
 * The ID is generated once when this module is first imported
 * and remains stable for the lifetime of the page.
 */

// Generate UUID once per page load (module initialization)
const paginationContextId = crypto.randomUUID();

/**
 * Get the pagination context ID for this page load.
 * Returns the same ID for all calls within the same page session.
 */
export function getPaginationContextId(): string {
    return paginationContextId;
}
