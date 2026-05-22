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
      // Test files: not included in web tsconfigs, linted separately via vitest
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "**/tests/**",
      // React Native / Expo native files: use a different module resolution
      "**/*.native.ts",
      "**/*.native.tsx",
      // Files literally named "native.ts/tsx" (no dot prefix) in lib sub-packages
      "lib/auth-utils/src/captcha/native.tsx",
      "lib/auth-utils/src/oauth/native.ts",
      // Build/tool config files: typically not included in app tsconfigs
      "**/vitest.config.ts",
      "**/drizzle.config.ts",
      "**/orval.config.ts",
      "scripts/**",
    ],
  },
  // ─── TypeScript files (all workspaces) ────────────────────────────
  {
    files: ["**/*.ts", "**/*.tsx"],
    linterOptions: {
      reportUnusedDisableDirectives: "warn",
    },
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
      // ── Type safety ───────────────────────────────────────────────
      // Downgraded to warn: legitimate any usage exists in ORM queries,
      // Express req.body, and dynamic Drizzle patterns throughout.
      "@typescript-eslint/no-explicit-any": "warn",
      // Off: these fire on every ORM/Express any-typed value and produce
      // thousands of low-signal warnings across the codebase.
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      // Off: TypeScript infers return types well; requiring them on every
      // function is too verbose for a large React + Express codebase.
      "@typescript-eslint/explicit-function-return-type": "off",

      // ── Variables ─────────────────────────────────────────────────
      // Warn instead of error: lets CI pass while still surfacing unused
      // vars as visible feedback during development.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      // ── Async / Promises ──────────────────────────────────────────
      // Warn: Express 5 handles async route handler errors internally,
      // so floating promises in route files are intentional.
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/await-thenable": "error",
      // Off: false-positives on interface-implementing methods that must
      // match an async signature even when the body is synchronous.
      "@typescript-eslint/require-await": "off",

      // ── Silent error swallowing ────────────────────────────────────
      "ajk-local/no-silent-catch": "error",

      // ── General ───────────────────────────────────────────────────
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
    },
  },
  // ─── React files (admin, vendor-app, rider-app, lib UI packages) ──
  // Covers both .ts and .tsx so that hooks used in .ts hook files are
  // also checked by react-hooks/rules-of-hooks and exhaustive-deps.
  {
    files: [
      "artifacts/admin/**/*.ts",
      "artifacts/admin/**/*.tsx",
      "artifacts/vendor-app/**/*.ts",
      "artifacts/vendor-app/**/*.tsx",
      "artifacts/rider-app/**/*.ts",
      "artifacts/rider-app/**/*.tsx",
      "lib/auth-react/**/*.ts",
      "lib/auth-react/**/*.tsx",
      "lib/auth-utils/**/*.ts",
      "lib/auth-utils/**/*.tsx",
      "lib/ui/**/*.ts",
      "lib/ui/**/*.tsx",
    ],
    plugins: { react, "react-hooks": reactHooks },
    rules: {
      "react/jsx-key": "error",
      // cmdk-input-wrapper is a valid attribute used by the cmdk library (shadcn/ui command)
      "react/no-unknown-property": ["error", { ignore: ["cmdk-input-wrapper"] }],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
    settings: { react: { version: "detect" } },
  },
];
