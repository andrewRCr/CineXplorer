import { CARD_WIDTH } from "@/components/movie/collection/shared/gridConstants";

export const POSTER_GAP = 16;
const MIN_CARD_WIDTH = 138;

/** Fill a viewport with complete cards, choosing the count nearest the catalog width. */
export function posterRowLayout(width: number) {
    const available = Math.max(width, MIN_CARD_WIDTH);
    const count = Math.max(
        1,
        Math.min(
            Math.round((available + POSTER_GAP) / (CARD_WIDTH + POSTER_GAP)),
            Math.floor(
                (available + POSTER_GAP) / (MIN_CARD_WIDTH + POSTER_GAP),
            ),
        ),
    );
    const cardWidth = (available - (count - 1) * POSTER_GAP) / count;
    return { count, cardWidth, stride: cardWidth + POSTER_GAP };
}
