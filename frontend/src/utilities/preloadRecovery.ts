export function registerPreloadRecovery(buildUrl: string): () => void {
    const storageKey = `cinexplorer:preload-reload:${buildUrl}`;
    const recover = (event: Event) => {
        try {
            const storage = window.sessionStorage;
            if (storage.getItem(storageKey) !== null) return;
            // Keep this marker across reloads so a persistently missing asset cannot loop.
            storage.setItem(storageKey, "1");
        } catch {
            // Without a persistent guard, let Vite propagate the original error.
            return;
        }
        event.preventDefault();
        window.location.reload();
    };
    window.addEventListener("vite:preloadError", recover);
    return () => window.removeEventListener("vite:preloadError", recover);
}
