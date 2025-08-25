import { Text } from "@chakra-ui/react";
import MovieGrid from "@/components/movie/MovieGrid";
import { COLORS } from "@/constants/theme";
import type { PaginatedMoviesResponse } from "@/services/movieService";

interface MovieGridPageLayoutProps {
	title: string;
	fetcher: (page: number) => {
		request: Promise<{ data: PaginatedMoviesResponse }>;
		cancel: () => void;
	};
	source?: string;
}

const MovieGridPageLayout = ({
	title,
	fetcher,
	source,
}: MovieGridPageLayoutProps) => {
	return (
		<>
			<Text
				fontSize="2xl"
				fontStyle="italic"
				color={COLORS.text.main}
				p={2}
				textAlign="center"
			>
				{title}
			</Text>
			<MovieGrid fetcher={fetcher} source={source} />
		</>
	);
};

export default MovieGridPageLayout;
