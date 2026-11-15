/** Film links from Home return to Home instead of a catalog view. */
export const homeFilmPath = (tmdbId: number) => `/movie/${tmdbId}?from=home`;
