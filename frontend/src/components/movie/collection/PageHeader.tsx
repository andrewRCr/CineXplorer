import { forwardRef, type ReactNode, type ElementType } from "react";
import { Box, type BoxProps } from "@chakra-ui/react";
import { COLORS } from "@/constants/theme";

type PageHeaderOwnProps<T extends ElementType = ElementType> = {
	as?: T;
	title: string;
	showAccent?: boolean;
	size?: 'sm' | 'md' | 'lg' | 'xl';
	children?: ReactNode;
};

type PageHeaderProps<T extends ElementType> = PageHeaderOwnProps<T> &
	Omit<BoxProps, keyof PageHeaderOwnProps>;

const sizeStyles = {
	sm: { fontSize: 'xl', minHeight: '40px' },
	md: { fontSize: '2xl', minHeight: '50px' },
	lg: { fontSize: '3xl', minHeight: '60px' },
	xl: { fontSize: '4xl', minHeight: '70px' }
};

const PageHeader = forwardRef(
	<T extends ElementType = 'div'>(
		{ 
			as, 
			title, 
			showAccent = true, 
			size = 'lg',
			children, 
			...props 
		}: PageHeaderProps<T>,
		ref: React.Ref<HTMLElement>
	) => {
		const Component = as || 'div';
		const styles = sizeStyles[size];

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
					color={COLORS.text.main}
					textAlign="left"
					mb={1}
					position="relative"
					display="block"
				>
					{title}
					{children}
					{showAccent && (
						<Box
							position="absolute"
							bottom="-2px"
							left="0"
							right="0"
							height="2px"
							backgroundColor={COLORS.accent.primary}
							borderRadius="1px"
						/>
					)}
				</Box>
			</Box>
		);
	}
);

PageHeader.displayName = "PageHeader";

export default PageHeader;
