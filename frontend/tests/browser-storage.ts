// Node 25+ defines its own localStorage and sessionStorage globals, which keep
// Vitest from installing jsdom's (localStorage is undefined unless Node gets
// --localstorage-file). Install jsdom's Storage the way Vitest installs other
// window globals; reading Node's getter to test for this would log a warning.
declare const jsdom: {
    window: Pick<Window, "localStorage" | "sessionStorage">;
};
for (const key of ["localStorage", "sessionStorage"] as const) {
    let override: Storage | undefined;
    Object.defineProperty(globalThis, key, {
        configurable: true,
        get: () => override ?? jsdom.window[key],
        set: (value: Storage) => {
            override = value;
        },
    });
}
