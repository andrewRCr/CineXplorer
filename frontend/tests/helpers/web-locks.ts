/** A FIFO lock boundary for tests that exercise coordination between tabs. */
export function installWebLocks(): void {
    const tails = new Map<string, Promise<void>>();
    Object.defineProperty(navigator, "locks", {
        configurable: true,
        value: {
            request: async <T>(
                name: string,
                callback: () => Promise<T>,
            ): Promise<T> => {
                const previous = tails.get(name) ?? Promise.resolve();
                let release = () => {};
                const held = new Promise<void>((resolve) => {
                    release = resolve;
                });
                tails.set(
                    name,
                    previous.then(() => held),
                );
                await previous;
                try {
                    return await callback();
                } finally {
                    release();
                }
            },
        },
    });
}

export function gate() {
    let release = () => {};
    const wait = new Promise<void>((resolve) => {
        release = resolve;
    });
    return { wait, release: () => release() };
}
