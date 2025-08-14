import { useState } from "react";
import { AxiosError } from "axios";
import useAxiosWithInterceptor from "@/utilities/jwt-interceptor";

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

interface IuseCRUD<T> {
	dataCRUD: T[];
	fetchData: () => Promise<void>;
	error: Error | null;
	isLoading: boolean;
}

const useCRUD = <T>(initialData: T[], endpointURL: string): IuseCRUD<T> => {
	const jwtAxiosInstance = useAxiosWithInterceptor();
	const [dataCRUD, setDataCRUD] = useState<T[]>(initialData);
	const [error, setError] = useState<Error | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const fetchData = async () => {
		setIsLoading(true);
		try {
			const response = await jwtAxiosInstance.get(
				`${BASE_URL}${endpointURL}`,
				{}
			);
			setDataCRUD(response.data);
			setError(null); // reset error state on successful fetch
			setIsLoading(false);
		} catch (error: unknown) {
			if (error instanceof AxiosError) {
				if (error.response && error.response.status === 400) {
					setError(new Error("400"));
				} else {
					setError(error);
				}
			}
			setIsLoading(false);
			throw error;
		}
	};

	return { fetchData, dataCRUD, error, isLoading };
};

export default useCRUD;
