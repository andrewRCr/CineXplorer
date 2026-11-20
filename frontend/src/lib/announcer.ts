/**
 * The app's announcement channel. `announce` sends a message to the mounted `LiveAnnouncer`, the app's one polite
 * live region, which connects in the app's first commit; with no region connected, a message goes nowhere.
 */

type Deliver = (message: string) => void;

let deliver: Deliver | null = null;

/** Announces a message politely to screen readers, through the app's live region. */
export function announce(message: string) {
    deliver?.(message);
}

/** Connects the live region and returns its disconnect. */
export function connectAnnouncer(next: Deliver): () => void {
    deliver = next;
    return () => {
        if (deliver === next) deliver = null;
    };
}
