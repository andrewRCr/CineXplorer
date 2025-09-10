import { useState, useEffect } from "react";
import { Box, Text, Flex, Spinner } from "@chakra-ui/react";
import { COLORS } from "@/constants/theme";
import { fetchMovieGenresService } from "@/services/movieService";

interface Genre {
	id: number;
	name: string;
}

interface GenreSelectorProps {
	selectedGenres: number[];
	onChange: (genres: number[]) => void;
}

const GenreSelector = ({ selectedGenres, onChange }: GenreSelectorProps) => {
	const [genres, setGenres] = useState<Genre[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchGenres = async () => {
			try {
				const { request } = fetchMovieGenresService.getPaginated();
				const response = await request;
				setGenres(response.data as Genre[]);
			} catch (err) {
				// Fallback to mock data if API fails
				const mockGenres: Genre[] = [
					{ id: 28, name: "Action" },
					{ id: 12, name: "Adventure" },
					{ id: 16, name: "Animation" },
					{ id: 35, name: "Comedy" },
					{ id: 80, name: "Crime" },
					{ id: 99, name: "Documentary" },
					{ id: 18, name: "Drama" },
					{ id: 10751, name: "Family" },
					{ id: 14, name: "Fantasy" },
					{ id: 36, name: "History" },
					{ id: 27, name: "Horror" },
					{ id: 10402, name: "Music" },
					{ id: 9648, name: "Mystery" },
					{ id: 10749, name: "Romance" },
					{ id: 878, name: "Science Fiction" },
					{ id: 10770, name: "TV Movie" },
					{ id: 53, name: "Thriller" },
					{ id: 10752, name: "War" },
					{ id: 37, name: "Western" },
				];
				setGenres(mockGenres);
			} finally {
				setLoading(false);
			}
		};

		fetchGenres();
	}, []);

	const handleGenreChange = (genreId: number, checked: boolean) => {
		if (checked) {
			onChange([...selectedGenres, genreId]);
		} else {
			onChange(selectedGenres.filter((id) => id !== genreId));
		}
	};

	if (loading) {
		return (
			<Box textAlign="center" py={4}>
				<Spinner size="sm" color={COLORS.accent.primary} />
				<Text ml={2} color={COLORS.text.secondary}>
					Loading genres...
				</Text>
			</Box>
		);
	}

	return (
		<Box>
			<Text fontSize="sm" fontWeight="medium" mb={2} color={COLORS.text.main}>
				Genres
			</Text>
			<Flex wrap="wrap" gap={2}>
				{genres.map((genre) => (
					<Box key={genre.id}>
						<label
							style={{
								display: "flex",
								alignItems: "center",
								cursor: "pointer",
							}}
						>
							<input
								type="checkbox"
								checked={selectedGenres.includes(genre.id)}
								onChange={(e) => handleGenreChange(genre.id, e.target.checked)}
								style={{ marginRight: "6px" }}
							/>
							<Text fontSize="sm" color={COLORS.text.main}>
								{genre.name}
							</Text>
						</label>
					</Box>
				))}
			</Flex>
		</Box>
	);
};

export default GenreSelector;
