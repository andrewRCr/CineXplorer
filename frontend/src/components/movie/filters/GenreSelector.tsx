import { Box, Text, SimpleGrid, Checkbox } from "@chakra-ui/react";
import { COLORS } from "@/constants/theme";
import { genreOptions } from "@/constants/movieFilterOptions";

interface GenreSelectorProps {
	selectedGenres: number[];
	onChange: (genres: number[]) => void;
}

const GenreSelector = ({ selectedGenres, onChange }: GenreSelectorProps) => {
	console.log("GenreSelector re-rendered with selectedGenres:", selectedGenres);
	return (
		<Box>
			<Text fontSize="sm" fontWeight="medium" mb={2} color={COLORS.text.main}>
				Genres
			</Text>
			<SimpleGrid columns={5} gap={2}>
				{genreOptions
					.filter((g) => g.value !== "")
					.map((g) => {
						const id = Number(g.value);
						const checked = selectedGenres.includes(id);
						return (
							<Checkbox.Root
								key={id}
								checked={checked}
								onCheckedChange={(details) => {
									if (details.checked) {
										onChange([...selectedGenres, id]);
									} else {
										onChange(selectedGenres.filter((gid) => gid !== id));
									}
								}}
							>
								<Checkbox.HiddenInput />
								<Checkbox.Control
									borderColor="gray.200"
									borderRadius="4px"
									_hover={{
										backgroundColor: COLORS.background.main,
									}}
								>
									{checked && <Checkbox.Indicator />}
								</Checkbox.Control>
								<Checkbox.Label>
									<Text as="span" fontSize="sm" color={COLORS.text.main}>
										{g.label}
									</Text>
								</Checkbox.Label>
							</Checkbox.Root>
						);
					})}
			</SimpleGrid>
		</Box>
	);
};

export default GenreSelector;
