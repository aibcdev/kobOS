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
    // Third-party landing-page templates kept for reference; not built or imported by the app.
    "downloads/**",
    "vendor/**",
    // Local agent-skill tooling, not part of the app.
    ".agents/**",
  ]),
  {
    rules: {
      // React Compiler advisory: flags fetch-on-mount and storage-sync effects across the app. Kept visible as a
      // warning so new code avoids it; not a correctness bug in the existing call sites.
      "react-hooks/set-state-in-effect": "warn",
      // A leading underscore marks a parameter or binding as deliberately unused (e.g. Netlify handler signatures).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
