import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Tests rodam fora do tsconfig do Next
    "tests/**",
    "playwright.config.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
  {
    // Regras experimentais do react-hooks v5 disparam em vários componentes
    // legados — degradadas para warning até refatorarmos com calma.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
