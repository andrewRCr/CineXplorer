/** Format an API calendar date in local time without parsing it as UTC. */
export function calendarDate(
    value: string,
    options: Intl.DateTimeFormatOptions,
) {
    return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", options);
}
