import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "test-results/**",
      "tests/**",
      "coverage/**",
      "**/*.mjs",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      // TypeScript's own compiler already catches undefined-reference errors,
      // and this rule false-positives on TS-only constructs (ambient DOM
      // globals, merged global types) that ESLint's scope analysis can't see.
      "no-undef": "off",
      // Allow an explicit `_`-prefixed name to document an intentionally
      // unused parameter (common in typed stub/fixture implementations).
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // .ts as well as .tsx: a custom hook can live in a plain .ts module, and
    // rules-of-hooks / exhaustive-deps must catch violations there too.
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    // eslint-plugin-react-hooks v7 folded the experimental React Compiler
    // rule set (set-state-in-effect, purity, immutability, refs-in-render,
    // etc.) into its "recommended" config. Those rules assume code written
    // for compiler compatibility and would require a large rewrite of this
    // existing, working codebase. Keep only the long-standing correctness
    // rules that predate that merge.
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  eslintConfigPrettier,
);
