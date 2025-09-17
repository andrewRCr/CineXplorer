import { useState, useRef, useEffect } from "react";
import { HStack, Button, Input } from "@chakra-ui/react";
import { FiSearch, FiX } from "react-icons/fi";
import { COLORS } from "@/constants/theme";

interface CollapsibleSearchBoxProps {
	query: string;
	onQueryChange: (query: string) => void;
	pageSource?: string;
}

const CollapsibleSearchBox = ({
	query,
	onQueryChange,
	pageSource,
}: CollapsibleSearchBoxProps) => {
	const [localQuery, setLocalQuery] = useState(query);
	const [isSearchExpanded, setIsSearchExpanded] = useState(false);
	const searchInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setLocalQuery(query);
	}, [query]);

	// Close search bar when page source changes (e.g., via sidebar navigation)
	useEffect(() => {
		setIsSearchExpanded(false);
	}, [pageSource]);

	const handleSearchSubmit = () => {
		onQueryChange(localQuery);
		// Don't close the search bar after submitting - let user close manually
	};

	const toggleSearch = () => {
		setIsSearchExpanded(!isSearchExpanded);
		// Focus the input when expanding
		if (!isSearchExpanded) {
			setTimeout(() => {
				searchInputRef.current?.focus();
			}, 100);
		}
	};

	const closeSearch = () => {
		setIsSearchExpanded(false);
		// Don't clear the query on close, only when parent calls onQueryChange
	};

	const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			handleSearchSubmit();
		} else if (e.key === "Escape") {
			setIsSearchExpanded(false);
		}
	};

	return (
		<HStack
			alignSelf="center"
			gap={0}
			align="stretch"
			border="1px solid"
			borderColor="gray.200"
			borderRadius="4px"
			width={isSearchExpanded ? "260px" : "32px"}
			height="32px"
			transition="width 0.3s ease-in-out"
			overflow="hidden" // Prevents content from spilling during animation
		>
			<Input
				ref={searchInputRef}
				placeholder="Search results..."
				value={localQuery}
				onChange={(e) => setLocalQuery(e.target.value)}
				onKeyDown={handleSearchKeyDown}
				size="sm"
				border="none"
				borderRadius="0"
				backgroundColor={COLORS.background.main}
				color={COLORS.text.main}
				_focus={{ boxShadow: "none" }}
				fontSize="14px"
				height="30px"
				flex="1"
				p={isSearchExpanded ? 2 : 0} // No padding when collapsed
				minW="0" // Allows input to shrink to 0
				opacity={isSearchExpanded ? 1 : 0}
				visibility={isSearchExpanded ? "visible" : "hidden"}
				transition="opacity 0.2s 0.1s, visibility 0.2s 0.1s, padding 0.3s"
				disabled={!isSearchExpanded}
			/>
			<Button
				aria-label={isSearchExpanded ? "Submit search" : "Open search"}
				onClick={isSearchExpanded ? handleSearchSubmit : toggleSearch}
				size="sm"
				variant="ghost"
				borderRadius={0}
				backgroundColor={COLORS.background.main}
				color={COLORS.text.main}
				_hover={{
					backgroundColor: COLORS.background.subItem,
				}}
				height="30px"
				minW="30px"
				p={0}
				flexShrink={0}
			>
				<FiSearch size={14} />
			</Button>
			{isSearchExpanded && (
				<Button
					aria-label="Close search"
					onClick={closeSearch}
					size="sm"
					variant="ghost"
					borderRadius="0 4px 4px 0"
					backgroundColor="transparent"
					color={COLORS.text.secondary}
					_hover={{
						backgroundColor: COLORS.background.subItem,
						color: COLORS.text.main,
					}}
					height="30px"
					minW="30px"
					p={0}
					flexShrink={0}
					opacity={isSearchExpanded ? 1 : 0}
					transition="opacity 0.2s ease-in-out 0.1s"
				>
					<FiX size={16} />
				</Button>
			)}
		</HStack>
	);
};

export default CollapsibleSearchBox;