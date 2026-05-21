import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { rules: localRules } = require("./eslint-rules/no-silent-catch.cjs");

export default [
  // ─── Global ignores (replaces .eslintignore) ──────────────────────
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.expo/**",
      "**/coverage/**",
      "**/.vite/**",
      "**/artifacts/ajkmart/**", // READ-ONLY — do not lint
    ],
  },
  // ─── TypeScript files (all workspaces) ────────────────────────────
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node, ...globals.browser },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "ajk-local": { rules: localRules },
    },
    rules: {
      // Enforce explicit types
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // Catch errors properly
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      // Async/await
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/require-await": "warn",
      // Silent error swallowing
      "ajk-local/no-silent-catch": "error",
      // General
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
    },
  },
  // ─── React files (admin, vendor-app, rider-app) ────────────────────
  {
    files: [
      "artifacts/admin/**/*.tsx",
      "artifacts/vendor-app/**/*.tsx",
      "artifacts/rider-app/**/*.tsx",
    ],
    plugins: { react, "react-hooks": reactHooks },
    rules: {
      "react/jsx-key": "error",
      "react/no-unknown-property": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
    settings: { react: { version: "detect" } },
  },
];
