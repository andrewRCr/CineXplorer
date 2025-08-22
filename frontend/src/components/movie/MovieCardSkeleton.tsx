import {
	Card,
	Skeleton,
	SkeletonText,
	Text,
	useBreakpointValue,
} from "@chakra-ui/react";

const MovieCardSkeleton = () => {
	const cardWidth = useBreakpointValue({
		base: "100%",
	});
	const cardHeight = useBreakpointValue({
		base: "325px",
	});

	return (
		<Card.Root>
			<Skeleton width={cardWidth} height={cardHeight} />
			<Card.Body>
				<SkeletonText />
			</Card.Body>
		</Card.Root>
	);
};

export default MovieCardSkeleton;
