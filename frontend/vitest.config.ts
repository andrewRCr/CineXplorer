/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";

export default defineConfig({
    plugins: [react(), tsconfigPaths()],
    test: {
        // Environment configuration
        environment: "jsdom",
        
        // Global test setup
        globals: true,
        setupFiles: ["./tests/setup.ts"],
        
        // Coverage configuration
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            // Include unexecuted files as well as files loaded by tests.
            include: ["**/*.{js,cjs,mjs,ts,mts,tsx,jsx,vue,svelte,marko,astro}"],
            exclude: [
                "node_modules/",
                "tests/",
                "**/*.d.ts",
                "**/*.config.*",
                "**/*.test.*",
                "**/*.spec.*",
            ],
            thresholds: {
                global: {
                    branches: 70,
                    functions: 70,
                    lines: 70,
                    statements: 70,
                },
            },
        },

        // Test file patterns
        include: [
            "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
            "tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
        ],
        exclude: [
            "node_modules/",
            "dist/",
            ".git/",
        ],

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
        alias: {
            // Note: @/types/* is handled by tsconfigPaths() plugin which supports
            // multiple fallback paths (./src/@types/* and ./src/types/*)
            "@": resolve(__dirname, "./src"),
            "@shared": resolve(__dirname, "../shared"),
            "@tests": resolve(__dirname, "./tests"),
        },
        conditions: ['import', 'module', 'browser', 'default'],
        mainFields: ['browser', 'module', 'main'],
        extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.d.ts'],
    },
});