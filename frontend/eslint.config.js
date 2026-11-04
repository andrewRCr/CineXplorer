import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

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
            "src/components/core/chakra/**"
        ],
    },
    {
        files: ["**/*.{ts,tsx}"],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            reactHooks.configs["recommended-latest"],
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
                    "argsIgnorePattern": "^_",
                    "varsIgnorePattern": "^_"
                }
            ],
        },
    },
]);
