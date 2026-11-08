import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^[A-Z_]" }],
    },
  },
  {
    // React Three Fiber animates by mutating three.js objects (uniforms, positions)
    // inside useFrame on every frame, outside React's render cycle. That is the
    // intended R3F pattern, but the React Compiler "immutability" rule flags it.
    files: ["src/three/**/*.{js,jsx,ts,tsx}"],
    rules: { "react-hooks/immutability": "off" },
  },
  {
    files: ["scripts/**/*.{js,mjs}", "*.config.js"],
    languageOptions: { globals: globals.node },
  },
  // Must stay last: turns off style rules that would fight with Prettier.
  prettier,
);
