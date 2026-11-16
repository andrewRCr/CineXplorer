import { createContext } from "react";
import type { MoviePickerItem } from "@/types/movie";
import type { MovieEntries } from "@/services/userMovieDataService";

export interface EntryDialogOptions {
    film?: MoviePickerItem;
    dateOn: boolean;
    filmChangeable: boolean;
    entry?: MovieEntries["entries"][number];
    returnFocus?: () => HTMLElement | null;
    /** Prefer the connected target when the opener may disappear after closing. */
    preferReturnFocus?: boolean;
}

export const EntryDialogContext = createContext<{
    open: (options: EntryDialogOptions) => void;
}>({
    open: () => {
        throw new Error("Opening an entry requires EntryDialogHost");
    },
});
