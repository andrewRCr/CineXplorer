// import apiClient from "./apiClient";
import create from "./httpService";

// This interface represents the User object returned by the API.
export interface User {
	id: number;
	username: string;
	email: string;
	first_name: string;
	last_name: string;
}

// This interface is used for creating a new user or updating an existing user.
// It does not include the 'id' field, but does include 'password'.
// TODO: Consider removing this interface if not needed.
export interface ManageUser {
	username: string;
	email: string;
	password: string;
	first_name: string;
	last_name: string;
}

// Create an instance of HttpService for the User endpoint.
// TODO: update backend endpoints to allow create and get/update operations on the same endpoint.
// Currently, the backend only allows GET/PATCH/PUT on /user/me and POST on /user/create.
export default create("/user/me");

// class UserService {
// 	/**
// 	 * Returns an API GET request promise for the currently authenticated User.
// 	 * @returns { request: Promise<AxiosResponse<User, any>>; cancel: () => void; }
// 	 */
// 	getCurrentUser() {
// 		const controller = new AbortController();
// 		const request = apiClient.get<User>("/user/me", {
// 			signal: controller.signal,
// 		});

// 		return { request, cancel: () => controller.abort() };
// 	}

// 	/**
// 	 * Returns an API POST request promise to create a new user.
// 	 * @param newUser - {NewUser}
// 	 * @returns Promise<AxiosResponse<any, any>>
// 	 */
// 	createUser(newUser: ManageUser) {
// 		return apiClient.post("/user/create", newUser);
// 	}

// 	/**
// 	 * Returns an API PATCH request promise to update the current user.
// 	 * @param user - {User}
// 	 * @returns Promise<AxiosResponse<any, any>>
// 	 */
// 	updateCurrentUser(updatedUser: ManageUser) {
// 		return apiClient.patch("/user/me", updatedUser);
// 	}
// }

// export default new UserService();
