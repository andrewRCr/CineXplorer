import { COLORS } from "@/constants/theme";
import { ButtonGroup, IconButton } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

// Constants for pagination styling
const PAGINATION_CURRENT_PAGE_INDICATOR_WIDTH = "60%";

// Helper function to format large page numbers
const formatPageNumber = (page: number): string => {
	if (page >= 1000000) {
		return `${(page / 1000000).toFixed(1)}M`;
	} else if (page >= 1000) {
		return `${(page / 1000).toFixed(1)}K`;
	} else {
		return page.toLocaleString(); // Adds commas for numbers >= 1000
	}
};

// Helper function to calculate dynamic padding based on text length
const getDynamicPadding = (formattedText: string): string => {
	const length = formattedText.length;
	if (length <= 1) return "0.5rem"; // "1" - minimal padding
	if (length <= 3) return "0.75rem"; // "999" - medium padding
	if (length <= 4) return "1rem"; // "1.2K" - more padding
	return "1.25rem"; // "52.4K", "1.2M" - maximum padding
};

interface iPaginationCtrlProps {
	totalMovieCount: number;
	onGoToPage: (pageNumber: number) => void;
	currentPage: number;
	totalPages?: number; // Optional: override total pages calculation
}

export const PaginationCtrl = (props: iPaginationCtrlProps) => {
	const totalPages = props.totalPages || Math.ceil(props.totalMovieCount / 20);

	// TMDB API has a hard limit of 500 pages - cap the UI to match
	const effectiveTotalPages = Math.min(totalPages, 500);

	console.log("PaginationCtrl: Props received", {
		totalMovieCount: props.totalMovieCount,
		currentPage: props.currentPage,
		totalPages: props.totalPages,
		calculatedTotalPages: totalPages,
		effectiveTotalPages, // This is what we'll use for UI
	});

	// If we have very few pages, show them all
	if (effectiveTotalPages <= 7) {
		console.log("PaginationCtrl: Using few pages layout");
		return (
			<ButtonGroup variant="ghost" size="sm">
				<IconButton
					aria-label="Previous page"
					color={COLORS.text.main}
					borderColor={COLORS.border.main}
					disabled={props.currentPage === 1}
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						console.log("PaginationCtrl: Previous button clicked");
						console.log("PaginationCtrl: Event target:", e.target);
						console.log(
							"PaginationCtrl: Event currentTarget:",
							e.currentTarget
						);
						if (props.currentPage > 1) {
							props.onGoToPage(props.currentPage - 1);
						}
					}}
					onMouseDown={() => {
						console.log("PaginationCtrl: Mouse down on previous button");
					}}
				>
					<LuChevronLeft />
				</IconButton>

				{/* Generate page buttons for few pages */}
				{Array.from({ length: effectiveTotalPages }, (_, i) => i + 1).map(
					(page) => {
						const formattedPage = formatPageNumber(page);
						console.log(
							`PaginationCtrl: Rendering page button ${page}, currentPage: ${props.currentPage}`
						);
						return (
							<IconButton
								key={page}
								variant={page === props.currentPage ? "solid" : "ghost"}
								colorScheme={page === props.currentPage ? "blue" : undefined}
								aria-current={page === props.currentPage ? "page" : undefined}
								color={
									page === props.currentPage ? undefined : COLORS.text.main
								}
								borderColor={
									page === props.currentPage ? undefined : COLORS.border.main
								}
								position="relative"
								px={getDynamicPadding(formattedPage)}
								_after={
									page === props.currentPage
										? {
												content: '""',
												position: "absolute",
												bottom: "-2px",
												left: "50%",
												transform: "translateX(-50%)",
												width: PAGINATION_CURRENT_PAGE_INDICATOR_WIDTH,
												height: "2px",
												backgroundColor: COLORS.accent.primary,
												borderRadius: "1px",
										  }
										: undefined
								}
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									console.log(
										"PaginationCtrl: Page button clicked with page",
										page
									);
									console.log("PaginationCtrl: Event target:", e.target);
									console.log(
										"PaginationCtrl: Event currentTarget:",
										e.currentTarget
									);
									props.onGoToPage(page);
								}}
								onMouseDown={() => {
									console.log("PaginationCtrl: Mouse down on page", page);
								}}
							>
								{formattedPage}
							</IconButton>
						);
					}
				)}

				<IconButton
					aria-label="Next page"
					color={COLORS.text.main}
					borderColor={COLORS.border.main}
					disabled={props.currentPage === effectiveTotalPages}
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						console.log("PaginationCtrl: Next button clicked");
						console.log("PaginationCtrl: Event target:", e.target);
						console.log(
							"PaginationCtrl: Event currentTarget:",
							e.currentTarget
						);
						if (props.currentPage < effectiveTotalPages) {
							props.onGoToPage(props.currentPage + 1);
						}
					}}
					onMouseDown={() => {
						console.log("PaginationCtrl: Mouse down on next button");
					}}
				>
					<LuChevronRight />
				</IconButton>
			</ButtonGroup>
		);
	}

	// For many pages, show a smart selection with ellipses
	console.log("PaginationCtrl: Using many pages layout");
	const pagesToShow: (number | "ellipsis")[] = [];

	// Smart pagination logic: always show first page, pages around current, and last page
	// Pattern: 1, ... [current-1, current, current+1], ... last

	// Always include first page
	pagesToShow.push(1);

	// Calculate the range around current page
	// For page 1, show more pages (2-3) to make it look better with ellipsis
	// For other pages, show 1 page before and after current
	const rangeStart =
		props.currentPage === 1
			? 2 // Start from page 2 for page 1
			: Math.max(2, props.currentPage - 1);
	const rangeEnd =
		props.currentPage === 1
			? 3 // End at page 3 for page 1
			: Math.min(effectiveTotalPages - 1, props.currentPage + 1);

	// Add ellipsis if there's a gap after first page
	if (rangeStart > 2) {
		pagesToShow.push("ellipsis");
	}

	// Add pages in range around current page
	for (let i = rangeStart; i <= rangeEnd; i++) {
		pagesToShow.push(i);
	}

	// Add ellipsis if there's a gap before last page
	if (rangeEnd < effectiveTotalPages - 1) {
		pagesToShow.push("ellipsis");
	}

	// Always include last page if different from first
	if (effectiveTotalPages > 1) {
		pagesToShow.push(effectiveTotalPages);
	}

	// Special case: if current page is very near the beginning and there's no gap between first page and range, don't show ellipsis after first page
	if (props.currentPage <= 2) {
		// Only remove the ellipsis if it appears immediately after the first page (index 1)
		// This handles cases where range starts immediately after page 1
		if (pagesToShow.length > 1 && pagesToShow[1] === "ellipsis") {
			pagesToShow.splice(1, 1); // Remove ellipsis at index 1 (right after page 1)
		}
	}

	// Special case: if current page is near the end, don't show ellipsis before last page
	if (props.currentPage >= effectiveTotalPages - 2) {
		// Remove the last ellipsis if it exists
		const lastEllipsisIndex = pagesToShow.lastIndexOf("ellipsis");
		if (lastEllipsisIndex > 0 && lastEllipsisIndex < pagesToShow.length - 1) {
			pagesToShow.splice(lastEllipsisIndex, 1);
		}
	}

	console.log("PaginationCtrl: Component rendering with props:", {
		currentPage: props.currentPage,
		totalPages: props.totalPages,
		effectiveTotalPages,
		totalMovieCount: props.totalMovieCount,
	});

	return (
		<ButtonGroup variant="ghost" size="sm">
			<IconButton
				aria-label="Previous page"
				color={COLORS.text.main}
				borderColor={COLORS.border.main}
				disabled={props.currentPage === 1}
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					console.log("PaginationCtrl: Previous button clicked");
					console.log("PaginationCtrl: Event target:", e.target);
					console.log("PaginationCtrl: Event currentTarget:", e.currentTarget);
					if (props.currentPage > 1) {
						props.onGoToPage(props.currentPage - 1);
					}
				}}
				onMouseDown={() => {
					console.log("PaginationCtrl: Mouse down on previous button");
				}}
			>
				<LuChevronLeft />
			</IconButton>

			{pagesToShow.map((page, index) => {
				if (page === "ellipsis") {
					return (
						<IconButton
							key={`ellipsis-${index}`}
							disabled
							color={COLORS.text.secondary}
							borderColor={COLORS.border.main}
							_hover={{ bg: "transparent" }}
							cursor="default"
							px="0.75rem"
						>
							…
						</IconButton>
					);
				}

				console.log(
					`PaginationCtrl: Rendering page button ${page}, currentPage: ${props.currentPage}`
				);
				return (
					<IconButton
						key={page}
						variant={page === props.currentPage ? "solid" : "ghost"}
						colorScheme={page === props.currentPage ? "blue" : undefined}
						aria-current={page === props.currentPage ? "page" : undefined}
						color={page === props.currentPage ? undefined : COLORS.text.main}
						borderColor={
							page === props.currentPage ? undefined : COLORS.border.main
						}
						position="relative"
						px={getDynamicPadding(formatPageNumber(page))}
						disabled={false} // Explicitly set disabled to false
						cursor="pointer" // Explicitly set cursor
						_after={
							page === props.currentPage
								? {
										content: '""',
										position: "absolute",
										bottom: "-2px",
										left: "50%",
										transform: "translateX(-50%)",
										width: PAGINATION_CURRENT_PAGE_INDICATOR_WIDTH,
										height: "2px",
										backgroundColor: COLORS.accent.primary,
										borderRadius: "1px",
								  }
								: undefined
						}
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							console.log(
								"PaginationCtrl: Manual button clicked with page",
								page
							);
							console.log("PaginationCtrl: Event target:", e.target);
							console.log(
								"PaginationCtrl: Event currentTarget:",
								e.currentTarget
							);
							props.onGoToPage(page);
						}}
						onMouseDown={() => {
							console.log("PaginationCtrl: Mouse down on page", page);
						}}
					>
						{formatPageNumber(page)}
					</IconButton>
				);
			})}

			<IconButton
				aria-label="Next page"
				color={COLORS.text.main}
				borderColor={COLORS.border.main}
				disabled={
					props.currentPage === effectiveTotalPages &&
					effectiveTotalPages >= 500
				} // Only disable next button if we're at TMDB's documented limit
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					console.log("PaginationCtrl: Next button clicked");
					console.log("PaginationCtrl: Event target:", e.target);
					console.log("PaginationCtrl: Event currentTarget:", e.currentTarget);
					if (
						props.currentPage < effectiveTotalPages ||
						effectiveTotalPages < 500
					) {
						// Allow navigation beyond reported total_pages if under TMDB limit
						props.onGoToPage(props.currentPage + 1);
					}
				}}
				onMouseDown={() => {
					console.log("PaginationCtrl: Mouse down on next button");
				}}
			>
				<LuChevronRight />
			</IconButton>
		</ButtonGroup>
	);
};
