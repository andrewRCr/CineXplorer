import { COLORS } from "@/constants/theme";
import { ButtonGroup, IconButton } from "@chakra-ui/react";
import { memo, useMemo, useCallback } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

// Constants for pagination styling
const PAGINATION_CURRENT_PAGE_INDICATOR_WIDTH = "60%";

// Memoized helper functions outside component to prevent recreation
const formatPageNumberCache = new Map<number, string>();
const formatPageNumber = (page: number): string => {
	if (formatPageNumberCache.has(page)) {
		return formatPageNumberCache.get(page)!;
	}
	
	// TMDB API has a 500 page limit, so we'll only handle numbers ≤ 500
	// Simple string conversion is sufficient for our needs
	const result = page.toString();
	
	formatPageNumberCache.set(page, result);
	return result;
};

const paddingCache = new Map<string, string>();
const getDynamicPadding = (formattedText: string): string => {
	if (paddingCache.has(formattedText)) {
		return paddingCache.get(formattedText)!;
	}
	
	const length = formattedText.length;
	let padding: string;
	if (length <= 1) padding = "0.5rem"; // "1" - minimal padding
	else if (length <= 2) padding = "0.65rem"; // "10" - slightly more padding
	else padding = "0.75rem"; // "100", "500" - medium padding
	
	paddingCache.set(formattedText, padding);
	return padding;
};

interface iPaginationCtrlProps {
	totalMovieCount: number;
	onGoToPage: (pageNumber: number) => void;
	currentPage: number;
	totalPages?: number; // Optional: override total pages calculation
}

