import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("browser base URLs", () => {
  it.each([
    ["siteOrigin", "", "", "page"],
    ["apiBaseUrl", "", "", "page/api"],
    ["siteOrigin", "https://site.example", "", "https://site.example"],
    ["apiBaseUrl", "https://site.example", "", "https://site.example/api"],
    ["apiBaseUrl", "", "https://api.example/v1", "https://api.example/v1"],
    ["apiBaseUrl", "https://site.example", "https://api.example/v1", "https://api.example/v1"],
  ] as const)("resolves %s with site=%s and API=%s", async (key, site, api, expected) => {
    vi.stubEnv("VITE_BASE_URL", site);
    vi.stubEnv("VITE_BASE_API_URL", api);
    vi.resetModules();

    const urls = await import("./baseUrls");
    const address = expected.replace(/^page/, window.location.origin);
    expect(urls[key]).toBe(address);
  });
});
