# ADR-017: Extend Border-Only Focus Pattern to Select.Trigger

## Status

Accepted

## Context

ADR-015 established border-only focus indicators for text inputs (Input, Textarea, NumberInput) and keyboard-only outline
rings for buttons, links, and Select dropdowns.

During recipe system implementation (November 2025), we discovered that the Chakra UI v3 Select recipe's `_focusVisible`
prop with outline rings does not reliably apply to `Select.Trigger` components. The recipe's outline ring styling was
not consistently displayed, requiring per-component CSS workarounds.

**Key findings:**

1. **Border-only focus DOES work in Select.Trigger:** ConnectedDropdowns and SortDropdownMinimal components successfully
   use `_focusVisible={{ borderColor: "tertiary", outline: "none" }}` pattern
2. **Semantic alignment:** Select.Trigger is semantically a form control (choose a value from a list), not an action
   button (perform an operation)
3. **Consistency with form controls:** All other form controls (Input, Textarea, Checkbox, Radio, Switch) use non-outline
   focus patterns (border changes or internal state changes)

**Original ADR-015 reasoning for outline rings on Select:**
> "Select dropdowns are button-like (not editable text fields), so `:focus-visible` correctly matches only keyboard focus."

**New perspective:** While Select.Trigger uses button-like visual treatment (trigger opens dropdown), its semantic
purpose is form value selection, not action execution. This aligns it more closely with text inputs than buttons.

## Decision

We will extend the **border-only focus pattern** from text inputs to Select.Trigger components.

Select.Trigger will use:

- Border color change to `tertiary` on keyboard focus
- No outline ring (`outline: "none"`)
- Suppression of outline handled by recipe's `_focusVisible` prop

This supersedes ADR-015's guidance on Select dropdowns while maintaining ADR-015's text input and button/link patterns.

**Implementation:**

- Recipe provides default border-only focus behavior
- Components using custom border colors must explicitly set `_focusVisible={{ borderColor: "tertiary" }}`

## Consequences

### Positive

- **Works reliably:** Border-only pattern proven functional in Select.Trigger (no CSS workaround needed for default usage)
- **Semantic consistency:** Form controls use border-based or internal focus indicators; action elements use outline rings
- **Centralized in recipe:** Default Select usage gets correct focus behavior automatically
- **Maintains WCAG compliance:** Border color change satisfies WCAG 2.4.7 and 2.4.13 requirements

### Negative

- **Different from ADR-015 guidance:** Creates brief documentation inconsistency (resolved by this ADR)
- **Custom border colors need explicit focus:** Components overriding `borderColor` must also specify `_focusVisible`
    - **Mitigation:** Documented in strategy guide; only affects 3 components
      (ConnectedDropdowns, SortDropdownMinimal, SortSelector)

### Risks

None identified. Pattern is proven functional and maintains accessibility standards.

## References

- **Supersedes:** ADR-015 (Select dropdown section only; text input guidance remains valid)
- **Recipe Implementation:** `frontend/src/theme/recipes/select.ts`
- **Strategy Guide:** `.arc/reference/strategies/project/style/strategy-component-styling.md` (Select/Dropdown section)
- **Reference Implementation:** `frontend/src/pages/dev/theme-debug/sections/FormControlsSection.tsx`
