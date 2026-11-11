/**
 * Marquee: antique brass on warm black, with a deep-cream light mode.
 * Uses Carbon's surface and button mapping with its own palette and border bases.
 */
import type { UnifiedTheme } from "../types";
import { carbonShadows } from "../shadows";
import { createExtensions } from "../extensions";
import {
    adjustColor,
    deriveBorderHierarchy,
    deriveInteractionStates,
} from "../utils";

const palettes = {
    dark: {
        background: "#110E0A",
        layer01: "#191510",
        layer02: "#221E18",
        layer03: "#2D2721",
        borderSubtle: "#413B33",
        borderStrong: "#736A5F",
        pattern: "progressive" as const,
        foreground: "#EFE9DC",
        onMuted: "#B1A898",
        primary: "#D1AF6B",
        onPrimary: "#110E0A",
        tertiary: "#D8BA7E",
        star: "#DCB970",
        secondary: "#3A332B",
        badge: "#433C34",
        success: "#86C163",
        onSuccess: "#110E0A",
        destructive: "#D08F93",
        onDestructive: "#110E0A",
        warning: "#FED071",
        onWarning: "#110E0A",
        info: "#8DB4D6",
        onInfo: "#110E0A",
    },
    light: {
        background: "#F2E8CE",
        layer01: "#FBF6E9",
        layer02: "#F2E8CE",
        layer03: "#FBF6E9",
        borderSubtle: "#D3C5AA",
        borderStrong: "#7C705B",
        pattern: "alternating" as const,
        foreground: "#221E14",
        onMuted: "#5F594B",
        primary: "#755327",
        onPrimary: "#FFFFFF",
        tertiary: "#755327",
        star: "#7F5806",
        secondary: "#D6C8A9",
        badge: "#DFD2B4",
        success: "#376A0D",
        onSuccess: "#FFFFFF",
        destructive: "#693137",
        onDestructive: "#FFFFFF",
        warning: "#9C3A11",
        onWarning: "#FFFFFF",
        info: "#2F5E86",
        onInfo: "#FFFFFF",
    },
};

export function createMarqueeAdapter(mode: "light" | "dark"): UnifiedTheme {
    // Base mappings
    const palette = palettes[mode];
    const borders = deriveBorderHierarchy(
        palette.borderSubtle,
        palette.borderStrong,
        palette.pattern,
    );
    // Derived interaction states
    const layer01States = deriveInteractionStates(
        palette.layer01,
        palette.foreground,
    );
    const layer02States = deriveInteractionStates(
        palette.layer02,
        palette.foreground,
    );
    const primaryStates = deriveInteractionStates(
        palette.primary,
        palette.onPrimary,
    );
    const secondaryStates = deriveInteractionStates(
        palette.secondary,
        palette.foreground,
    );
    const shadows = carbonShadows[mode];
    // Application extensions
    const extensions = createExtensions(
        {
            muted: palette.layer01,
            mutedForeground: palette.onMuted,
            secondaryHover: secondaryStates.hover,
        },
        mode,
    );
    // Unified theme assembly
    return {
        background: palette.background,
        foreground: palette.foreground,
        "layer-01": palette.layer01,
        "layer-02": palette.layer02,
        "layer-03": palette.layer03,
        popover: palette.layer02,
        "on-popover": palette.foreground,
        "border-subtle-00": borders.subtle00,
        "border-subtle-01": borders.subtle01,
        "border-subtle-02": borders.subtle02,
        "border-strong-01": borders.strong01,
        "border-strong-02": borders.strong02,
        "border-strong-03": borders.strong03,
        "shadow-sm": shadows.sm,
        "shadow-md": shadows.md,
        "shadow-lg": shadows.lg,
        backdrop: "rgba(0, 0, 0, 0.7)",
        "layer-hover-01": layer01States.hover,
        "layer-hover-02": layer02States.hover,
        "layer-selected-01": layer01States.selected,
        "layer-selected-02": layer02States.selected,
        "layer-active-01": layer01States.active,
        "layer-active-02": layer02States.active,
        brand: palette.primary,
        "on-brand": palette.onPrimary,
        "button-outline": borders.strong01,
        "on-button-outline": palette.foreground,
        "button-outline-primary": palette.primary,
        "on-button-outline-primary": palette.primary,
        "button-subtle": palette.secondary,
        "on-button-subtle": palette.foreground,
        "button-subtle-selected": layer02States.selected,
        "on-button-subtle-selected": palette.foreground,
        primary: palette.primary,
        "on-primary": palette.onPrimary,
        secondary: palette.secondary,
        "on-secondary": palette.foreground,
        muted: palette.layer01,
        "on-muted": palette.onMuted,
        tertiary: palette.tertiary,
        "on-tertiary": palette.onPrimary,
        "primary-hover": primaryStates.hover,
        "primary-active": primaryStates.active,
        "secondary-hover": secondaryStates.hover,
        "secondary-active": secondaryStates.active,
        "tertiary-hover": adjustColor(
            palette.tertiary,
            mode === "light" ? -5 : 5,
        ),
        "tertiary-active": adjustColor(
            palette.tertiary,
            mode === "light" ? -10 : 10,
        ),
        destructive: palette.destructive,
        "on-destructive": palette.onDestructive,
        success: palette.success,
        "on-success": palette.onSuccess,
        warning: palette.warning,
        "on-warning": palette.onWarning,
        info: palette.info,
        "on-info": palette.onInfo,
        "imdb-gold": palette.star,
        badge: palette.badge,
        "on-badge": palette.foreground,
        "drag-active": extensions["drag-active"],
        "drop-zone": extensions["drop-zone"],
        ring: palette.tertiary,
    };
}
