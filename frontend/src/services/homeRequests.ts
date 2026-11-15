import type { ReadOptions } from "./httpService";
import { getHomePaginationContextId } from "./paginationContext";

export const homeReadOptions: ReadOptions = {
    shouldReportServerError: () => false,
};
export const homeSectionOptions: ReadOptions = {
    ...homeReadOptions,
    headers: { "X-Pagination-Context": getHomePaginationContextId() },
};