const PaginationCtrl = (props: iPaginationCtrlProps) => {
	// Destructure props for useCallback dependencies
	const { currentPage, onGoToPage, totalMovieCount, totalPages } = props;
	
	// Memoize complex pagination calculations
	const paginationData = useMemo(() => {
		const totalPagesValue = totalPages || Math.ceil(totalMovieCount / 20);
		const calculatedFromCount = Math.ceil(totalMovieCount / 20);

		// If the API-provided total_pages differs significantly from the calculated value,
		// prefer the calculated value (TMDB API sometimes returns incorrect pagination data with filters)
		const preferredTotalPages =
			Math.abs(totalPagesValue - calculatedFromCount) > 5 &&
			calculatedFromCount > totalPagesValue
				? calculatedFromCount
				: totalPagesValue;

		// TMDB API has a hard limit of 500 pages - cap the UI to match
		const effectiveTotalPages = Math.min(preferredTotalPages, 500);
		
		return {
			totalPages: totalPagesValue,
			calculatedFromCount,
			preferredTotalPages,
			effectiveTotalPages,
		};
	}, [totalMovieCount, totalPages]);
	
	const { effectiveTotalPages } = paginationData;

	// Memoize navigation event handlers
	const handlePrevious = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (currentPage > 1) {
			onGoToPage(currentPage - 1);
		}
	}, [currentPage, onGoToPage]);

	const handleNext = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (currentPage < effectiveTotalPages) {
			onGoToPage(currentPage + 1);
		}
	}, [currentPage, effectiveTotalPages, onGoToPage]);

	// Memoize page click handler factory
	const createPageClickHandler = useCallback((page: number) => {
		return (e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			onGoToPage(page);
		};
	}, [onGoToPage]);

	// MOVE ALL HOOKS TO TOP - Rules of Hooks compliance
	// Memoize simple pagination for few pages
	const simplePagination = useMemo(() => {
		if (effectiveTotalPages > 5) return null;
		
		const pages = Array.from({ length: effectiveTotalPages }, (_, i) => i + 1);
		
		return (
			<ButtonGroup variant="ghost" size="sm">
					<IconButton
						aria-label="Previous page"
						color={COLORS.text.main}
						borderColor={COLORS.border.main}
						disabled={currentPage === 1}
						onClick={handlePrevious}
				>
					<LuChevronLeft />
				</IconButton>

				{/* Generate page buttons for few pages */}
				{pages.map((page) => {
					const formattedPage = formatPageNumber(page);
					const isCurrentPage = page === currentPage;
					
					return (
						<IconButton
							key={page}
							variant={isCurrentPage ? "solid" : "ghost"}
							colorScheme={isCurrentPage ? "blue" : undefined}
							aria-current={isCurrentPage ? "page" : undefined}
							color={isCurrentPage ? undefined : COLORS.text.main}
							borderColor={isCurrentPage ? undefined : COLORS.border.main}
							position="relative"
							px={getDynamicPadding(formattedPage)}
							_after={
								isCurrentPage
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
							onClick={createPageClickHandler(page)}
						>
							{formattedPage}
						</IconButton>
					);
				})}

					<IconButton
						aria-label="Next page"
						color={COLORS.text.main}
						borderColor={COLORS.border.main}
						disabled={currentPage === effectiveTotalPages}
						onClick={handleNext}
				>
					<LuChevronRight />
				</IconButton>
			</ButtonGroup>
		);
	}, [effectiveTotalPages, currentPage, handlePrevious, handleNext, createPageClickHandler]);

	// Memoize complex smart pagination logic (for >5 pages)
	const pagesToShow = useMemo(() => {
		// Only calculate if we need smart pagination
		if (effectiveTotalPages <= 5) return [];
		
		const pages: (number | "ellipsis")[] = [];

		// Smart pagination logic: always show first page, pages around current, and last page
		// Pattern: 1, ... [current-1, current, current+1], ... last

		// Always include first page
		pages.push(1);

		// Calculate the range around current page
		// For page 1, show more pages (2-3) to make it look better with ellipsis
		// For other pages, show 1 page before and after current
		const rangeStart =
			currentPage === 1
				? 2 // Start from page 2 for page 1
				: Math.max(2, currentPage - 1);
		const rangeEnd =
			currentPage === 1
				? 3 // End at page 3 for page 1
				: Math.min(effectiveTotalPages - 1, currentPage + 1);

		// Add ellipsis if there's a gap after first page
		if (rangeStart > 2) {
			pages.push("ellipsis");
		}

		// Add pages in range around current page
		for (let i = rangeStart; i <= rangeEnd; i++) {
			pages.push(i);
		}

		// Add ellipsis if there's a gap before last page
		if (rangeEnd < effectiveTotalPages - 1) {
			pages.push("ellipsis");
		}

		// Always include last page if different from first
		if (effectiveTotalPages > 1) {
			pages.push(effectiveTotalPages);
		}

		// Special case: if current page is very near the beginning and there's no gap between first page and range, don't show ellipsis after first page
		if (currentPage <= 2) {
			// Only remove the ellipsis if it appears immediately after the first page (index 1)
			// AND there's no gap between page 1 and the range (i.e., range starts at page 2)
			if (
				pages.length > 1 &&
				pages[1] === "ellipsis" &&
				rangeStart === 2
			) {
				pages.splice(1, 1); // Remove ellipsis at index 1 (right after page 1)
			}
		}

		// Special case: if current page is near the end, don't show ellipsis before last page
		if (currentPage >= effectiveTotalPages - 2) {
			// Remove the last ellipsis if it exists AND there's no gap between the range and last page
			const lastEllipsisIndex = pages.lastIndexOf("ellipsis");
			if (
				lastEllipsisIndex > 0 &&
				lastEllipsisIndex < pages.length - 1 &&
				rangeEnd === effectiveTotalPages - 1
			) {
				pages.splice(lastEllipsisIndex, 1);
			}
		}

		return pages;
	}, [currentPage, effectiveTotalPages]);

	// Memoize pagination buttons to prevent recreation
	const paginationButtons = useMemo(() => {
		// Only create buttons for smart pagination
		if (effectiveTotalPages <= 5 || pagesToShow.length === 0) return [];
		
		return pagesToShow.map((page, index) => {
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

			const formattedPage = formatPageNumber(page);
			const isCurrentPage = page === currentPage;
			
			return (
				<IconButton
					key={page}
					variant={isCurrentPage ? "solid" : "ghost"}
					colorScheme={isCurrentPage ? "blue" : undefined}
					aria-current={isCurrentPage ? "page" : undefined}
					color={isCurrentPage ? undefined : COLORS.text.main}
					borderColor={isCurrentPage ? undefined : COLORS.border.main}
					position="relative"
					px={getDynamicPadding(formattedPage)}
					disabled={false} // Explicitly set disabled to false
					cursor="pointer" // Explicitly set cursor
					_after={
						isCurrentPage
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
					onClick={createPageClickHandler(page)}
				>
					{formattedPage}
				</IconButton>
			);
		});
	}, [effectiveTotalPages, pagesToShow, currentPage, createPageClickHandler]);

	// Return simple pagination if applicable (NO EARLY RETURN AFTER HOOKS)
	if (simplePagination) {
		return simplePagination;
	}

	return (
		<ButtonGroup variant="ghost" size="sm">
			<IconButton
				aria-label="Previous page"
				color={COLORS.text.main}
				borderColor={COLORS.border.main}
				disabled={currentPage === 1}
				onClick={handlePrevious}
			>
				<LuChevronLeft />
			</IconButton>

			{paginationButtons}

			<IconButton
				aria-label="Next page"
				color={COLORS.text.main}
				borderColor={COLORS.border.main}
				disabled={currentPage === effectiveTotalPages}
				onClick={handleNext}
			>
				<LuChevronRight />
			</IconButton>
		</ButtonGroup>
	);
};

// Memoize the component to prevent unnecessary re-renders
const MemoizedPaginationCtrl = memo(PaginationCtrl, (prevProps, nextProps) => {
	// Custom comparison function for optimal performance
	return (
		prevProps.currentPage === nextProps.currentPage &&
		prevProps.totalMovieCount === nextProps.totalMovieCount &&
		prevProps.totalPages === nextProps.totalPages &&
		prevProps.onGoToPage === nextProps.onGoToPage
	);
});

MemoizedPaginationCtrl.displayName = "PaginationCtrl";

export default MemoizedPaginationCtrl;
export { MemoizedPaginationCtrl as PaginationCtrl };
