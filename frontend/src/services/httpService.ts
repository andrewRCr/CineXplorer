import apiClient from "./apiClient";

// This interface represents a generic entity with an 'id' field.
interface Entity {
	id: number;
}

/**
 * Generic HTTP service for RESTful API resources.
 * Supports CRUD operations for single entities (by ID) and paginated resource requests.
 * Use get() for single-entity fetches, and getPaginated() for paginated endpoints returning metadata and arrays.
 */
class HttpService {
	endpoint: string;

	constructor(endpoint: string) {
		this.endpoint = endpoint;
	}

	/**
	 * Fetch a single entity by ID from the API endpoint.
	 * @param id - The entity's unique identifier.
	 * @returns { request: Promise<AxiosResponse<T>>; cancel: () => void; }
	 */
	get<T extends Entity>(id: string) {
		const controller = new AbortController();
		const request = apiClient.get<T>(`${this.endpoint}/${id}`, {
			signal: controller.signal,
		});

		return { request, cancel: () => controller.abort() };
	}

	/**
	 * Fetch a paginated resource from the API endpoint.
	 * Returns the full paginated response object, including metadata (e.g., page, total_pages, results).
	 * @param params - Query parameters for pagination, filtering, etc.
	 * @returns { request: Promise<AxiosResponse<T>>; cancel: () => void; }
	 */
	getPaginated<T>(params?: Record<string, unknown>) {
		const controller = new AbortController();
		const request = apiClient.get<T>(this.endpoint, {
			signal: controller.signal,
			params,
		});

		return { request, cancel: () => controller.abort() };
	}

	/**
	 * Returns an apiClient POST request promise to create a new generic entity.
	 * @param newEntity - {T}
	 * @returns Promise<AxiosResponse<any, any>>
	 */
	create<T extends Entity>(newEntity: T) {
		return apiClient.post(this.endpoint, newEntity);
	}

	/**
	 * Returns an apiClient PATCH request promise to update a generic entity.
	 * @param user - {T}
	 * @returns Promise<AxiosResponse<any, any>>
	 */
	update<T extends Entity>(entity: T) {
		return apiClient.patch(this.endpoint + "/" + entity.id, entity);
	}
}

/**
 * Factory function to create an instance of HttpService for a given API endpoint.
 * @param endpoint - The API endpoint for the resource.
 * @returns An instance of HttpService.
 */
const create = (endpoint: string) => new HttpService(endpoint);

export default create;
