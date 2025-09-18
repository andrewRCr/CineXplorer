import { useState, useEffect } from 'react';
import { useBreakpointValue } from '@chakra-ui/react';

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
	const [isOpen, setIsOpen] = useState(false);
	
	// Determine if we're in mobile mode
	const isMobile = useBreakpointValue({ 
		base: true, 
		lg: false 
	}, { ssr: false }) ?? true;
	
	// On desktop (lg+), sidebar should be persistent and visible
	// On mobile/tablet (base-md), sidebar should be a drawer
	const shouldShowAsDrawer = isMobile;
	
	// Auto-open sidebar on desktop by default
	useEffect(() => {
		if (!isMobile) {
			setIsOpen(true);
		} else {
			setIsOpen(false);
		}
	}, [isMobile]);
	
	const onOpen = () => setIsOpen(true);
	const onClose = () => setIsOpen(false);
	const onToggle = () => setIsOpen(prev => !prev);
	
	return {
		isOpen,
		onOpen,
		onClose,
		onToggle,
		isMobile,
		shouldShowAsDrawer,
	};
};
