import js from "@eslint/js";
import eslintReact from "@eslint-react/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintPluginBetterTailwindcss from "eslint-plugin-better-tailwindcss";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores([
    "dist/**",
    "node_modules/**",
    ".local/**",
    ".agents/**",
    ".serena/**",
  ]),
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    extends: [js.configs.recommended],
    plugins: { "simple-import-sort": simpleImportSort },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended],
  },
  {
    files: ["src/client/**/*.{ts,tsx}"],
    extends: [
      eslintReact.configs.recommended,
      eslintPluginBetterTailwindcss.configs.recommended,
    ],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
    settings: {
      "better-tailwindcss": {
        entryPoint: "src/client/style.css",
      },
    },
  },
  {
    files: [
      "*.{js,mjs,cjs,ts}",
      "scripts/**/*.{js,mjs,cjs}",
      "src/server/**/*.ts",
      "src/**/*.test.ts",
    ],
    languageOptions: { globals: globals.node },
  },
  prettierRecommended,
);
