import { Box, Text, HStack, Input } from "@chakra-ui/react";
import { COLORS } from "@/constants/theme";

interface RuntimeSelectorProps {
	minRuntime: string;
	maxRuntime: string;
	onMinRuntimeChange: (runtime: string) => void;
	onMaxRuntimeChange: (runtime: string) => void;
}

const RuntimeSelector = ({
	minRuntime,
	maxRuntime,
	onMinRuntimeChange,
	onMaxRuntimeChange,
}: RuntimeSelectorProps) => {
	return (
		<Box>
			<Text fontSize="sm" fontWeight="medium" mb={2} color={COLORS.text.main}>
				Runtime (minutes)
			</Text>
			<HStack gap={2}>
				<Input
					placeholder="Min"
					value={minRuntime}
					onChange={(e) => onMinRuntimeChange(e.target.value)}
					type="number"
					min="0"
					max="500"
					size="sm"
					borderColor={COLORS.border.main}
					_focus={{
						borderColor: COLORS.accent.primary,
						boxShadow: `0 0 0 1px ${COLORS.accent.primary}`,
					}}
					_hover={{
						borderColor: COLORS.accent.secondary,
					}}
				/>
				<Text fontSize="sm" color={COLORS.text.secondary}>
					to
				</Text>
				<Input
					placeholder="Max"
					value={maxRuntime}
					onChange={(e) => onMaxRuntimeChange(e.target.value)}
					type="number"
					min="0"
					max="500"
					size="sm"
					borderColor={COLORS.border.main}
					_focus={{
						borderColor: COLORS.accent.primary,
						boxShadow: `0 0 0 1px ${COLORS.accent.primary}`,
					}}
					_hover={{
						borderColor: COLORS.accent.secondary,
					}}
				/>
			</HStack>
		</Box>
	);
};

export default RuntimeSelector;
