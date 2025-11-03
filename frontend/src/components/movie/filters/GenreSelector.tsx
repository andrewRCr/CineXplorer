import { Box, Text, SimpleGrid, Checkbox } from "@chakra-ui/react";
import { genreOptions } from "@/constants/movieFilterOptions";

interface GenreSelectorProps {
	selectedGenres: number[];
	onChange: (genres: number[]) => void;
}

const GenreSelector = ({ selectedGenres, onChange }: GenreSelectorProps) => {
	console.log("GenreSelector re-rendered with selectedGenres:", selectedGenres);
	return (
		<Box>
			<Text fontSize="sm" fontWeight="medium" mb={2} color="foreground">
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
								borderColor="border"
								borderRadius="4px"
								_hover={{
									backgroundColor: "background",
								}}
								>
									{checked && <Checkbox.Indicator />}
								</Checkbox.Control>
								<Checkbox.Label>
									<Text as="span" fontSize="sm" color="foreground">
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
