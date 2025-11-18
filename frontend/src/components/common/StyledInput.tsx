import { Input, type InputProps } from "@chakra-ui/react";

/**
 * Styled Input Component
 *
 * Wrapper around Chakra Input with ADR-015 border-only focus pattern.
 * Provides layer-aware border hierarchy and hover/focus transitions.
 *
 * **Use for:** Standard text input fields following the border-only focus pattern
 * (no outline ring - border color change is sufficient per ADR-015).
 *
 * **Pattern:**
 * - Default: `border-strong-{layer}` border
 * - Hover (not focused): `border-strong-{layer+1}` + `tertiary/8` background tint
 * - Focus: `tertiary` border (border change is sufficient focus indicator)
 *
 * **Do NOT use for:**
 * - Highly custom inputs that need different styling (use Chakra Input directly)
 * - Inputs that need outline rings (use Chakra Input with `_focusVisible`)
 *
 * See strategy-semantic-tokens.md "Form Controls" for complete usage guide.
 *
 * @example
 * ```tsx
 * // On layer-01 (default)
 * <StyledInput placeholder="Enter text" />
 *
 * // On layer-02 (cards, elevated surfaces)
 * <StyledInput layer="02" placeholder="Search..." />
 *
 * // With additional Chakra props
 * <StyledInput placeholder="Email" type="email" maxW="300px" />
 * ```
 *
 * Pattern: Similar to TextLink.tsx (encapsulated wrapper for special cases).
 * Styling logic lives inside component - no separate utility file needed.
 */

interface StyledInputProps extends InputProps {
  /**
   * Layer context for appropriate border hierarchy
   * - "01": Default layer (transparent background)
   * - "02": Elevated surfaces (background fill)
   */
  layer?: "01" | "02";
}

export const StyledInput = ({ layer = "01", ...props }: StyledInputProps) => {
  const borderHover = layer === "01" ? "border-strong-02" : "border-strong-03";

  return (
    <Input
      borderColor={`border-strong-${layer}`}
      bg={layer === "01" ? "transparent" : "background"}
      color="foreground"
      css={{
        "&:hover:not(:focus)": {
          borderColor: `var(--chakra-colors-${borderHover})`,
          backgroundColor: "color-mix(in srgb, var(--chakra-colors-tertiary) 8%, transparent)",
        },
        "&:focus": {
          borderColor: "var(--chakra-colors-tertiary)",
          backgroundColor: layer === "01" ? "transparent" : "var(--chakra-colors-background)",
          outline: "none",
        },
      }}
      {...props}
    />
  );
};
