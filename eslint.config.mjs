import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Type-aware linting. This is what catches an unawaited promise, which is
    // not a style problem: `if (!isAuthorized(request))` on an async function
    // is always false, which silently turns a protected route public. The auth
    // helpers in src/server/editorAuth.ts are async, so the check is worth
    // enforcing in the compiler rather than in review.
    languageOptions: {
      parserOptions: {
        projectService: {
          // The config files are plain JavaScript run by Node, not part of the
          // app's TypeScript project.
          allowDefaultProject: ["*.mjs"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "data/**",
  ]),
]);
