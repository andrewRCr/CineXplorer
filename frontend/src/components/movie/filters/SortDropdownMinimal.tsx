import { Box, Text, Select, createListCollection } from "@chakra-ui/react";
import { COLORS } from "@/constants/theme";
import { minimalSortOptions } from "@/constants/movieFilterOptions";
import type { MovieFilters as UnifiedMovieFilters } from "./AdvancedMovieFilters";

const SORT_WIDTH = "170px";

interface SortDropdownMinimalProps {
	filters: UnifiedMovieFilters;
	onSortChange: (sortBy: string) => void;
	pageSource?: string;
}

const SortDropdownMinimal = ({
	filters,
	onSortChange,
	pageSource,
}: SortDropdownMinimalProps) => {
	const getCurrentSortValue = () => {
		// This function maps the API sort value (from filters.sortBy)
		// back to the value used by the minimal dropdown's sortOptions.
		const apiValue = filters.sortBy;
		switch (apiValue) {
			case "vote_average.desc":
				return "vote_average.desc";
			case "vote_average.asc":
				return "vote_average.asc";
			case "popularity.desc":
				return "popularity.desc";
			case "original_title.asc":
				return "original_title.asc";
			case "original_title.desc":
				return "original_title.desc";
			default:
				return apiValue;
		}
	};

	const currentSortValue = getCurrentSortValue();
	const isSortCustom = !minimalSortOptions.some(
		(opt) => opt.value === currentSortValue
	);

	const sortDisplayValue = () => {
		if (isSortCustom) return "custom";
		return currentSortValue;
	};

	const sortCollection = createListCollection({
		items: [
			...(isSortCustom ? [{ label: "Custom", value: "custom" }] : []),
			...minimalSortOptions.map((option) => {
				const isDisabled =
					(pageSource === "popular" && option.value === "popularity.desc") ||
					(pageSource === "top-rated" && option.value === "vote_average.desc");
				return {
					label: option.label + (isDisabled ? " (current)" : ""),
					value: option.value,
					disabled: isDisabled,
				};
			}),
		],
	});

	return (
		<>
			{/* Spacer to separate filters from sort */}
			<Box width="20px" flexShrink={0} />

			{/* Sort by label */}
			<Text
				fontSize="sm"
				fontWeight="medium"
				color={COLORS.text.secondary}
				alignSelf="center"
				flexShrink={0}
				mr={2}
			>
				Sort by
			</Text>

			{/* Sort dropdown */}
			<Box position="relative">
				<Select.Root
					collection={sortCollection}
					value={[sortDisplayValue()]}
					onValueChange={(details) => {
						const selectedItem = sortCollection.items.find(
							(item) => item.value === details.value[0]
						);
						if (
							selectedItem &&
							"disabled" in selectedItem &&
							!selectedItem.disabled
						) {
							onSortChange(details.value[0]);
						}
					}}
					disabled={isSortCustom}
					positioning={{ placement: "bottom-start", gutter: 2 }}
				>
					<Select.Trigger
						w={SORT_WIDTH}
						minH="32px"
						h="32px"
						fontSize="14px"
						lineHeight="1.2"
						borderRadius="4px"
						border="1px solid"
						borderColor="gray.200"
						backgroundColor="transparent"
						_hover={{
							backgroundColor: COLORS.background.subItem,
						}}
						_disabled={{
							opacity: 1,
							cursor: "not-allowed",
						}}
						css={{
							padding: "6px 12px",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							"& > span": {
								fontStyle: isSortCustom ? "italic" : "normal",
								color: isSortCustom
									? COLORS.text.secondary
									: COLORS.text.main,
							},
							"& [data-part='indicator']": {
								width: "16px",
								height: "16px",
							},
						}}
					>
						<Select.ValueText placeholder="Sort by" />
						<Select.Indicator />
					</Select.Trigger>
					<Select.Positioner>
						<Select.Content
							w={SORT_WIDTH}
							bg={COLORS.background.subItem}
							borderColor={COLORS.border.main}
						>
							{sortCollection.items.map((item) => (
								<Select.Item
									key={item.value}
									item={item}
									style={{
										color:
											"disabled" in item && item.disabled
												? COLORS.text.secondary
												: COLORS.text.main,
										fontStyle:
											"disabled" in item && item.disabled
												? "italic"
												: "normal",
									}}
									_hover={
										"disabled" in item && item.disabled
											? {}
											: { bg: COLORS.accent.primary }
									}
								>
									{item.label}
								</Select.Item>
							))}
						</Select.Content>
					</Select.Positioner>
				</Select.Root>
			</Box>
		</>
	);
};

export default SortDropdownMinimal;
