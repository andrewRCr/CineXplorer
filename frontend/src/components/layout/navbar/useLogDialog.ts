import { useMatch } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEntryDialog } from "@/hooks/movie/useEntryDialog";
import { movieDetailQuery } from "@/lib/queries";
import type { MovieDetail } from "@/types/movie";

/** Read the film page's current query state only when Log is pressed. */
export function useLogDialog() {
    const match = useMatch("/movie/:id");
    const client = useQueryClient();
    const { open } = useEntryDialog();
    return (returnFocus?: () => HTMLElement | null) => {
        const query = match
            ? client.getQueryState<MovieDetail>(
                  movieDetailQuery(Number(match.params.id)).queryKey,
              )
            : undefined;
        const film = query?.status === "success" ? query.data : undefined;
        open({
            film: film
                ? {
                      tmdbId: film.tmdb_id,
                      title: film.title,
                      year: film.release_date?.slice(0, 4) || null,
                      posterPath: film.poster_path ?? null,
                  }
                : undefined,
            dateOn: true,
            filmChangeable: true,
            returnFocus,
        });
    };
}
