/**
 * Chakra's own color and shadow names, pointed at theme roles.
 *
 * Chakra's recipes and global styles draw `bg`, `fg`, `border`, the `gray` palette (the default `colorPalette`)
 * and the `xs`–`2xl` shadows wherever a component does not set its own color. Redefining those names makes every
 * such default render a theme role, in every theme and color mode, instead of Chakra's own grays.
 *
 * `border` is the accessible default for interactive edges on the page and on cards; inputs on overlays keep
 * choosing the layer-aware `border-strong-02` themselves.
 */

const color = (role: string) => ({ value: `{colors.${role}}` });
const shadow = (role: string) => ({ value: `{shadows.${role}}` });

export const chakraColorRoles = {
    bg: {
        DEFAULT: color("background"),
        subtle: color("layer-01"),
        muted: color("muted"),
        emphasized: color("layer-hover-01"),
        inverted: color("foreground"),
        panel: color("popover"),
        error: color("destructive/10"),
        warning: color("warning/10"),
        success: color("success/10"),
        info: color("info/10"),
    },
    fg: {
        DEFAULT: color("foreground"),
        muted: color("on-muted"),
        subtle: color("on-muted"),
        inverted: color("background"),
        error: color("destructive"),
        warning: color("warning"),
        success: color("success"),
        info: color("info"),
    },
    border: {
        DEFAULT: color("border-strong-01"),
        muted: color("border-subtle-01"),
        subtle: color("border-subtle-00"),
        emphasized: color("border-strong-02"),
        inverted: color("foreground"),
        error: color("destructive"),
        warning: color("warning"),
        success: color("success"),
        info: color("info"),
    },
    gray: {
        contrast: color("background"),
        fg: color("foreground"),
        subtle: color("layer-01"),
        muted: color("muted"),
        emphasized: color("layer-hover-01"),
        solid: color("foreground"),
        focusRing: color("ring"),
        border: color("border-strong-01"),
    },
};

export const chakraShadowRoles = {
    xs: shadow("shadow-sm"),
    sm: shadow("shadow-sm"),
    md: shadow("shadow-md"),
    lg: shadow("shadow-lg"),
    xl: shadow("shadow-lg"),
    "2xl": shadow("shadow-lg"),
};
