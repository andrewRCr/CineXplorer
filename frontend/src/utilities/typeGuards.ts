/** Narrow unknown JSON or navigation state before accessing its properties. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);
