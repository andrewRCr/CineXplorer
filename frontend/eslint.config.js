import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import testingLibrary from "eslint-plugin-testing-library";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default tseslint.config([
    {
        ignores: [
            "dist",
            "coverage",
            // Chakra UI v3 "snippet" system: CLI-installed utility files that intentionally
            // export both components and hooks in single files for cohesion. This violates
            // react-refresh/only-export-components but aligns with Chakra's documented
            // snippet architecture.
            // See: https://www.chakra-ui.com/docs/components/concepts/color-mode
            "src/components/core/chakra/**",
        ],
    },
    {
        files: ["**/*.{ts,tsx}"],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            reactHooks.configs.flat.recommended,
            reactRefresh.configs.vite,
        ],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        rules: {
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
        },
    },
    {
        files: ["src/**/*.{ts,tsx}"],
        ignores: ["src/**/__tests__/**", "src/**/*.{test,spec}.{ts,tsx}"],
        extends: [tseslint.configs.recommendedTypeChecked],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        files: ["src/**/*.{js,jsx,ts,tsx}", "tests/**/*.{js,jsx,ts,tsx}"],
        rules: { "no-console": "error" },
    },
    {
        files: ["src/services/logger.ts", "src/services/consoleCapture.ts"],
        rules: { "no-console": "off" },
    },
    {
        files: [
            "**/__tests__/**/*.{js,jsx,ts,tsx}",
            "**/*.{test,spec}.{js,jsx,ts,tsx}",
        ],
        extends: [testingLibrary.configs["flat/react"]],
        settings: {
            "testing-library/utils-module": "test-renderer",
        },
    },
    eslintConfigPrettier,
]);
