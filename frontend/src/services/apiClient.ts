import axios, { CanceledError } from "axios";

const BASE_URL = import.meta.env.VITE_BASE_API_URL;
// const devTestToken = import.meta.env.VITE_DEV_TEST_TOKEN;

export default axios.create({
	baseURL: BASE_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

// // define common API methods
// const _get = (url: string, config = {}) => {
// 	return apiClient.get(url, config);
// };

// const _delete = (url: string, config = {}) => {
// 	return apiClient.delete(url, config);
// };

// const _put = (url: string, data = {}, config = {}) => {
// 	return apiClient.put(url, data, config);
// };

// const _post = (url: string, data = {}, config = {}) => {
// 	return apiClient.post(url, data, config);
// };

// // export API methods
// export { _get, _delete, _put, _post };

export { CanceledError };
