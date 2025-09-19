import {
	forwardRef,
	type ReactNode,
	type ElementType,
	useState,
	useEffect,
} from "react";
import { flushSync } from "react-dom";
import { Box, type BoxProps } from "@chakra-ui/react";
import { COLORS } from "@/constants/theme";

type PageHeaderOwnProps<T extends ElementType = ElementType> = {
	as?: T;
	title: string | { main: string; secondary?: string };
	showAccent?: boolean;
	size?: "sm" | "md" | "lg" | "xl";
	children?: ReactNode;
};

type PageHeaderProps<T extends ElementType> = PageHeaderOwnProps<T> &
	Omit<BoxProps, keyof PageHeaderOwnProps>;

const sizeStyles = {
	sm: { fontSize: "xl", minHeight: "40px" },
	md: { fontSize: "2xl", minHeight: "50px" },
	lg: { fontSize: "3xl", minHeight: "60px" },
	xl: { fontSize: "4xl", minHeight: "70px" },
};

const PageHeader = forwardRef(
	<T extends ElementType = "div">(
		{
			as,
			title,
			showAccent = true,
			size = "lg",
			children,
			...props
		}: PageHeaderProps<T>,
		ref: React.Ref<HTMLElement>
	) => {
		const Component = as || "div";
		const styles = sizeStyles[size];
		const [animationPhase, setAnimationPhase] = useState<
			"reset" | "ready" | "animating"
		>("reset");

		// Trigger animation on title change
		useEffect(() => {
			// Use microtasks to avoid React warning while keeping flushSync functionality
			queueMicrotask(() => {
				// Phase 1: Force reset with no transition
				flushSync(() => {
					setAnimationPhase("reset");
				});

				// Phase 2: Enable transition but stay at 0%
				setTimeout(() => {
					flushSync(() => {
						setAnimationPhase("ready");
					});

					// Phase 3: Animate to 100%
					setTimeout(() => {
						setAnimationPhase("animating");
					}, 50);
				}, 50);
			});
		}, [title]);

		// Trigger initial animation on mount
		useEffect(() => {
			const initialTimer = setTimeout(() => {
				setAnimationPhase("ready");
				setTimeout(() => setAnimationPhase("animating"), 50);
			}, 50);

			return () => clearTimeout(initialTimer);
		}, []);

		// Handle title structure - string or object with main/secondary parts
		const titleData =
			typeof title === "string" ? { main: title, secondary: undefined } : title;

		return (
			<Box
				ref={ref}
				as={Component}
				flexShrink={0}
				mb={6}
				minHeight={styles.minHeight}
				display="flex"
				alignItems="flex-end"
				width="100%"
				{...props}
			>
				<Box
					fontSize={styles.fontSize}
					fontWeight="normal"
					fontStyle="italic"
					fontFamily="heading"
					color={COLORS.text.main}
					textAlign="left"
					mb={1}
					position="relative"
					display="block"
				>
					{/* Render main part of title */}
					<Box as="span" position="relative" display="inline-block">
						{titleData.main}
						{/* Accent underline only under main title */}
						{showAccent && (
							<Box
								position="absolute"
								bottom="-2px"
								left="0"
								width={animationPhase === "animating" ? "100%" : "0%"}
								height="2px"
								backgroundColor={COLORS.accent.secondary}
								borderRadius="1px"
								transition={
									animationPhase === "reset" ? "none" : "width 0.3s ease-out"
								}
							/>
						)}
					</Box>
					{/* Render secondary part without underline */}
					{titleData.secondary && (
						<Box as="span" ml={1}>
							{titleData.secondary}
						</Box>
					)}
					{children}
				</Box>
			</Box>
		);
	}
);

PageHeader.displayName = "PageHeader";

export default PageHeader;
