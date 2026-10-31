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
    "frontend/node_modules/**",
    "frontend/dist/**",
    "frontend/generated/**",
    "**/client-loader.generated.tsx",
    "src/server/client-registry.generated.ts",
    "src/server/client-actions.generated.ts",
  ]),
]);

export default eslintConfig;
