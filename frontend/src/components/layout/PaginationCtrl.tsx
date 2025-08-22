import { ButtonGroup, IconButton, Pagination } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

interface iPaginationCtrlProps {
	totalMovieCount: number;
	maxPage: number;
	onGoToPage: (pageNumber: number) => void;
	currentPage: number;
}

export const PaginationCtrl = (props: iPaginationCtrlProps) => {
	return (
		<Pagination.Root
			count={props.maxPage}
			page={props.currentPage}
			defaultPage={1}
		>
			<ButtonGroup variant="ghost" size="sm">
				<Pagination.PrevTrigger asChild>
					<IconButton
						onClick={() =>
							props.currentPage > 1 && props.onGoToPage(props.currentPage - 1)
						}
						disabled={props.currentPage === 1}
						aria-label="Previous page"
					>
						<LuChevronLeft />
					</IconButton>
				</Pagination.PrevTrigger>

				<Pagination.Items
					render={(page) => (
						<IconButton
							key={page.value}
							onClick={() => props.onGoToPage(page.value)}
							variant={page.value === props.currentPage ? "outline" : "ghost"}
							aria-current={
								page.value === props.currentPage ? "page" : undefined
							}
						>
							{page.value}
						</IconButton>
					)}
				/>

				<Pagination.NextTrigger asChild>
					<IconButton
						onClick={() =>
							props.currentPage < props.maxPage &&
							props.onGoToPage(props.currentPage + 1)
						}
						disabled={props.currentPage === props.maxPage}
						aria-label="Next page"
					>
						<LuChevronRight />
					</IconButton>
				</Pagination.NextTrigger>
			</ButtonGroup>
		</Pagination.Root>
	);
};
