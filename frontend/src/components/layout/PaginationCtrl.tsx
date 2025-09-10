import { COLORS } from "@/constants/theme";
import { ButtonGroup, IconButton, Pagination } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

interface iPaginationCtrlProps {
	totalMovieCount: number;
	onGoToPage: (pageNumber: number) => void;
	currentPage: number;
	maxPagesToShow?: number; // Optional: limit number of page buttons
}

export const PaginationCtrl = (props: iPaginationCtrlProps) => {
	const totalPages = Math.ceil(props.totalMovieCount / 20);
	const maxPages = props.maxPagesToShow || totalPages;
	const effectiveTotalPages = Math.min(totalPages, maxPages);
	const effectiveCount = Math.min(
		props.totalMovieCount,
		effectiveTotalPages * 20
	);

	return (
		<Pagination.Root
			count={effectiveCount}
			pageSize={20}
			page={props.currentPage}
			defaultPage={1}
			onPageChange={(page) => props.onGoToPage(page.page)}
		>
			<ButtonGroup variant="ghost" size="sm">
				<Pagination.PrevTrigger asChild>
					<IconButton
						aria-label="Previous page"
						color={COLORS.text.main}
						borderColor={COLORS.border.main}
					>
						<LuChevronLeft />
					</IconButton>
				</Pagination.PrevTrigger>

				<Pagination.Items
					render={(page) => (
						<IconButton
							key={page.value}
							variant={page.value === props.currentPage ? "outline" : "ghost"}
							aria-current={
								page.value === props.currentPage ? "page" : undefined
							}
							color={COLORS.text.main}
							borderColor={COLORS.border.main}
						>
							{page.value}
						</IconButton>
					)}
				/>

				<Pagination.NextTrigger asChild>
					<IconButton
						aria-label="Next page"
						color={COLORS.text.main}
						borderColor={COLORS.border.main}
					>
						<LuChevronRight />
					</IconButton>
				</Pagination.NextTrigger>
			</ButtonGroup>
		</Pagination.Root>
	);
};
