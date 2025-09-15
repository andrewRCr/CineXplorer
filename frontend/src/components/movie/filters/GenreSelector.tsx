import { Box, Text, Flex, Checkbox } from "@chakra-ui/react";
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
			<Flex wrap="wrap" gap={2}>
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
								<Checkbox.Control borderColor={COLORS.border.main}>
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
			</Flex>
		</Box>
	);
};

export default GenreSelector;
