/**
 * @file httpService.ts
 * @description This file defines a generic, reusable HTTP service class for interacting with a RESTful API.
 * It uses the configured 'apiClient' (Axios instance) to perform the actual HTTP requests,
 * abstracting away the low-level implementation details. Its purpose is to provide a clean,
 * consistent, and extensible interface for all CRUD and data-fetching operations.
 */

import apiClient from "./apiClient";

/**
 * A generic HTTP service for RESTful API resources.
 * Supports all common CRUD operations and paginated requests.
 * This service is decoupled from the shape of the data (entities) it handles.
 */
class HttpService {
    endpoint: string;

    constructor(endpoint: string) {
        this.endpoint = endpoint;
    }

    /**
     * Fetch a single entity by ID.
     * @param id - The entity's unique identifier.
     */
    get<T>(id: string | number) {
        const controller = new AbortController();
        const request = apiClient
            .get<T>(`${this.endpoint}/${id}`, {
                signal: controller.signal,
            })
            .then((response) => ({ data: response.data }));
        return { request, cancel: () => controller.abort() };
    }

    /**
     * Fetch a paginated resource.
     * @param params - Optional query parameters for pagination, filtering, etc.
     */
    getPaginated<T>(params?: Record<string, unknown> | object) {
        const controller = new AbortController();
        const request = apiClient
            .get<T>(this.endpoint, {
                signal: controller.signal,
                params,
            })
            .then((response) => ({ data: response.data }));
        return { request, cancel: () => controller.abort() };
    }

    /**
     * Create a new entity.
     * @param entity - The data for the new entity.
     */
    create<TRequest, TResponse = unknown>(entity: TRequest) {
        return apiClient.post<TResponse>(this.endpoint, entity);
    }

    /**
     * Update an existing entity.
     * @param id - The unique identifier of the entity to update.
     * @param entity - The updated data for the entity.
     */
    update<TRequest, TResponse = unknown>(
        id: string | number,
        entity: TRequest,
    ) {
        return apiClient.patch<TResponse>(`${this.endpoint}/${id}`, entity);
    }

    /**
     * Remove an entity by its ID.
     * @param id - The unique identifier of the entity to remove.
     */
    remove(id: string | number) {
        return apiClient.delete(`${this.endpoint}/${id}`);
    }
}

const create = (endpoint: string) => new HttpService(endpoint);

export default create;
