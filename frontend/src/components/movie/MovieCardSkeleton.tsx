import {
	Card,
	Skeleton,
	SkeletonText,
	useBreakpointValue,
	Box,
} from "@chakra-ui/react";

const MovieCardSkeleton = () => {
	const cardWidth = useBreakpointValue({
		base: "100%",
	});

	return (
		<Box
			width={cardWidth}
			p={0.5}
			height="100%"
			position="relative"
			// Add empty hover handlers to ensure perfect structural parity with MovieCard
			onMouseEnter={() => {}}
			onMouseLeave={() => {}}
		>
			<Card.Root
				height="100%"
				display="flex"
				flexDirection="column"
				position="relative"
				overflow="hidden"
			>
				{/* Poster Image Skeleton - matches MovieCard's responsive aspect ratio */}
				{/* Wrap in a non-functional <a> tag to achieve perfect DOM parity with MovieCard */}
				<a style={{ display: "block" }}>
					<Box position="relative" paddingBottom="150%" overflow="hidden">
						<Skeleton
							position="absolute"
							top="0"
							left="0"
							width="100%"
							height="100%"
						/>
					</Box>
				</a>

				{/* Card Body - matches MovieCard structure */}
				<Box flex="1" display="flex" flexDirection="column">
					<Card.Body flex="1" display="flex" flexDirection="column" p={3}>
						{/* Title skeleton */}
						<Box mb={2}>
							<SkeletonText noOfLines={2} gap="4" />
						</Box>

						{/* Date and score skeleton */}
						<Box>
							<Box
								display="flex"
								justifyContent="space-between"
								alignItems="center"
							>
								<Skeleton height="16px" width="80px" />
								<Skeleton height="24px" width="40px" borderRadius="full" />
							</Box>
						</Box>
					</Card.Body>

					{/* Card Footer - matches MovieCard structure */}
					<Card.Footer p={3} pt={0}>
						<Box width="100%" display="flex" justifyContent="center">
							<Box display="flex" gap={1}>
								<Skeleton height="32px" width="32px" borderRadius="md" />
								<Skeleton height="32px" width="32px" borderRadius="md" />
								<Skeleton height="32px" width="32px" borderRadius="md" />
							</Box>
						</Box>
					</Card.Footer>
				</Box>

				{/* Animated Accent Line Skeleton - matches MovieCard structure */}
				<Box
					position="absolute"
					bottom="0"
					left="0"
					width="0%"
					height="3px"
					backgroundColor="transparent"
					transition="none"
					zIndex="1"
				/>
			</Card.Root>
		</Box>
	);
};

export default MovieCardSkeleton;
