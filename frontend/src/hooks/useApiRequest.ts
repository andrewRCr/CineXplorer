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
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		setIsLoading(true);
		setError("");

		const { request, cancel } = fetcher();

		request
			.then((res) => {
				// Atomic update of data and loading state
				setData(res.data);
				setIsLoading(false);
			})
			.catch((err: { message: SetStateAction<string> }) => {
				if (err instanceof CanceledError) return;
				setError(err.message);
				setIsLoading(false); // Also set loading to false on error
			});

		return () => {
			cancel();
		};
	}, [fetcher]);

	return { data, error, setData, setError, isLoading };
}
