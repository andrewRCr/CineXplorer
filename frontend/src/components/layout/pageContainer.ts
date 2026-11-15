import type { ContainerProps } from "@chakra-ui/react";

/** Shared page width and padding, including Home's full-width sections. */
export const pageContainerProps = {
    maxW: "container.xl",
    px: { base: 2, md: 6, lg: 8 },
    w: "100%",
} satisfies ContainerProps;
