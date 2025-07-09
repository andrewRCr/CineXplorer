import apiClient from "./apiClient";

// This interface represents a generic entity with an 'id' field.
interface Entity {
	id: number;
}

// This class provides a generic HTTP service for CRUD operations on entities.
// It can be used for any entity type that extends the Entity interface.
class HttpService {
	endpoint: string;

	constructor(endpoint: string) {
		this.endpoint = endpoint;
	}

	/**
	 * Returns an apiClient GET request promise for a generic entity.
	 * @returns { request: Promise<AxiosResponse<any, any>>; cancel: () => void; }
	 */
	get<T extends Entity>() {
		const controller = new AbortController();
		const request = apiClient.get<T>(this.endpoint, {
			signal: controller.signal,
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
 * Factory function to create an instance of HttpService with a specific endpoint.
 * @param endpoint - The API endpoint for the service.
 * @returns An instance of HttpService.
 */
const create = (endpoint: string) => new HttpService(endpoint);

export default create;
