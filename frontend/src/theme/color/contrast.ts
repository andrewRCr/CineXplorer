export type RGB = [number, number, number];

function parseHex(value: unknown): RGB | undefined {
    if (typeof value !== "string") return undefined;
    const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
    if (!match?.[1]) return undefined;
    const hex =
        match[1].length === 3
            ? [...match[1]].map((digit) => digit + digit).join("")
            : match[1];
    return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
    ];
}

/** Resolve opaque and translucent semantic colors in bottom-to-top painting order. */
export function resolveColorStack(
    tokens: readonly string[],
    theme: object,
): RGB | undefined {
    let background = parseHex(Reflect.get(theme, "background"));
    for (const token of tokens) {
        const match = /^([^/]+)(?:\/(\d+(?:\.\d+)?))?$/.exec(token);
        if (!match?.[1]) return undefined;
        const color = parseHex(Reflect.get(theme, match[1]));
        if (!color) return undefined;
        if (match[2] === undefined) {
            background = color;
        } else {
            const opacity = Number(match[2]) / 100;
            if (!background || opacity > 1) return undefined;
            // Keep fractional channels: rounding can turn a contrast failure into a pass.
            background = [
                color[0] * opacity + background[0] * (1 - opacity),
                color[1] * opacity + background[1] * (1 - opacity),
                color[2] * opacity + background[2] * (1 - opacity),
            ];
        }
    }
    return tokens.length ? background : undefined;
}
