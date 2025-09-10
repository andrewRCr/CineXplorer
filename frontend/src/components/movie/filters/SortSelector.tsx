import { Box, Text } from "@chakra-ui/react";
import { COLORS } from "@/constants/theme";

export type SortOption =
	| "popularity.desc"
	| "popularity.asc"
	| "vote_average.desc"
	| "vote_average.asc"
	| "release_date.desc"
	| "release_date.asc"
	| "title.asc"
	| "title.desc";

interface SortSelectorProps {
	value: SortOption;
	onChange: (sort: SortOption) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
	{ value: "popularity.desc", label: "Popularity (High to Low)" },
	{ value: "popularity.asc", label: "Popularity (Low to High)" },
	{ value: "vote_average.desc", label: "Rating (High to Low)" },
	{ value: "vote_average.asc", label: "Rating (Low to High)" },
	{ value: "release_date.desc", label: "Release Date (Newest)" },
	{ value: "release_date.asc", label: "Release Date (Oldest)" },
	{ value: "title.asc", label: "Title (A-Z)" },
	{ value: "title.desc", label: "Title (Z-A)" },
];

const SortSelector = ({ value, onChange }: SortSelectorProps) => {
	return (
		<Box>
			<Text fontSize="sm" fontWeight="medium" mb={2} color={COLORS.text.main}>
				Sort By
			</Text>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value as SortOption)}
				style={{
					width: "100%",
					padding: "6px 12px",
					border: `1px solid ${COLORS.border.main}`,
					borderRadius: "4px",
					backgroundColor: COLORS.background.main,
					color: COLORS.text.main,
					fontSize: "14px",
				}}
			>
				{sortOptions.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</Box>
	);
};

export default SortSelector;
