/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";

export default defineConfig({
    plugins: [react()],
    test: {
        // Environment configuration
        environment: "jsdom",
        environmentOptions: {
            jsdom: { url: "http://localhost:3000" },
        },
        env: {
            VITE_BASE_URL: "http://localhost:3000",
            VITE_BASE_API_URL: "http://localhost:3000/api",
        },

        // Global test setup
        globals: true,
        setupFiles: ["./tests/setup.ts"],

        // Coverage configuration
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            // Include unexecuted files as well as files loaded by tests.
            include: ["src/**"],
            exclude: [
                "src/pages/dev/**",
                "src/main.tsx",
                "node_modules/",
                "tests/",
                "**/*.d.ts",
                "**/*.config.*",
                "**/*.test.*",
                "**/*.spec.*",
            ],
            thresholds: {
                branches: 39,
                functions: 37,
                lines: 42,
                statements: 41,
            },
        },

        // Test file patterns
        include: [
            "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
            "tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
        ],
        exclude: ["node_modules/", "dist/", ".git/"],

        // Performance and behavior
        testTimeout: 10000,
        hookTimeout: 10000,
        teardownTimeout: 5000,

        // Reporter configuration
        reporters: ["verbose"],

        // Mock configuration
        clearMocks: true,
        restoreMocks: true,
    },

    resolve: {
        tsconfigPaths: true,
        alias: {
            // React and user-event must share DOM's configured event and async wrappers.
            "@testing-library/dom": createRequire(import.meta.url).resolve(
                "@testing-library/dom",
            ),
            // Only the MSW server entry needs Node exports; app imports keep browser conditions.
            "msw/node": createRequire(import.meta.url).resolve("msw/node"),
        },
        conditions: ["import", "module", "browser", "default"],
        mainFields: ["browser", "module", "main"],
        extensions: [
            ".mjs",
            ".js",
            ".mts",
            ".ts",
            ".jsx",
            ".tsx",
            ".json",
            ".d.ts",
        ],
    },
});
