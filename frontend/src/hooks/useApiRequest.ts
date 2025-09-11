import { useEffect, useState, type SetStateAction } from "react";
import { CanceledError } from "../services/apiClient";

interface ApiRequestResult<T> {
	data: T | undefined;
	error: string;
	setData: React.Dispatch<React.SetStateAction<T | undefined>>;
	setError: React.Dispatch<React.SetStateAction<string>>;
	isLoading: boolean;
}

interface FetcherResult<T> {
	request: Promise<{ data: T }>;
	cancel: () => void;
}

/**
 * Generic data fetching hook for handling API requests w/ loading and error state management.
 * @param fetcher - {() => { request: Promise<{ data: T }>; cancel: () => void; }}
 * @returns { data, error, setData, setError, isLoading }
 */
export function useApiRequest<T>(
	fetcher: () => FetcherResult<T>
): ApiRequestResult<T> {
	const [data, setData] = useState<T | undefined>();
	const [error, setError] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);

	useEffect(() => {
		console.log("useApiRequest: fetcher changed, making new request");
		const result = fetcher();
		if (
			!result ||
			typeof result.request !== "object" ||
			typeof result.cancel !== "function"
		) {
			console.warn(
				"useApiRequest: fetcher did not return valid request/cancel object"
			);
			return;
		}
		const { request, cancel } = result;
		setIsLoading(true);
		// Clear previous data when starting a new request to prevent stale data issues
		setData(undefined);
		setError("");
		console.log("useApiRequest: Starting request");
		request
			.then((res) => {
				console.log("useApiRequest: Request successful", res.data);
				setData(res.data);
				setIsLoading(false);
			})
			.catch((err: { message: SetStateAction<string> }) => {
				if (err instanceof CanceledError) return;
				console.log("useApiRequest: Request failed", err.message);
				setError(err.message);
				setIsLoading(false);
			});

		return () => {
			console.log("useApiRequest: Cleaning up previous request");
			cancel();
		};
	}, [fetcher]);

	return { data, error, setData, setError, isLoading };
}
