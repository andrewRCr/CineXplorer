/**
 * Tooltip wrapper providing simplified API over Chakra UI v3 compound components
 *
 * Features:
 * - Simple `content` prop instead of nested children
 * - Arrow shown by default (set showArrow={false} to hide)
 * - Uses tooltip recipe for consistent styling (popover/on-popover tokens)
 * - Portalled by default for proper z-index stacking
 */
import { Tooltip as ChakraTooltip, Portal } from "@chakra-ui/react"
import * as React from "react"

export interface TooltipProps extends ChakraTooltip.RootProps {
  /** Whether to show the arrow indicator (default: true) */
  showArrow?: boolean
  /** Whether to render in a portal (default: true) */
  portalled?: boolean
  /** Container ref for portal rendering */
  portalRef?: React.RefObject<HTMLElement>
  /** Tooltip content */
  content: React.ReactNode
  /** Props passed to Tooltip.Content */
  contentProps?: ChakraTooltip.ContentProps
  /** Whether the tooltip is disabled */
  disabled?: boolean
}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  function Tooltip(props, ref) {
    const {
      showArrow = true,
      children,
      disabled,
      portalled = true,
      content,
      contentProps,
      portalRef,
      ...rest
    } = props

    if (disabled) return children

    return (
      <ChakraTooltip.Root {...rest}>
        <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
        <Portal disabled={!portalled} container={portalRef}>
          <ChakraTooltip.Positioner>
            <ChakraTooltip.Content ref={ref} {...contentProps}>
              {showArrow && (
                <ChakraTooltip.Arrow>
                  <ChakraTooltip.ArrowTip />
                </ChakraTooltip.Arrow>
              )}
              {content}
            </ChakraTooltip.Content>
          </ChakraTooltip.Positioner>
        </Portal>
      </ChakraTooltip.Root>
    )
  },
)
