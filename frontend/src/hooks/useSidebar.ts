import { useState } from "react";
import { useBreakpointValue } from "@chakra-ui/react";

export interface UseSidebarReturn {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
    onToggle: () => void;
    isMobile: boolean;
    shouldShowAsDrawer: boolean;
}

/**
 * Custom hook for managing sidebar state and responsive behavior
 *
 * Handles:
 * - Sidebar open/closed state
 * - Responsive behavior (drawer on mobile, persistent on desktop)
 * - Auto-close on mobile navigation
 * - Integrates with Chakra v3 overlay management patterns
 */
export const useSidebar = (): UseSidebarReturn => {
    // useBreakpointValue acceptable here: controls behavioral logic (drawer vs persistent),
    // not just visibility. See ADR-007 for CSS-vs-JS responsive patterns.
    const isMobile =
        useBreakpointValue(
            {
                base: true,
                lg: false,
            },
            { ssr: false },
        ) ?? true;

    // On desktop (lg+), sidebar should be persistent and visible
    // On mobile/tablet (base-md), sidebar should be a drawer
    const shouldShowAsDrawer = isMobile;

    const [choice, setChoice] = useState({ isMobile, open: !isMobile });
    const changed = choice.isMobile !== isMobile;
    if (changed) setChoice({ isMobile, open: !isMobile });
    const isOpen = changed ? !isMobile : choice.open;
    const onOpen = () => setChoice({ isMobile, open: true });
    const onClose = () => setChoice({ isMobile, open: false });
    const onToggle = () => setChoice({ isMobile, open: !isOpen });

    return {
        isOpen,
        onOpen,
        onClose,
        onToggle,
        isMobile,
        shouldShowAsDrawer,
    };
};
